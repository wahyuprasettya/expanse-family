// ============================================================
// Debts Screen
// ============================================================
import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import { useDebts } from '@hooks/useDebts';
import { useTranslation } from '@hooks/useTranslation';
import { useAppTheme } from '@hooks/useAppTheme';
import { selectDebtsLoading } from '@store/debtSlice';
import Input from '@components/common/Input';
import EmptyState from '@components/common/EmptyState';
import LoadingState from '@components/common/LoadingState';
import { formatCurrency, formatDateSmart } from '@utils/formatters';
import { getDebtProgress, getDebtStatus, isDebtDueSoon } from '@utils/debts';
import { BORDER_RADIUS, FONT_FAMILY, FONT_SIZE, SPACING, SHADOWS } from '@constants/theme';

const FILTERS = ['all', 'debt', 'receivable', 'overdue'];

const DebtSummaryCard = ({ label, value, color, helper, styles }) => (
  <View style={styles.summaryCard}>
    <Text style={styles.summaryLabel}>{label}</Text>
    <Text style={[styles.summaryValue, { color }]} numberOfLines={1}>
      {value}
    </Text>
    <Text style={styles.summaryHelper}>{helper}</Text>
  </View>
);

export const DebtsScreen = ({ navigation }) => {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isCompact = width < 380;
  const { colors } = useAppTheme();
  const { t, language } = useTranslation();
  const styles = createStyles(colors, { isCompact, bottomInset: insets.bottom });
  const { debts, summary } = useDebts();
  const isLoading = useSelector(selectDebtsLoading);
  const [activeFilter, setActiveFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredDebts = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    return debts.filter((debt) => {
      const status = getDebtStatus(debt);
      if (activeFilter === 'debt' && debt.type !== 'debt') return false;
      if (activeFilter === 'receivable' && debt.type !== 'receivable') return false;
      if (activeFilter === 'overdue' && status !== 'overdue') return false;

      if (!normalizedQuery) return true;

      const searchable = [
        debt.title,
        debt.counterpartName,
        debt.description,
        debt.walletName,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return searchable.includes(normalizedQuery);
    });
  }, [activeFilter, debts, searchQuery]);

  const renderDebtCard = ({ item }) => {
    const status = getDebtStatus(item);
    const progress = getDebtProgress(item);
    const isReceivable = item.type === 'receivable';
    const accentColor = isReceivable ? colors.income : colors.expense;
    const progressWidth = `${Math.max(progress.ratio * 100, progress.ratio > 0 ? 8 : 0)}%`;
    const dueSoon = isDebtDueSoon(item, 7);
    const dueLabel = item.dueDate
      ? formatDateSmart(item.dueDate, language, {
          today: t('common.today'),
          yesterday: t('common.yesterday'),
        })
      : t('debts.noDueDate');
    const statusLabel = t(`debts.status.${status}`);

    return (
      <TouchableOpacity
        style={styles.debtCard}
        activeOpacity={0.85}
        onPress={() => navigation.navigate('DebtDetail', { debtId: item.id })}
      >
        <View style={styles.debtCardHeader}>
          <View style={styles.debtLead}>
            <View style={[styles.debtIconWrap, { backgroundColor: `${accentColor}18` }]}>
              <Text style={styles.debtIcon}>{isReceivable ? '💵' : '💳'}</Text>
            </View>
            <View style={styles.debtTextWrap}>
              <Text style={styles.debtTitle} numberOfLines={1}>{item.title}</Text>
              <Text style={styles.debtCounterpart} numberOfLines={1}>
                {isReceivable
                  ? t('debts.fromLabel', { name: item.counterpartName })
                  : t('debts.toLabel', { name: item.counterpartName })}
              </Text>
            </View>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: `${accentColor}15` }]}>
            <Text style={[styles.statusBadgeText, { color: accentColor }]}>{statusLabel}</Text>
          </View>
        </View>

        <View style={styles.amountRow}>
          <View style={styles.amountGroup}>
            <Text style={styles.amountCaption}>{t('debts.outstanding')}</Text>
            <Text style={[styles.amountValue, { color: accentColor }]} numberOfLines={1}>
              {formatCurrency(item.outstandingAmount, 'IDR', language)}
            </Text>
          </View>
          <View style={styles.amountGroup}>
            <Text style={styles.amountCaption}>{t('debts.totalAmount')}</Text>
            <Text style={styles.amountSecondary} numberOfLines={1}>
              {formatCurrency(item.principalAmount, 'IDR', language)}
            </Text>
          </View>
        </View>

        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: progressWidth, backgroundColor: accentColor }]} />
        </View>

        <View style={styles.metaRow}>
          <Text style={styles.metaText}>
            {item.paymentScheme === 'installment'
              ? t('debts.installmentProgress', {
                  current: progress.paidInstallments,
                  total: progress.totalInstallments,
                })
              : t('debts.paidAmountLabel', {
                  amount: formatCurrency(item.paidAmount, 'IDR', language),
                })}
          </Text>
          <Text
            style={[
              styles.metaText,
              dueSoon && status !== 'overdue' && { color: colors.warning },
              status === 'overdue' && { color: colors.expense },
            ]}
          >
            {t('debts.dueLabelShort', { date: dueLabel })}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (isLoading && debts.length === 0) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <LoadingState />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <LinearGradient colors={colors.gradients.header} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerIconBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{t('debts.title')}</Text>
        <TouchableOpacity onPress={() => navigation.navigate('AddDebt')} style={styles.headerIconBtn}>
          <Ionicons name="add" size={24} color={colors.primary} />
        </TouchableOpacity>
      </LinearGradient>

      <FlatList
        data={filteredDebts}
        keyExtractor={(item) => item.id}
        renderItem={renderDebtCard}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={(
          <View>
            <View style={styles.summaryGrid}>
              <DebtSummaryCard
                label={t('debts.summaryDebt')}
                value={formatCurrency(summary.debtOutstanding, 'IDR', language)}
                color={colors.expense}
                helper={t('debts.summaryDebtHelper')}
                styles={styles}
              />
              <DebtSummaryCard
                label={t('debts.summaryReceivable')}
                value={formatCurrency(summary.receivableOutstanding, 'IDR', language)}
                color={colors.income}
                helper={t('debts.summaryReceivableHelper')}
                styles={styles}
              />
              <DebtSummaryCard
                label={t('debts.summaryDueSoon')}
                value={`${summary.dueSoonCount + summary.overdueCount}`}
                color={summary.overdueCount > 0 ? colors.expense : colors.warning}
                helper={t('debts.summaryDueSoonHelper', { overdue: summary.overdueCount })}
                styles={styles}
              />
            </View>

            <Input
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder={t('debts.searchPlaceholder')}
              icon="search-outline"
            />

            <View style={styles.filterRow}>
              {FILTERS.map((filter) => (
                <TouchableOpacity
                  key={filter}
                  style={[
                    styles.filterChip,
                    activeFilter === filter && styles.filterChipActive,
                  ]}
                  onPress={() => setActiveFilter(filter)}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      activeFilter === filter && styles.filterChipTextActive,
                    ]}
                  >
                    {t(`debts.filters.${filter}`)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.sectionTitle}>
              {t('debts.listTitle', { count: filteredDebts.length })}
            </Text>
          </View>
        )}
        ListEmptyComponent={(
          <EmptyState
            icon="🧾"
            title={t('debts.emptyTitle')}
            subtitle={t('debts.emptySubtitle')}
            actionLabel={t('debts.addDebt')}
            onAction={() => navigation.navigate('AddDebt')}
          />
        )}
      />
    </SafeAreaView>
  );
};

