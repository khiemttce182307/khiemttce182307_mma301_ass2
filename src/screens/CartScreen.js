import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useCart } from '../hooks/useCart';
import { firebaseService } from '../services/firebaseService';
import { notificationService } from '../services/notificationService';
import { getStorageData, setStorageData, STORAGE_KEYS } from '../storage/asyncStorage';
import { EmptyView } from '../components/common/EmptyView';
import { formatCurrency } from '../utils/formatters';
import { COLORS } from '../constants/colors';
import { ROUTES } from '../constants/routes';

export const CartScreen = ({ navigation }) => {
  const {
    items,
    totalQuantity,
    totalAmount,
    updateQuantity,
    removeFromCart,
    clearCart,
  } = useCart();

  const [checkingOut, setCheckingOut] = useState(false);

  // Xác nhận trước khi xóa toàn bộ giỏ hàng
  const handleConfirmClearCart = () => {
    Alert.alert(
      'Xóa giỏ hàng',
      'Bạn có chắc chắn muốn xóa toàn bộ sản phẩm trong giỏ hàng không?',
      [
        { text: 'Hủy', style: 'cancel' },
        { text: 'Xóa hết', style: 'destructive', onPress: clearCart },
      ]
    );
  };

  // TIẾN HÀNH ĐẶT HÀNG (BUSINESS WORKFLOW M5: FIREBASE VỚI LOCAL FALLBACK)
  const handleCheckout = async () => {
    if (items.length === 0) return;

    setCheckingOut(true);

    try {
      // 1. Cố gắng ghi đơn hàng lên Firebase Firestore
      const createdOrder = await firebaseService.createOrder({
        items,
        totalAmount,
        totalQuantity,
      });

      // Ghi bản sao vào local cache để dự phòng
      const existingLocal = await getStorageData(STORAGE_KEYS.ORDERS, []);
      await setStorageData(STORAGE_KEYS.ORDERS, [createdOrder, ...existingLocal]);

      // KÍCH HOẠT BUSINESS NOTIFICATION: Đặt hàng thành công
      await notificationService.sendOrderSuccessNotification(createdOrder);

      clearCart();

      Alert.alert(
        'Đặt hàng thành công 🎉',
        `Đơn hàng #${createdOrder.id.slice(0, 8)} đã được đồng bộ lên Cloud Firestore.`,
        [
          {
            text: 'Xem đơn hàng',
            onPress: () => navigation.navigate(ROUTES.ORDERS),
          },
        ]
      );
    } catch (error) {
      // 2. FALLBACK AN TOÀN KHI MẤT MẠNG HOẶC FIREBASE LỖI
      console.warn('[Checkout Fallback] Firebase ghi lỗi, chuyển sang lưu Local:', error.message);

      const localOrder = {
        id: `LOCAL-${Date.now()}`,
        items: [...items],
        totalAmount,
        totalQuantity,
        status: 'Đã hoàn thành (Lưu Offline)',
        createdAt: new Date().toISOString(),
        isLocalOnly: true,
      };

      const existingLocal = await getStorageData(STORAGE_KEYS.ORDERS, []);
      await setStorageData(STORAGE_KEYS.ORDERS, [localOrder, ...existingLocal]);

      // KÍCH HOẠT BUSINESS NOTIFICATION (cho cả đơn lưu offline)
      await notificationService.sendOrderSuccessNotification(localOrder);

      clearCart();

      Alert.alert(
        'Đặt hàng thành công (Chế độ Ngoại tuyến)',
        `${error.message}\n\nĐơn hàng đã được bảo vệ lưu cục bộ (Local Fallback). Bạn vẫn có thể xem lại tại mục Đơn hàng.`,
        [
          {
            text: 'Xem đơn hàng',
            onPress: () => navigation.navigate(ROUTES.ORDERS),
          },
        ]
      );
    } finally {
      setCheckingOut(false);
    }
  };

  // 1. Trạng thái Giỏ hàng rỗng (Empty State)
  if (items.length === 0) {
    return (
      <EmptyView
        icon="cart-outline"
        title="Giỏ hàng của bạn đang trống"
        message="Hãy khám phá danh mục và thêm các sản phẩm yêu thích vào giỏ hàng nhé."
        actionLabel="Khám phá mua sắm ngay"
        onAction={() => navigation.navigate(ROUTES.PRODUCT_LIST)}
      />
    );
  }

  // Render 1 phần tử trong giỏ hàng
  const renderCartItem = ({ item }) => {
    const itemSubtotal = item.price * item.quantity;

    return (
      <View style={styles.itemCard}>
        {item.thumbnail ? (
          <Image
            source={{ uri: item.thumbnail }}
            style={styles.itemThumbnail}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.thumbnailPlaceholder}>
            <Ionicons name="image-outline" size={24} color={COLORS.textSecondary} />
          </View>
        )}

        <View style={styles.itemDetails}>
          <Text style={styles.itemTitle} numberOfLines={2}>
            {item.title}
          </Text>
          <Text style={styles.itemUnitPrice}>
            Đơn giá: {formatCurrency(item.price)}
          </Text>

          <View style={styles.quantityControl}>
            <TouchableOpacity
              style={styles.qtyActionBtn}
              onPress={() => updateQuantity(item.id, item.quantity - 1)}
              activeOpacity={0.7}
            >
              <Ionicons
                name={item.quantity === 1 ? 'trash-outline' : 'remove'}
                size={16}
                color={item.quantity === 1 ? COLORS.danger : COLORS.textPrimary}
              />
            </TouchableOpacity>

            <Text style={styles.qtyDisplay}>{item.quantity}</Text>

            <TouchableOpacity
              style={styles.qtyActionBtn}
              onPress={() => updateQuantity(item.id, item.quantity + 1)}
              activeOpacity={0.7}
            >
              <Ionicons name="add" size={16} color={COLORS.textPrimary} />
            </TouchableOpacity>

            <Text style={styles.subtotalText}>= {formatCurrency(itemSubtotal)}</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.deleteBtn}
          onPress={() => removeFromCart(item.id)}
          activeOpacity={0.7}
        >
          <Ionicons name="trash-outline" size={20} color={COLORS.danger} />
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <Text style={styles.itemCountText}>
          Giỏ hàng ({totalQuantity} món)
        </Text>
        <TouchableOpacity onPress={handleConfirmClearCart}>
          <Text style={styles.clearText}>Xóa tất cả</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={items}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderCartItem}
        contentContainerStyle={styles.listContent}
      />

      <View style={styles.checkoutFooter}>
        <View style={styles.summaryContainer}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Tổng số lượng món:</Text>
            <Text style={styles.summaryValue}>{totalQuantity} sản phẩm</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.totalLabel}>Tổng thanh toán:</Text>
            <Text style={styles.totalAmount}>{formatCurrency(totalAmount)}</Text>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.checkoutBtn, checkingOut && styles.disabledBtn]}
          onPress={handleCheckout}
          disabled={checkingOut}
          activeOpacity={0.8}
        >
          {checkingOut ? (
            <ActivityIndicator size="small" color={COLORS.white} />
          ) : (
            <Text style={styles.checkoutBtnText}>
              Tiến hành đặt hàng ({formatCurrency(totalAmount)})
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.card,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  itemCountText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  clearText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.danger,
  },
  listContent: {
    padding: 14,
    paddingBottom: 16,
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  itemThumbnail: {
    width: 64,
    height: 64,
    borderRadius: 8,
    backgroundColor: COLORS.background,
  },
  thumbnailPlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 8,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemDetails: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },
  itemTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textPrimary,
    lineHeight: 18,
    marginBottom: 2,
  },
  itemUnitPrice: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 6,
  },
  quantityControl: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  qtyActionBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  qtyDisplay: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
    minWidth: 20,
    textAlign: 'center',
  },
  subtotalText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primaryDark,
    marginLeft: 4,
  },
  deleteBtn: {
    padding: 6,
  },
  checkoutFooter: {
    backgroundColor: COLORS.card,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 20,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  summaryContainer: {
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  summaryLabel: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  summaryValue: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  totalAmount: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.primaryDark,
  },
  checkoutBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  disabledBtn: {
    backgroundColor: COLORS.textSecondary,
  },
  checkoutBtnText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: '700',
  },
});
