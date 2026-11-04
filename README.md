# INTEGRATED E-COMMERCE MOBILE APPLICATION
## MÔN HỌC: MMA301 - REACT NATIVE (EXPO) | ASSIGNMENT 02

- **Sinh viên thực hiện:** Trần Tuấn Khiêm
- **Mã sinh viên:** CE182307
- **Mã lớp môn học:** MMA301
- **Công nghệ chính:** React Native, Expo SDK 52, JavaScript (ES6+), React Navigation, Context API + useReducer, AsyncStorage, Cloud Firestore + Anonymous Auth, expo-notifications, Google Gemini AI REST API, EAS Build (APK Preview).

---

## I. TỔNG QUAN NGHIỆP VỤ (BUSINESS WORKFLOW)

Ứng dụng mô phỏng một sàn thương mại điện tử di động hoàn chỉnh với 8 luồng nghiệp vụ khép kín:
1. **Startup (Khởi động):** Khôi phục trạng thái giỏ hàng (`CartContext`) và danh sách yêu thích (`FavoritesContext`) từ `AsyncStorage` thông qua cờ `isHydrated` (chống lỗi ghi đè mảng rỗng). Sau đó tự động nạp danh mục sản phẩm ban đầu từ Remote API.
2. **ProductList (Danh mục & Tìm kiếm):** Sử dụng `FlatList` với phân trang Infinite Scroll (`limit=10`, `skip=products.length`), hỗ trợ kéo để làm mới (Pull-to-refresh) và tìm kiếm Debounce 450ms. Tích hợp cơ chế guard 3 lớp chống duplicate request và triệt tiêu Race Condition giữa search cũ và mới qua `latestRequestIdRef`.
3. **ProductDetail (Chi tiết sản phẩm):** Nạp dữ liệu sản phẩm từ Remote API theo ID (xử lý an toàn khi ID sai/mất mạng), chống memory leak khi người dùng unmount sớm. Cho phép tùy chọn số lượng và thêm vào giỏ hàng (`addToCart`).
4. **Cart (Giỏ hàng & Derived Totals):** Quản lý giỏ hàng bất biến bằng Context API + useReducer (ADD, UPDATE_QUANTITY, REMOVE, CLEAR). Tổng tiền (`totalAmount`) và tổng số lượng (`totalQuantity`) là **Derived State** (tính toán suy diễn qua `useMemo`), không lưu trong state để tránh lỗi lệch pha dữ liệu. Giảm số lượng về 0 tự động xóa item; hỗ trợ giao diện Empty State khi giỏ rỗng.
5. **Firebase (Lịch sử đơn hàng - Cloud Firestore & Anonymous Auth):** Khi bấm "Tiến hành đặt hàng", ứng dụng xác thực ẩn danh (Anonymous Auth) lấy UID và ghi đơn hàng vào collection `orders` trên Cloud Firestore. Được bảo vệ bởi Security Rules (người dùng chỉ đọc/ghi đơn của chính mình). Nếu mất mạng hoặc lỗi Firebase, tự động kích hoạt **Local Fallback** lưu vào `AsyncStorage` để không gián đoạn trải nghiệm.
6. **Notification Workflow (Thông báo nghiệp vụ):** Gắn với sự kiện đặt hàng thành công (`ORDER_SUCCESS`). Tự động gửi Local Notification kèm âm thanh/rung qua Notification Channel chuẩn Android 13+. Người dùng nhấn vào thông báo sẽ tự động chuyển hướng đến màn hình Đơn hàng. Nếu bị từ chối quyền (Denied), ứng dụng không crash và cung cấp nút mở Cài đặt máy (`Linking.openSettings()`).
7. **Gemini AI Recommendation (Tư vấn mua sắm gắn Catalog thật):** Nhận nhu cầu người dùng và ngữ cảnh 20 sản phẩm thật từ kho DummyJSON. Ép Gemini trả về chuỗi JSON theo schema `{ recommendations: [{ id, reason }] }`. Đi qua **Bộ lọc chống ảo giác (Anti-Hallucination Validator)** đối chiếu ID với catalog thật: ID lạ bị loại bỏ ngay lập tức, dữ liệu hiển thị (ảnh, giá, tên) lấy 100% từ kho thật, chỉ lấy lý do từ AI. Có chế độ Fallback khi mất mạng/hết hạn ngạch.
8. **Chịu lỗi & Hoạt động Ngoại tuyến (Resilience):** Khi ngắt kết nối mạng đồng thời, giỏ hàng, đặt hàng offline, thông báo cục bộ và danh sách yêu thích vẫn hoạt động 100%.

