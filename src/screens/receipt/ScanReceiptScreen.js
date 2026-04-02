// ============================================================
// Receipt Scan Screen (OCR)
// ============================================================
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Image, Alert, ActivityIndicator, TextInput, ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { pickReceiptImage, extractTextFromReceipt } from '@services/ocr';
import Button from '@components/common/Button';
import { BORDER_RADIUS, FONT_SIZE, FONT_WEIGHT, FONT_FAMILY, SPACING, SHADOWS } from '@constants/theme';
import { formatCurrency } from '@utils/formatters';
import { useAppTheme } from '@hooks/useAppTheme';
import { useTranslation } from '@hooks/useTranslation';

export const ScanReceiptScreen = ({ navigation }) => {
  const { colors } = useAppTheme();
  const { t, language } = useTranslation();
  const styles = createStyles(colors);
  const [imageUri, setImageUri] = useState(null);
  const [parsedData, setParsedData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [rawText, setRawText] = useState('');

  const handlePickImage = async (useCamera) => {
    const { uri, error } = await pickReceiptImage(useCamera);
    if (error) { Alert.alert(t('common.error'), error); return; }
    if (!uri) return;

    setImageUri(uri);
    setParsedData(null);
  };

  const handleAnalyzeText = async () => {
    setLoading(true);
    const { text, parsedData: data, error: ocrError } = await extractTextFromReceipt(rawText);
    setLoading(false);

    if (ocrError) {
      Alert.alert(t('receipt.ocrErrorTitle'), ocrError);
      return;
    }

    setRawText(text);
    setParsedData(data);
  };

  const handleClear = () => {
    setRawText('');
    setParsedData(null);
  };

  const handleUseData = () => {
    if (!parsedData) return;
    navigation.navigate('AddTransaction', {
      prefill: {
        amount: parsedData.amount?.toString() || '',
        description: parsedData.description || t('receipt.defaultDescription'),
        date: parsedData.date,
        type: 'expense',
      },
    });
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <LinearGradient colors={colors.gradients.header} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('receipt.title')}</Text>
        <View style={{ width: 40 }} />
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator>
        {/* Image Preview */}
        <View style={styles.imageContainer}>
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={styles.image} resizeMode="cover" />
          ) : (
            <View style={styles.imagePlaceholder}>
              <Ionicons name="receipt-outline" size={60} color={colors.textMuted} />
              <Text style={styles.placeholderText}>{t('receipt.placeholderTitle')}</Text>
              <Text style={styles.placeholderSubtext}>{t('receipt.placeholderSubtitle')}</Text>
            </View>
          )}
        </View>

        {/* Scan Buttons */}
        <View style={styles.scanButtons}>
          <TouchableOpacity style={styles.scanBtn} onPress={() => handlePickImage(true)}>
            <LinearGradient colors={colors.gradients.primary} style={styles.scanBtnGradient}>
              <Ionicons name="camera" size={28} color="#FFF" />
            </LinearGradient>
            <Text style={styles.scanBtnLabel}>{t('receipt.camera')}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.scanBtn} onPress={() => handlePickImage(false)}>
            <LinearGradient colors={colors.gradients.secondary} style={styles.scanBtnGradient}>
              <Ionicons name="images" size={28} color={colors.primary} />
            </LinearGradient>
            <Text style={styles.scanBtnLabel}>{t('receipt.gallery')}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.manualBlock}>
          <Text style={styles.manualTitle}>{t('receipt.manualInputTitle')}</Text>
          <Text style={styles.manualSubtitle}>{t('receipt.manualInputSubtitle')}</Text>
          <TextInput
            style={styles.manualInput}
            value={rawText}
            onChangeText={setRawText}
            placeholder={t('receipt.manualInputPlaceholder')}
            placeholderTextColor={colors.textMuted}
            multiline
            textAlignVertical="top"
          />
          <View style={styles.manualActions}>
            <Button
              title={t('receipt.analyzeText')}
              onPress={handleAnalyzeText}
              loading={loading}
              disabled={!rawText.trim()}
              style={{ flex: 1 }}
            />
            <Button
              title={t('receipt.clearText')}
              onPress={handleClear}
              variant="ghost"
              fullWidth={false}
              style={styles.clearBtn}
            />
          </View>
        </View>

        {/* Loading */}
        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator color={colors.primary} size="large" />
            <Text style={styles.loadingText}>{t('receipt.analyzing')}</Text>
          </View>
        )}

        {/* Parsed Data */}
        {parsedData && !loading && (
          <View style={styles.resultCard}>
            <Text style={styles.resultTitle}>{t('receipt.analyzed')}</Text>

            <View style={styles.resultRow}>
              <Text style={styles.resultLabel}>{t('receipt.amountDetected')}</Text>
              <Text style={[styles.resultValue, { color: colors.expense }]}>
                {parsedData.amount ? formatCurrency(parsedData.amount, 'IDR', language) : t('receipt.notFound')}
              </Text>
            </View>

            <View style={styles.resultRow}>
              <Text style={styles.resultLabel}>{t('receipt.dateDetected')}</Text>
              <Text style={styles.resultValue}>{parsedData.date || t('common.today')}</Text>
            </View>

            <View style={styles.resultRow}>
              <Text style={styles.resultLabel}>{t('receipt.merchant')}</Text>
              <Text style={styles.resultValue} numberOfLines={1}>{parsedData.description || '–'}</Text>
            </View>

            <View style={styles.resultRow}>
              <Text style={styles.resultLabel}>{t('receipt.calculationMethod')}</Text>
              <Text style={styles.resultValue}>
                {parsedData.amountSource === 'manual_sum'
                  ? t('receipt.manualSumUsed')
                  : parsedData.amountSource === 'detected_total'
                    ? t('receipt.detectedTotalUsed')
                    : t('receipt.notFound')}
              </Text>
            </View>

            {parsedData.itemizedLines?.length ? (
              <View style={styles.itemizedBlock}>
                <Text style={styles.itemizedTitle}>
                  {t('receipt.itemizedSummary', { count: parsedData.itemizedLines.length })}
                </Text>
                {parsedData.itemizedLines.slice(0, 5).map((item, index) => (
                  <View key={`${item.name}-${index}`} style={styles.itemizedRow}>
                    <Text style={styles.itemizedName} numberOfLines={1}>{item.name}</Text>
                    <Text style={styles.itemizedAmount}>{formatCurrency(item.amount, 'IDR', language)}</Text>
                  </View>
                ))}
                {parsedData.itemizedLines.length > 5 ? (
                  <Text style={styles.moreItemsText}>
                    {t('receipt.moreItems', { count: parsedData.itemizedLines.length - 5 })}
                  </Text>
                ) : null}
              </View>
            ) : null}

            <Button
              title={t('receipt.useData')}
              onPress={handleUseData}
              style={{ marginTop: SPACING.md }}
              disabled={!parsedData.amount}
            />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const createStyles = (colors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: FONT_SIZE.lg, fontWeight: FONT_WEIGHT.bold, fontFamily: FONT_FAMILY.bold, color: colors.textPrimary },
  content: { flex: 1, padding: SPACING.lg },
  imageContainer: {
    height: 260, borderRadius: BORDER_RADIUS.xl,
    overflow: 'hidden', marginBottom: SPACING.lg,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
  },
  image: { width: '100%', height: '100%' },
  imagePlaceholder: {
    flex: 1, alignItems: 'center', justifyContent: 'center', gap: SPACING.sm,
  },
  placeholderText: { color: colors.textSecondary, fontSize: FONT_SIZE.md, fontWeight: FONT_WEIGHT.medium, fontFamily: FONT_FAMILY.medium },
  placeholderSubtext: { color: colors.textMuted, fontSize: FONT_SIZE.sm, fontFamily: FONT_FAMILY.regular, textAlign: 'center', paddingHorizontal: SPACING.lg },
  scanButtons: { flexDirection: 'row', justifyContent: 'center', gap: SPACING.xl, marginBottom: SPACING.lg },
  scanBtn: { alignItems: 'center', gap: SPACING.sm },
  scanBtnGradient: {
    width: 70, height: 70, borderRadius: 35,
    alignItems: 'center', justifyContent: 'center', ...SHADOWS.md,
  },
  scanBtnLabel: { color: colors.textSecondary, fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.medium, fontFamily: FONT_FAMILY.medium },
  manualBlock: {
    backgroundColor: colors.surface,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: SPACING.lg,
  },
  manualTitle: {
    color: colors.textPrimary,
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.bold,
    fontFamily: FONT_FAMILY.bold,
    marginBottom: 4,
  },
  manualSubtitle: {
    color: colors.textSecondary,
    fontSize: FONT_SIZE.sm,
    fontFamily: FONT_FAMILY.regular,
    marginBottom: SPACING.md,
    lineHeight: 20,
    flexWrap: 'wrap',
  },
  manualInput: {
    minHeight: 160,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    color: colors.textPrimary,
    fontSize: FONT_SIZE.md,
    fontFamily: FONT_FAMILY.regular,
    padding: SPACING.md,
  },
  manualActions: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.md,
    alignItems: 'center',
  },
  clearBtn: {
    minWidth: 100,
  },
  loadingContainer: { alignItems: 'center', gap: SPACING.md, marginTop: SPACING.lg },
  loadingText: { color: colors.textSecondary, fontSize: FONT_SIZE.md, fontFamily: FONT_FAMILY.regular },
  resultCard: {
    backgroundColor: colors.surface, borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.lg, borderWidth: 1, borderColor: `${colors.income}40`,
  },
  resultTitle: { fontSize: FONT_SIZE.lg, fontWeight: FONT_WEIGHT.bold, fontFamily: FONT_FAMILY.bold, color: colors.textPrimary, marginBottom: SPACING.md },
  resultRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  resultLabel: { color: colors.textSecondary, fontSize: FONT_SIZE.sm, fontFamily: FONT_FAMILY.regular },
  resultValue: { color: colors.textPrimary, fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.semibold, fontFamily: FONT_FAMILY.semibold, maxWidth: '55%', textAlign: 'right' },
  itemizedBlock: {
    marginTop: SPACING.md,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: colors.background,
  },
  itemizedTitle: {
    color: colors.textPrimary,
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.bold,
    fontFamily: FONT_FAMILY.bold,
    marginBottom: SPACING.sm,
  },
  itemizedRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: SPACING.md,
    paddingVertical: 4,
  },
  itemizedName: { color: colors.textSecondary, fontSize: FONT_SIZE.sm, fontFamily: FONT_FAMILY.regular, flex: 1 },
  itemizedAmount: { color: colors.textPrimary, fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.semibold, fontFamily: FONT_FAMILY.semibold },
  moreItemsText: { color: colors.textMuted, fontSize: FONT_SIZE.xs, fontFamily: FONT_FAMILY.regular, marginTop: SPACING.xs },
});

export default ScanReceiptScreen;
