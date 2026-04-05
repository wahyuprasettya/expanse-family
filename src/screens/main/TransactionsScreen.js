// ============================================================
// Transactions Screen (Month-first History + Archive Tools)
// ============================================================
import React, { useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, ScrollView, useWindowDimensions, ActivityIndicator
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSelector } from 'react-redux';
import { selectTransactions, selectTransactionsLoading } from '@store/transactionSlice';
import { selectCategories } from '@store/categorySlice';
import { useTransactions } from '@hooks/useTransactions';
import { exportTransactionsBackupToJSON } from '@services/export';
import TransactionCard from '@components/transaction/TransactionCard';
import LoadingState from '@components/common/LoadingState';
import Input from '@components/common/Input';
import { BORDER_RADIUS, FONT_SIZE, FONT_WEIGHT, FONT_FAMILY, SPACING, SHADOWS } from '@constants/theme';
import { formatDate } from '@utils/formatters';
import { useTranslation } from '@hooks/useTranslation';
import { useAppTheme } from '@hooks/useAppTheme';

const createMonthStart = (date = new Date()) => new Date(date.getFullYear(), date.getMonth(), 1);
const shiftMonth = (date, delta) => new Date(date.getFullYear(), date.getMonth() + delta, 1);
const isSameMonth = (first, second) =>
  first.getFullYear() === second.getFullYear() && first.getMonth() === second.getMonth();