---

## II. HƯỚNG DẪN CÀI ĐẶT & CẤU HÌNH (SETUP & CONFIG)

### 1. Yêu cầu môi trường
- Node.js: `>= 18.x` (Khuyến nghị Node.js v20.x hoặc v22.x LTS)
- npm: `>= 9.x`
- Thiết bị thử nghiệm: Điện thoại Android/iOS đã cài ứng dụng **Expo Go**, hoặc Android Emulator / iOS Simulator.

### 2. Cài đặt mã nguồn
Mở terminal tại thư mục gốc của dự án:
```bash
# 1. Cài đặt các gói phụ thuộc tương thích với Expo SDK 52
npm install

# 2. Kiểm tra tính toàn vẹn của dependencies
npx expo-doctor
```

### 3. Cấu hình biến môi trường (.env)
Dự án quản lý toàn bộ cấu hình qua biến môi trường. Tệp `.env` được bảo vệ nghiêm ngặt trong `.gitignore` để không bao giờ bị lộ secret lên GitHub.

Sao chép tệp mẫu [.env.example](file:///.env.example) thành `.env`:
```bash
cp .env.example .env
```
Nội dung file `.env` cần thiết lập:
```env
# Remote API công khai
EXPO_PUBLIC_API_BASE_URL=https://dummyjson.com

# Cấu hình Firebase Project (Lấy từ Firebase Console > Project Settings > Web App)
EXPO_PUBLIC_FIREBASE_API_KEY=AIzaSy...
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.firebasestorage.app
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=1006775513445
EXPO_PUBLIC_FIREBASE_APP_ID=1:1006775513445:web:2c0baffb75ab26fd92718c

# Cấu hình Google Gemini AI (Lấy miễn phí từ aistudio.google.com)
EXPO_PUBLIC_GEMINI_API_KEY=AIzaSy...
EXPO_PUBLIC_GEMINI_MODEL=gemini-1.5-flash
```

### 4. Khởi chạy ứng dụng ở môi trường phát triển (Dev Mode)
```bash
npx expo start
```
- Nhấn phím `a` để mở trên Android Emulator.
- Quét mã QR hiển thị trên Terminal bằng ứng dụng **Expo Go** trên thiết bị thật.

---

## III. KIẾN TRÚC PHÂN LỚP & DATA FLOW

Dự án tuân thủ nghiêm ngặt nguyên lý **Tách biệt mối quan tâm (Separation of Concerns)** với 10 thư mục chuyên biệt:

```text
src/
├── components/
│   └── common/               # UI dùng chung cho 4 trạng thái chuẩn
│       ├── EmptyView.js      # Giao diện khi dữ liệu rỗng (kèm nút hành động)
│       ├── ErrorView.js      # Giao diện khi gặp lỗi mạng/HTTP (kèm nút Thử lại)
│       └── LoadingView.js    # Giao diện vòng xoay khi đang nạp dữ liệu
├── config/
│   └── env.js                # Đọc tập trung biến môi trường EXPO_PUBLIC_*
├── constants/
│   ├── colors.js             # Bảng màu chủ đạo của toàn ứng dụng
│   └── routes.js             # Enum tên các màn hình (tránh typo string)
├── context/
│   ├── CartContext.js        # Global State giỏ hàng (Context API + useReducer)
│   └── FavoritesContext.js   # Global State yêu thích (Wishlist local)
├── hooks/
│   ├── useCart.js            # Hook tiện ích gói gọn hành động giỏ hàng
│   ├── useDebounce.js        # Hook trì hoãn tìm kiếm (450ms)
│   └── useProducts.js        # Hook quản lý phân trang, pull-to-refresh, race condition
├── navigation/
│   ├── AppNavigator.js       # Root Stack Navigator + NavigationRef click notification
│   └── TabNavigator.js       # 5 Bottom Tabs (Sản phẩm, Giỏ hàng, Đơn hàng, AI, Cài đặt)
├── screens/
│   ├── AIRecommendScreen.js  # Màn hình AI tư vấn + Mock test chống ảo giác
│   ├── CartScreen.js         # Màn hình Giỏ hàng + Tăng/giảm/xóa + Derived Totals
│   ├── OrdersScreen.js       # Màn hình Lịch sử đơn hàng (Firebase + Local Fallback)
│   ├── ProductDetailScreen.js# Màn hình Chi tiết SP (Chống memory leak khi unmount)
│   ├── ProductListScreen.js  # Màn hình Danh sách SP (FlatList + Debounced Search)
│   └── SettingsScreen.js     # Màn hình Cài đặt + Kiểm tra quyền + Test Corrupted JSON
├── services/
│   ├── aiService.js          # Giao tiếp Gemini REST API + Anti-Hallucination Filter
│   ├── firebaseService.js    # Giao tiếp Firestore + Anonymous Auth Persistence
│   ├── notificationService.js# Giao tiếp expo-notifications + Android Channel
│   └── productService.js     # Giao tiếp DummyJSON + Normalize dữ liệu
├── storage/
│   └── asyncStorage.js       # Storage Helper an toàn (Bắt lỗi chuỗi JSON hỏng)
└── utils/
    └── formatters.js         # Format tiền tệ ($) và ngày giờ thân thiện
```

### Luồng dữ liệu (Data Flow):
```text
UI Screens (Chỉ render + nối event)
     │
     ▼
Custom Hooks & Context (useProducts, useCart, useFavorites)
     │
     ▼
Service Layer (productService, firebaseService, aiService, notificationService)
     │
     ▼
Remote API (DummyJSON) / Cloud Firestore / Gemini AI / Device Hardware
```

---

## IV. THIẾT LẬP DỊCH VỤ NGOÀI (FIREBASE, NOTIFICATION, GEMINI)

### 1. Firebase (Firestore & Anonymous Auth)
1. Tạo dự án trên [Firebase Console](https://console.firebase.google.com).
2. Vào **Authentication** > **Sign-in method** > Kích hoạt **Anonymous**.
3. Vào **Firestore Database** > Tạo Database > Tab **Rules**, cấu hình bảo mật:
   ```javascript
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /orders/{orderId} {
         allow create: if request.auth != null && request.resource.data.userId == request.auth.uid;
         allow read: if request.auth != null && resource.data.userId == request.auth.uid;
         allow update, delete: if false;
       }
     }
   }
   ```
4. Copy thông số Web App vào `.env`.

### 2. Thông báo (expo-notifications)
- Cấu hình plugin `"expo-notifications"` và quyền `POST_NOTIFICATIONS` trong `app.json`.
- Kênh thông báo Android (Channel ID: `order_channel`) được tự động khởi tạo khi ứng dụng chạy.

### 3. Google Gemini AI
- Lấy API Key từ [Google AI Studio](https://aistudio.google.com) và điền vào `.env`.
- Model sử dụng mặc định: `gemini-1.5-flash` (nhanh, hạn mức miễn phí cao).

---

## V. HƯỚNG DẪN XUẤT BẢN FILE APK (EAS BUILD PROFILE PREVIEW)

### 1. Cấu hình tệp `eas.json`
Tệp `eas.json` đã được tạo sẵn trong thư mục gốc với cấu hình xuất trực tiếp file cài đặt `.apk`:
```json
{
  "cli": {
    "version": ">= 12.0.0"
  },
  "build": {
    "preview": {
      "distribution": "internal",
      "android": {
        "buildType": "apk"
      }
    }
  }
}
```

### 2. Thiết lập Biến môi trường trên EAS (Không commit secret lên Git)
Khi build trên Cloud của Expo qua EAS, Expo server không thể đọc file `.env` cục bộ trên máy tính của bạn. Bạn cấu hình secrets lên đám mây EAS bằng lệnh:
```bash
# Đăng nhập tài khoản Expo
npx eas-cli@latest login

# Đẩy các biến môi trường lên EAS Secret
npx eas-cli@latest secret:create --scope project --name EXPO_PUBLIC_FIREBASE_API_KEY --value "AIzaSy..." --type string
npx eas-cli@latest secret:create --scope project --name EXPO_PUBLIC_GEMINI_API_KEY --value "AIzaSy..." --type string
```
*(Hoặc thêm trực tiếp trên giao diện web Expo Dashboard > Project > Environment Variables).*

### 3. Lệnh thực hiện Build file APK
Chạy lệnh đóng gói trên terminal:
```bash
npx eas-cli@latest build --profile preview --platform android
```
- EAS Build sẽ tự động biên dịch trên Cloud của Expo.
- Sau khi build hoàn tất (khoảng 5-10 phút), terminal sẽ cung cấp một đường link tải trực tiếp file `.apk` và mã QR để quét tải về điện thoại Android.

### 4. Cài đặt và chạy trên thiết bị thật
1. Tải file `.apk` về điện thoại Android.
2. Mở file để cài đặt. Nếu Android hiển thị cảnh báo bảo mật, chọn **Cài đặt từ nguồn này (Allow from this source / Install unknown apps)**.
3. Mở app và kiểm tra toàn bộ luồng chức năng ngoài môi trường dev.

### 5. Khác biệt cốt lõi giữa Dev (Expo Go) và Release (APK Standalone)
| Tiêu chí | Môi trường Dev (Expo Go) | Môi trường Release (File APK thật) |
| :--- | :--- | :--- |
| **Biến môi trường** | Đọc tự động từ file `.env` trên máy tính | Phải được cấu hình qua EAS Secrets hoặc nhúng vào bundle lúc build |
| **Quyền thông báo Android 13+** | Kế thừa quyền của ứng dụng Expo Go | Hệ điều hành sẽ hiển thị popup xin quyền riêng của ứng dụng |
| **Notification Channel** | Chạy chung channel của Expo Go | Sử dụng đúng icon và channel riêng (`order_channel`) khai báo trong `app.json` |
| **Hiệu năng & Kích thước** | Chạy qua Metro bundler, có overhead dev tools | Mã nguồn được nén bằng Hermes Engine (`.hbc`), chạy cực kỳ mượt mà |

---

## VI. GIỚI HẠN KỸ THUẬT & HƯỚNG PHÁT TRIỂN PRODUCTION (LIMITATIONS)

1. **Bảo mật API Key phía Client:**
   - *Giới hạn hiện tại:* Gemini API Key và Firebase Key nằm tại client. Trong đồ án, rủi ro được giảm thiểu bằng cách đưa vào `.env`, không commit lên Git và giới hạn quyền API trên Google Cloud Console.
   - *Giải pháp Production:* Bắt buộc triển khai một **Backend Proxy Server (Node.js/Go/Firebase Cloud Functions)**. Mobile App gửi yêu cầu kèm JWT token đến Backend, Backend mới gọi Gemini AI và trả kết quả về cho mobile.
2. **Khả năng ngoại tuyến nâng cao (Advanced Offline Sync):**
   - *Giới hạn hiện tại:* Khi offline, đơn hàng được lưu vào AsyncStorage và hiển thị badge `Lưu Offline`. Người dùng có thể xem lại ngay.
   - *Giải pháp Production:* Xây dựng tiến trình nền (Background Sync Worker) tự động phát hiện khi thiết bị có kết nối mạng trở lại để tự động đẩy toàn bộ đơn `isLocalOnly` lên Cloud Firestore mà không cần thao tác thủ công.

---

## VII. BẢNG ĐỐI CHIẾU YÊU CẦU (REQUIREMENTS TRACEABILITY MATRIX - RTM R01–R12)

| Mã YC | Mô tả yêu cầu nghiệp vụ & kỹ thuật | File bằng chứng cụ thể | Đánh giá |
| :---: | :--- | :--- | :---: |
| **R01** | Expo SDK 52, JavaScript, React Navigation kết hợp Native Stack và 5 Bottom Tabs | [TabNavigator.js](file:///src/navigation/TabNavigator.js), [AppNavigator.js](file:///src/navigation/AppNavigator.js) | Đạt 100% |
| **R02** | Phân lớp kiến trúc chuẩn: Screens ➔ Hooks/Context ➔ Services ➔ APIs/Firebase | Cấu trúc 10 thư mục trong `src/` | Đạt 100% |
| **R03** | Gọi Remote API DummyJSON, chuẩn hóa (normalize) dữ liệu, ném lỗi rõ ràng | [productService.js](file:///src/services/productService.js) | Đạt 100% |
| **R04** | FlatList phân trang limit/skip, infinite scroll, pull-to-refresh, guard chống duplicate | [ProductListScreen.js](file:///src/screens/ProductListScreen.js), [useProducts.js](file:///src/hooks/useProducts.js) | Đạt 100% |
| **R05** | Chi tiết sản phẩm lấy theo ID, bắt lỗi khi ID hỏng, chống memory leak unmount | [ProductDetailScreen.js](file:///src/screens/ProductDetailScreen.js) | Đạt 100% |
| **R06** | Giỏ hàng quản lý bằng Context API + useReducer bất biến (ADD, UPDATE, REMOVE, CLEAR) | [CartContext.js](file:///src/context/CartContext.js), [useCart.js](file:///src/hooks/useCart.js) | Đạt 100% |
| **R07** | Tổng tiền và tổng số lượng là Derived State qua `useMemo`, không lưu trong state | [CartContext.js](file:///src/context/CartContext.js#L110-L125) | Đạt 100% |
| **R08** | Lưu trữ cục bộ AsyncStorage có try-catch, chống JSON hỏng, cờ `isHydrated` chống ghi đè | [asyncStorage.js](file:///src/storage/asyncStorage.js), [CartContext.js](file:///src/context/CartContext.js#L75-L105) | Đạt 100% |
| **R09** | Tìm kiếm Debounce 450ms, kết hợp phân trang, triệt tiêu Race Condition bằng request ID | [useDebounce.js](file:///src/hooks/useDebounce.js), [useProducts.js](file:///src/hooks/useProducts.js#L30-L65) | Đạt 100% |
| **R10** | Firebase Firestore lưu `orders` + Anonymous Auth + Security Rules theo UID + Local Fallback | [firebaseService.js](file:///src/services/firebaseService.js), [CartScreen.js](file:///src/screens/CartScreen.js) | Đạt 100% |
| **R11** | expo-notifications: Xin quyền, kênh Android 13+, gửi khi đặt hàng, click điều hướng | [notificationService.js](file:///src/services/notificationService.js), [SettingsScreen.js](file:///src/screens/SettingsScreen.js) | Đạt 100% |
| **R12** | Gemini AI REST API, model qua config, ép JSON schema, bộ lọc Anti-Hallucination | [aiService.js](file:///src/services/aiService.js), [AIRecommendScreen.js](file:///src/screens/AIRecommendScreen.js) | Đạt 100% |

---

## VIII. NHẬT KÝ QUYẾT ĐỊNH THIẾT KẾ (DESIGN DECISION RECORD - DDR)

### 1. State Management (Context API + useReducer)
- **Quyết định:** Sử dụng Context API kết hợp `useReducer` cho Cart State thay vì cài thư viện ngoài (Redux Toolkit / Zustand).
- **Lý do:** Giỏ hàng là trạng thái toàn cục duy nhất cần chia sẻ giữa màn hình Chi tiết, Giỏ hàng và Tab Bar Badge. `useReducer` giúp quản lý các hành động phức tạp theo luồng một chiều (Action ➔ Reducer ➔ New State) một cách minh bạch, giữ dự án gọn nhẹ và đúng chuẩn kiến trúc thuần React.
- **Trade-off:** Có thể gây re-render nhẹ ở Component tiêu thụ khi state thay đổi, nhưng đã được tối ưu bằng `useMemo`.

### 2. Kiến trúc Tách lớp Services
- **Quyết định:** Tách toàn bộ các thao tác mạng thành các file độc lập (`productService`, `firebaseService`, `aiService`, `notificationService`).
- **Lý do:** Screens hoàn toàn không chứa URL hay logic gọi `fetch()`. Khi cần đổi endpoint từ DummyJSON sang API của trường, chỉ cần can thiệp tại 1 file duy nhất.

### 3. Chiến lược Phân trang & Chống Duplicate
- **Quyết định:** Kết hợp `onEndReached` của `FlatList` với cơ chế guard 3 lớp: `isFetchingRef` (chặn gọi trùng), `hasMore` (chặn gọi vô hạn khi hết dữ liệu), và lọc trùng ID bằng `Set`.
- **Lý do:** Ngăn chặn triệt để tình trạng ứng dụng bắn hàng chục request liên tục khi người dùng cuộn giật ở cuối màn hình.

### 4. Quá trình Hydration & Cơ chế Chống ghi thừa
- **Quyết định:** Tạo cờ `isHydrated` trong `CartProvider`. Chỉ cho phép `useEffect` lưu vào AsyncStorage khi `isHydrated === true`.
- **Lý do:** Loại bỏ hoàn toàn lỗi kinh điển: mảng rỗng khởi tạo ban đầu ghi đè xóa sạch dữ liệu cũ của người dùng trước khi AsyncStorage kịp đọc xong.

### 5. Kiến trúc Firebase & Chiến lược Nguồn chân lý (Source of Truth)
- **Quyết định:** Áp dụng mô hình **Cloud-Authoritative with Local Fallback Cache**.
- **Lý do:** Khi online, Cloud Firestore là nguồn chân lý duy nhất. Khi mất mạng hoặc lỗi quyền, ứng dụng tự động fallback lưu máy `isLocalOnly: true`, đảm bảo khách hàng luôn đặt được hàng và không bị crash app.

### 6. Anti-Hallucination Filter trong Gemini AI
- **Quyết định:** Đặt `temperature: 0.2`, giới hạn ngữ cảnh 20 sản phẩm thật, và bắt buộc chạy qua hàm `validateAndEnrich` đối chiếu ID trước khi hiển thị.
- **Lý do:** AI chỉ được phép đóng góp lý do tư vấn (`reason`), toàn bộ ảnh, tên, giá bán hiển thị bắt buộc phải lấy từ Catalog thật của cửa hàng để bảo vệ tính chính xác thương mại.

### 7. Notification Flow & Khả năng tương thích Android 13+
- **Quyết định:** Dùng Local Notification gắn với sự kiện đặt hàng thành công, đăng ký `order_channel` với độ ưu tiên cao nhất (`MAX`).
- **Lý do:** Hoạt động độc lập không cần server backend đẩy push, tương thích hoàn toàn trên cả Expo Go lẫn bản build file APK độc lập.

---

## IX. SƠ ĐỒ TÍCH HỢP HỆ THỐNG (INTEGRATION MAP)

```text
+-----------------------------------------------------------------------------------+
|                                  USER INTERFACE                                   |
|  [ProductListScreen]   [ProductDetailScreen]   [CartScreen]   [Orders]   [AI/Set] |
+---------+-----------------------+--------------------+------------+---------------+
          |                       |                    |            |
          ▼                       ▼                    ▼            ▼
+---------------------+ +--------------------+ +-----------------+ +---------------+
|     useProducts     | |      useCart       | |  useFavorites   | |  navigation   |
| (Pagination/Search) | | (Context+Reducer)  | | (Local Wishlist)| | (Stack + Tabs)|
+---------+-----------+ +---------+----------+ +--------+--------+ +-------+-------+
          |                       |                     |                  |
          ▼                       ▼                     ▼                  |
+---------------------------------------------------------------+          |
|                         SERVICES LAYER                        |          |
|  productService     firebaseService      notificationService  |          |
|  aiService          asyncStorage         formatters           |          |
+---------+-------------------+--------------------+------------+          |
          |                   |                    |                       |
          ▼                   ▼                    ▼                       ▼
   [DummyJSON REST]    [Cloud Firestore]    [Local OS Engine]      [Deep Linking]
   (Catalog API)       (Orders DB + Auth)   (Notification Channel)  (Click Notif)
```

---

## X. MA TRẬN KIỂM THỬ (TEST MATRIX - 15 TEST CASES)

| ID | Chức năng | Kịch bản kiểm thử | Các bước thực hiện | Kết quả mong đợi (Expected Result) | Kết quả thực tế (Actual) | Đánh giá |
| :---: | :--- | :--- | :--- | :--- | :---: | :---: |
| **TC01** | Navigation | Chuyển đổi qua lại 5 Tab | Nhấn lần lượt 5 tab ở thanh dưới | Chuyển tab mượt mà, icon đổi màu active, không bị chớp màn hình | | |
| **TC02** | Navigation | Push và Back chi tiết sản phẩm | Tại tab Sản phẩm, bấm vào 1 sản phẩm ➔ bấm `< Quay lại` | Mở chi tiết ẩn bottom bar; bấm back quay lại đúng vị trí danh sách cũ | | |
| **TC03** | Catalog | Tải danh mục ban đầu | Khởi động app khi có mạng | Hiển thị spinner loading trong 0.5s, sau đó render 10 sản phẩm đầu tiên | | |
| **TC04** | Pagination | Cuộn tải trang vô tận | Cuộn xuống cuối danh sách sản phẩm | Xuất hiện spinner chân trang, nạp tiếp 10 sản phẩm tiếp theo, không lặp item | | |
| **TC05** | Search | Tìm kiếm Debounce | Gõ từ khóa `"mascara"` vào ô tìm kiếm | Không gửi request khi đang gõ; sau 450ms tự động nạp kết quả đúng từ khóa | | |
| **TC06** | Search | Tìm kiếm không có kết quả | Gõ từ khóa ngẫu nhiên `"xyz999"` | Hiển thị `EmptyView` riêng biệt kèm nút "Xóa từ khóa tìm kiếm" | | |
| **TC07** | Cart | Thêm cùng 1 sản phẩm 2 lần | Vào chi tiết sản phẩm A ➔ bấm Thêm vào giỏ 2 lần | Trong giỏ chỉ có 1 dòng duy nhất, số lượng tự tăng lên 2, tổng tiền nhân đôi | | |
| **TC08** | Cart | Giảm số lượng về 0 | Tại giỏ hàng, bấm nút trừ `-` khi số lượng đang là 1 | Sản phẩm tự động bị xóa khỏi giỏ, tổng tiền và badge tab bar giảm tương ứng | | |
| **TC09** | Cart | Xóa toàn bộ giỏ hàng | Bấm nút "Xóa tất cả" trên đỉnh giỏ hàng ➔ Xác nhận | Giỏ chuyển sang `EmptyView` rỗng kèm nút "Khám phá mua sắm ngay" | | |
| **TC10** | Persistence | Khôi phục giỏ hàng sau restart | Thêm hàng vào giỏ ➔ Tắt hẳn ứng dụng ➔ Mở lại | Giỏ hàng và badge số lượng vẫn được khôi phục nguyên vẹn từ AsyncStorage | | |
| **TC11** | Edge Case | Chống crash khi JSON hỏng | Vào Cài đặt ➔ bấm "Ghi JSON hỏng vào giỏ hàng" ➔ Restart | App bắt lỗi an toàn, fallback về giỏ hàng rỗng, tuyệt đối không bị văng | | |
| **TC12** | Firebase | Đặt hàng thành công (Online) | Tại giỏ hàng, bấm "Tiến hành đặt hàng" | Tạo đơn thành công trên Cloud Firestore, dọn giỏ, hiển thị badge xanh Cloud | | |
| **TC13** | Offline | Đặt hàng khi mất kết nối mạng | Bật chế độ máy bay ➔ Bấm "Tiến hành đặt hàng" | Báo lỗi mạng thân thiện, tự động lưu Local Fallback với badge vàng `Lưu Offline` | | |
| **TC14** | Notification | Thông báo khi đặt hàng | Hoàn tất đặt hàng thành công | Banner thông báo nổ ra trên thanh status bar; bấm vào banner tự mở màn hình Đơn | | |
| **TC15** | Gemini AI | Chống ảo giác (Anti-Hallucination) | Vào tab AI ➔ bấm "Test Mock AI ảo giác: Gửi ID #999999" | Bộ lọc phát hiện và loại bỏ ID #999999, chỉ hiển thị sản phẩm thật có trong kho | | |

---

## XI. BIỂU MẪU DEBUG LOG (DÀNH CHO PHỎNG VẤN & BÁO CÁO)

```text
================================================================================
DEBUG LOG ENTRY
================================================================================
1. Mã lỗi / Tên lỗi: [Tên vấn đề gặp phải]
2. Giả thuyết (Hypothesis): [Nguyên nhân bạn dự đoán ban đầu]
3. Cách kiểm tra / Tái hiện: [Các bước và console.log để chứng minh lỗi]
4. Nguyên nhân gốc rễ (Root Cause): [Bản chất kỹ thuật của lỗi]
5. Giải pháp khắc phục (Fix): [Đoạn code đã sửa đổi]
6. Kết quả kiểm thử lại (Retest): [Bằng chứng sau khi sửa lỗi đã hết]
================================================================================
```

---

## XII. NHẬT KÝ SỬ DỤNG AI (AI USAGE LOG TỔNG HỢP)

| Milestone | Nhiệm vụ thực hiện | Mục đích sử dụng AI | Nội dung sinh viên tự kiểm chứng |
| :---: | :--- | :--- | :--- |
| **M1** | Khởi tạo dự án & Navigation | Dựng bộ khung Stack + 5 Tabs và các UI states chuẩn | Chạy `npx expo start`, bấm thử 5 tab và vào màn hình chi tiết |
| **M2** | Tích hợp Remote API DummyJSON | Chuẩn hóa dữ liệu, hook phân trang và guard chống lặp | Cuộn trang vô tận, kiểm tra spinner footer và kéo pull-to-refresh |
| **M3** | Product Detail & Cart Reducer | Xây dựng CartContext bất biến, tính Derived Totals | Thêm trùng item xem số lượng tăng, giảm về 0 xem item bị xóa |
| **M4** | Persistence & Debounced Search | Xây dựng helper AsyncStorage an toàn, debounce 450ms | Tắt hẳn app mở lại xem còn giỏ; thử tìm từ khóa không tồn tại |
| **M5** | Firebase Cloud Firestore & Auth | Kết nối Firestore lưu orders, xử lý Offline Fallback | Đặt hàng khi có mạng (xem Firestore Console) và khi mất mạng |
| **M6** | Notification Workflow | Cấu hình kênh Android, gửi thông báo đặt hàng, click chuyển trang | Bấm đặt hàng xem notification nổ ra, bấm vào banner xem nhảy trang |
| **M7** | Google Gemini AI Recommendation | Xây dựng REST service, ép JSON schema, lọc chống ảo giác | Bấm câu hỏi mẫu, bấm nút mock test ID #999999 kiểm tra bộ lọc |
| **M8** | Debug & Integration Hardening | Rà soát deadlock, memory leak, lập ma trận chịu lỗi | Thử gõ tìm kiếm thật nhanh xem không bị nghẽn, back nhanh chi tiết |
| **M9** | EAS Build Preview & Tài liệu | Cấu hình `eas.json` ra file APK, lập RTM, DDR, Test Matrix | Kiểm tra tệp APK xuất ra và đối chiếu 15 test cases trong ma trận |
