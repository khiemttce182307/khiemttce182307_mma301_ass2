import { ENV_CONFIG } from '../config/env';

// Hàm bóc tách JSON an toàn khỏi phản hồi văn bản của AI (loại bỏ code fence ```json)
const cleanAndParseJson = (rawText) => {
  if (!rawText || typeof rawText !== 'string') {
    throw new Error('Phản hồi từ AI rỗng.');
  }

  // 1. Loại bỏ markdown code fence ```json ... ```
  let cleaned = rawText
    .replace(/```json/gi, '')
    .replace(/```/g, '')
    .trim();

  // 2. Tìm vị trí dấu ngoặc nhọn đầu tiên { và cuối cùng } để trích xuất JSON thuần
  const startIndex = cleaned.indexOf('{');
  const endIndex = cleaned.lastIndexOf('}');

  if (startIndex === -1 || endIndex === -1 || endIndex <= startIndex) {
    throw new Error('AI không trả về cấu trúc JSON hợp lệ.');
  }

  cleaned = cleaned.substring(startIndex, endIndex + 1);

  return JSON.parse(cleaned);
};

export const aiService = {
  // Kiểm tra xem đã có API Key Gemini hay chưa
  isConfigured: () =>
    Boolean(
      ENV_CONFIG.geminiApiKey &&
      ENV_CONFIG.geminiApiKey !== 'your_gemini_api_key_here'
    ),

  /**
   * Gọi Gemini REST API để tư vấn sản phẩm
   * @param {string} userPrompt - Nhu cầu tìm kiếm của người dùng
   * @param {Array} catalogSummary - Danh sách tóm tắt catalog thật [{ id, title, price, category }]
   * @returns {Promise<{ recommendations: Array }>}
   */
  getRecommendations: async ({ userPrompt, catalogSummary }) => {
    if (!aiService.isConfigured()) {
      throw new Error(
        'Chưa cấu hình EXPO_PUBLIC_GEMINI_API_KEY trong file .env. Vui lòng thêm API Key để sử dụng tính năng này.'
      );
    }

    if (!Array.isArray(catalogSummary) || catalogSummary.length === 0) {
      throw new Error('Danh mục sản phẩm rỗng, không thể cung cấp context cho AI.');
    }

    // Giới hạn context tối đa 20 sản phẩm để tiết kiệm token và giảm latency
    const safeCatalog = catalogSummary.slice(0, 20).map((p) => ({
      id: p.id,
      title: p.title,
      price: p.price,
      category: p.category,
    }));

    const systemPrompt = `Bạn là chuyên gia tư vấn mua sắm thông minh cho ứng dụng di động.
Dưới đây là danh mục sản phẩm THỰC TẾ đang có trong cửa hàng:
${JSON.stringify(safeCatalog)}

Yêu cầu của khách hàng: "${userPrompt}"

HÃY TUÂN THỦ NGHIÊM NGẶT CÁC QUY TẮC SAU:
1. CHỈ được chọn các sản phẩm có ID xuất hiện trong danh mục thực tế ở trên. TUYỆT ĐỐI KHÔNG tự bịa ra ID hoặc sản phẩm không có trong danh mục.
2. Trả về tối đa 3 sản phẩm phù hợp nhất.
3. BẮT BUỘC trả về duy nhất một chuỗi JSON hợp lệ theo đúng cấu trúc schema sau, không thêm lời chào, không thêm markdown code fence:
{
  "recommendations": [
    {
      "id": 1,
      "reason": "Giải thích ngắn gọn 1 câu vì sao sản phẩm này đáp ứng nhu cầu của khách hàng"
    }
  ]
}`;

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${ENV_CONFIG.geminiModel}:generateContent?key=${ENV_CONFIG.geminiApiKey}`;

    // Cơ chế AbortController hủy request nếu quá thời gian chờ (Timeout 15 giây)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    let response;
    try {
      response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [{ text: systemPrompt }],
            },
          ],
          generationConfig: {
            temperature: 0.2, // Nhiệt độ thấp để giảm ảo giác (anti-hallucination)
            topK: 20,
            topP: 0.8,
          },
        }),
        signal: controller.signal,
      });
    } catch (err) {
      if (err.name === 'AbortError') {
        throw new Error('Yêu cầu tới Gemini AI bị quá thời gian chờ (Timeout 15s). Vui lòng thử lại.');
      }
      throw new Error('Không thể kết nối đến máy chủ Gemini AI. Vui lòng kiểm tra kết nối mạng.');
    } finally {
      clearTimeout(timeoutId);
    }

    if (!response.ok) {
      if (response.status === 429) {
        throw new Error('Đã vượt quá hạn mức sử dụng Gemini API (Quota Exceeded). Vui lòng thử lại sau.');
      }
      if (response.status === 400 || response.status === 403) {
        throw new Error('Gemini API Key không hợp lệ hoặc không có quyền truy cập model.');
      }
      throw new Error(`Lỗi máy chủ Gemini (${response.status}): ${response.statusText}`);
    }

    const data = await response.json();
    const candidateText = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!candidateText) {
      throw new Error('Gemini không trả về nội dung tư vấn phù hợp.');
    }

    return cleanAndParseJson(candidateText);
  },

  /**
   * BỘ LỌC CHỐNG ẢO GIÁC (Anti-Hallucination Validator):
   * Đối chiếu từng ID do AI trả về với Catalog thật:
   * - ID lạ / không tồn tại => BỊ LOẠI BỎ NGAY LẬP TỨC.
   * - Render HOÀN TOÀN bằng dữ liệu thật (ảnh, giá, tên từ catalog), chỉ lấy trường reason từ AI.
   * - Nếu toàn bộ ID bị loại => Trả về danh sách Fallback an toàn.
   */
  validateAndEnrich: (rawRecommendations, fullCatalog) => {
    if (!Array.isArray(fullCatalog) || fullCatalog.length === 0) return [];

    const catalogMap = new Map(fullCatalog.map((p) => [p.id, p]));
    const validatedProducts = [];

    if (Array.isArray(rawRecommendations)) {
      for (const item of rawRecommendations) {
        if (!item || typeof item.id === 'undefined') continue;

        // KIỂM TRA SỰ TỒN TẠI TRONG CATALOG THẬT
        const realProduct = catalogMap.get(item.id);

        if (realProduct) {
          // Lấy 100% dữ liệu gốc của sản phẩm, CHỈ lấy reason từ AI
          validatedProducts.push({
            ...realProduct,
            aiReason: item.reason || 'Sản phẩm phù hợp với nhu cầu của bạn.',
            isHallucinated: false,
          });
        } else {
          console.warn(`[Anti-Hallucination] Phát hiện và LOẠI BỎ ID ảo giác do AI sinh ra: #${item.id}`);
        }
      }
    }

    // NẾU TẤT CẢ ID ĐỀU ẢO HOẶC PARSE THẤT BẠI: Trả về Fallback từ catalog thật
    if (validatedProducts.length === 0) {
      console.log('[AI Fallback] Không còn sản phẩm hợp lệ, kích hoạt danh sách Fallback gợi ý.');
      const fallbackItems = fullCatalog.slice(0, 3).map((p) => ({
        ...p,
        aiReason: 'Gợi ý sản phẩm nổi bật thay thế từ cửa hàng do AI không tìm thấy sản phẩm hoàn toàn trùng khớp.',
        isFallback: true,
      }));
      return fallbackItems;
    }

    return validatedProducts;
  },
};
