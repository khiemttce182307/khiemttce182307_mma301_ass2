import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useProducts } from '../hooks/useProducts';
import { useDebounce } from '../hooks/useDebounce';
import { useFavorites } from '../context/FavoritesContext';
import { LoadingView } from '../components/common/LoadingView';
import { ErrorView } from '../components/common/ErrorView';
import { EmptyView } from '../components/common/EmptyView';
import { formatCurrency } from '../utils/formatters';
import { COLORS } from '../constants/colors';
import { ROUTES } from '../constants/routes';

export const ProductListScreen = ({ navigation }) => {
  const [searchTerm, setSearchTerm] = useState('');
  // Áp dụng Debounce 450ms cho ô tìm kiếm
  const debouncedQuery = useDebounce(searchTerm, 450);

  const {
    products,
    total,
    loading,
    loadingMore,
    refreshing,
    error,
    hasMore,
    loadMore,
    refresh,
    retry,
  } = useProducts(debouncedQuery);

  const { isFavorite, toggleFavorite } = useFavorites();

  const handlePressProduct = (item) => {
    navigation.navigate(ROUTES.PRODUCT_DETAIL, {
      productId: item.id,
      title: item.title,
    });
  };

  // Render 1 thẻ sản phẩm
  const renderProductItem = ({ item }) => {
    const favorite = isFavorite(item.id);

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.7}
        onPress={() => handlePressProduct(item)}
      >
        {item.thumbnail ? (
          <Image
            source={{ uri: item.thumbnail }}
            style={styles.thumbnail}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.thumbnailPlaceholder}>
            <Ionicons name="image-outline" size={32} color={COLORS.textSecondary} />
          </View>
        )}

        <View style={styles.cardInfo}>
          <View style={styles.badgeRow}>
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryText}>{item.category.toUpperCase()}</Text>
            </View>
            <View style={styles.ratingBox}>
              <Ionicons name="star" size={12} color={COLORS.secondary} />
              <Text style={styles.ratingText}>{item.rating.toFixed(1)}</Text>
            </View>
          </View>

          <Text style={styles.title} numberOfLines={2}>
            {item.title}
          </Text>

          <View style={styles.priceRow}>
            <Text style={styles.price}>{formatCurrency(item.price)}</Text>
            {item.stock <= 5 && item.stock > 0 && (
              <Text style={styles.lowStockText}>Chỉ còn {item.stock}!</Text>
            )}
          </View>
        </View>

        {/* Nút yêu thích (Wishlist local) */}
        <TouchableOpacity
          style={styles.favoriteBtn}
          onPress={() => toggleFavorite(item)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons
            name={favorite ? 'heart' : 'heart-outline'}
            size={22}
            color={favorite ? COLORS.danger : COLORS.textSecondary}
          />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  // Render Footer danh sách
  const renderFooter = () => {
    if (loadingMore) {
      return (
        <View style={styles.footerLoader}>
          <ActivityIndicator size="small" color={COLORS.primary} />
          <Text style={styles.footerText}>Đang tải thêm sản phẩm...</Text>
        </View>
      );
    }

    if (!hasMore && products.length > 0) {
      return (
        <View style={styles.footerEnd}>
          <Ionicons name="checkmark-circle-outline" size={16} color={COLORS.textSecondary} />
          <Text style={styles.footerEndText}>
            Đã hiển thị toàn bộ {total || products.length} sản phẩm
          </Text>
        </View>
      );
    }

    return null;
  };

  return (
    <View style={styles.container}>
      {/* Thanh tìm kiếm có Debounce */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color={COLORS.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Tìm kiếm sản phẩm theo tên..."
            placeholderTextColor={COLORS.textSecondary}
            value={searchTerm}
            onChangeText={setSearchTerm}
            autoCorrect={false}
            returnKeyType="search"
          />
          {searchTerm.length > 0 && (
            <TouchableOpacity onPress={() => setSearchTerm('')} style={styles.clearBtn}>
              <Ionicons name="close-circle" size={18} color={COLORS.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Trạng thái Lỗi toàn trang khi chưa có dữ liệu */}
      {error && products.length === 0 ? (
        <ErrorView message={error} onRetry={retry} />
      ) : loading && products.length === 0 ? (
        <LoadingView message={searchTerm ? 'Đang tìm kiếm sản phẩm...' : 'Đang tải danh mục...'} />
      ) : (
        <>
          {/* Banner lỗi nhẹ khi cuộn thêm bị rớt mạng */}
          {error && products.length > 0 && (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle" size={16} color={COLORS.danger} />
              <Text style={styles.errorBannerText}>{error}</Text>
              <TouchableOpacity onPress={retry} style={styles.errorRetryBtn}>
                <Text style={styles.errorRetryText}>Thử lại</Text>
              </TouchableOpacity>
            </View>
          )}

          <FlatList
            data={products}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderProductItem}
            contentContainerStyle={styles.listContent}
            onEndReached={loadMore}
            onEndReachedThreshold={0.3}
            ListFooterComponent={renderFooter}
            // EDGE CASE: Phân biệt rõ giữa "Giỏ/Danh mục trống" và "Không tìm thấy theo từ khóa"
            ListEmptyComponent={
              !loading && (
                <EmptyView
                  icon="search-outline"
                  title={searchTerm ? 'Không tìm thấy kết quả' : 'Danh mục sản phẩm trống'}
                  message={
                    searchTerm
                      ? `Không có sản phẩm nào khớp với từ khóa "${searchTerm}". Vui lòng thử từ khóa khác.`
                      : 'Hiện tại chưa có sản phẩm nào được hiển thị.'
                  }
                  actionLabel={searchTerm ? 'Xóa từ khóa tìm kiếm' : 'Tải lại'}
                  onAction={searchTerm ? () => setSearchTerm('') : refresh}
                />
              )
            }
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={refresh}
                colors={[COLORS.primary]}
                tintColor={COLORS.primary}
              />
            }
          />
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  searchContainer: {
    backgroundColor: COLORS.card,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    height: 42,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: COLORS.textPrimary,
    marginLeft: 8,
  },
  clearBtn: {
    padding: 4,
  },
  listContent: {
    padding: 14,
    paddingBottom: 24,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  thumbnail: {
    width: 70,
    height: 70,
    borderRadius: 8,
    backgroundColor: COLORS.background,
  },
  thumbnailPlaceholder: {
    width: 70,
    height: 70,
    borderRadius: 8,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardInfo: {
    flex: 1,
    marginLeft: 12,
    marginRight: 6,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  categoryBadge: {
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  categoryText: {
    fontSize: 9,
    fontWeight: '700',
    color: COLORS.primary,
  },
  ratingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  ratingText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
    lineHeight: 18,
    marginBottom: 4,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  price: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.primaryDark,
  },
  lowStockText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.danger,
  },
  favoriteBtn: {
    padding: 8,
  },
  footerLoader: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  footerText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  footerEnd: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    gap: 6,
  },
  footerEndText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.dangerLight,
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 8,
  },
  errorBannerText: {
    flex: 1,
    fontSize: 12,
    color: COLORS.danger,
    fontWeight: '500',
  },
  errorRetryBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: COLORS.danger,
    borderRadius: 4,
  },
  errorRetryText: {
    color: COLORS.white,
    fontSize: 11,
    fontWeight: '700',
  },
});
