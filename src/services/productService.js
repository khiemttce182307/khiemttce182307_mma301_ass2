import { ENV_CONFIG } from '../config/env';

// Hàm chuẩn hóa dữ liệu (normalize) giúp đồng nhất cấu trúc dữ liệu cho UI
const normalizeProduct = (item) => {
  if (!item || typeof item !== 'object') return null;

  return {
    id: item.id,
    title: item.title || 'Sản phẩm chưa đặt tên',
    description: item.description || '',
    price: typeof item.price === 'number' ? item.price : 0,
    discountPercentage: item.discountPercentage || 0,
    rating: typeof item.rating === 'number' ? item.rating : 0,
    stock: typeof item.stock === 'number' ? item.stock : 0,
    brand: item.brand || 'Khác',
    category: item.category || 'chung',
    thumbnail:
      item.thumbnail ||
      (Array.isArray(item.images) && item.images.length > 0 ? item.images[0] : ''),
    images: Array.isArray(item.images) ? item.images : [],
  };
};

export const productService = {
  // Lấy danh sách sản phẩm có hỗ trợ phân trang (limit, skip) và tìm kiếm (query)
  fetchProducts: async ({ limit = 10, skip = 0, query = '' } = {}) => {
    const trimmedQuery = typeof query === 'string' ? query.trim() : '';

    const endpoint = trimmedQuery
      ? `${ENV_CONFIG.apiBaseUrl}/products/search?q=${encodeURIComponent(trimmedQuery)}&limit=${limit}&skip=${skip}`
      : `${ENV_CONFIG.apiBaseUrl}/products?limit=${limit}&skip=${skip}`;

    let response;
    try {
      response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
    } catch (networkError) {
      // Bắt lỗi mất kết nối internet hoặc rớt mạng cục bộ
      throw new Error(
        'Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối mạng của bạn.'
      );
    }

    if (!response.ok) {
      throw new Error(
        `Lỗi từ máy chủ (${response.status}): ${response.statusText || 'Không thể tải danh mục sản phẩm.'}`
      );
    }

    const data = await response.json();

    if (!data || !Array.isArray(data.products)) {
      throw new Error('Dữ liệu sản phẩm trả về từ máy chủ không đúng định dạng.');
    }

    const normalizedProducts = data.products
      .map(normalizeProduct)
      .filter((p) => p !== null);

    return {
      products: normalizedProducts,
      total: typeof data.total === 'number' ? data.total : normalizedProducts.length,
      skip: typeof data.skip === 'number' ? data.skip : skip,
      limit: typeof data.limit === 'number' ? data.limit : limit,
    };
  },

  // Lấy chi tiết 1 sản phẩm theo ID (chuẩn bị sẵn cho M3)
  fetchProductById: async (id) => {
    if (!id) throw new Error('Mã sản phẩm (ID) không hợp lệ.');

    let response;
    try {
      response = await fetch(`${ENV_CONFIG.apiBaseUrl}/products/${id}`);
    } catch (networkError) {
      throw new Error('Không thể kết nối đến máy chủ khi tải chi tiết sản phẩm.');
    }

    if (!response.ok) {
      throw new Error(`Không tìm thấy sản phẩm #${id} (${response.status}).`);
    }

    const data = await response.json();
    return normalizeProduct(data);
  },
};
