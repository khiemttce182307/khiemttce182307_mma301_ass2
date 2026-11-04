import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { productService } from '../services/productService';
import { useCart } from '../hooks/useCart';
import { LoadingView } from '../components/common/LoadingView';
import { ErrorView } from '../components/common/ErrorView';
import { formatCurrency } from '../utils/formatters';
import { COLORS } from '../constants/colors';
import { ROUTES } from '../constants/routes';

export const ProductDetailScreen = ({ route, navigation }) => {
  const { productId, title: initialTitle } = route.params || {};

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedQty, setSelectedQty] = useState(1);

  const { addToCart } = useCart();

  // Tải thông tin chi tiết sản phẩm từ Remote API với cờ isMounted chống Memory Leak
  const fetchProductDetail = useCallback(async (isMountedCheck) => {
    if (!productId) {
      if (isMountedCheck()) {
        setError('Mã sản phẩm không tồn tại.');
        setLoading(false);
      }
      return;
    }

    if (isMountedCheck()) {
      setLoading(true);
      setError(null);
    }

    try {
      const data = await productService.fetchProductById(productId);
      if (isMountedCheck()) {
        if (!data) {
          setError('Không tìm thấy thông tin sản phẩm.');
        } else {
          setProduct(data);
        }
      }
    } catch (err) {
      if (isMountedCheck()) {
        setError(err.message || 'Không thể tải chi tiết sản phẩm.');
      }
    } finally {
      if (isMountedCheck()) {
        setLoading(false);
      }
    }
  }, [productId]);

  useEffect(() => {
    let isMounted = true;
    fetchProductDetail(() => isMounted);

    return () => {
      // Dọn dẹp: Hủy quyền cập nhật state khi người dùng bấm Back
      isMounted = false;
    };
  }, [fetchProductDetail]);

  // Xử lý thêm vào giỏ hàng
  const handleAddToCart = () => {
    if (!product) return;

    addToCart(product, selectedQty);

    Alert.alert(
      'Thành công',
      `Đã thêm ${selectedQty} sản phẩm "${product.title}" vào giỏ hàng.`,
      [
        { text: 'Tiếp tục xem', style: 'cancel' },
        {
          text: 'Xem giỏ hàng',
          onPress: () => navigation.navigate(ROUTES.MAIN_TABS, { screen: ROUTES.CART }),
        },
      ]
    );
  };

  // Trạng thái Loading
  if (loading) {
    return <LoadingView message="Đang tải chi tiết sản phẩm..." />;
  }

  // Trạng thái Lỗi (ID không tồn tại hoặc lỗi mạng)
  if (error || !product) {
    return (
      <ErrorView
        message={error || 'Sản phẩm không tồn tại.'}
        onRetry={productId ? () => fetchProductDetail(() => true) : () => navigation.goBack()}
      />
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Ảnh sản phẩm lớn */}
        <View style={styles.imageContainer}>
          {product.thumbnail ? (
            <Image
              source={{ uri: product.thumbnail }}
              style={styles.image}
              resizeMode="contain"
            />
          ) : (
            <View style={styles.imagePlaceholder}>
              <Ionicons name="image-outline" size={64} color={COLORS.textSecondary} />
            </View>
          )}
        </View>

        {/* Hộp thông tin chi tiết */}
        <View style={styles.infoCard}>
          <View style={styles.tagRow}>
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryBadgeText}>{product.category.toUpperCase()}</Text>
            </View>
            <View style={styles.ratingBadge}>
              <Ionicons name="star" size={14} color={COLORS.secondary} />
              <Text style={styles.ratingText}>{product.rating.toFixed(1)} / 5.0</Text>
            </View>
          </View>

          <Text style={styles.title}>{product.title}</Text>
          <Text style={styles.brand}>Thương hiệu: {product.brand}</Text>

          <View style={styles.priceContainer}>
            <Text style={styles.price}>{formatCurrency(product.price)}</Text>
            {product.discountPercentage > 0 && (
              <View style={styles.discountBadge}>
                <Text style={styles.discountText}>Giảm {product.discountPercentage}%</Text>
              </View>
            )}
          </View>

          <View style={styles.stockRow}>
            <Ionicons
              name={product.stock > 0 ? 'checkmark-circle' : 'close-circle'}
              size={16}
              color={product.stock > 0 ? COLORS.success : COLORS.danger}
            />
            <Text
              style={[
                styles.stockText,
                { color: product.stock > 0 ? COLORS.success : COLORS.danger },
              ]}
            >
              {product.stock > 0 ? `Còn hàng (${product.stock} sản phẩm)` : 'Hết hàng'}
            </Text>
          </View>

          <View style={styles.divider} />

          <Text style={styles.sectionHeading}>Mô tả sản phẩm</Text>
          <Text style={styles.description}>{product.description}</Text>
        </View>
      </ScrollView>

      {/* Thanh công cụ chân trang: Tùy chọn số lượng + Nút Thêm vào giỏ */}
      <View style={styles.bottomBar}>
        <View style={styles.quantityPicker}>
          <TouchableOpacity
            style={styles.qtyBtn}
            onPress={() => setSelectedQty(Math.max(1, selectedQty - 1))}
            disabled={selectedQty <= 1}
          >
            <Ionicons
              name="remove"
              size={18}
              color={selectedQty <= 1 ? COLORS.border : COLORS.textPrimary}
            />
          </TouchableOpacity>
          <Text style={styles.qtyValue}>{selectedQty}</Text>
          <TouchableOpacity
            style={styles.qtyBtn}
            onPress={() => setSelectedQty(selectedQty + 1)}
          >
            <Ionicons name="add" size={18} color={COLORS.textPrimary} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.addToCartBtn, product.stock <= 0 && styles.disabledBtn]}
          onPress={handleAddToCart}
          disabled={product.stock <= 0}
          activeOpacity={0.8}
        >
          <Ionicons name="cart" size={20} color={COLORS.white} />
          <Text style={styles.addToCartText}>Thêm vào giỏ hàng</Text>
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
  content: {
    padding: 16,
    paddingBottom: 90,
  },
  imageContainer: {
    width: '100%',
    height: 280,
    backgroundColor: COLORS.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoCard: {
    backgroundColor: COLORS.card,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  tagRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryBadge: {
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  categoryBadgeText: {
    color: COLORS.primary,
    fontSize: 11,
    fontWeight: '700',
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#D97706',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textPrimary,
    lineHeight: 26,
    marginBottom: 4,
  },
  brand: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 12,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  price: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.primaryDark,
  },
  discountBadge: {
    backgroundColor: COLORS.dangerLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  discountText: {
    color: COLORS.danger,
    fontSize: 12,
    fontWeight: '700',
  },
  stockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  stockText: {
    fontSize: 13,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 12,
  },
  sectionHeading: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 6,
  },
  description: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 22,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    backgroundColor: COLORS.card,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    alignItems: 'center',
    gap: 12,
  },
  quantityPicker: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    backgroundColor: COLORS.background,
  },
  qtyBtn: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  qtyValue: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textPrimary,
    minWidth: 24,
    textAlign: 'center',
  },
  addToCartBtn: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: 10,
    gap: 8,
  },
  disabledBtn: {
    backgroundColor: COLORS.textSecondary,
  },
  addToCartText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: '700',
  },
});