export const TransactionsScreen = ({ navigation }) => {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isCompact = width < 380;
  const isNarrow = width < 350;
  const isTablet = width >= 768;
  const isLargeTablet = width >= 1100;
  const { t, language } = useTranslation();
  const { colors } = useAppTheme();
  const styles = createStyles(colors, {
    isCompact,
    isNarrow,
    isTablet,
    isLargeTablet,
    bottomInset: insets.bottom,
  });
  const transactions = useSelector(selectTransactions);
  const transactionsLoading = useSelector(selectTransactionsLoading);
  const categories = useSelector(selectCategories);
  const {
    deleteTransaction,
    archiveTransactionsBeforeDate,
    restoreArchivedTransactionsBeforeDate,
    deleteArchivedTransactionsBeforeDate,
  } = useTransactions();
  const TYPE_FILTERS = [
    { id: null, label: t('transactions.typeAll') },
    { id: 'expense', label: t('transactions.typeExpense') },
    { id: 'income', label: t('transactions.typeIncome') },
    { id: 'transfer', label: t('transactions.typeTransfer') },
    { id: 'debt', label: t('transactions.typeDebt') },
  ];
  const currentMonthStart = createMonthStart(new Date());

  const [typeFilter, setTypeFilter] = useState(null);
  const [categoryFilter, setCategoryFilter] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(currentMonthStart);
  const [showAllPeriods, setShowAllPeriods] = useState(false);
  const [viewMode, setViewMode] = useState('active');
  const [maintenanceAction, setMaintenanceAction] = useState(null);

  const getCategoryDisplayName = (category) => {
    if (category?.isDefault && category?.id) {
      const translatedName = t(`categories.names.${category.id}`);
      return translatedName !== `categories.names.${category.id}` ? translatedName : category.name;
    }
    return category?.name || '';
  };

  const categoryMap = useMemo(
    () => new Map(categories.map((category) => [category.id, category])),
    [categories]
  );

  const maintenanceCutoff = showAllPeriods ? currentMonthStart : createMonthStart(selectedMonth);
  const maintenancePeriodLabel = formatDate(maintenanceCutoff, 'MMMM yyyy', language);
  const monthLabel = formatDate(selectedMonth, 'MMMM yyyy', language);
  const canMoveForward = !showAllPeriods && !isSameMonth(selectedMonth, currentMonthStart);

  const oldTransactions = useMemo(
    () => transactions.filter((transaction) => new Date(transaction.date) < maintenanceCutoff),
    [maintenanceCutoff, transactions]
  );
  const oldActiveTransactions = useMemo(
    () => oldTransactions.filter((transaction) => !transaction.archivedAt),
    [oldTransactions]
  );
  const oldArchivedTransactions = useMemo(
    () => oldTransactions.filter((transaction) => Boolean(transaction.archivedAt)),
    [oldTransactions]
  );
  const shouldShowMaintenanceCard = oldTransactions.length > 0;

  const filtered = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    return transactions.filter((transaction) => {
      const isArchived = Boolean(transaction.archivedAt);
      const date = new Date(transaction.date);

      if (viewMode === 'active' && isArchived) return false;
      if (viewMode === 'archived' && !isArchived) return false;
      if (!showAllPeriods && !isSameMonth(date, selectedMonth)) return false;
      if (typeFilter && transaction.type !== typeFilter) return false;
      if (categoryFilter && transaction.categoryId !== categoryFilter) return false;

      if (normalizedQuery) {
        const searchableFields = [
          transaction.category,
          transaction.description,
          transaction.walletName,
          transaction.createdByName,
          transaction.transferMeta?.sourceWalletName,
          transaction.transferMeta?.destinationWalletName,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();

        if (!searchableFields.includes(normalizedQuery)) return false;
      }
      return true;
    });
  }, [transactions, searchQuery, viewMode, showAllPeriods, selectedMonth, typeFilter, categoryFilter]);

  const grouped = useMemo(() => {
    const groups = {};
    filtered.forEach((transaction) => {
      const key = formatDate(transaction.date, 'yyyy-MM-dd', language);
      if (!groups[key]) groups[key] = { date: transaction.date, items: [] };
      const category = categoryMap.get(transaction.categoryId);
      groups[key].items.push({
        ...transaction,
        category: getCategoryDisplayName(category) || transaction.category,
        categoryIcon: transaction.categoryIcon || category?.icon,
        categoryColor: transaction.categoryColor || category?.color,
      });
    });
    return Object.values(groups).sort((first, second) => new Date(second.date) - new Date(first.date));
  }, [filtered, language, categoryMap, t]);

  const resetFilters = () => {
    setTypeFilter(null);
    setCategoryFilter(null);
    setSearchQuery('');
    setShowAllPeriods(false);
    setSelectedMonth(currentMonthStart);
    setViewMode('active');
  };

  const showNoOldDataAlert = (messageKey) => {
    Alert.alert(t('transactions.dataMaintenanceTitle'), t(messageKey, { period: maintenancePeriodLabel }));
  };

  const handleDelete = (transactionId) => {
    const transaction = transactions.find((item) => item.id === transactionId);
    if (transaction?.debtMeta?.linkedDebtId) {
      Alert.alert(t('transactions.managedByDebtTitle'), t('transactions.managedByDebtMessage'));
      return;
    }

    Alert.alert(t('transactions.deleteTitle'), t('transactions.deleteMessage'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: () => deleteTransaction(transactionId),
      },
    ]);
  };

  const handleBackupOldTransactions = async (transactionsToBackup = oldTransactions) => {
    if (transactionsToBackup.length === 0) {
      showNoOldDataAlert('transactions.noOldTransactions');
      return;
    }

    setMaintenanceAction('backup');
    const result = await exportTransactionsBackupToJSON(transactionsToBackup, {
      filenamePrefix: `transactions-before-${formatDate(maintenanceCutoff, 'yyyy-MM', language)}`,
      title: t('transactions.backupDialogTitle'),
      label: maintenancePeriodLabel,
    });
    setMaintenanceAction(null);

    if (result.error) {
      Alert.alert(t('common.error'), result.error);
      return;
    }

    Alert.alert(
      t('common.success'),
      t('transactions.backupSuccess', {
        count: result.counts.transactions,
        filename: result.filename,
      })
    );
  };

  const runArchiveOldTransactions = async () => {
    setMaintenanceAction('archive');
    const result = await archiveTransactionsBeforeDate(maintenanceCutoff);
    setMaintenanceAction(null);

    if (result.error) {
      Alert.alert(t('common.error'), result.error);
      return;
    }

    Alert.alert(
      t('common.success'),
      t('transactions.archiveSuccess', {
        count: result.archivedCount,
        period: maintenancePeriodLabel,
      })
    );
    setViewMode('archived');
    setShowAllPeriods(true);
  };

  const handleArchiveOldTransactions = () => {
    if (oldActiveTransactions.length === 0) {
      showNoOldDataAlert('transactions.noOldTransactionsToArchive');
      return;
    }

    Alert.alert(
      t('transactions.archiveOldTitle'),
      t('transactions.archiveOldMessage', {
        count: oldActiveTransactions.length,
        period: maintenancePeriodLabel,
      }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('transactions.archiveAction'),
          onPress: runArchiveOldTransactions,
        },
      ]
    );
  };

  const runRestoreArchivedTransactions = async () => {
    setMaintenanceAction('restore');
    const result = await restoreArchivedTransactionsBeforeDate(maintenanceCutoff);
    setMaintenanceAction(null);

    if (result.error) {
      Alert.alert(t('common.error'), result.error);
      return;
    }

    Alert.alert(
      t('common.success'),
      t('transactions.restoreArchiveSuccess', {
        count: result.restoredCount,
        period: maintenancePeriodLabel,
      })
    );
    setViewMode('active');
    setShowAllPeriods(false);
    setSelectedMonth(currentMonthStart);
  };

  const handleRestoreArchivedTransactions = () => {
    if (oldArchivedTransactions.length === 0) {
      showNoOldDataAlert('transactions.noArchivedTransactions');
      return;
    }

    Alert.alert(
      t('transactions.restoreArchiveTitle'),
      t('transactions.restoreArchiveMessage', {
        count: oldArchivedTransactions.length,
        period: maintenancePeriodLabel,
      }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('transactions.restoreArchiveAction'),
          onPress: runRestoreArchivedTransactions,
        },
      ]
    );
  };

  const runDeleteArchivedTransactions = async () => {
    setMaintenanceAction('delete');

    const backupResult = await exportTransactionsBackupToJSON(oldArchivedTransactions, {
      filenamePrefix: `archived-before-${formatDate(maintenanceCutoff, 'yyyy-MM', language)}`,
      title: t('transactions.deleteBackupDialogTitle'),
      label: maintenancePeriodLabel,
    });

    if (backupResult.error) {
      setMaintenanceAction(null);
      Alert.alert(t('common.error'), backupResult.error);
      return;
    }

    const deleteResult = await deleteArchivedTransactionsBeforeDate(maintenanceCutoff);
    setMaintenanceAction(null);

    if (deleteResult.error) {
      Alert.alert(t('common.error'), deleteResult.error);
      return;
    }

    Alert.alert(
      t('common.success'),
      t('transactions.deleteArchivedSuccess', {
        count: deleteResult.deletedCount,
        filename: backupResult.filename,
      })
    );
    setViewMode('active');
    setShowAllPeriods(false);
    setSelectedMonth(currentMonthStart);
  };

  const handleDeleteArchivedTransactions = () => {
    if (oldArchivedTransactions.length === 0) {
      showNoOldDataAlert('transactions.noArchivedTransactions');
      return;
    }

    Alert.alert(
      t('transactions.deleteArchivedTitle'),
      t('transactions.deleteArchivedMessage', {
        count: oldArchivedTransactions.length,
        period: maintenancePeriodLabel,
      }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('transactions.deleteAfterBackup'),
          style: 'destructive',
          onPress: runDeleteArchivedTransactions,
        },
      ]
    );
  };

  const renderMaintenanceAction = ({
    icon,
    label,
    tone = 'default',
    onPress,
    loadingKey,
    disabled = false,
  }) => {
    const isLoading = maintenanceAction === loadingKey;
    const isDisabled = disabled || Boolean(maintenanceAction);
    const iconColor = tone === 'danger'
      ? colors.expense
      : tone === 'success'
        ? colors.income
        : colors.primary;

    return (
      <TouchableOpacity
        style={[
          styles.maintenanceAction,
          tone === 'danger' && styles.maintenanceActionDanger,
          isDisabled && styles.maintenanceActionDisabled,
        ]}
        onPress={onPress}
        disabled={isDisabled}
      >
        {isLoading ? (
          <ActivityIndicator size="small" color={iconColor} />
        ) : (
          <Ionicons name={icon} size={18} color={iconColor} />
        )}
        <Text
          style={[
            styles.maintenanceActionText,
            tone === 'danger' && styles.maintenanceActionTextDanger,
          ]}
        >
          {label}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderHeader = () => (
    <LinearGradient colors={colors.gradients.header} style={styles.header}>
      <View style={styles.headerContent}>
        <Text style={styles.title} numberOfLines={1}>{t('transactions.title')}</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={() => navigation.navigate('Debts')} style={styles.addBtn}>
            <Ionicons name="card-outline" size={21} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('AddTransaction')} style={styles.addBtn}>
            <Ionicons name="add" size={24} color={colors.primary} />
          </TouchableOpacity>
        </View>
      </View>
    </LinearGradient>
  );

  const renderGroup = ({ item: group }) => (
    <View style={styles.group}>
      <View style={styles.groupHeader}>
        <Text style={styles.groupDate}>
          {formatDate(group.date, 'EEEE, dd MMMM yyyy', language)}
        </Text>
        {viewMode === 'archived' ? (
          <View style={styles.archiveBadge}>
            <Ionicons name="archive-outline" size={12} color={colors.primary} />
            <Text style={styles.archiveBadgeText}>{t('transactions.archivedView')}</Text>
          </View>
        ) : null}
      </View>
      {group.items.map((transaction) => (
        <TransactionCard
          key={transaction.id}
          transaction={transaction}
          onPress={(selectedTransaction) => navigation.navigate('TransactionDetail', { transaction: selectedTransaction })}
          onDelete={handleDelete}
        />
      ))}
    </View>
  );

  const maintenanceSection = shouldShowMaintenanceCard ? (
    <View style={styles.maintenanceCard}>
      <View style={styles.maintenanceHeader}>
        <View style={styles.maintenanceTitleRow}>
          <Ionicons name="archive-outline" size={18} color={colors.primary} />
          <Text style={styles.maintenanceTitle}>{t('transactions.dataMaintenanceTitle')}</Text>
        </View>
        <Text style={styles.maintenanceSubtitle}>
          {t('transactions.dataMaintenanceSubtitle', { period: maintenancePeriodLabel })}
        </Text>
      </View>

      <View style={styles.maintenanceStatsRow}>
        <View style={styles.maintenanceStat}>
          <Text style={styles.maintenanceStatValue}>{oldActiveTransactions.length}</Text>
          <Text style={styles.maintenanceStatLabel}>{t('transactions.readyToArchive')}</Text>
        </View>
        <View style={styles.maintenanceStat}>
          <Text style={styles.maintenanceStatValue}>{oldArchivedTransactions.length}</Text>
          <Text style={styles.maintenanceStatLabel}>{t('transactions.archivedCountLabel')}</Text>
        </View>
      </View>

      <View style={styles.maintenanceActions}>
        {renderMaintenanceAction({
          icon: 'download-outline',
          label: t('transactions.backupOldData'),
          onPress: () => handleBackupOldTransactions(),
          loadingKey: 'backup',
        })}
        {renderMaintenanceAction({
          icon: 'file-tray-full-outline',
          label: t('transactions.archiveAction'),
          onPress: handleArchiveOldTransactions,
          loadingKey: 'archive',
          disabled: oldActiveTransactions.length === 0,
        })}
        {renderMaintenanceAction({
          icon: 'arrow-undo-outline',
          label: t('transactions.restoreArchiveAction'),
          tone: 'success',
          onPress: handleRestoreArchivedTransactions,
          loadingKey: 'restore',
          disabled: oldArchivedTransactions.length === 0,
        })}
        {renderMaintenanceAction({
          icon: 'trash-outline',
          label: t('transactions.deleteAfterBackup'),
          tone: 'danger',
          onPress: handleDeleteArchivedTransactions,
          loadingKey: 'delete',
          disabled: oldArchivedTransactions.length === 0,
        })}
      </View>
    </View>
  ) : null;

  if (transactionsLoading && transactions.length === 0) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        {renderHeader()}
        <LoadingState />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      {renderHeader()}

      <View style={styles.filters}>
        <Input
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder={t('transactions.searchPlaceholder')}
          icon="search-outline"
          style={styles.searchInput}
        />

        <View style={styles.filterSection}>
          <Text style={styles.filterLabel}>{t('transactions.periodLabel')}</Text>
          <View style={styles.periodNavigator}>
            <TouchableOpacity
              style={[styles.periodArrow, showAllPeriods && styles.periodArrowDisabled]}
              disabled={showAllPeriods}
              onPress={() => {
                setShowAllPeriods(false);
                setSelectedMonth((currentValue) => shiftMonth(currentValue, -1));
              }}
            >
              <Ionicons name="chevron-back" size={18} color={showAllPeriods ? colors.textMuted : colors.textPrimary} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.periodPill, showAllPeriods && styles.periodPillInactive]}
              onPress={() => setShowAllPeriods(false)}
            >
              <Text style={[styles.periodPillText, showAllPeriods && styles.periodPillTextInactive]}>
                {monthLabel}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.periodArrow, !canMoveForward && styles.periodArrowDisabled]}
              disabled={!canMoveForward}
              onPress={() => setSelectedMonth((currentValue) => shiftMonth(currentValue, 1))}
            >
              <Ionicons name="chevron-forward" size={18} color={!canMoveForward ? colors.textMuted : colors.textPrimary} />
            </TouchableOpacity>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalFilterContent}
          >
            <TouchableOpacity
              style={[styles.filterChip, !showAllPeriods && isSameMonth(selectedMonth, currentMonthStart) && styles.filterChipActive]}
              onPress={() => {
                setShowAllPeriods(false);
                setSelectedMonth(currentMonthStart);
              }}
            >
              <Text style={[styles.filterChipText, !showAllPeriods && isSameMonth(selectedMonth, currentMonthStart) && styles.filterChipTextActive]}>
                {t('transactions.currentMonth')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterChip, showAllPeriods && styles.filterChipActive]}
              onPress={() => setShowAllPeriods(true)}
            >
              <Text style={[styles.filterChipText, showAllPeriods && styles.filterChipTextActive]}>
                {t('transactions.allPeriods')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterChip, viewMode === 'active' && styles.filterChipActive]}
              onPress={() => setViewMode('active')}
            >
              <Text style={[styles.filterChipText, viewMode === 'active' && styles.filterChipTextActive]}>
                {t('transactions.activeView')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterChip, viewMode === 'archived' && styles.filterChipActive]}
              onPress={() => {
                setViewMode('archived');
                setShowAllPeriods(true);
              }}
            >
              <Text style={[styles.filterChipText, viewMode === 'archived' && styles.filterChipTextActive]}>
                {t('transactions.archivedView')}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        <View style={styles.filterSection}>
          <Text style={styles.filterLabel}>{t('transaction.type')}</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalFilterContent}
          >
            {TYPE_FILTERS.map((filter) => (
              <TouchableOpacity
                key={String(filter.id)}
                style={[styles.filterChip, typeFilter === filter.id && styles.filterChipActive]}
                onPress={() => {
                  setTypeFilter(filter.id);
                  if (filter.id === 'transfer') setCategoryFilter(null);
                }}
              >
                <Text style={[styles.filterChipText, typeFilter === filter.id && styles.filterChipTextActive]}>
                  {filter.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {typeFilter !== 'transfer' ? (
          <View style={styles.filterSection}>
            <Text style={styles.filterLabel}>{t('common.category')}</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalFilterContent}
            >
              <TouchableOpacity
                style={[styles.categoryChip, !categoryFilter && styles.categoryChipActive]}
                onPress={() => setCategoryFilter(null)}
              >
                <Ionicons
                  name="apps-outline"
                  size={14}
                  color={!categoryFilter ? '#FFFFFF' : colors.textMuted}
                />
                <Text style={[styles.categoryChipText, !categoryFilter && styles.categoryChipTextActive]}>
                  {t('common.all')}
                </Text>
              </TouchableOpacity>
              {categories.map((category) => (
                <TouchableOpacity
                  key={category.id}
                  style={[styles.categoryChip, categoryFilter === category.id && styles.categoryChipActive]}
                  onPress={() => setCategoryFilter(category.id)}
                >
                  <Text>{category.icon}</Text>
                  <Text style={[styles.categoryChipText, categoryFilter === category.id && styles.categoryChipTextActive]}>
                    {getCategoryDisplayName(category)}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        ) : null}
      </View>

      <View style={styles.stats}>
        <Text style={styles.statsText}>
          {t('common.transactionCount', {
            count: filtered.length,
            suffix: filtered.length !== 1 ? 's' : '',
          })}
        </Text>
        {(typeFilter || categoryFilter || searchQuery || showAllPeriods || viewMode === 'archived' || !isSameMonth(selectedMonth, currentMonthStart)) && (
          <TouchableOpacity onPress={resetFilters}>
            <Text style={styles.clearFilter}>{t('common.clearFilters')}</Text>
          </TouchableOpacity>
        )}
      </View>

      {grouped.length === 0 ? (
        <View style={styles.emptyStateContainer}>
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>{viewMode === 'archived' ? '🗃️' : '🔍'}</Text>
            <Text style={styles.emptyText}>
              {viewMode === 'archived' ? t('transactions.noArchivedTransactionsInView') : t('transactions.noTransactions')}
            </Text>
          </View>
          {maintenanceSection}
        </View>
      ) : (
        <FlatList
          data={grouped}
          keyExtractor={(item) => formatDate(item.date, 'yyyy-MM-dd', language)}
          renderItem={renderGroup}
          ListFooterComponent={maintenanceSection}
          contentContainerStyle={styles.list}
          style={styles.listView}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
};

const createStyles = (colors, { isCompact, isNarrow, isTablet, isLargeTablet, bottomInset }) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    paddingHorizontal: isTablet ? SPACING.xl : SPACING.lg,
    paddingVertical: SPACING.md,
  },
  headerContent: {
    width: '100%',
    maxWidth: isLargeTablet ? 1120 : isTablet ? 980 : '100%',
    alignSelf: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  title: { fontSize: FONT_SIZE.xl, fontFamily: FONT_FAMILY.bold, color: colors.textPrimary, flex: 1, marginRight: SPACING.sm },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: `${colors.primary}20`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filters: {
    width: '100%',
    maxWidth: isLargeTablet ? 1120 : isTablet ? 980 : '100%',
    alignSelf: 'center',
    paddingHorizontal: isTablet ? SPACING.xl : SPACING.lg,
    paddingTop: 6,
    paddingBottom: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: 6,
  },
  searchInput: {
    marginBottom: 0,
  },
  filterSection: {
    gap: 6,
  },
  filterLabel: {
    color: colors.textMuted,
    fontSize: FONT_SIZE.xs,
    fontFamily: FONT_FAMILY.medium,
  },
  horizontalFilterContent: {
    paddingRight: SPACING.lg,
    gap: 6,
  },
  periodNavigator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    width: '100%',
  },
  periodArrow: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  periodArrowDisabled: {
    opacity: 0.45,
  },
  periodPill: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: BORDER_RADIUS.full,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: `${colors.primary}12`,
  },
  periodPillInactive: {
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  periodPillText: {
    color: colors.primary,
    fontSize: FONT_SIZE.sm,
    fontFamily: FONT_FAMILY.semibold,
    textAlign: 'center',
  },
  periodPillTextInactive: {
    color: colors.textSecondary,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterChipText: { color: colors.textSecondary, fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.medium, fontFamily: FONT_FAMILY.medium },
  filterChipTextActive: { color: '#FFFFFF' },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: BORDER_RADIUS.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    maxWidth: 180,
  },
  categoryChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  categoryChipText: { color: colors.textSecondary, fontSize: FONT_SIZE.xs, fontFamily: FONT_FAMILY.regular },
  categoryChipTextActive: { color: '#FFFFFF' },
  maintenanceCard: {
    width: '100%',
    maxWidth: isLargeTablet ? 1120 : isTablet ? 980 : '100%',
    alignSelf: 'center',
    marginHorizontal: 0,
    marginTop: SPACING.md,
    marginBottom: SPACING.sm,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    ...SHADOWS.sm,
    gap: SPACING.md,
  },
  maintenanceHeader: {
    gap: 6,
  },
  maintenanceTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  maintenanceTitle: {
    color: colors.textPrimary,
    fontSize: FONT_SIZE.md,
    fontFamily: FONT_FAMILY.semibold,
  },
  maintenanceSubtitle: {
    color: colors.textSecondary,
    fontSize: FONT_SIZE.sm,
    fontFamily: FONT_FAMILY.regular,
    lineHeight: 20,
  },
  maintenanceStatsRow: {
    flexDirection: isNarrow ? 'column' : 'row',
    gap: SPACING.sm,
  },
  maintenanceStat: {
    flex: 1,
    padding: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: `${colors.primary}10`,
    gap: 4,
  },
  maintenanceStatValue: {
    color: colors.textPrimary,
    fontSize: FONT_SIZE.lg,
    fontFamily: FONT_FAMILY.bold,
  },
  maintenanceStatLabel: {
    color: colors.textSecondary,
    fontSize: FONT_SIZE.xs,
    fontFamily: FONT_FAMILY.medium,
  },
  maintenanceActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  maintenanceAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexBasis: isNarrow ? '100%' : isLargeTablet ? '24%' : '48%',
    flexGrow: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  maintenanceActionDanger: {
    borderColor: `${colors.expense}40`,
    backgroundColor: `${colors.expense}10`,
  },
  maintenanceActionDisabled: {
    opacity: 0.45,
  },
  maintenanceActionText: {
    color: colors.textPrimary,
    fontSize: FONT_SIZE.sm,
    fontFamily: FONT_FAMILY.medium,
    flexShrink: 1,
  },
  maintenanceActionTextDanger: {
    color: colors.expense,
  },
  stats: {
    flexDirection: isCompact ? 'column' : 'row',
    justifyContent: 'space-between',
    alignSelf: 'center',
    width: '100%',
    maxWidth: isLargeTablet ? 1120 : isTablet ? 980 : '100%',
    paddingHorizontal: isTablet ? SPACING.xl : SPACING.lg,
    paddingVertical: 6,
    gap: isCompact ? SPACING.xs : SPACING.sm,
  },
  statsText: { color: colors.textMuted, fontSize: FONT_SIZE.sm, fontFamily: FONT_FAMILY.regular, flexShrink: 1 },
  clearFilter: { color: colors.primary, fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.medium, fontFamily: FONT_FAMILY.medium },
  listView: { flex: 1 },
  list: {
    paddingHorizontal: isTablet ? SPACING.xl : SPACING.lg,
    paddingBottom: Math.max(bottomInset + SPACING.xxl, 88),
  },
  group: {
    width: '100%',
    maxWidth: isLargeTablet ? 1120 : isTablet ? 980 : '100%',
    alignSelf: 'center',
    marginBottom: SPACING.md,
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  groupDate: {
    color: colors.textMuted,
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.medium,
    fontFamily: FONT_FAMILY.medium,
    flexShrink: 1,
  },
  archiveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: `${colors.primary}12`,
  },
  archiveBadgeText: {
    color: colors.primary,
    fontSize: FONT_SIZE.xs,
    fontFamily: FONT_FAMILY.medium,
  },
  emptyStateContainer: {
    flex: 1,
    width: '100%',
    maxWidth: isLargeTablet ? 1120 : isTablet ? 980 : '100%',
    alignSelf: 'center',
    paddingHorizontal: isTablet ? SPACING.xl : SPACING.lg,
    paddingBottom: Math.max(bottomInset + SPACING.xxl, 88),
  },
  empty: { alignItems: 'center', justifyContent: 'center', paddingTop: 80, paddingBottom: SPACING.xl },
  emptyIcon: { fontSize: 48, marginBottom: SPACING.md },
  emptyText: { color: colors.textSecondary, fontSize: FONT_SIZE.lg, fontFamily: FONT_FAMILY.regular, textAlign: 'center', paddingHorizontal: SPACING.xl },
});

export default TransactionsScreen;
