// ============================================================
// Budget Screen
// ============================================================
import React, { useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Alert, Modal, ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSelector, useDispatch } from 'react-redux';
import { selectUser } from '@store/authSlice';
import { selectBudgets, selectBudgetsLoading, removeBudgetLocal } from '@store/budgetSlice';
import { selectTransactions } from '@store/transactionSlice';
import { addBudget, deleteBudget } from '@services/firebase/budgets';
import { selectCategories } from '@store/categorySlice';
import BudgetCard from '@components/budget/BudgetCard';
import Button from '@components/common/Button';
import Input from '@components/common/Input';
import LoadingState from '@components/common/LoadingState';
import { BORDER_RADIUS, FONT_SIZE, FONT_WEIGHT, FONT_FAMILY, SPACING, SHADOWS } from '@constants/theme';
import { formatCurrency, formatDate, parseAmount } from '@utils/formatters';
import { calcBudgetUsage, getBudgetStatus, isExpenseTransaction } from '@utils/calculations';
import { useTranslation } from '@hooks/useTranslation';
import { useAppTheme } from '@hooks/useAppTheme';

export const BudgetScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const { t, language } = useTranslation();
  const { colors } = useAppTheme();
  const styles = createStyles(colors);
  const user = useSelector(selectUser);
  const budgets = useSelector(selectBudgets);
  const budgetsLoading = useSelector(selectBudgetsLoading);
  const transactions = useSelector(selectTransactions);
  const categories = useSelector(selectCategories);
  const now = new Date();
  const [year] = useState(now.getFullYear());
  const [month] = useState(now.getMonth() + 1);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [budgetAmount, setBudgetAmount] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAdd = async () => {
    if (!selectedCategory || !budgetAmount || parseAmount(budgetAmount) <= 0) {
      Alert.alert(t('common.error'), t('budget.fillAllFields'));
      return;
    }

    const categoryName = getCategoryDisplayName(selectedCategory);

    setLoading(true);
    const { error } = await addBudget(user.uid, {
      categoryId: selectedCategory.id,
      categoryName,
      categoryIcon: selectedCategory.icon,
      amount: parseAmount(budgetAmount),
      period: 'monthly',
      month,
      year,
      spent: 0,
    });
    setLoading(false);

    if (error) {
      Alert.alert(t('common.error'), error);
      return;
    }

    setShowAddModal(false);
    setSelectedCategory(null);
    setBudgetAmount('');
  };

  const handleDelete = (budgetId) => {
    Alert.alert(t('budget.deleteTitle'), t('budget.deleteMessage'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          await deleteBudget(budgetId);
          dispatch(removeBudgetLocal(budgetId));
        },
      },
    ]);
  };

  const getCategoryDisplayName = (category) => {
    // If it's a default category, use translation, otherwise use the custom name
    if (category?.isDefault && category?.id) {
      const translatedName = t(`categories.names.${category.id}`);
      // If translation key doesn't exist, it returns the key itself, so check if it's different
      return translatedName !== `categories.names.${category.id}` ? translatedName : category.name;
    }
    return category?.name || '';
  };

  const budgetList = useMemo(() => {
    const categoryMap = new Map(categories.map((category) => [category.id, category]));
    const monthlySpending = transactions
      .filter((transaction) => {
        const date = new Date(transaction.date);
        return (
          isExpenseTransaction(transaction) &&
          date.getFullYear() === year &&
          date.getMonth() + 1 === month
        );
      })
      .reduce((accumulator, transaction) => {
        accumulator[transaction.categoryId] = (accumulator[transaction.categoryId] || 0) + transaction.amount;
        return accumulator;
      }, {});

    const getStatusLabel = (status) => {
      if (language === 'en') {
        if (status === 'exceeded') return 'Exceeded';
        if (status === 'critical') return 'Almost gone';
        if (status === 'warning') return 'Warning';
        return 'Safe';
      }

      if (status === 'exceeded') return 'Terlampaui';
      if (status === 'critical') return 'Hampir habis';
      if (status === 'warning') return 'Waspada';
      return 'Aman';
    };

    return budgets
      .map((budget) => {
        const category = categoryMap.get(budget.categoryId);
        const spent = monthlySpending[budget.categoryId] || 0;
        const usagePercentage = calcBudgetUsage(spent, budget.amount);
        const status = getBudgetStatus(usagePercentage);
        const categoryName = getCategoryDisplayName(category || {
          id: budget.categoryId,
          name: budget.categoryName,
          isDefault: false,
        });

        return {
          ...budget,
          categoryName,
          categoryIcon: category?.icon || budget.categoryIcon,
          spent,
          usagePercentage,
          status,
          statusLabel: getStatusLabel(status),
          message: status === 'exceeded'
            ? (language === 'en'
                ? `${categoryName} budget has been exceeded`
                : `Budget ${categoryName} sudah terlampaui`)
            : status === 'critical'
              ? (language === 'en'
                  ? `${categoryName} budget is almost gone`
                  : `Budget ${categoryName} hampir habis`)
              : status === 'warning'
                ? (language === 'en'
                    ? `${categoryName} budget is already used ${usagePercentage}%`
                    : `Budget ${categoryName} sudah terpakai ${usagePercentage}%`)
                : (language === 'en'
                    ? `${categoryName} budget is still safe`
                    : `Budget ${categoryName} kamu masih aman`),
        };
      })
      .sort((first, second) => second.usagePercentage - first.usagePercentage);
  }, [budgets, categories, transactions, year, month, language, t]);

  const totalBudget = budgetList.reduce((sum, budget) => sum + budget.amount, 0);
  const totalSpent = budgetList.reduce((sum, budget) => sum + (budget.spent || 0), 0);


  if (budgetsLoading && budgetList.length === 0) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <LinearGradient colors={colors.gradients.header} style={styles.header}>
          <Text style={styles.title}>{t('budget.title')}</Text>
          <Text style={styles.subtitle}>{formatDate(new Date(year, month - 1, 1), 'MMM yyyy', language)}</Text>
          <TouchableOpacity style={styles.addBtn} onPress={() => setShowAddModal(true)}>
            <Ionicons name="add" size={24} color={colors.primary} />
          </TouchableOpacity>
        </LinearGradient>
        <LoadingState />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <LinearGradient colors={colors.gradients.header} style={styles.header}>
        <Text style={styles.title}>{t('budget.title')}</Text>
        <Text style={styles.subtitle}>{formatDate(new Date(year, month - 1, 1), 'MMM yyyy', language)}</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => setShowAddModal(true)}>
          <Ionicons name="add" size={24} color={colors.primary} />
        </TouchableOpacity>
      </LinearGradient>

      {budgetList.length > 0 && (
        <View style={styles.overallCard}>
          <View style={styles.overallInfo}>
            <Text style={styles.overallLabel}>{t('budget.totalBudgetUsed')}</Text>
            <Text style={styles.overallValues}>
              <Text style={{ color: totalSpent > totalBudget ? colors.expense : colors.income }}>
                {Math.round(totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0)}%
              </Text>
              <Text style={styles.overallSub}> · {t('budget.leftAmount', {
                amount: formatCurrency(totalBudget - totalSpent, 'IDR', language),
              })}</Text>
            </Text>
          </View>
          <View style={styles.overallTrack}>
            <View
              style={[
                styles.overallFill,
                {
                  width: `${Math.min(totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0, 100)}%`,
                  backgroundColor: totalSpent > totalBudget ? colors.expense : colors.primary,
                },
              ]}
            />
          </View>
        </View>
      )}

      {budgetList.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>🎯</Text>
          <Text style={styles.emptyText}>{t('budget.noBudgets')}</Text>
          <Text style={styles.emptySubtext}>{t('budget.setLimits')}</Text>
          <Button title={t('budget.addBudget')} onPress={() => setShowAddModal(true)} style={styles.emptyBtn} fullWidth={false} />
        </View>
      ) : (
        <FlatList
          data={budgetList}
          keyExtractor={(budget) => budget.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <TouchableOpacity onLongPress={() => handleDelete(item.id)}>
              <BudgetCard budget={item} />
            </TouchableOpacity>
          )}
          showsVerticalScrollIndicator={false}
        />
      )}

      <Modal visible={showAddModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('budget.addBudgetTitle')}</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <Ionicons name="close" size={24} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={true} contentContainerStyle={styles.modalScrollContent}>
              <Text style={styles.modalLabel}>{t('budget.selectCategory')}</Text>
              <View style={styles.categoryGrid}>
                {categories.filter((category) => category.type === 'expense' || category.type === 'both').map((category) => (
                  <TouchableOpacity
                    key={category.id}
                    style={[
                      styles.catItem,
                      selectedCategory?.id === category.id && styles.catItemSelected,

                    ]}
                    onPress={() => setSelectedCategory(category)}
                  >
                    <Text style={styles.catIcon}>{category.icon}</Text>
                    <Text style={styles.catName} numberOfLines={2}>
                      {getCategoryDisplayName(category)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Input
                label={t('budget.monthlyLimit')}
                value={budgetAmount}
                onChangeText={setBudgetAmount}
                placeholder={t('budget.monthlyLimitPlaceholder')}
                keyboardType="numeric"
                formatAsRupiah
                icon="wallet-outline"
                prefix="Rp"
              />

              <Button title={t('budget.setBudget')} onPress={handleAdd} loading={loading} />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const createStyles = (colors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  title: { fontSize: FONT_SIZE.xl, fontFamily: FONT_FAMILY.bold, color: colors.textPrimary, flex: 1 },
  subtitle: { color: colors.textMuted, fontSize: FONT_SIZE.sm, fontFamily: FONT_FAMILY.regular, marginRight: 8 },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: `${colors.primary}20`,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  overallCard: {
    margin: SPACING.lg,
    backgroundColor: colors.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...SHADOWS.sm,
  },
  overallInfo: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: SPACING.sm },
  overallLabel: { color: colors.textSecondary, fontSize: FONT_SIZE.sm, fontFamily: FONT_FAMILY.regular },
  overallValues: { fontSize: FONT_SIZE.sm, fontFamily: FONT_FAMILY.regular },
  overallSub: { color: colors.textMuted, fontWeight: FONT_WEIGHT.regular, fontFamily: FONT_FAMILY.regular },
  overallTrack: {
    height: 10,
    backgroundColor: colors.surfaceVariant,
    borderRadius: BORDER_RADIUS.full,
    overflow: 'hidden',
  },
  overallFill: { height: '100%', borderRadius: BORDER_RADIUS.full },
  list: { paddingHorizontal: SPACING.lg, paddingBottom: SPACING.xxl + 40 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyIcon: { fontSize: 60, marginBottom: SPACING.md },
  emptyText: { fontSize: FONT_SIZE.xl, fontFamily: FONT_FAMILY.bold, color: colors.textPrimary },
  emptySubtext: { color: colors.textMuted, fontSize: FONT_SIZE.md, fontFamily: FONT_FAMILY.regular, marginBottom: SPACING.lg },
  emptyBtn: { paddingHorizontal: 0 },
  modalOverlay: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: BORDER_RADIUS.xl,
    borderTopRightRadius: BORDER_RADIUS.xl,
    padding: SPACING.lg,
    maxHeight: '90%',
  },
  modalScrollContent: {
    paddingBottom: SPACING.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  modalTitle: { fontSize: FONT_SIZE.lg, fontFamily: FONT_FAMILY.bold, color: colors.textPrimary },
  modalLabel: { color: colors.textSecondary, fontSize: FONT_SIZE.sm, marginBottom: SPACING.sm, fontWeight: '500', fontFamily: FONT_FAMILY.medium },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: SPACING.lg },
  catItem: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    width: '31%',
    minHeight: 92,
  },
  catItemSelected: { borderColor: colors.primary, backgroundColor: `${colors.primary}20` },
  catIcon: { fontSize: 22, marginBottom: 4 },
  catName: { color: colors.textSecondary, fontSize: FONT_SIZE.xs, fontFamily: FONT_FAMILY.regular, textAlign: 'center' },
});

export default BudgetScreen;
