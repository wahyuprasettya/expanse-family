// ============================================================
// Transactions Screen (Full History + Filters)
// ============================================================
import React, { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, ScrollView, useWindowDimensions
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSelector } from 'react-redux';
import { selectTransactions, selectTransactionsLoading } from '@store/transactionSlice';
import { selectCategories } from '@store/categorySlice';
import { useTransactions } from '@hooks/useTransactions';
import TransactionCard from '@components/transaction/TransactionCard';
import LoadingState from '@components/common/LoadingState';
import Input from '@components/common/Input';
import { BORDER_RADIUS, FONT_SIZE, FONT_WEIGHT, FONT_FAMILY, SPACING } from '@constants/theme';
import { formatDate } from '@utils/formatters';
import { useTranslation } from '@hooks/useTranslation';
import { useAppTheme } from '@hooks/useAppTheme';

export const TransactionsScreen = ({ navigation }) => {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isCompact = width < 380;
  const { t, language } = useTranslation();
  const { colors } = useAppTheme();
  const styles = createStyles(colors, { isCompact, bottomInset: insets.bottom });
  const transactions = useSelector(selectTransactions);
  const transactionsLoading = useSelector(selectTransactionsLoading);
  const categories = useSelector(selectCategories);
  const { deleteTransaction } = useTransactions();
  const TYPE_FILTERS = [
    { id: null, label: t('transactions.typeAll') },
    { id: 'expense', label: t('transactions.typeExpense') },
    { id: 'income', label: t('transactions.typeIncome') },
    { id: 'transfer', label: t('transactions.typeTransfer') },
    { id: 'debt', label: t('transactions.typeDebt') },
  ];

  const [typeFilter, setTypeFilter] = useState(null);
  const [categoryFilter, setCategoryFilter] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

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

  const filtered = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    return transactions.filter((transaction) => {
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
  }, [transactions, typeFilter, categoryFilter, searchQuery]);

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
    return Object.values(groups).sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [filtered, language, categoryMap, t]);

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

  const renderGroup = ({ item: group }) => (
    <View style={styles.group}>
      <Text style={styles.groupDate}>
        {formatDate(group.date, 'EEEE, dd MMMM yyyy', language)}
      </Text>
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

  if (transactionsLoading && transactions.length === 0) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <LinearGradient colors={colors.gradients.header} style={styles.header}>
          <Text style={styles.title} numberOfLines={1}>{t('transactions.title')}</Text>
          <View style={styles.headerActions}>
            <TouchableOpacity onPress={() => navigation.navigate('Debts')} style={styles.addBtn}>
              <Ionicons name="card-outline" size={21} color={colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => navigation.navigate('AddTransaction')} style={styles.addBtn}>
              <Ionicons name="add" size={24} color={colors.primary} />
            </TouchableOpacity>
          </View>
        </LinearGradient>
        <LoadingState />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <LinearGradient colors={colors.gradients.header} style={styles.header}>
        <Text style={styles.title} numberOfLines={1}>{t('transactions.title')}</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={() => navigation.navigate('Debts')} style={styles.addBtn}>
            <Ionicons name="card-outline" size={21} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('AddTransaction')} style={styles.addBtn}>
            <Ionicons name="add" size={24} color={colors.primary} />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <View style={styles.filters}>
        <Input
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder={t('transactions.searchPlaceholder')}
          icon="search-outline"
          style={styles.searchInput}
        />

        <View style={styles.filterSection}>
          <Text style={styles.filterLabel}>{t('transaction.type')}</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator
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
              showsHorizontalScrollIndicator
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
        {(typeFilter || categoryFilter || searchQuery) && (
          <TouchableOpacity onPress={() => { setTypeFilter(null); setCategoryFilter(null); setSearchQuery(''); }}>
            <Text style={styles.clearFilter}>{t('common.clearFilters')}</Text>
          </TouchableOpacity>
        )}
      </View>

      {grouped.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>🔍</Text>
          <Text style={styles.emptyText}>{t('transactions.noTransactions')}</Text>
        </View>
      ) : (
        <FlatList
          data={grouped}
          keyExtractor={(item) => formatDate(item.date, 'yyyy-MM-dd', language)}
          renderItem={renderGroup}
          contentContainerStyle={styles.list}
          style={styles.listView}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
};

const createStyles = (colors, { isCompact, bottomInset }) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
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
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: SPACING.sm,
  },
  searchInput: {
    marginBottom: 0,
  },
  filterSection: {
    gap: 8,
  },
  filterLabel: {
    color: colors.textMuted,
    fontSize: FONT_SIZE.xs,
    fontFamily: FONT_FAMILY.medium,
  },
  horizontalFilterContent: {
    paddingRight: SPACING.lg,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
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
    paddingVertical: 8,
    borderRadius: BORDER_RADIUS.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    maxWidth: 180,
  },
  categoryChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  categoryChipText: { color: colors.textSecondary, fontSize: FONT_SIZE.xs, fontFamily: FONT_FAMILY.regular },
  categoryChipTextActive: { color: '#FFFFFF' },
  stats: {
    flexDirection: isCompact ? 'column' : 'row',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    gap: isCompact ? SPACING.xs : SPACING.sm,
  },
  statsText: { color: colors.textMuted, fontSize: FONT_SIZE.sm, fontFamily: FONT_FAMILY.regular, flexShrink: 1 },
  clearFilter: { color: colors.primary, fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.medium, fontFamily: FONT_FAMILY.medium },
  listView: { flex: 1 },
  list: { paddingHorizontal: SPACING.lg, paddingBottom: Math.max(bottomInset + SPACING.xxl, 88) },
  group: { marginBottom: SPACING.md },
  groupDate: {
    color: colors.textMuted,
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.medium,
    fontFamily: FONT_FAMILY.medium,
    marginBottom: SPACING.sm,
    flexShrink: 1,
  },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
  emptyIcon: { fontSize: 48, marginBottom: SPACING.md },
  emptyText: { color: colors.textSecondary, fontSize: FONT_SIZE.lg, fontFamily: FONT_FAMILY.regular },
});

export default TransactionsScreen;
