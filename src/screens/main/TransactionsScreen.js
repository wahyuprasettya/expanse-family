// ============================================================
// Transactions Screen (Full History + Filters)
// ============================================================
import React, { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSelector } from 'react-redux';
import { selectTransactions } from '@store/transactionSlice';
import { selectCategories } from '@store/categorySlice';
import { useTransactions } from '@hooks/useTransactions';
import TransactionCard from '@components/transaction/TransactionCard';
import { BORDER_RADIUS, FONT_SIZE, FONT_WEIGHT, SPACING } from '@constants/theme';
import { formatDate } from '@utils/formatters';
import { useTranslation } from '@hooks/useTranslation';
import { useAppTheme } from '@hooks/useAppTheme';

export const TransactionsScreen = ({ navigation }) => {
  const { t, language } = useTranslation();
  const { colors } = useAppTheme();
  const styles = createStyles(colors);
  const transactions = useSelector(selectTransactions);
  const categories = useSelector(selectCategories);
  const { deleteTransaction } = useTransactions();
  const TYPE_FILTERS = [
    { id: null, label: t('transactions.typeAll') },
    { id: 'expense', label: t('transactions.typeExpense') },
    { id: 'income', label: t('transactions.typeIncome') },
  ];

  const [typeFilter, setTypeFilter] = useState(null);
  const [categoryFilter, setCategoryFilter] = useState(null);
  const [showCategoryFilter, setShowCategoryFilter] = useState(false);

  const filtered = useMemo(() => {
    return transactions.filter((transaction) => {
      if (typeFilter && transaction.type !== typeFilter) return false;
      if (categoryFilter && transaction.categoryId !== categoryFilter) return false;
      return true;
    });
  }, [transactions, typeFilter, categoryFilter]);

  const grouped = useMemo(() => {
    const groups = {};
    filtered.forEach((transaction) => {
      const key = formatDate(transaction.date, 'yyyy-MM-dd', language);
      if (!groups[key]) groups[key] = { date: transaction.date, items: [] };
      groups[key].items.push(transaction);
    });
    return Object.values(groups).sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [filtered, language]);

  const handleDelete = (transactionId) => {
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

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <LinearGradient colors={colors.gradients.header} style={styles.header}>
        <Text style={styles.title}>{t('transactions.title')}</Text>
        <TouchableOpacity onPress={() => navigation.navigate('AddTransaction')} style={styles.addBtn}>
          <Ionicons name="add" size={24} color={colors.primary} />
        </TouchableOpacity>
      </LinearGradient>

      <View style={styles.filters}>
        <View style={styles.typeFilters}>
          {TYPE_FILTERS.map((filter) => (
            <TouchableOpacity
              key={String(filter.id)}
              style={[styles.filterChip, typeFilter === filter.id && styles.filterChipActive]}
              onPress={() => setTypeFilter(filter.id)}
            >
              <Text style={[styles.filterChipText, typeFilter === filter.id && styles.filterChipTextActive]}>
                {filter.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={[styles.categoryFilterBtn, categoryFilter && styles.categoryFilterActive]}
          onPress={() => setShowCategoryFilter(!showCategoryFilter)}
        >
          <Ionicons name="filter" size={16} color={categoryFilter ? colors.primary : colors.textMuted} />
          <Text style={[styles.categoryFilterText, categoryFilter && { color: colors.primary }]}>
            {categoryFilter ? categories.find((category) => category.id === categoryFilter)?.name || t('common.category') : t('common.category')}
          </Text>
        </TouchableOpacity>
      </View>

      {showCategoryFilter && (
        <View style={styles.categoryChips}>
          <TouchableOpacity
            style={[styles.categoryChip, !categoryFilter && styles.categoryChipActive]}
            onPress={() => { setCategoryFilter(null); setShowCategoryFilter(false); }}
          >
            <Text style={[styles.categoryChipText, !categoryFilter && { color: colors.primary }]}>{t('common.all')}</Text>
          </TouchableOpacity>
          {categories.map((category) => (
            <TouchableOpacity
              key={category.id}
              style={[styles.categoryChip, categoryFilter === category.id && styles.categoryChipActive]}
              onPress={() => { setCategoryFilter(category.id); setShowCategoryFilter(false); }}
            >
              <Text>{category.icon}</Text>
              <Text style={[styles.categoryChipText, categoryFilter === category.id && { color: colors.primary }]}>
                {category.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <View style={styles.stats}>
        <Text style={styles.statsText}>
          {t('common.transactionCount', {
            count: filtered.length,
            suffix: filtered.length !== 1 ? 's' : '',
          })}
        </Text>
        {(typeFilter || categoryFilter) && (
          <TouchableOpacity onPress={() => { setTypeFilter(null); setCategoryFilter(null); }}>
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
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
};

const createStyles = (colors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  title: { fontSize: FONT_SIZE.xl, fontWeight: FONT_WEIGHT.bold, color: colors.textPrimary },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: `${colors.primary}20`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filters: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  typeFilters: { flexDirection: 'row', gap: 8 },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterChipText: { color: colors.textSecondary, fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.medium },
  filterChipTextActive: { color: '#FFFFFF' },
  categoryFilterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  categoryFilterActive: { borderColor: colors.primary },
  categoryFilterText: { color: colors.textMuted, fontSize: FONT_SIZE.sm },
  categoryChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: SPACING.sm,
    paddingHorizontal: SPACING.md,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: BORDER_RADIUS.full,
    borderWidth: 1,
    borderColor: colors.border,
  },
  categoryChipActive: { borderColor: colors.primary },
  categoryChipText: { color: colors.textSecondary, fontSize: FONT_SIZE.xs },
  stats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
  },
  statsText: { color: colors.textMuted, fontSize: FONT_SIZE.sm },
  clearFilter: { color: colors.primary, fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.medium },
  list: { paddingHorizontal: SPACING.lg, paddingBottom: SPACING.xxl },
  group: { marginBottom: SPACING.md },
  groupDate: {
    color: colors.textMuted,
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.medium,
    marginBottom: SPACING.sm,
  },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
  emptyIcon: { fontSize: 48, marginBottom: SPACING.md },
  emptyText: { color: colors.textSecondary, fontSize: FONT_SIZE.lg },
});

export default TransactionsScreen;
