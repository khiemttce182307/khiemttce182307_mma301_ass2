import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Linking,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/colors';
import { notificationService } from '../services/notificationService';
import { setRawStorageData, removeStorageData, STORAGE_KEYS } from '../storage/asyncStorage';

export const SettingsScreen = () => {
  const [permissionInfo, setPermissionInfo] = useState({
    granted: false,
    status: 'undetermined',
    canAskAgain: true,
  });

  // Kiểm tra trạng thái quyền khi màn hình mount
  const checkCurrentPermission = async () => {
    const result = await notificationService.checkPermission();
    setPermissionInfo(result);
  };

  useEffect(() => {
    checkCurrentPermission();
  }, []);

  // Xử lý xin cấp quyền thông báo
  const handleRequestPermission = async () => {
    const result = await notificationService.requestPermission();
    setPermissionInfo((prev) => ({ ...prev, ...result }));

    if (result.granted) {
      Alert.alert('Thành công 🎉', 'Bạn đã cấp quyền thông báo thành công cho ứng dụng!');
    } else {
      Alert.alert(
        'Quyền bị từ chối',
        'Ứng dụng không có quyền gửi thông báo. Bạn có thể mở Cài đặt thiết bị để cấp quyền thủ công.',
        [
          { text: 'Để sau', style: 'cancel' },
          { text: 'Mở Cài đặt', onPress: () => Linking.openSettings() },
        ]
      );
    }
  };

  // Mở cài đặt hệ thống khi quyền bị từ chối
  const handleOpenAppSettings = () => {
    Linking.openSettings();
  };

  // Gửi thử thông báo đặt hàng mẫu (Business Notification Event)
  const handleTestBusinessNotification = async () => {
    const mockOrder = {
      id: 'ORD-TEST-9988',
      totalAmount: 49.98,
      totalQuantity: 2,
    };

    const notifId = await notificationService.sendOrderSuccessNotification(mockOrder);

    if (notifId) {
      Alert.alert('Đã gửi thông báo', 'Thông báo đơn hàng mẫu đã được gửi lên thanh trạng thái hệ thống!');
    } else {
      Alert.alert(
        'Không thể gửi thông báo',
        'Quyền thông báo chưa được cấp hoặc đang bị từ chối. Hãy bấm nút "Xin cấp quyền thông báo" phía trên.'
      );
    }
  };

  // Test Corrupted JSON (M4)
  const handleCorruptCartJson = async () => {
    const corruptString = '{"items": [{"id": 1, "title": "Bị cắt cụt...';
    await setRawStorageData(STORAGE_KEYS.CART, corruptString);
    Alert.alert(
      'Đã ghi JSON hỏng',
      'Đã ghi chuỗi lỗi vào @app_cart. Tắt app và mở lại để kiểm tra cơ chế bắt lỗi an toàn!'
    );
  };

  // Test Clear Storage (M4)
  const handleClearAllStorage = async () => {
    await removeStorageData(STORAGE_KEYS.CART);
    await removeStorageData(STORAGE_KEYS.FAVORITES);
    await removeStorageData(STORAGE_KEYS.ORDERS);
    Alert.alert('Đã dọn sạch bộ nhớ', 'Đã xóa toàn bộ giỏ hàng và lịch sử đơn hàng cục bộ.');
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* KHU VỰC THÔNG BÁO (NOTIFICATION SECTION - M6) */}
      <Text style={styles.sectionTitle}>Cấu hình thông báo (M6 Scope)</Text>

      <View style={styles.card}>
        {/* Hàng hiển thị trạng thái quyền */}
        <View style={styles.row}>
          <View style={styles.rowLeft}>
            <View
              style={[
                styles.iconCircle,
                permissionInfo.granted ? styles.iconCircleSuccess : styles.iconCircleDanger,
              ]}
            >
              <Ionicons
                name={permissionInfo.granted ? 'notifications' : 'notifications-off-outline'}
                size={20}
                color={permissionInfo.granted ? COLORS.success : COLORS.danger}
              />
            </View>
            <View>
              <Text style={styles.rowTitle}>Trạng thái quyền thông báo</Text>
              <Text style={styles.rowSubtitle}>
                Hệ điều hành: <Text style={{ fontWeight: '700' }}>{Platform.OS}</Text>
              </Text>
            </View>
          </View>

          {/* Badge trạng thái */}
          <View
            style={[
              styles.statusBadge,
              permissionInfo.granted ? styles.statusBadgeGranted : styles.statusBadgeDenied,
            ]}
          >
            <Text
              style={[
                styles.statusText,
                permissionInfo.granted ? styles.statusTextGranted : styles.statusTextDenied,
              ]}
            >
              {permissionInfo.granted ? 'ĐÃ CẤP QUYỀN' : 'TỪ CHỐI / CHƯA CẤP'}
            </Text>
          </View>
        </View>

        <View style={styles.divider} />

        {/* Nút xin quyền hoặc mở cài đặt */}
        {!permissionInfo.granted ? (
          <TouchableOpacity style={styles.actionRow} onPress={handleRequestPermission}>
            <Ionicons name="shield-checkmark-outline" size={18} color={COLORS.primary} />
            <Text style={styles.actionText}>Yêu cầu cấp quyền thông báo (Request Permission)</Text>
            <Ionicons name="chevron-forward" size={16} color={COLORS.textSecondary} />
          </TouchableOpacity>
        ) : (
          <View style={styles.actionRow}>
            <Ionicons name="checkmark-circle-outline" size={18} color={COLORS.success} />
            <Text style={[styles.actionText, { color: COLORS.success }]}>
              Quyền thông báo đang hoạt động bình thường
            </Text>
          </View>
        )}

        {/* Nút mở Settings hệ thống khi quyền bị từ chối */}
        {!permissionInfo.granted && (
          <>
            <View style={styles.divider} />
            <TouchableOpacity style={styles.actionRow} onPress={handleOpenAppSettings}>
              <Ionicons name="open-outline" size={18} color="#D97706" />
              <Text style={[styles.actionText, { color: '#D97706' }]}>
                Mở Cài đặt máy để bật thông báo thủ công
              </Text>
              <Ionicons name="chevron-forward" size={16} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </>
        )}

        <View style={styles.divider} />

        {/* Nút gửi thử thông báo Business Event */}
        <TouchableOpacity style={styles.actionRow} onPress={handleTestBusinessNotification}>
          <Ionicons name="paper-plane-outline" size={18} color={COLORS.primary} />
          <Text style={styles.actionText}>Gửi thử thông báo đặt hàng (Test Business Event)</Text>
          <Ionicons name="chevron-forward" size={16} color={COLORS.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* LƯU Ý MÔI TRƯỜNG EXPO GO & ANDROID 13+ */}
      <View style={styles.noteCard}>
        <View style={styles.noteHeader}>
          <Ionicons name="information-circle-outline" size={18} color={COLORS.primary} />
          <Text style={styles.noteTitle}>Lưu ý kỹ thuật Android 13+ & Expo:</Text>
        </View>
        <Text style={styles.noteBody}>
          • <Text style={{ fontWeight: '700' }}>Android 13+ (API 33+):</Text> Quyền thông báo là Runtime Permission (`POST_NOTIFICATIONS`) và bắt buộc phải đăng ký Notification Channel.
        </Text>
        <Text style={styles.noteBody}>
          • <Text style={{ fontWeight: '700' }}>Local vs Push Notification:</Text> Dự án sử dụng Local Notification cho sự kiện đặt hàng, chạy mượt mà trên cả Expo Go lẫn bản build phát hành (APK Standalone).
        </Text>
      </View>

      {/* KIỂM THỬ BỘ NHỚ LOCAL (M4) */}
      <Text style={styles.sectionTitle}>Kiểm thử lưu trữ & Edge Cases (M4 Scope)</Text>
      <View style={styles.card}>
        <TouchableOpacity style={styles.actionRow} onPress={handleCorruptCartJson}>
          <Ionicons name="warning-outline" size={18} color={COLORS.danger} />
          <Text style={[styles.actionText, { color: COLORS.danger }]}>
            Cố tình ghi JSON hỏng vào giỏ hàng (Test Corrupted JSON)
          </Text>
          <Ionicons name="chevron-forward" size={16} color={COLORS.textSecondary} />
        </TouchableOpacity>

        <View style={styles.divider} />

        <TouchableOpacity style={styles.actionRow} onPress={handleClearAllStorage}>
          <Ionicons name="trash-bin-outline" size={18} color={COLORS.textSecondary} />
          <Text style={styles.actionText}>Xóa sạch bộ nhớ Local (Test First Run)</Text>
          <Ionicons name="chevron-forward" size={16} color={COLORS.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* THÔNG TIN SINH VIÊN */}
      <Text style={styles.sectionTitle}>Thông tin MMA301</Text>
      <View style={styles.card}>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Sinh viên thực hiện:</Text>
          <Text style={styles.infoValue}>Trần Thiện Khiêm</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Mã sinh viên:</Text>
          <Text style={styles.infoValue}>CE182307</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Môn học:</Text>
          <Text style={styles.infoValue}>MMA301 - React Native</Text>
        </View>
        <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
          <Text style={styles.infoLabel}>Phiên bản:</Text>
          <Text style={styles.infoValue}>Expo SDK 52 (React 18.3.1)</Text>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconCircleSuccess: {
    backgroundColor: COLORS.successLight,
  },
  iconCircleDanger: {
    backgroundColor: COLORS.dangerLight,
  },
  rowTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  rowSubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusBadgeGranted: {
    backgroundColor: COLORS.successLight,
  },
  statusBadgeDenied: {
    backgroundColor: COLORS.dangerLight,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '800',
  },
  statusTextGranted: {
    color: COLORS.success,
  },
  statusTextDenied: {
    color: COLORS.danger,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 12,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 4,
  },
  actionText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.primary,
  },
  noteCard: {
    backgroundColor: COLORS.primaryLight,
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
  },
  noteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  noteTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primaryDark,
  },
  noteBody: {
    fontSize: 12,
    color: COLORS.primaryDark,
    lineHeight: 18,
    marginBottom: 4,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  infoLabel: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
});
