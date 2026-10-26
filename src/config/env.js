// Đọc cấu hình từ biến môi trường với giá trị fallback an toàn
export const ENV_CONFIG = {
  apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL || 'https://dummyjson.com',
  firebase: {
    apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || '',
    authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
    projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || '',
    storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || '',
    messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
    appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || '',
  },
  geminiApiKey: process.env.EXPO_PUBLIC_GEMINI_API_KEY || '',
  geminiModel: process.env.EXPO_PUBLIC_GEMINI_MODEL || 'gemini-1.5-flash',
};
