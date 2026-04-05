// ============================================================
// Budget Screen
// ============================================================
import React, { useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, useWindowDimensions,
  Alert, Modal, ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSelector, useDispatch } from 'react-redux';
import { selectProfile, selectUser } from '@store/authSlice';
import {
  selectBudgets,
  selectBudgetsLoading,
  removeBudgetLocal,
  updateBudgetLocal,
} from '@store/budgetSlice';
import { selectTransactions } from '@store/transactionSlice';
import { selectWallets } from '@store/walletSlice';
import { addBudget, deleteBudget, updateBudget } from '@services/firebase/budgets';
import { selectCategories } from '@store/categorySlice';
import BudgetCard from '@components/budget/BudgetCard';
import Button from '@components/common/Button';
import Input from '@components/common/Input';
import LoadingState from '@components/common/LoadingState';
import { BORDER_RADIUS, FONT_SIZE, FONT_WEIGHT, FONT_FAMILY, SPACING, SHADOWS } from '@constants/theme';
import { formatCurrency, formatDate, formatRupiahInput, parseAmount } from '@utils/formatters';
import { calcBudgetUsage, getBudgetStatus, isExpenseTransaction } from '@utils/calculations';
import { useTranslation } from '@hooks/useTranslation';
import { useAppTheme } from '@hooks/useAppTheme';

