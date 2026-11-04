import AsyncStorage from '@react-native-async-storage/async-storage';

// 1. Định nghĩa tập trung toàn bộ Storage Keys để tránh rải rác magic string
export const STORAGE_KEYS = {
  CART: '@app_cart',
  FAVORITES: '@app_favorites',
  ORDERS: '@app_orders',
  SETTINGS: '@app_settings',
};

// 2. Helper đọc dữ liệu an toàn tuyệt đối (bảo vệ khỏi chuỗi JSON hỏng, null, undefined)
export const getStorageData = async (key, fallback = null) => {
  try {
    const rawValue = await AsyncStorage.getItem(key);
    if (rawValue === null || rawValue === undefined) {
      return fallback;
    }
    // Cố gắng parse JSON; nếu chuỗi bị lỗi cú pháp sẽ rơi vào catch bên dưới
    const parsed = JSON.parse(rawValue);
    return parsed;
  } catch (error) {
    // Không bao giờ để lỗi JSON hỏng làm crash ứng dụng
    console.warn(`[AsyncStorage Warning] Dữ liệu tại key "${key}" bị hỏng hoặc sai định dạng JSON. Trả về fallback an toàn.`, error.message);
    return fallback;
  }
};

// 3. Helper lưu dữ liệu JSON vào AsyncStorage
export const setStorageData = async (key, value) => {
  try {
    const jsonValue = JSON.stringify(value);
    await AsyncStorage.setItem(key, jsonValue);
    return true;
  } catch (error) {
    console.error(`[AsyncStorage Error] Lỗi khi ghi vào key "${key}":`, error.message);
    return false;
  }
};

// 4. Helper ghi chuỗi raw (phục vụ kiểm thử Negative Test khi cố tình ghi chuỗi hỏng)
export const setRawStorageData = async (key, rawString) => {
  try {
    await AsyncStorage.setItem(key, rawString);
    return true;
  } catch (error) {
    console.error(`[AsyncStorage Error] Không thể ghi raw vào key "${key}":`, error.message);
    return false;
  }
};

// 5. Helper xóa dữ liệu
export const removeStorageData = async (key) => {
  try {
    await AsyncStorage.removeItem(key);
    return true;
  } catch (error) {
    console.error(`[AsyncStorage Error] Lỗi khi xóa key "${key}":`, error.message);
    return false;
  }
};
