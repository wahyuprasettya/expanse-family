// ============================================================
// Receipt Scan Screen (OCR)
// ============================================================
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Image, Alert, ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { pickReceiptImage, extractTextFromReceipt } from '@services/ocr';
import Button from '@components/common/Button';
import { Colors, BORDER_RADIUS, FONT_SIZE, FONT_WEIGHT, SPACING, SHADOWS } from '@constants/theme';
import { formatCurrency } from '@utils/formatters';

export const ScanReceiptScreen = ({ navigation }) => {
  const [imageUri, setImageUri] = useState(null);
  const [parsedData, setParsedData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [rawText, setRawText] = useState('');

  const handleScan = async (useCamera) => {
    const { uri, base64, error } = await pickReceiptImage(useCamera);
    if (error) { Alert.alert('Error', error); return; }
    if (!uri) return;

    setImageUri(uri);
    setParsedData(null);
    setLoading(true);

    const { text, parsedData: data, error: ocrError } = await extractTextFromReceipt(base64);
    setLoading(false);

    if (ocrError) {
      Alert.alert('OCR Error', ocrError);
      return;
    }
    setRawText(text);
    setParsedData(data);
  };

  const handleUseData = () => {
    if (!parsedData) return;
    navigation.navigate('AddTransaction', {
      prefill: {
        amount: parsedData.amount?.toString() || '',
        description: parsedData.description || 'Receipt scan',
        date: parsedData.date,
        type: 'expense',
      },
    });
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <LinearGradient colors={['#1E293B', '#0F172A']} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Scan Receipt</Text>
        <View style={{ width: 40 }} />
      </LinearGradient>

      <View style={styles.content}>
        {/* Image Preview */}
        <View style={styles.imageContainer}>
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={styles.image} resizeMode="cover" />
          ) : (
            <View style={styles.imagePlaceholder}>
              <Ionicons name="receipt-outline" size={60} color={Colors.textMuted} />
              <Text style={styles.placeholderText}>Take a photo of your receipt</Text>
              <Text style={styles.placeholderSubtext}>We'll extract the amount and date automatically</Text>
            </View>
          )}
        </View>

        {/* Scan Buttons */}
        <View style={styles.scanButtons}>
          <TouchableOpacity style={styles.scanBtn} onPress={() => handleScan(true)}>
            <LinearGradient colors={Colors.gradients.primary} style={styles.scanBtnGradient}>
              <Ionicons name="camera" size={28} color="#FFF" />
            </LinearGradient>
            <Text style={styles.scanBtnLabel}>Camera</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.scanBtn} onPress={() => handleScan(false)}>
            <LinearGradient colors={['#334155', '#1E293B']} style={styles.scanBtnGradient}>
              <Ionicons name="images" size={28} color={Colors.primary} />
            </LinearGradient>
            <Text style={styles.scanBtnLabel}>Gallery</Text>
          </TouchableOpacity>
        </View>

        {/* Loading */}
        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator color={Colors.primary} size="large" />
            <Text style={styles.loadingText}>Analyzing receipt...</Text>
          </View>
        )}

        {/* Parsed Data */}
        {parsedData && !loading && (
          <View style={styles.resultCard}>
            <Text style={styles.resultTitle}>✅ Receipt Analyzed</Text>

            <View style={styles.resultRow}>
              <Text style={styles.resultLabel}>Amount detected:</Text>
              <Text style={[styles.resultValue, { color: Colors.expense }]}>
                {parsedData.amount ? formatCurrency(parsedData.amount) : 'Not found'}
              </Text>
            </View>

            <View style={styles.resultRow}>
              <Text style={styles.resultLabel}>Date detected:</Text>
              <Text style={styles.resultValue}>{parsedData.date || 'Today'}</Text>
            </View>

            <View style={styles.resultRow}>
              <Text style={styles.resultLabel}>Merchant:</Text>
              <Text style={styles.resultValue} numberOfLines={1}>{parsedData.description || '–'}</Text>
            </View>

            <Button
              title="Use This Data"
              onPress={handleUseData}
              style={{ marginTop: SPACING.md }}
              disabled={!parsedData.amount}
            />
          </View>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: FONT_SIZE.lg, fontWeight: FONT_WEIGHT.bold, color: Colors.textPrimary },
  content: { flex: 1, padding: SPACING.lg },
  imageContainer: {
    height: 260, borderRadius: BORDER_RADIUS.xl,
    overflow: 'hidden', marginBottom: SPACING.lg,
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border,
  },
  image: { width: '100%', height: '100%' },
  imagePlaceholder: {
    flex: 1, alignItems: 'center', justifyContent: 'center', gap: SPACING.sm,
  },
  placeholderText: { color: Colors.textSecondary, fontSize: FONT_SIZE.md, fontWeight: FONT_WEIGHT.medium },
  placeholderSubtext: { color: Colors.textMuted, fontSize: FONT_SIZE.sm, textAlign: 'center', paddingHorizontal: SPACING.lg },
  scanButtons: { flexDirection: 'row', justifyContent: 'center', gap: SPACING.xl, marginBottom: SPACING.lg },
  scanBtn: { alignItems: 'center', gap: SPACING.sm },
  scanBtnGradient: {
    width: 70, height: 70, borderRadius: 35,
    alignItems: 'center', justifyContent: 'center', ...SHADOWS.md,
  },
  scanBtnLabel: { color: Colors.textSecondary, fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.medium },
  loadingContainer: { alignItems: 'center', gap: SPACING.md, marginTop: SPACING.lg },
  loadingText: { color: Colors.textSecondary, fontSize: FONT_SIZE.md },
  resultCard: {
    backgroundColor: Colors.surface, borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.lg, borderWidth: 1, borderColor: `${Colors.income}40`,
  },
  resultTitle: { fontSize: FONT_SIZE.lg, fontWeight: FONT_WEIGHT.bold, color: Colors.textPrimary, marginBottom: SPACING.md },
  resultRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  resultLabel: { color: Colors.textSecondary, fontSize: FONT_SIZE.sm },
  resultValue: { color: Colors.textPrimary, fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.semibold, maxWidth: '55%' },
});

export default ScanReceiptScreen;
