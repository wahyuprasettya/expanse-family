// ============================================================
// Transaction Detail Screen
// ============================================================
import React from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTransactions } from '@hooks/useTransactions';
import { formatCurrency, formatDate, formatTime } from '@utils/formatters';
import { BORDER_RADIUS, FONT_SIZE, FONT_WEIGHT, SPACING, SHADOWS } from '@constants/theme';
import { useAppTheme } from '@hooks/useAppTheme';

export const TransactionDetailScreen = ({ navigation, route }) => {
  const { transaction } = route.params;
  const { deleteTransaction } = useTransactions();
  const { colors } = useAppTheme();
  const styles = createStyles(colors);

  const isIncome = transaction.type === 'income';
  const typeColor = isIncome ? colors.income : colors.expense;
  const gradientColors = isIncome ? colors.gradients.income : colors.gradients.expense;

  const handleDelete = () => {
    Alert.alert('Delete Transaction', 'This action cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteTransaction(transaction.id);
          navigation.goBack();
        },
      },
    ]);
  };

  const DetailRow = ({ label, value, valueColor }) => (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={[styles.detailValue, valueColor && { color: valueColor }]}>{value}</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header with gradient */}
      <LinearGradient colors={gradientColors} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Transaction Detail</Text>
        <TouchableOpacity onPress={handleDelete} style={styles.deleteBtn}>
          <Ionicons name="trash-outline" size={22} color="#FFF" />
        </TouchableOpacity>
      </LinearGradient>

      {/* Amount Card */}
      <View style={styles.amountSection}>
        <LinearGradient colors={gradientColors} style={styles.amountCard}>
          <Text style={styles.categoryIcon}>{transaction.categoryIcon || '📦'}</Text>
          <Text style={styles.amountLabel}>{isIncome ? 'Income' : 'Expense'}</Text>
          <Text style={styles.amountValue}>
            {isIncome ? '+' : '-'}{formatCurrency(transaction.amount)}
          </Text>
          <Text style={styles.categoryName}>{transaction.category}</Text>
        </LinearGradient>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.detailCard}>
          <DetailRow label="Date" value={formatDate(transaction.date, 'EEEE, dd MMMM yyyy')} />
          <DetailRow label="Time" value={formatTime(transaction.date)} />
          <DetailRow label="Category" value={transaction.category} />
          <DetailRow label="Type" value={transaction.type.toUpperCase()} valueColor={typeColor} />
          {transaction.createdByName ? (
            <DetailRow label="Added By" value={transaction.createdByName} />
          ) : null}
          {transaction.description ? (
            <DetailRow label="Description" value={transaction.description} />
          ) : null}
          <DetailRow label="Transaction ID" value={transaction.id.slice(0, 12) + '...'} />
        </View>

        {/* Quick Stats: last 3 same-category transactions */}
        <View style={styles.relatedSection}>
          <Text style={styles.relatedTitle}>About this Category</Text>
          <View style={[styles.relatedCard, { borderColor: typeColor }]}>
            <Text style={styles.relatedText}>
              {`You've recorded a ${transaction.category} ${transaction.type} of ${formatCurrency(transaction.amount)}.`}
            </Text>
          </View>
        </View>
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
  headerTitle: { fontSize: FONT_SIZE.lg, fontWeight: FONT_WEIGHT.bold, color: '#FFF' },
  deleteBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  amountSection: { paddingHorizontal: SPACING.lg, paddingBottom: SPACING.lg, marginTop: -1 },
  amountCard: {
    borderRadius: BORDER_RADIUS.xl, padding: SPACING.xl,
    alignItems: 'center', ...SHADOWS.lg,
  },
  categoryIcon: { fontSize: 48, marginBottom: SPACING.sm },
  amountLabel: { color: 'rgba(255,255,255,0.75)', fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.medium },
  amountValue: { color: '#FFF', fontSize: 42, fontWeight: FONT_WEIGHT.extrabold, letterSpacing: -1, marginVertical: 8 },
  categoryName: { color: 'rgba(255,255,255,0.9)', fontSize: FONT_SIZE.lg, fontWeight: FONT_WEIGHT.semibold },
  content: { flex: 1, padding: SPACING.lg },
  detailCard: {
    backgroundColor: colors.surface, borderRadius: BORDER_RADIUS.xl,
    borderWidth: 1, borderColor: colors.border, overflow: 'hidden', ...SHADOWS.sm,
    marginBottom: SPACING.lg,
  },
  detailRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    padding: SPACING.md, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  detailLabel: { color: colors.textMuted, fontSize: FONT_SIZE.sm, flex: 1 },
  detailValue: {
    color: colors.textPrimary, fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.semibold, flex: 2, textAlign: 'right',
  },
  relatedSection: { marginBottom: SPACING.xxl },
  relatedTitle: { color: colors.textSecondary, fontSize: FONT_SIZE.md, fontWeight: FONT_WEIGHT.semibold, marginBottom: SPACING.sm },
  relatedCard: {
    backgroundColor: colors.surface, borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md, borderWidth: 1,
  },
  relatedText: { color: colors.textSecondary, fontSize: FONT_SIZE.sm, lineHeight: 22 },
});

export default TransactionDetailScreen;
