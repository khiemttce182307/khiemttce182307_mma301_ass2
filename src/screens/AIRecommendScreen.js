import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
  Alert,
  Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { aiService } from '../services/aiService';
import { productService } from '../services/productService';
import { LoadingView } from '../components/common/LoadingView';
import { ErrorView } from '../components/common/ErrorView';
import { formatCurrency } from '../utils/formatters';
import { COLORS } from '../constants/colors';
import { ROUTES } from '../constants/routes';

export const AIRecommendScreen = ({ navigation }) => {
  const [catalog, setCatalog] = useState([]);
  const [loadingCatalog, setLoadingCatalog] = useState(true);
  const [catalogError, setCatalogError] = useState(null);

  const [promptText, setPromptText] = useState('Gợi ý mỹ phẩm trang điểm giá dưới $20');
  const [consulting, setConsulting] = useState(false);
  const [aiResults, setAiResults] = useState([]);
  const [aiError, setAiError] = useState(null);

  // 1. Tải catalog sản phẩm thật để làm Context cho AI
  const loadRealCatalog = useCallback(async () => {
    setLoadingCatalog(true);
    setCatalogError(null);
    try {
      const res = await productService.fetchProducts({ limit: 20 });
      setCatalog(res.products);
    } catch (err) {
      setCatalogError('Không thể tải catalog sản phẩm để làm ngữ cảnh cho AI.');
    } finally {
      setLoadingCatalog(false);
    }
  }, []);

  useEffect(() => {
    loadRealCatalog();
  }, [loadRealCatalog]);

  // 2. Gửi yêu cầu tư vấn tới Gemini AI
  const handleAskAI = async (selectedQuery) => {
    const query = selectedQuery || promptText;
    if (!query || query.trim().length === 0) {
      Alert.alert('Thông báo', 'Vui lòng nhập nhu cầu mua sắm của bạn.');
      return;
    }

    Keyboard.dismiss();
    setConsulting(true);
    setAiError(null);

    try {
      // Gọi Gemini API với context từ catalog thật
      const rawAiResponse = await aiService.getRecommendations({
        userPrompt: query.trim(),
        catalogSummary: catalog,
      });

      // BỘ LỌC CHỐNG ẢO GIÁC: Chỉ giữ lại các ID thực sự tồn tại trong catalog
      const validatedList = aiService.validateAndEnrich(
        rawAiResponse.recommendations,
        catalog
      );

      setAiResults(validatedList);
    } catch (err) {
      setAiError(err.message || 'Không thể lấy phản hồi từ AI.');
      // Tự động kích hoạt Fallback để người dùng không bị gián đoạn trải nghiệm
      const fallbackList = aiService.validateAndEnrich([], catalog);
      setAiResults(fallbackList);
    } finally {
      setConsulting(false);
    }
  };

  // 3. HÀM KIỂM THỬ PHÒNG VẤN: Giả lập AI trả về ID ảo giác (Fake ID Mock Test)
  const handleMockHallucinationTest = () => {
    const fakeAiOutput = [
      { id: 999999, reason: 'ID ảo giác số 1 do AI bịa đặt không có thật.' },
      { id: 888888, reason: 'ID ảo giác số 2 không tồn tại trong kho DummyJSON.' },
      { id: 1, reason: 'Sản phẩm thật (#1) có trong kho.' },
    ];

    const filtered = aiService.validateAndEnrich(fakeAiOutput, catalog);
    setAiResults(filtered);

    Alert.alert(
      'Kiểm thử chống ảo giác (Anti-Hallucination Test)',
      'Đã đưa vào 3 ID giả lập (gồm #999999, #888888 và #1).\n\nKết quả: Bộ lọc validateAndEnrich đã LOẠI BỎ 2 ID ảo giác và CHỈ hiển thị duy nhất sản phẩm thật #1 với dữ liệu gốc của cửa hàng!'
    );
  };

  // 4. Điều hướng sang chi tiết sản phẩm
  const handleSelectProduct = (item) => {
    navigation.navigate(ROUTES.PRODUCT_DETAIL, {
      productId: item.id,
      title: item.title,
    });
  };

  if (loadingCatalog) {
    return <LoadingView message="Đang nạp ngữ cảnh catalog cho Trợ lý AI..." />;
  }

  if (catalogError && catalog.length === 0) {
    return <ErrorView message={catalogError} onRetry={loadRealCatalog} />;
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {/* Banner giới thiệu */}
        <View style={styles.banner}>
          <View style={styles.iconCircle}>
            <Ionicons name="sparkles" size={26} color={COLORS.primary} />
          </View>
          <Text style={styles.bannerTitle}>Gemini AI Mua Sắm Thông Minh</Text>
          <Text style={styles.bannerSubtitle}>
            Tư vấn sản phẩm gắn chặt với {catalog.length} sản phẩm thực tế từ kho DummyJSON.
          </Text>
        </View>

        {/* Nút kiểm thử Mock Hallucination phục vụ phỏng vấn */}
        <TouchableOpacity
          style={styles.mockTestBtn}
          onPress={handleMockHallucinationTest}
          activeOpacity={0.8}
        >
          <Ionicons name="flask-outline" size={16} color="#B45309" />
          <Text style={styles.mockTestText}>
            Test Mock AI ảo giác: Gửi ID #999999 để thử bộ lọc
          </Text>
        </TouchableOpacity>

        {/* Gợi ý câu hỏi nhanh */}
        <Text style={styles.sectionTitle}>Gợi ý câu hỏi mẫu:</Text>
        {[
          'Gợi ý mỹ phẩm dưỡng da giá dưới $20',
          'Tìm mascara và phấn mắt trang điểm bán chạy',
          'Gợi ý sản phẩm giá rẻ nhất trong kho',
        ].map((samplePrompt, index) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.promptChip,
              promptText === samplePrompt && styles.promptChipActive,
            ]}
            onPress={() => {
              setPromptText(samplePrompt);
              handleAskAI(samplePrompt);
            }}
          >
            <Ionicons
              name="chatbubble-ellipses-outline"
              size={14}
              color={promptText === samplePrompt ? COLORS.primary : COLORS.textSecondary}
            />
            <Text
              style={[
                styles.promptChipText,
                promptText === samplePrompt && styles.promptChipTextActive,
              ]}
              numberOfLines={1}
            >
              "{samplePrompt}"
            </Text>
          </TouchableOpacity>
        ))}

        {/* Cảnh báo lỗi nếu có */}
        {aiError && (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle" size={16} color={COLORS.danger} />
            <Text style={styles.errorBoxText}>{aiError}</Text>
          </View>
        )}

        {/* Trạng thái AI đang tư vấn */}
        {consulting && (
          <View style={styles.consultingCard}>
            <ActivityIndicator size="small" color={COLORS.primary} />
            <Text style={styles.consultingText}>
              Gemini AI đang phân tích nhu cầu và rà soát catalog thật...
            </Text>
          </View>
        )}

        {/* Danh sách kết quả tư vấn */}
        {aiResults.length > 0 && (
          <>
            <View style={styles.resultHeader}>
              <Text style={styles.resultHeading}>Sản phẩm AI gợi ý ({aiResults.length}):</Text>
              {aiResults[0]?.isFallback && (
                <View style={styles.fallbackBadge}>
                  <Text style={styles.fallbackBadgeText}>Gợi ý thay thế (Fallback)</Text>
                </View>
              )}
            </View>

            {aiResults.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.card}
                onPress={() => handleSelectProduct(item)}
                activeOpacity={0.7}
              >
                <Image
                  source={{ uri: item.thumbnail }}
                  style={styles.cardThumb}
                  resizeMode="cover"
                />

                <View style={styles.cardContent}>
                  <View style={styles.categoryRow}>
                    <Text style={styles.cardCategory}>{item.category?.toUpperCase()}</Text>
                    <Text style={styles.cardPrice}>{formatCurrency(item.price)}</Text>
                  </View>

                  <Text style={styles.cardTitle} numberOfLines={2}>
                    {item.title}
                  </Text>

                  {/* Lý do AI đưa ra */}
                  <View style={styles.reasonBox}>
                    <Ionicons name="bulb-outline" size={14} color={COLORS.primary} />
                    <Text style={styles.reasonText}>{item.aiReason}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </>
        )}
      </ScrollView>

      {/* Thanh nhập liệu phía dưới */}
      <View style={styles.inputBar}>
        <TextInput
          style={styles.inputField}
          placeholder="Nhập nhu cầu mua sắm của bạn..."
          placeholderTextColor={COLORS.textSecondary}
          value={promptText}
          onChangeText={setPromptText}
          editable={!consulting}
          returnKeyType="send"
          onSubmitEditing={() => handleAskAI()}
        />
        <TouchableOpacity
          style={[styles.sendButton, consulting && styles.sendButtonDisabled]}
          onPress={() => handleAskAI()}
          disabled={consulting}
          activeOpacity={0.8}
        >
          {consulting ? (
            <ActivityIndicator size="small" color={COLORS.white} />
          ) : (
            <Ionicons name="send" size={16} color={COLORS.white} />
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
  content: {
    padding: 16,
    paddingBottom: 90,
  },
  banner: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 12,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  bannerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  bannerSubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
  mockTestBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEF3C7',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FDE68A',
    gap: 6,
    marginBottom: 16,
  },
  mockTestText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#B45309',
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 8,
  },
  promptChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 6,
    gap: 8,
  },
  promptChipActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryLight,
  },
  promptChipText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    flex: 1,
  },
  promptChipTextActive: {
    color: COLORS.primaryDark,
    fontWeight: '600',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.dangerLight,
    padding: 10,
    borderRadius: 8,
    gap: 8,
    marginTop: 8,
  },
  errorBoxText: {
    flex: 1,
    fontSize: 12,
    color: COLORS.danger,
    lineHeight: 16,
  },
  consultingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.card,
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 10,
    marginVertical: 12,
  },
  consultingText: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: '600',
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 14,
    marginBottom: 10,
  },
  resultHeading: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  fallbackBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  fallbackBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#D97706',
  },
  card: {
    flexDirection: 'row',
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 10,
    alignItems: 'center',
  },
  cardThumb: {
    width: 68,
    height: 68,
    borderRadius: 8,
    backgroundColor: COLORS.background,
  },
  cardContent: {
    flex: 1,
    marginLeft: 12,
  },
  categoryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  cardCategory: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.primary,
  },
  cardPrice: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.primaryDark,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textPrimary,
    lineHeight: 18,
    marginBottom: 6,
  },
  reasonBox: {
    flexDirection: 'row',
    backgroundColor: COLORS.background,
    padding: 6,
    borderRadius: 6,
    gap: 6,
  },
  reasonText: {
    flex: 1,
    fontSize: 11,
    color: COLORS.textSecondary,
    lineHeight: 16,
  },
  inputBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    backgroundColor: COLORS.card,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    alignItems: 'center',
    gap: 8,
  },
  inputField: {
    flex: 1,
    backgroundColor: COLORS.background,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 9,
    fontSize: 13,
    color: COLORS.textPrimary,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: COLORS.textSecondary,
  },
});
