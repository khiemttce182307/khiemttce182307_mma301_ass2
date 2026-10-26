import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInAnonymously,
  onAuthStateChanged,
} from 'firebase/auth';
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import { ENV_CONFIG } from '../config/env';

// 1. Kiểm tra cấu hình Firebase hợp lệ
const isConfigValid = Boolean(
  ENV_CONFIG.firebase.apiKey &&
  ENV_CONFIG.firebase.apiKey !== 'your_firebase_api_key_here' &&
  ENV_CONFIG.firebase.projectId &&
  ENV_CONFIG.firebase.projectId !== 'your_project_id'
);

let app = null;
let auth = null;
let db = null;

if (isConfigValid) {
  try {
    app = getApps().length > 0 ? getApp() : initializeApp(ENV_CONFIG.firebase);
    auth = getAuth(app);
    db = getFirestore(app);
  } catch (error) {
    console.warn('[Firebase Init Warning] Không thể khởi tạo Firebase:', error.message);
  }
}

import { getStorageData, setStorageData } from '../storage/asyncStorage';

const USER_UID_STORAGE_KEY = '@app_firebase_uid';

// 2. Lấy UID của người dùng (giữ nguyên UID cố định qua các phiên khởi động app)
export const getOrSignInUser = async () => {
  if (!auth) {
    throw new Error('Firebase Auth chưa được khởi tạo. Vui lòng cấu hình file .env');
  }

  // 1. Nếu Firebase Auth đã có session trong RAM
  if (auth.currentUser) {
    await setStorageData(USER_UID_STORAGE_KEY, auth.currentUser.uid);
    return auth.currentUser.uid;
  }

  // 2. Đăng nhập ẩn danh mới nếu chưa có session
  try {
    const userCredential = await signInAnonymously(auth);
    const newUid = userCredential.user.uid;
    await setStorageData(USER_UID_STORAGE_KEY, newUid);
    return newUid;
  } catch (authError) {
    // 3. Fallback: Nếu mất mạng khi mở app, lấy UID đã lưu trước đó từ AsyncStorage
    const cachedUid = await getStorageData(USER_UID_STORAGE_KEY, null);
    if (cachedUid) {
      return cachedUid;
    }

    if (authError.code === 'auth/admin-restricted-operation' || authError.code === 'auth/operation-not-allowed') {
      throw new Error(
        'Tính năng Anonymous Auth chưa được bật trên Firebase Console. Vui lòng bật tại Authentication > Sign-in method.'
      );
    }
    throw new Error(`Lỗi xác thực người dùng: ${authError.message}`);
  }
};

// 3. Service xử lý nghiệp vụ Orders trên Cloud Firestore
export const firebaseService = {
  // Kiểm tra xem Firebase đã cấu hình xong chưa
  isConfigured: () => isConfigValid && Boolean(db) && Boolean(auth),

  // SCHEMA COLLECTION: 'orders'
  // {
  //   userId: string,          // Auth UID của người mua
  //   items: array,            // Danh sách { id, title, price, quantity, thumbnail }
  //   totalAmount: number,     // Tổng tiền thanh toán
  //   totalQuantity: number,   // Tổng số món
  //   status: string,          // Trạng thái đơn hàng ('Đã hoàn thành')
  //   createdAt: timestamp,    // Thời gian tạo đơn
  // }
  createOrder: async ({ items, totalAmount, totalQuantity }) => {
    if (!firebaseService.isConfigured()) {
      throw new Error(
        'Firebase chưa được cấu hình. Hệ thống sẽ tự động lưu đơn hàng vào bộ nhớ cục bộ (Offline Local).'
      );
    }

    if (!Array.isArray(items) || items.length === 0) {
      throw new Error('Giỏ hàng trống, không thể tạo đơn hàng.');
    }

    try {
      const uid = await getOrSignInUser();

      const newOrderData = {
        userId: uid,
        items: items.map((i) => ({
          id: i.id,
          title: i.title,
          price: i.price,
          quantity: i.quantity,
          thumbnail: i.thumbnail || '',
        })),
        totalAmount,
        totalQuantity,
        status: 'Đã hoàn thành',
        createdAt: new Date().toISOString(), // Dùng ISO string tương thích mượt mà cả offline lẫn online
      };

      const docRef = await addDoc(collection(db, 'orders'), newOrderData);

      return {
        id: docRef.id,
        ...newOrderData,
      };
    } catch (err) {
      if (err.code === 'permission-denied') {
        throw new Error(
          'Firebase Security Rules từ chối quyền ghi: Bạn chỉ được phép ghi dữ liệu với tài khoản của chính mình.'
        );
      }
      if (err.code === 'unavailable' || err.message?.includes('network')) {
        throw new Error(
          'Mất kết nối mạng đến Firebase. Đơn hàng sẽ được chuyển sang chế độ lưu offline.'
        );
      }
      throw err;
    }
  },

  // Đọc danh sách đơn hàng của người dùng hiện tại
  getUserOrders: async () => {
    if (!firebaseService.isConfigured()) {
      throw new Error('Firebase chưa được cấu hình.');
    }

    try {
      const uid = await getOrSignInUser();

      // Truy vấn chỉ lấy các đơn hàng do chính uid này tạo
      const q = query(
        collection(db, 'orders'),
        where('userId', '==', uid)
      );

      const querySnapshot = await getDocs(q);
      const orders = [];

      querySnapshot.forEach((doc) => {
        orders.push({
          id: doc.id,
          ...doc.data(),
        });
      });

      // Sắp xếp đơn mới nhất lên đầu
      orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      return orders;
    } catch (err) {
      if (err.code === 'permission-denied') {
        throw new Error(
          'Security Rules từ chối quyền đọc: Bạn không thể xem đơn hàng của người dùng khác.'
        );
      }
      if (err.code === 'unavailable') {
        throw new Error('Không thể kết nối máy chủ Firebase (ngoại tuyến).');
      }
      throw err;
    }
  },
};
