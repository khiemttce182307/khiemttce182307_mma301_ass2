import { useState, useEffect, useCallback, useRef } from 'react';
import { productService } from '../services/productService';

const PAGE_LIMIT = 10;

// Custom hook quản lý tải danh mục sản phẩm kết hợp Search & Pagination
export const useProducts = (searchQuery = '') => {
  const [products, setProducts] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);         // Tải trang đầu tiên / tìm kiếm mới
  const [loadingMore, setLoadingMore] = useState(false); // Phân trang cuộn xuống
  const [refreshing, setRefreshing] = useState(false);   // Kéo xuống làm mới (pull-to-refresh)
  const [error, setError] = useState(null);
  const [hasMore, setHasMore] = useState(true);

  // Ref khóa guard chống duplicate request mạng đang chạy
  const isFetchingRef = useRef(false);

  // Ref theo dõi ID của request mới nhất để TRIỆT TIÊU RACE CONDITION giữa search cũ và mới
  const latestRequestIdRef = useRef(0);

  // Hàm tải dữ liệu cốt lõi
  const loadData = useCallback(
    async ({ isRefresh = false, isLoadMore = false, query = searchQuery } = {}) => {
      // GUARD 1: Chống gọi trùng lặp nếu đang có 1 request đang chạy
      if (isFetchingRef.current) return;

      // GUARD 2: Không tải thêm nếu danh sách đã hết
      if (isLoadMore && !hasMore) return;

      isFetchingRef.current = true;

      // Đánh dấu mã phiên request hiện tại
      const thisRequestId = ++latestRequestIdRef.current;

      if (isRefresh) {
        setRefreshing(true);
        setError(null);
      } else if (isLoadMore) {
        setLoadingMore(true);
      } else {
        setLoading(true);
        setError(null);
      }

      try {
        // Tính toán skip: nếu loadMore thì lấy số lượng hiện tại; nếu tải mới/refresh thì skip = 0
        const currentSkip = isLoadMore ? products.length : 0;

        const result = await productService.fetchProducts({
          limit: PAGE_LIMIT,
          skip: currentSkip,
          query: query,
        });

        // XỬ LÝ RACE CONDITION: Nếu trong thời gian chờ mạng, người dùng đã gõ từ khóa mới
        // (làm thisRequestId không còn là request mới nhất nữa) thì BỎ QUA kết quả cũ này ngay!
        if (thisRequestId !== latestRequestIdRef.current) {
          return;
        }

        const newItems = result.products;
        const totalItems = result.total;

        setTotal(totalItems);

        if (isLoadMore) {
          // GUARD 3: Khử trùng ID bằng Set khi ghép mảng
          setProducts((prev) => {
            const existingIds = new Set(prev.map((item) => item.id));
            const uniqueNewItems = newItems.filter((item) => !existingIds.has(item.id));
            const updated = [...prev, ...uniqueNewItems];

            const reachedEnd = updated.length >= totalItems || newItems.length < PAGE_LIMIT;
            setHasMore(!reachedEnd);

            return updated;
          });
        } else {
          // Tải trang đầu hoặc Tìm kiếm mới
          setProducts(newItems);
          const reachedEnd = newItems.length >= totalItems || newItems.length < PAGE_LIMIT;
          setHasMore(!reachedEnd);
        }
      } catch (err) {
        // Chỉ cập nhật lỗi nếu vẫn là request mới nhất
        if (thisRequestId === latestRequestIdRef.current) {
          setError(err.message || 'Đã có lỗi xảy ra khi tải sản phẩm.');
        }
      } finally {
        // FIX CRITICAL BUG: isFetchingRef.current BẮT BUỘC luôn phải reset về false để tránh Deadlock
        isFetchingRef.current = false;

        // Chỉ tắt các cờ loading UI nếu request này vẫn là request mới nhất
        if (thisRequestId === latestRequestIdRef.current) {
          setLoading(false);
          setLoadingMore(false);
          setRefreshing(false);
        }
      }
    },
    [products.length, hasMore, searchQuery]
  );

  // KHI TỪ KHÓA TÌM KIẾM THAY ĐỔI: Reset toàn bộ danh sách và tải lại từ skip = 0
  useEffect(() => {
    setProducts([]);
    setHasMore(true);
    loadData({ isRefresh: false, isLoadMore: false, query: searchQuery });
  }, [searchQuery]);

  // Cuộn xuống cuối tải thêm (Infinite Scroll)
  const loadMore = useCallback(() => {
    if (!loading && !loadingMore && !refreshing && hasMore) {
      loadData({ isLoadMore: true });
    }
  }, [loading, loadingMore, refreshing, hasMore, loadData]);

  // Kéo xuống làm mới (Pull-to-refresh)
  const refresh = useCallback(() => {
    if (!loading && !loadingMore && !refreshing) {
      loadData({ isRefresh: true });
    }
  }, [loading, loadingMore, refreshing, loadData]);

  // Thử lại khi có lỗi mạng (Retry)
  const retry = useCallback(() => {
    loadData();
  }, [loadData]);

  return {
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
  };
};
