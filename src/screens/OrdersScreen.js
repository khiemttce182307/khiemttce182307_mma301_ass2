import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { firebaseService } from '../services/firebaseService';
import { getStorageData, STORAGE_KEYS } from '../storage/asyncStorage';
import { LoadingView } from '../components/common/LoadingView';
import { ErrorView } from '../components/common/ErrorView';
import { EmptyView } from '../components/common/EmptyView';
import { formatCurrency, formatDate } from '../utils/formatters';
import { COLORS } from '../constants/colors';
import { ROUTES } from '../constants/routes';

export const OrdersScreen = ({ navigation }) => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [dataSource, setDataSource] = useState('cloud'); // 'cloud' | 'local_fallback'

  // Tải danh sách đơn hàng (Ưu tiên Firebase, tự động fallback Local khi offline)
  const loadOrders = useCallback(async ({ isRefresh = false } = {}) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      if (firebaseService.isConfigured()) {
        // 1. Thử lấy từ Cloud Firestore
        const remoteOrders = await firebaseService.getUserOrders();

        // Đọc thêm các đơn hàng lưu tạm offline nếu có
        const localOrders = await getStorageData(STORAGE_KEYS.ORDERS, []);
        const offlineOnly = localOrders.filter((o) => o.isLocalOnly);

        // Gộp đơn remote và đơn local offline
        const combined = [...offlineOnly, ...remoteOrders];
        setOrders(combined);
        setDataSource('cloud');
      } else {
        // 2. Fallback sang AsyncStorage Local
        const localOrders = await getStorageData(STORAGE_KEYS.ORDERS, []);
        setOrders(localOrders);
        setDataSource('local_fallback');
      }
    } catch (err) {
      console.warn('[Orders Fallback] Lỗi đọc Firebase, chuyển sang Local cache:', err.message);

      // Khi Firebase gặp lỗi (Rules từ chối, rớt mạng), nạp dữ liệu từ Local cache
      const cached = await getStorageData(STORAGE_KEYS.ORDERS, []);
      if (cached && cached.length > 0) {
        setOrders(cached);
        setDataSource('local_fallback');
      } else {
        setError(err.message || 'Không thể tải lịch sử đơn hàng.');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  // Loading lần đầu
  if (loading && orders.length === 0) {
    return <LoadingView message="Đang nạp lịch sử đơn hàng..." />;
  }

  // Màn hình lỗi khi không có dữ liệu
  if (error && orders.length === 0) {
    return <ErrorView message={error} onRetry={() => loadOrders()} />;
  }

  // Render 1 thẻ đơn hàng
  const renderOrderItem = ({ item }) => {
    const isCloud = !item.isLocalOnly && !item.id?.startsWith('LOCAL-');

    return (
      <View style={styles.orderCard}>
        {/* Header đơn: ID + Nguồn lưu trữ (Cloud / Local) */}
        <View style={styles.orderHeader}>
          <View>
            <Text style={styles.orderId}>#{item.id?.slice(0, 16)}</Text>
            <Text style={styles.orderDate}>
              {formatDate(item.createdAt) || 'Vừa xong'}
            </Text>
          </View>

          <View
            style={[
              styles.badge,
              isCloud ? styles.badgeCloud : styles.badgeOffline,
            ]}
          >
            <Ionicons
              name={isCloud ? 'cloud-done-outline' : 'save-outline'}
              size={12}
              color={isCloud ? COLORS.success : '#D97706'}
            />
            <Text
              style={[
                styles.badgeText,
                { color: isCloud ? COLORS.success : '#D97706' },
              ]}
            >
              {isCloud ? 'Cloud Firestore' : 'Lưu Offline'}
            </Text>
          </View>
        </View>

        <View style={styles.divider} />

        {/* Danh sách các sản phẩm trong đơn */}
        <View style={styles.itemsList}>
          {Array.isArray(item.items) &&
            item.items.map((prod, idx) => (
              <View key={idx} style={styles.productRow}>
                <Text style={styles.productQty}>{prod.quantity}x</Text>
                <Text style={styles.productTitle} numberOfLines={1}>
                  {prod.title}
                </Text>
                <Text style={styles.productPrice}>
                  {formatCurrency(prod.price * prod.quantity)}
                </Text>
              </View>
            ))}
        </View>

        <View style={styles.divider} />

        {/* Footer đơn: Tổng số lượng & Tổng thanh toán */}
        <View style={styles.orderFooter}>
          <Text style={styles.footerSummary}>
            Tổng {item.totalQuantity || item.items?.length || 0} sản phẩm
          </Text>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Tổng tiền: </Text>
            <Text style={styles.totalValue}>{formatCurrency(item.totalAmount)}</Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Banner thông báo trạng thái nguồn dữ liệu */}
      <View style={styles.sourceBanner}>
        <Ionicons
          name={dataSource === 'cloud' ? 'cloud-done' : 'information-circle'}
          size={16}
          color={dataSource === 'cloud' ? COLORS.primary : '#D97706'}
        />
        <Text style={styles.sourceBannerText}>
          {dataSource === 'cloud'
            ? 'Đang đồng bộ trực tiếp với Firebase Firestore'
            : 'Đang hiển thị bản sao ngoại tuyến (Offline Local Storage)'}
        </Text>
      </View>

      <FlatList
        data={orders}
        keyExtractor={(item, index) => item.id?.toString() || index.toString()}
        renderItem={renderOrderItem}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          !loading && (
            <EmptyView
              icon="receipt-outline"
              title="Chưa có đơn hàng nào"
              message="Bạn chưa thực hiện đơn đặt hàng nào trong tài khoản."
              actionLabel="Mua sắm ngay"
              onAction={() => navigation.navigate(ROUTES.PRODUCT_LIST)}
            />
          )
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadOrders({ isRefresh: true })}
            colors={[COLORS.primary]}
            tintColor={COLORS.primary}
          />
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  sourceBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: 8,
  },
  sourceBannerText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  listContent: {
    padding: 14,
    paddingBottom: 24,
  },
  orderCard: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orderId: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  orderDate: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  badgeCloud: {
    backgroundColor: COLORS.successLight,
  },
  badgeOffline: {
    backgroundColor: '#FEF3C7',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 10,
  },
  itemsList: {
    gap: 6,
  },
  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  productQty: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
    width: 24,
  },
  productTitle: {
    flex: 1,
    fontSize: 13,
    color: COLORS.textPrimary,
    marginRight: 8,
  },
  productPrice: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerSummary: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  totalRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  totalValue: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.primaryDark,
  },
});