const createStyles = (colors, { isCompact, bottomInset }) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  headerIconBtn: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    color: colors.textPrimary,
    fontSize: FONT_SIZE.lg,
    fontFamily: FONT_FAMILY.bold,
    marginHorizontal: SPACING.sm,
  },
  listContent: {
    padding: SPACING.lg,
    paddingBottom: Math.max(bottomInset + SPACING.xl, SPACING.xxl),
  },
  summaryGrid: {
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  summaryCard: {
    backgroundColor: colors.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...SHADOWS.sm,
  },
  summaryLabel: {
    color: colors.textMuted,
    fontSize: FONT_SIZE.xs,
    fontFamily: FONT_FAMILY.medium,
  },
  summaryValue: {
    color: colors.textPrimary,
    fontSize: isCompact ? FONT_SIZE.lg : FONT_SIZE.xl,
    fontFamily: FONT_FAMILY.bold,
    marginTop: 6,
  },
  summaryHelper: {
    color: colors.textSecondary,
    fontSize: FONT_SIZE.xs,
    fontFamily: FONT_FAMILY.regular,
    marginTop: 4,
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterChipText: {
    color: colors.textSecondary,
    fontSize: FONT_SIZE.sm,
    fontFamily: FONT_FAMILY.medium,
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  sectionTitle: {
    color: colors.textPrimary,
    fontSize: FONT_SIZE.md,
    fontFamily: FONT_FAMILY.semibold,
    marginBottom: SPACING.sm,
  },
  debtCard: {
    backgroundColor: colors.surface,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: SPACING.sm,
    ...SHADOWS.sm,
  },
  debtCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: SPACING.sm,
  },
  debtLead: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: SPACING.sm,
  },
  debtIconWrap: {
    width: 46,
    height: 46,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  debtIcon: {
    fontSize: 22,
  },
  debtTextWrap: {
    flex: 1,
  },
  debtTitle: {
    color: colors.textPrimary,
    fontSize: FONT_SIZE.md,
    fontFamily: FONT_FAMILY.semibold,
  },
  debtCounterpart: {
    color: colors.textSecondary,
    fontSize: FONT_SIZE.sm,
    fontFamily: FONT_FAMILY.regular,
    marginTop: 2,
  },
  statusBadge: {
    borderRadius: BORDER_RADIUS.full,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  statusBadgeText: {
    fontSize: FONT_SIZE.xs,
    fontFamily: FONT_FAMILY.semibold,
  },
  amountRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.md,
  },
  amountGroup: {
    flex: 1,
  },
  amountCaption: {
    color: colors.textMuted,
    fontSize: FONT_SIZE.xs,
    fontFamily: FONT_FAMILY.medium,
  },
  amountValue: {
    fontSize: FONT_SIZE.lg,
    fontFamily: FONT_FAMILY.bold,
    marginTop: 4,
  },
  amountSecondary: {
    color: colors.textPrimary,
    fontSize: FONT_SIZE.md,
    fontFamily: FONT_FAMILY.semibold,
    marginTop: 4,
  },
  progressTrack: {
    height: 8,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: colors.border,
    overflow: 'hidden',
    marginTop: SPACING.md,
  },
  progressFill: {
    height: '100%',
    borderRadius: BORDER_RADIUS.full,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: SPACING.sm,
    marginTop: SPACING.sm,
  },
  metaText: {
    color: colors.textSecondary,
    fontSize: FONT_SIZE.xs,
    fontFamily: FONT_FAMILY.medium,
    flex: 1,
  },
});

export default DebtsScreen;
