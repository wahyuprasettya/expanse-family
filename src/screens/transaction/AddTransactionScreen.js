// ============================================================
// Add Transaction Screen
// ============================================================
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  KeyboardAvoidingView, Platform, Alert, FlatList, Modal, useWindowDimensions
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSelector } from 'react-redux';
import { selectCategories } from '@store/categorySlice';
import { selectWallets } from '@store/walletSlice';
import { useTransactions } from '@hooks/useTransactions';
import Input from '@components/common/Input';
import Button from '@components/common/Button';
import { BORDER_RADIUS, FONT_SIZE, FONT_WEIGHT, FONT_FAMILY, SPACING, SHADOWS } from '@constants/theme';
import { useAppTheme } from '@hooks/useAppTheme';
import { useTranslation } from '@hooks/useTranslation';
import { parseAmount, formatDate, formatRupiahInput } from '@utils/formatters';
import DateTimePicker from '@react-native-community/datetimepicker';

const TRANSACTION_TYPES = ['expense', 'income', 'debt'];

export const AddTransactionScreen = ({ navigation, route }) => {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isCompact = width < 380;
  const isNarrow = width < 350;
  const categoryColumns = width < 360 ? 2 : 3;
  const { colors } = useAppTheme();
  const { t, language } = useTranslation();
  const styles = createStyles(colors, { isCompact, isNarrow, categoryColumns, bottomInset: insets.bottom });
  const categories = useSelector(selectCategories);
  const wallets = useSelector(selectWallets);
  const { addTransaction, updateTransaction } = useTransactions();
  const editingTransaction = route?.params?.transaction || null;
  const editingTransactionId = route?.params?.transactionId || editingTransaction?.id || null;
  const isEditMode = Boolean(editingTransactionId);

  const [type, setType] = useState('expense');
  const [amount, setAmount] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedWallet, setSelectedWallet] = useState(null);
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date());
  const [dueDate, setDueDate] = useState(() => {
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    return nextWeek;
  });
  const [creditorName, setCreditorName] = useState('');
  const [remindDaysBefore, setRemindDaysBefore] = useState('3');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [datePickerTarget, setDatePickerTarget] = useState('transaction');
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const isSubmittingRef = useRef(false);
  const submissionKeyRef = useRef(null);
  const isDebt = type === 'debt';

  const getCategoryDisplayName = (category) => {
    if (category?.isDefault && category?.id) {
      const translatedName = t(`categories.names.${category.id}`);
      return translatedName !== `categories.names.${category.id}` ? translatedName : category.name;
    }
    return category?.name || '';
  };

  const filteredCategories = useMemo(() => categories.filter((category) => {
    if (isDebt) return category.type === 'expense' || category.type === 'both' || category.id === 'debt';
    return category.type === type || category.type === 'both';
  }), [categories, isDebt, type]);

  useEffect(() => {
    const prefill = route?.params?.prefill;
    if (!prefill || isEditMode) return;

    if (prefill.type) {
      setType(prefill.type);
      setSelectedCategory((currentCategory) => {
        if (prefill.type === 'debt') {
          return categories.find((category) => category.id === 'debt') || currentCategory;
        }

        if (!currentCategory) return null;
        return currentCategory.type === prefill.type || currentCategory.type === 'both'
          ? currentCategory
          : null;
      });
    }
    if (prefill.amount) setAmount(formatRupiahInput(prefill.amount));
    if (prefill.description) setDescription(prefill.description);
    if (prefill.date) setDate(new Date(prefill.date));
    setSelectedWallet(null);
    setErrors({});
  }, [categories, isEditMode, route?.params?.prefill]);

  useEffect(() => {
    if (!isEditMode || !editingTransaction) return;

    setType(editingTransaction.type || 'expense');
    setAmount(formatRupiahInput(editingTransaction.amount));
    setDescription(editingTransaction.description || '');
    setDate(editingTransaction.date ? new Date(editingTransaction.date) : new Date());

    const nextCategory = categories.find((category) => category.id === editingTransaction.categoryId)
      || (editingTransaction.categoryId
        ? {
            id: editingTransaction.categoryId,
            name: editingTransaction.category,
            icon: editingTransaction.categoryIcon || '📦',
            color: editingTransaction.categoryColor || colors.primary,
            type: editingTransaction.type,
            isDefault: false,
          }
        : null);
    setSelectedCategory(nextCategory);

    const nextWallet = wallets.find((wallet) => wallet.id === editingTransaction.walletId)
      || (editingTransaction.walletId
        ? {
            id: editingTransaction.walletId,
            name: editingTransaction.walletName,
            balance: 0,
          }
        : null);
    setSelectedWallet(nextWallet);

    if (editingTransaction.type === 'debt') {
      setCreditorName(editingTransaction.debtMeta?.creditorName || '');
      setDueDate(editingTransaction.debtMeta?.dueDate ? new Date(editingTransaction.debtMeta.dueDate) : new Date());
      setRemindDaysBefore(String(editingTransaction.debtMeta?.remindDaysBefore ?? 3));
    } else {
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);
      setCreditorName('');
      setDueDate(nextWeek);
      setRemindDaysBefore('3');
    }

    setErrors({});
  }, [categories, colors.primary, editingTransaction, isEditMode, wallets]);

  const validate = () => {
    const newErrors = {};
    if (!amount || parseAmount(amount) <= 0) newErrors.amount = t('addTransaction.amountRequired');
    if (!selectedCategory) newErrors.category = t('addTransaction.categoryRequired');
    if (wallets.length > 0 && !selectedWallet) newErrors.wallet = t('addTransaction.walletRequired');
    if (isDebt) {
      if (!creditorName.trim()) newErrors.creditorName = t('addTransaction.creditorRequired');
      if (!dueDate) newErrors.dueDate = t('addTransaction.dueDateRequired');
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChangeType = (nextType) => {
    setType(nextType);
    if (nextType === 'debt') {
      setSelectedCategory(categories.find((category) => category.id === 'debt') || null);
    } else {
      setSelectedCategory(null);
    }
    setErrors({});
  };

  const openDatePicker = (target) => {
    setDatePickerTarget(target);
    setShowDatePicker(true);
  };

  const handleScanReceipt = () => {
    navigation.navigate('ScanReceipt');
  };

  const handleSubmit = async () => {
    if (loading || isSubmittingRef.current) return;
    if (!validate()) return;
    if (!isEditMode && !submissionKeyRef.current) {
      submissionKeyRef.current = `tx-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    }
    isSubmittingRef.current = true;
    setLoading(true);
    let error = null;
    try {
      const payload = {
        amount: parseAmount(amount),
        type,
        category: getCategoryDisplayName(selectedCategory),
        categoryId: selectedCategory.id,
        walletId: selectedWallet?.id || null,
        walletName: selectedWallet?.name || null,
        categoryIcon: selectedCategory.icon,
        categoryColor: selectedCategory.color,
        description: description.trim(),
        date: date.toISOString(),
        debtMeta: isDebt ? {
          creditorName: creditorName.trim(),
          dueDate: dueDate.toISOString(),
          remindDaysBefore: parseInt(remindDaysBefore, 10) || 3,
        } : null,
      };
      if (!isEditMode) {
        payload.clientRequestId = submissionKeyRef.current;
      }
      const result = isEditMode
        ? await updateTransaction(editingTransactionId, payload)
        : await addTransaction(payload);
      error = result?.error || null;
    } finally {
      isSubmittingRef.current = false;
      setLoading(false);
    }

    if (error) {
      Alert.alert('Error', error);
    } else {
      submissionKeyRef.current = null;
      navigation.goBack();
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        {/* Header */}
        <LinearGradient colors={colors.gradients.header} style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="close" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {isEditMode ? t('addTransaction.editTitle') : t('addTransaction.title')}
          </Text>
          <View style={{ width: 40 }} />
        </LinearGradient>

        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          {/* Type Toggle */}
          <View style={styles.typeToggle}>
            {TRANSACTION_TYPES.map((txType) => (
              <TouchableOpacity
                key={txType}
                style={[
                  styles.typeBtn,
                  type === txType && {
                    backgroundColor: txType === 'income'
                      ? colors.income
                      : txType === 'debt'
                        ? colors.warning
                        : colors.expense,
                  },
                ]}
                onPress={() => handleChangeType(txType)}
              >
                <Text style={[styles.typeBtnText, type === txType && styles.typeBtnTextActive]}>
                  {txType === 'expense' ? t('common.expense') : txType === 'income' ? t('common.income') : t('addTransaction.typeDebt')}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity style={styles.receiptScannerCard} onPress={handleScanReceipt}>
            <View style={styles.receiptScannerIcon}>
              <Ionicons name="receipt-outline" size={20} color={colors.primary} />
            </View>
            <View style={styles.receiptScannerInfo}>
              <Text style={styles.receiptScannerTitle}>{t('profile.scanReceipt')}</Text>
              <Text style={styles.receiptScannerSubtitle}>{t('addTransaction.scanReceiptSubtitle')}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </TouchableOpacity>

          {/* Amount */}
          <View style={styles.amountContainer}>
            <Text style={styles.amountLabel}>{t('addTransaction.amount')}</Text>
            <View style={styles.amountInput}>
              <Text style={styles.currencySymbol}>Rp</Text>
              <Input
                value={amount}
                onChangeText={setAmount}
                placeholder="0"
                keyboardType="numeric"
                formatAsRupiah
                inputStyle={styles.amountText}
                style={{ flex: 1, marginBottom: 0 }}
                error={errors.amount}
              />
            </View>
          </View>

          {/* Category Picker */}
          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>{t('common.category')}</Text>
            <TouchableOpacity
              style={[styles.categorySelector, errors.category && styles.fieldError]}
              onPress={() => setShowCategoryModal(true)}
            >
              {selectedCategory ? (
                <View style={styles.selectedCategory}>
                  <Text style={styles.selectedCategoryIcon}>{selectedCategory.icon}</Text>
                  <Text style={styles.selectedCategoryName} numberOfLines={1}>
                    {getCategoryDisplayName(selectedCategory)}
                  </Text>
                </View>
              ) : (
                <Text style={styles.categoryPlaceholder} numberOfLines={1}>{t('addTransaction.selectCategory')}</Text>
              )}
              <Ionicons name="chevron-down" size={20} color={colors.textMuted} />
            </TouchableOpacity>
            {errors.category && <Text style={styles.errorText}>{errors.category}</Text>}
          </View>

          {/* Wallet Picker */}
          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>{t('addTransaction.selectWallet')}</Text>
            {wallets.length > 0 ? (
              <>
                <TouchableOpacity
                  style={[styles.categorySelector, errors.wallet && styles.fieldError]}
                  onPress={() => setShowWalletModal(true)}
                >
                  {selectedWallet ? (
                    <View style={styles.selectedCategory}>
                      <Ionicons name="wallet-outline" size={18} color={colors.primary} />
                      <Text style={styles.selectedCategoryName} numberOfLines={1}>{selectedWallet.name}</Text>
                    </View>
                  ) : (
                    <Text style={styles.categoryPlaceholder} numberOfLines={1}>{t('addTransaction.selectWallet')}</Text>
                  )}
                  <Ionicons name="chevron-down" size={20} color={colors.textMuted} />
                </TouchableOpacity>
                {errors.wallet ? <Text style={styles.errorText}>{errors.wallet}</Text> : null}
              </>
            ) : (
              <View style={styles.emptyWalletCard}>
                <View style={styles.emptyWalletTextWrap}>
                  <Text style={styles.emptyWalletTitle}>{t('addTransaction.noWalletTitle')}</Text>
                  <Text style={styles.emptyWalletSubtitle}>{t('addTransaction.noWalletSubtitle')}</Text>
                </View>
                <Button
                  title={t('addTransaction.createWallet')}
                  onPress={() => navigation.navigate('Wallets')}
                  fullWidth={false}
                  size="sm"
                />
              </View>
            )}
          </View>

          {/* Date Picker */}
          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>{t('common.date')}</Text>
            <TouchableOpacity style={styles.dateSelector} onPress={() => openDatePicker('transaction')}>
              <Ionicons name="calendar-outline" size={18} color={colors.textMuted} />
              <Text style={styles.dateText} numberOfLines={1}>
                {formatDate(date, 'EEEE, dd MMMM yyyy', language)}
              </Text>
              <Ionicons name="chevron-down" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          {showDatePicker && (
            <DateTimePicker
              value={datePickerTarget === 'due' ? dueDate : date}
              mode="date"
              display="default"
              maximumDate={datePickerTarget === 'transaction' ? new Date() : undefined}
              minimumDate={datePickerTarget === 'due' ? new Date() : undefined}
              onChange={(event, selectedDate) => {
                setShowDatePicker(false);
                if (!selectedDate) return;
                if (datePickerTarget === 'due') setDueDate(selectedDate);
                else setDate(selectedDate);
              }}
            />
          )}

          {isDebt ? (
            <View style={styles.debtSection}>
              <Text style={styles.sectionTitle}>{t('addTransaction.debtSection')}</Text>
              <Input
                label={t('addTransaction.creditorName')}
                value={creditorName}
                onChangeText={setCreditorName}
                placeholder={t('addTransaction.creditorPlaceholder')}
                icon="person-outline"
                error={errors.creditorName}
              />
              <View style={styles.fieldContainer}>
                <Text style={styles.fieldLabel}>{t('addTransaction.dueDate')}</Text>
                <TouchableOpacity
                  style={[styles.dateSelector, errors.dueDate && styles.fieldError]}
                  onPress={() => openDatePicker('due')}
                >
                  <Ionicons name="alarm-outline" size={18} color={colors.textMuted} />
                  <Text style={styles.dateText} numberOfLines={1}>
                    {formatDate(dueDate, 'EEEE, dd MMMM yyyy', language)}
                  </Text>
                  <Ionicons name="chevron-down" size={18} color={colors.textMuted} />
                </TouchableOpacity>
                {errors.dueDate ? <Text style={styles.errorText}>{errors.dueDate}</Text> : null}
              </View>
              <Input
                label={t('addTransaction.remindBefore')}
                value={remindDaysBefore}
                onChangeText={setRemindDaysBefore}
                placeholder={t('addTransaction.remindPlaceholder')}
                keyboardType="numeric"
                icon="notifications-outline"
                hint={t('addTransaction.daysBeforeSuffix')}
              />
            </View>
          ) : null}

          {/* Description */}
          <Input
            label={t('addTransaction.description')}
            value={description}
            onChangeText={setDescription}
            placeholder={isDebt ? t('addTransaction.debtDescriptionPlaceholder') : t('addTransaction.descriptionPlaceholder')}
            icon="document-text-outline"
            multiline
            numberOfLines={3}
          />

          <Button
            title={isEditMode
              ? (isDebt ? t('addTransaction.updateDebtBtn') : t('addTransaction.updateBtn'))
              : (isDebt ? t('addTransaction.addDebtBtn') : t('addTransaction.addBtn'))}
            onPress={handleSubmit}
            loading={loading}
            style={styles.submitBtn}
          />
        </ScrollView>

        {/* Category Modal */}
        <Modal visible={showCategoryModal} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{t('addTransaction.selectCategory')}</Text>
                <TouchableOpacity onPress={() => setShowCategoryModal(false)}>
                  <Ionicons name="close" size={24} color={colors.textPrimary} />
                </TouchableOpacity>
              </View>
              <FlatList
                data={filteredCategories}
                keyExtractor={(item) => item.id}
                numColumns={categoryColumns}
                contentContainerStyle={styles.categoryGrid}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[
                      styles.categoryItem,
                      selectedCategory?.id === item.id && styles.categoryItemSelected,
                      { borderColor: item.color },
                    ]}
                    onPress={() => { setSelectedCategory(item); setShowCategoryModal(false); }}
                  >
                    <Text style={styles.categoryItemIcon}>{item.icon}</Text>
                    <Text style={styles.categoryItemName} numberOfLines={2}>{getCategoryDisplayName(item)}</Text>
                  </TouchableOpacity>
                )}
              />
            </View>
          </View>
        </Modal>

        <Modal visible={showWalletModal} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{t('addTransaction.selectWallet')}</Text>
                <TouchableOpacity onPress={() => setShowWalletModal(false)}>
                  <Ionicons name="close" size={24} color={colors.textPrimary} />
                </TouchableOpacity>
              </View>
              <FlatList
                data={wallets}
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
                      setErrors((prev) => ({ ...prev, wallet: null }));
                      setShowWalletModal(false);
                    }}
                  >
                    <View style={styles.walletItemIcon}>
                      <Ionicons name="wallet-outline" size={18} color={colors.primary} />
                    </View>
                    <View style={styles.walletItemInfo}>
                      <Text style={styles.walletItemName} numberOfLines={1}>{item.name}</Text>
                      <Text style={styles.walletItemBalance} numberOfLines={1}>
                        Rp {parseAmount(item.balance).toLocaleString(language === 'en' ? 'en-US' : 'id-ID')}
                      </Text>
                    </View>
                  </TouchableOpacity>
                )}
              />
            </View>
          </View>
        </Modal>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const createStyles = (colors, { isCompact, isNarrow, categoryColumns, bottomInset }) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: {
    fontSize: FONT_SIZE.lg,
    fontFamily: FONT_FAMILY.bold,
    color: colors.textPrimary,
    flex: 1,
    textAlign: 'center',
    marginHorizontal: SPACING.sm,
  },
  content: { flex: 1 },
  contentContainer: {
    padding: SPACING.lg,
    paddingBottom: Math.max(bottomInset + SPACING.xl, SPACING.xxl),
  },
  typeToggle: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: 4,
    marginBottom: SPACING.lg,
    borderWidth: 1, borderColor: colors.border,
  },
  receiptScannerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...SHADOWS.sm,
  },
  receiptScannerIcon: {
    width: 40,
    height: 40,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: `${colors.primary}18`,
    marginRight: SPACING.md,
  },
  receiptScannerInfo: { flex: 1 },
  receiptScannerTitle: {
    color: colors.textPrimary,
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.semibold,
    fontFamily: FONT_FAMILY.semibold,
  },
  receiptScannerSubtitle: {
    color: colors.textMuted,
    fontSize: FONT_SIZE.xs,
    fontFamily: FONT_FAMILY.regular,
    marginTop: 2,
  },
  typeBtn: {
    flex: 1,
    paddingVertical: isNarrow ? 10 : 12,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
  },
  typeBtnText: {
    fontSize: isNarrow ? FONT_SIZE.sm : FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.medium,
    fontFamily: FONT_FAMILY.medium,
    color: colors.textMuted,
  },
  typeBtnTextActive: { color: '#FFFFFF', fontFamily: FONT_FAMILY.bold },
  amountContainer: { marginBottom: SPACING.lg },
  amountLabel: { color: colors.textSecondary, fontSize: FONT_SIZE.sm, fontWeight: '500', fontFamily: FONT_FAMILY.medium, marginBottom: 6 },
  amountInput: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  currencySymbol: {
    fontSize: isCompact ? FONT_SIZE.lg : FONT_SIZE.xl,
    fontWeight: FONT_WEIGHT.bold,
    fontFamily: FONT_FAMILY.bold,
    color: colors.textSecondary,
    marginTop: -16,
  },
  amountText: {
    fontSize: isNarrow ? FONT_SIZE.xxl : FONT_SIZE.xxxl,
    fontWeight: FONT_WEIGHT.extrabold,
    fontFamily: FONT_FAMILY.extrabold,
    color: colors.textPrimary,
  },
  fieldContainer: { marginBottom: SPACING.md },
  fieldLabel: { color: colors.textSecondary, fontSize: FONT_SIZE.sm, fontWeight: '500', fontFamily: FONT_FAMILY.medium, marginBottom: 6 },
  sectionTitle: {
    color: colors.textPrimary,
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.bold,
    fontFamily: FONT_FAMILY.bold,
    marginBottom: SPACING.md,
  },
  debtSection: {
    marginBottom: SPACING.sm,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    ...SHADOWS.sm,
  },
  categorySelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    borderWidth: 1, borderColor: colors.border,
  },
  emptyWalletCard: {
    backgroundColor: colors.surface,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: SPACING.md,
    gap: SPACING.md,
  },
  emptyWalletTextWrap: { gap: 4 },
  emptyWalletTitle: { color: colors.textPrimary, fontSize: FONT_SIZE.sm, fontFamily: FONT_FAMILY.semibold },
  emptyWalletSubtitle: { color: colors.textMuted, fontSize: FONT_SIZE.xs, fontFamily: FONT_FAMILY.regular, lineHeight: 18 },
  fieldError: { borderColor: colors.expense },
  selectedCategory: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, minWidth: 0, paddingRight: SPACING.sm },
  selectedCategoryIcon: { fontSize: 22 },
  selectedCategoryName: {
    color: colors.textPrimary,
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.medium,
    fontFamily: FONT_FAMILY.medium,
    flex: 1,
  },
  categoryPlaceholder: { color: colors.textMuted, fontSize: FONT_SIZE.md, fontFamily: FONT_FAMILY.regular, flex: 1, paddingRight: SPACING.sm },
  errorText: { color: colors.expense, fontSize: FONT_SIZE.xs, fontFamily: FONT_FAMILY.regular, marginTop: 4 },
  dateSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: colors.surface,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    borderWidth: 1, borderColor: colors.border,
  },
  dateText: { flex: 1, color: colors.textPrimary, fontSize: FONT_SIZE.sm, fontFamily: FONT_FAMILY.regular },
  submitBtn: { marginTop: SPACING.lg, marginBottom: SPACING.md },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: BORDER_RADIUS.xl,
    borderTopRightRadius: BORDER_RADIUS.xl,
    maxHeight: '88%',
    paddingBottom: Math.max(bottomInset, SPACING.md),
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: { fontSize: FONT_SIZE.lg, fontWeight: FONT_WEIGHT.bold, fontFamily: FONT_FAMILY.bold, color: colors.textPrimary },
  categoryGrid: { padding: SPACING.md },
  walletList: { padding: SPACING.md, gap: 10 },
  categoryItem: {
    width: categoryColumns === 2 ? '48%' : '31%',
    margin: 6,
    alignItems: 'center',
    padding: SPACING.md,
    backgroundColor: colors.background,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  categoryItemSelected: { backgroundColor: `${colors.primary}20`, borderColor: colors.primary },
  walletItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    gap: SPACING.md,
  },
  walletItemSelected: { borderColor: colors.primary, backgroundColor: `${colors.primary}14` },
  walletItemIcon: {
    width: 38,
    height: 38,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: `${colors.primary}18`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  walletItemInfo: { flex: 1, minWidth: 0 },
  walletItemName: { color: colors.textPrimary, fontSize: FONT_SIZE.sm, fontFamily: FONT_FAMILY.semibold },
  walletItemBalance: { color: colors.textMuted, fontSize: FONT_SIZE.xs, fontFamily: FONT_FAMILY.regular, marginTop: 2 },
  categoryItemIcon: { fontSize: 28, marginBottom: 6 },
  categoryItemName: {
    color: colors.textSecondary,
    fontSize: FONT_SIZE.xs,
    textAlign: 'center',
    fontWeight: FONT_WEIGHT.medium,
    fontFamily: FONT_FAMILY.medium,
  },
});

export default AddTransactionScreen;