export const BudgetScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const { t, language } = useTranslation();
  const { width } = useWindowDimensions();
  const isCompact = width < 380;
  const categoryColumns = width < 360 ? 2 : 3;
  const { colors } = useAppTheme();
  const styles = createStyles(colors, { isCompact, categoryColumns });
  const user = useSelector(selectUser);
  const profile = useSelector(selectProfile);
  const budgets = useSelector(selectBudgets);
  const budgetsLoading = useSelector(selectBudgetsLoading);
  const transactions = useSelector(selectTransactions);
  const categories = useSelector(selectCategories);
  const wallets = useSelector(selectWallets);
  const accountId = profile?.householdId || user?.uid;
  const now = new Date();
  const [year] = useState(now.getFullYear());
  const [month] = useState(now.getMonth() + 1);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedWallet, setSelectedWallet] = useState(null);
  const [budgetAmount, setBudgetAmount] = useState('');
  const [editingBudget, setEditingBudget] = useState(null);
  const [loading, setLoading] = useState(false);

  const resetBudgetForm = () => {
    setShowAddModal(false);
    setShowWalletModal(false);
    setSelectedCategory(null);
    setSelectedWallet(null);
    setBudgetAmount('');
    setEditingBudget(null);
  };

  const openAddBudgetModal = () => {
    setEditingBudget(null);
    setSelectedCategory(null);
    setSelectedWallet(null);
    setBudgetAmount('');
    setShowAddModal(true);
  };

  const openEditBudgetModal = (budget) => {
    const category = categories.find((item) => item.id === budget.categoryId) || {
      id: budget.categoryId,
      name: budget.categoryName,
      icon: budget.categoryIcon || '📦',
      type: 'expense',
      isDefault: false,
    };
    const wallet = wallets.find((item) => item.id === budget.walletId) || (
      budget.walletId
        ? {
            id: budget.walletId,
            name: budget.walletName,
            balance: 0,
          }
        : null
    );

    setEditingBudget(budget);
    setSelectedCategory(category);
    setSelectedWallet(wallet);
    setBudgetAmount(formatRupiahInput(String(budget.amount || '')));
    setShowAddModal(true);
  };

  const handleSubmitBudget = async () => {
    if (!selectedCategory || !budgetAmount || parseAmount(budgetAmount) <= 0) {
      Alert.alert(t('common.error'), t('budget.fillAllFields'));
      return;
    }
    if (wallets.length > 0 && !selectedWallet) {
      Alert.alert(t('common.error'), t('budget.walletRequired'));
      return;
    }

    const categoryName = getCategoryDisplayName(selectedCategory);
    const parsedAmount = parseAmount(budgetAmount);
    const nextWalletId = selectedWallet?.id || null;
    const nextWalletName = selectedWallet?.name || null;

    setLoading(true);
    const result = editingBudget
      ? await updateBudget(editingBudget.id, {
          amount: parsedAmount,
          categoryName,
          categoryIcon: selectedCategory.icon,
          walletId: nextWalletId,
          walletName: nextWalletName,
        })
      : await addBudget(accountId, {
          categoryId: selectedCategory.id,
          categoryName,
          categoryIcon: selectedCategory.icon,
          walletId: nextWalletId,
          walletName: nextWalletName,
          amount: parsedAmount,
          period: 'monthly',
          month,
          year,
          spent: 0,
        });
    setLoading(false);

    if (result?.error) {
      Alert.alert(t('common.error'), result.error);
      return;
    }

    if (editingBudget) {
      dispatch(updateBudgetLocal({
        id: editingBudget.id,
        amount: parsedAmount,
        categoryName,
        categoryIcon: selectedCategory.icon,
        walletId: nextWalletId,
        walletName: nextWalletName,
      }));
    }

    resetBudgetForm();
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

  const walletOptions = useMemo(() => {
    if (!selectedWallet) {
      return wallets;
    }

    return wallets.some((wallet) => wallet.id === selectedWallet.id)
      ? wallets
      : [selectedWallet, ...wallets];
  }, [selectedWallet, wallets]);

  const budgetList = useMemo(() => {
    const categoryMap = new Map(categories.map((category) => [category.id, category]));
    const walletMap = new Map(wallets.map((wallet) => [wallet.id, wallet]));
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
        const categoryKey = transaction.categoryId;
        const walletKey = getBudgetWalletKey(transaction.categoryId, transaction.walletId);
        accumulator.byCategory[categoryKey] = (accumulator.byCategory[categoryKey] || 0) + transaction.amount;
        accumulator.byCategoryWallet[walletKey] = (accumulator.byCategoryWallet[walletKey] || 0) + transaction.amount;
        return accumulator;
      }, { byCategory: {}, byCategoryWallet: {} });

    const getStatusLabel = (status) => {
      if (status === 'exceeded') return t('budget.statusExceeded');
      if (status === 'critical') return t('budget.statusCritical');
      if (status === 'warning') return t('budget.statusWarning');
      return t('budget.statusSafe');
    };

    return budgets
      .map((budget) => {
        const category = categoryMap.get(budget.categoryId);
        const resolvedWalletName = walletMap.get(budget.walletId)?.name || budget.walletName || null;
        const spent = budget.walletId
          ? (monthlySpending.byCategoryWallet[getBudgetWalletKey(budget.categoryId, budget.walletId)] || 0)
          : (monthlySpending.byCategory[budget.categoryId] || 0);
        const usagePercentage = calcBudgetUsage(spent, budget.amount);
        const status = getBudgetStatus(usagePercentage);
        const categoryName = getCategoryDisplayName(category || {
          id: budget.categoryId,
          name: budget.categoryName,
          isDefault: false,
        });
        const budgetSubject = getBudgetSubject(t, categoryName, resolvedWalletName);
        const walletDisplayName = resolvedWalletName || t('budget.allFundingSources');

        return {
          ...budget,
          categoryName,
          categoryIcon: category?.icon || budget.categoryIcon,
          walletName: resolvedWalletName,
          walletDisplayName,
          spent,
          usagePercentage,
          status,
          statusLabel: getStatusLabel(status),
          message: status === 'exceeded'
            ? t('budget.messageExceeded', { subject: budgetSubject })
            : status === 'critical'
              ? t('budget.messageCritical', { subject: budgetSubject })
              : status === 'warning'
                ? t('budget.messageWarning', { subject: budgetSubject, percent: usagePercentage })
                : t('budget.messageSafe', { subject: budgetSubject }),
        };
      })
      .sort((first, second) => second.usagePercentage - first.usagePercentage);
  }, [budgets, categories, language, month, t, transactions, wallets, year]);

  const totalBudget = budgetList.reduce((sum, budget) => sum + budget.amount, 0);
  const totalSpent = budgetList.reduce((sum, budget) => sum + (budget.spent || 0), 0);
  const showSharedAssetHint = profile?.householdRole === 'partner' || Boolean(profile?.householdId && profile?.householdId !== user?.uid);


  if (budgetsLoading && budgetList.length === 0) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <LinearGradient colors={colors.gradients.header} style={styles.header}>
          <Text style={styles.title}>{t('budget.title')}</Text>
          <Text style={styles.subtitle}>{formatDate(new Date(year, month - 1, 1), 'MMM yyyy', language)}</Text>
          <TouchableOpacity style={styles.addBtn} onPress={openAddBudgetModal}>
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
        <TouchableOpacity style={styles.addBtn} onPress={openAddBudgetModal}>
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

      {showSharedAssetHint ? (
        <TouchableOpacity
          style={styles.sharedAssetCard}
          activeOpacity={0.86}
          onPress={() => navigation.navigate('Assets')}
        >
          <View style={styles.sharedAssetIcon}>
            <Ionicons name="diamond-outline" size={20} color={colors.warning} />
          </View>
          <View style={styles.sharedAssetInfo}>
            <Text style={styles.sharedAssetTitle}>
              {t('budget.sharedAssetsTitle')}
            </Text>
            <Text style={styles.sharedAssetSubtitle}>
              {t('budget.sharedAssetsSubtitle')}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
        </TouchableOpacity>
      ) : null}

      {budgetList.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>🎯</Text>
          <Text style={styles.emptyText}>{t('budget.noBudgets')}</Text>
          <Text style={styles.emptySubtext}>{t('budget.setLimits')}</Text>
          <Button title={t('budget.addBudget')} onPress={openAddBudgetModal} style={styles.emptyBtn} fullWidth={false} />
        </View>
      ) : (
        <FlatList
          data={budgetList}
          keyExtractor={(budget) => budget.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <TouchableOpacity onPress={() => openEditBudgetModal(item)} onLongPress={() => handleDelete(item.id)}>
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
              <Text style={styles.modalTitle}>
                {editingBudget ? t('budget.editBudgetTitle') : t('budget.addBudgetTitle')}
              </Text>
              <TouchableOpacity onPress={resetBudgetForm}>
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
                    onPress={() => !editingBudget && setSelectedCategory(category)}
                    disabled={Boolean(editingBudget)}
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

              <Text style={styles.modalLabel}>{t('budget.selectWallet')}</Text>
              {walletOptions.length > 0 ? (
                <TouchableOpacity style={styles.selector} onPress={() => setShowWalletModal(true)}>
                  {selectedWallet ? (
                    <View style={styles.selectedWallet}>
                      <Ionicons name="wallet-outline" size={18} color={colors.primary} />
                      <Text style={styles.selectedWalletName} numberOfLines={1}>{selectedWallet.name}</Text>
                    </View>
                  ) : (
                    <Text style={styles.selectorPlaceholder} numberOfLines={1}>{t('budget.selectWallet')}</Text>
                  )}
                  <Ionicons name="chevron-down" size={20} color={colors.textMuted} />
                </TouchableOpacity>
              ) : (
                <View style={styles.emptyWalletCard}>
                  <View style={styles.emptyWalletTextWrap}>
                    <Text style={styles.emptyWalletTitle}>{t('budget.noWalletTitle')}</Text>
                    <Text style={styles.emptyWalletSubtitle}>{t('budget.noWalletSubtitle')}</Text>
                  </View>
                  <Button
                    title={t('budget.createWallet')}
                    onPress={() => navigation.navigate('Wallets')}
                    fullWidth={false}
                    size="sm"
                  />
                </View>
              )}

              <Button
                title={editingBudget ? t('budget.updateBudget') : t('budget.setBudget')}
                onPress={handleSubmitBudget}
                loading={loading}
              />
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={showWalletModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('budget.selectWallet')}</Text>
              <TouchableOpacity onPress={() => setShowWalletModal(false)}>
                <Ionicons name="close" size={24} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <FlatList
              data={walletOptions}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.walletList}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.walletItem,
                    selectedWallet?.id === item.id && styles.walletItemSelected,
                  ]}
                  onPress={() => {
                    setSelectedWallet(item);
                    setShowWalletModal(false);
                  }}
                >
                  <View style={styles.walletItemIcon}>
                    <Ionicons name="wallet-outline" size={18} color={colors.primary} />
                  </View>
                  <View style={styles.walletItemInfo}>
                    <Text style={styles.walletItemName} numberOfLines={1}>{item.name}</Text>
                    <Text style={styles.walletItemBalance} numberOfLines={1}>
                      {formatCurrency(item.balance || 0, 'IDR', language)}
                    </Text>
                  </View>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const createStyles = (colors, { isCompact, categoryColumns }) => StyleSheet.create({
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
  overallInfo: {
    flexDirection: isCompact ? 'column' : 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm,
    gap: isCompact ? SPACING.xs : SPACING.sm,
  },
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
  sharedAssetCard: {
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.md,
    marginBottom: SPACING.sm,
    backgroundColor: colors.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    ...SHADOWS.sm,
  },
  sharedAssetIcon: {
    width: 42,
    height: 42,
    borderRadius: BORDER_RADIUS.lg,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: `${colors.warning}18`,
  },
  sharedAssetInfo: { flex: 1 },
  sharedAssetTitle: {
    color: colors.textPrimary,
    fontSize: FONT_SIZE.md,
    fontFamily: FONT_FAMILY.semibold,
  },
  sharedAssetSubtitle: {
    color: colors.textSecondary,
    fontSize: FONT_SIZE.sm,
    fontFamily: FONT_FAMILY.regular,
    marginTop: 2,
    lineHeight: 20,
  },
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
    maxHeight: '92%',
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
  selector: {
    minHeight: 54,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectedWallet: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    flex: 1,
  },
  selectedWalletName: {
    color: colors.textPrimary,
    fontSize: FONT_SIZE.md,
    fontFamily: FONT_FAMILY.medium,
    flex: 1,
  },
  selectorPlaceholder: {
    color: colors.textMuted,
    fontSize: FONT_SIZE.md,
    fontFamily: FONT_FAMILY.regular,
  },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: SPACING.lg },
  catItem: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    width: categoryColumns === 2 ? '48%' : '31%',
    minHeight: 92,
  },
  catItemSelected: { borderColor: colors.primary, backgroundColor: `${colors.primary}20` },
  catIcon: { fontSize: 22, marginBottom: 4 },
  catName: { color: colors.textSecondary, fontSize: FONT_SIZE.xs, fontFamily: FONT_FAMILY.regular, textAlign: 'center' },
  emptyWalletCard: {
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
    gap: SPACING.md,
  },
  emptyWalletTextWrap: {
    gap: 4,
  },
  emptyWalletTitle: {
    color: colors.textPrimary,
    fontSize: FONT_SIZE.sm,
    fontFamily: FONT_FAMILY.semibold,
  },
  emptyWalletSubtitle: {
    color: colors.textSecondary,
    fontSize: FONT_SIZE.sm,
    fontFamily: FONT_FAMILY.regular,
    lineHeight: 20,
  },
  walletList: {
    paddingBottom: SPACING.md,
  },
  walletItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    backgroundColor: colors.background,
  },
  walletItemSelected: {
    borderColor: colors.primary,
    backgroundColor: `${colors.primary}12`,
  },
  walletItemIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: `${colors.primary}15`,
  },
  walletItemInfo: {
    flex: 1,
    minWidth: 0,
  },
  walletItemName: {
    color: colors.textPrimary,
    fontSize: FONT_SIZE.md,
    fontFamily: FONT_FAMILY.semibold,
  },
  walletItemBalance: {
    color: colors.textSecondary,
    fontSize: FONT_SIZE.sm,
    fontFamily: FONT_FAMILY.regular,
    marginTop: 2,
  },
});

const normalizeBudgetWalletId = (walletId) => walletId || null;
const getBudgetWalletKey = (categoryId, walletId) =>
  `${categoryId || 'uncategorized'}::${normalizeBudgetWalletId(walletId) || 'all'}`;
const getBudgetSubject = (t, categoryName, walletName) => (
  walletName
    ? t('budget.subjectWithWallet', { category: categoryName, wallet: walletName })
    : t('budget.subjectDefault', { category: categoryName })
);

export default BudgetScreen;
