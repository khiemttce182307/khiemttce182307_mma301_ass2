import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

// 1. Cấu hình Handler hiển thị thông báo ngay cả khi ứng dụng đang mở ở tiền cảnh (Foreground)
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export const notificationService = {
  // 2. Thiết lập kênh thông báo (Notification Channel) bắt buộc cho Android 8.0+ và Android 13+
  setupChannel: async () => {
    if (Platform.OS === 'android') {
      try {
        await Notifications.setNotificationChannelAsync('order_channel', {
          name: 'Thông báo đơn hàng',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#2563EB',
          sound: 'default',
        });
      } catch (err) {
        console.warn('Lỗi tạo Notification Channel Android:', err.message);
      }
    }
  },

  // 3. Kiểm tra trạng thái cấp quyền hiện tại
  checkPermission: async () => {
    try {
      const settings = await Notifications.getPermissionsAsync();
      return {
        granted: settings.granted || settings.status === 'granted',
        status: settings.status,
        canAskAgain: settings.canAskAgain,
      };
    } catch (err) {
      console.warn('Lỗi kiểm tra permission:', err.message);
      return { granted: false, status: 'undetermined', canAskAgain: true };
    }
  },

  // 4. Xin cấp quyền thông báo từ người dùng
  requestPermission: async () => {
    try {
      // Thiết lập channel trước khi xin quyền trên Android
      await notificationService.setupChannel();

      const settings = await Notifications.requestPermissionsAsync({
        ios: {
          allowAlert: true,
          allowBadge: true,
          allowSound: true,
        },
      });

      return {
        granted: settings.granted || settings.status === 'granted',
        status: settings.status,
      };
    } catch (err) {
      console.warn('Lỗi khi gọi requestPermissionsAsync:', err.message);
      return { granted: false, status: 'denied' };
    }
  },

  // 5. Gửi thông báo cục bộ (Local Notification)
  sendLocalNotification: async ({ title, body, data = {} }) => {
    try {
      // Đảm bảo kênh Android đã sẵn sàng
      await notificationService.setupChannel();

      // Kiểm tra quyền trước khi gửi
      const { granted } = await notificationService.checkPermission();
      if (!granted) {
        console.log('[Notification Notice] Người dùng chưa cấp quyền thông báo, bỏ qua.');
        return null;
      }

      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data,
          sound: 'default',
          channelId: 'order_channel',
        },
        trigger: null, // trigger null = gửi ngay lập tức
      });

      return id;
    } catch (err) {
      // Tuyệt đối không để lỗi notification làm crash app
      console.warn('Không thể gửi Local Notification:', err.message);
      return null;
    }
  },

  // 6. BUSINESS EVENT: Thông báo khi đặt hàng thành công
  sendOrderSuccessNotification: async (order) => {
    if (!order) return null;

    const shortId = order.id ? order.id.slice(0, 8) : 'NEW';
    const total = typeof order.totalAmount === 'number' ? `$${order.totalAmount.toFixed(2)}` : '';
    const qty = order.totalQuantity || order.items?.length || 1;

    return await notificationService.sendLocalNotification({
      title: '🎉 Đặt hàng thành công!',
      body: `Đơn hàng #${shortId} (${qty} món - ${total}) đã được ghi nhận và đang chuẩn bị giao.`,
      data: {
        type: 'ORDER_SUCCESS',
        orderId: order.id,
      },
    });
  },

  // 7. Đăng ký lắng nghe sự kiện khi người dùng click vào thông báo
  addNotificationResponseListener: (onReceive) => {
    return Notifications.addNotificationResponseReceivedListener((response) => {
      try {
        const data = response.notification.request.content.data;
        if (typeof onReceive === 'function') {
          onReceive(data);
        }
      } catch (err) {
        console.warn('Lỗi xử lý click notification:', err.message);
      }
    });
  },
};
