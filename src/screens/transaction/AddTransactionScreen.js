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

const TRANSACTION_TYPES = ['expense', 'income', 'transfer'];
const TRANSFER_ICON = '🔄';

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
  const [adminFee, setAdminFee] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedWallet, setSelectedWallet] = useState(null);
  const [selectedDestinationWallet, setSelectedDestinationWallet] = useState(null);
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [walletPickerTarget, setWalletPickerTarget] = useState('source');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const isSubmittingRef = useRef(false);
  const submissionKeyRef = useRef(null);
  const isTransfer = type === 'transfer';

  const getCategoryDisplayName = (category) => {
    if (category?.isDefault && category?.id) {
      const translatedName = t(`categories.names.${category.id}`);
      return translatedName !== `categories.names.${category.id}` ? translatedName : category.name;
    }
    return category?.name || '';
  };

  const findWalletOption = (walletId, walletName) => {
    if (!walletId && !walletName) return null;

    return wallets.find((wallet) => wallet.id === walletId) || {
      id: walletId || `wallet-${walletName || 'unknown'}`,
      name: walletName || t('wallets.wallet'),
      balance: 0,
    };
  };

  const filteredCategories = useMemo(() => {
    if (isTransfer) return [];
    return categories.filter((category) => category.type === type || category.type === 'both');
  }, [categories, isTransfer, type]);

  const activeWalletSelection = walletPickerTarget === 'destination'
    ? selectedDestinationWallet
    : selectedWallet;

  const walletModalTitle = walletPickerTarget === 'destination'
    ? t('addTransaction.selectDestinationWallet')
    : isTransfer
      ? t('addTransaction.selectSourceWallet')
      : t('addTransaction.selectWallet');

  useEffect(() => {
    const prefill = route?.params?.prefill;
    if (!prefill || isEditMode) return;

    const nextType = prefill.type && TRANSACTION_TYPES.includes(prefill.type) ? prefill.type : 'expense';
    setType(nextType);
    setSelectedCategory(null);
    setSelectedWallet(null);
    setSelectedDestinationWallet(null);
    setAdminFee('');

    if (prefill.amount) setAmount(formatRupiahInput(prefill.amount));
    if (prefill.description) setDescription(prefill.description);
    if (prefill.date) setDate(new Date(prefill.date));
    setErrors({});
  }, [isEditMode, route?.params?.prefill]);

  useEffect(() => {
    if (!isEditMode || !editingTransaction) return;

    const nextType = TRANSACTION_TYPES.includes(editingTransaction.type)
      ? editingTransaction.type
      : 'expense';
    setType(nextType);
    setAmount(formatRupiahInput(editingTransaction.amount));
    setDescription(editingTransaction.description || '');
    setDate(editingTransaction.date ? new Date(editingTransaction.date) : new Date());

    if (nextType === 'transfer') {
      setSelectedCategory(null);
      setSelectedWallet(
        findWalletOption(
          editingTransaction.transferMeta?.sourceWalletId || editingTransaction.walletId,
          editingTransaction.transferMeta?.sourceWalletName || editingTransaction.walletName
        )
      );
      setSelectedDestinationWallet(
        findWalletOption(
          editingTransaction.transferMeta?.destinationWalletId,
          editingTransaction.transferMeta?.destinationWalletName
        )
      );
      setAdminFee(formatRupiahInput(String(editingTransaction.transferMeta?.adminFee || '')));
    } else {
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
      setSelectedWallet(findWalletOption(editingTransaction.walletId, editingTransaction.walletName));
      setSelectedDestinationWallet(null);
      setAdminFee('');
    }

    setErrors({});
  }, [categories, colors.primary, editingTransaction, isEditMode, wallets]);

  const validate = () => {
    const newErrors = {};
    if (!amount || parseAmount(amount) <= 0) newErrors.amount = t('addTransaction.amountRequired');

    if (isTransfer) {
      if (!selectedWallet) newErrors.wallet = t('addTransaction.sourceWalletRequired');
      if (!selectedDestinationWallet) newErrors.destinationWallet = t('addTransaction.destinationWalletRequired');
      if (selectedWallet?.id && selectedDestinationWallet?.id && selectedWallet.id === selectedDestinationWallet.id) {
        newErrors.destinationWallet = t('addTransaction.walletsMustDiffer');
      }
    } else {
      if (!selectedCategory) newErrors.category = t('addTransaction.categoryRequired');
      if (wallets.length > 0 && !selectedWallet) newErrors.wallet = t('addTransaction.walletRequired');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChangeType = (nextType) => {
    setType(nextType);
    setSelectedCategory(null);
    setSelectedWallet(null);
    setSelectedDestinationWallet(null);
    setAdminFee('');
    setErrors({});
  };

  const openWalletPicker = (target) => {
    setWalletPickerTarget(target);
    setShowWalletModal(true);
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
      const payload = isTransfer
        ? {
            amount: parseAmount(amount),
            type,
            category: 'Transfer',
            categoryId: null,
            walletId: selectedWallet?.id || null,
            walletName: selectedWallet?.name || null,
            categoryIcon: TRANSFER_ICON,
            categoryColor: colors.primary,
            description: description.trim(),
            date: date.toISOString(),
            debtMeta: null,
            transferMeta: {
              sourceWalletId: selectedWallet?.id || null,
              sourceWalletName: selectedWallet?.name || null,
              destinationWalletId: selectedDestinationWallet?.id || null,
              destinationWalletName: selectedDestinationWallet?.name || null,
              adminFee: parseAmount(adminFee),
            },
          }
        : {
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
            debtMeta: null,
            transferMeta: null,
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

  const walletHelperText = isTransfer && wallets.length < 2
    ? t('addTransaction.transferNeedsTwoWallets')
    : t('addTransaction.noWalletSubtitle');

  const transferAdminFee = parseAmount(adminFee);
  const transferSourceDeduction = parseAmount(amount) + transferAdminFee;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
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
          <View style={styles.typeToggle}>
            {TRANSACTION_TYPES.map((txType) => (
              <TouchableOpacity
                key={txType}
                style={[
                  styles.typeBtn,
                  type === txType && {
                    backgroundColor: txType === 'income'
                      ? colors.income
                      : txType === 'transfer'
                        ? colors.primary
                        : colors.expense,
                  },
                ]}
                onPress={() => handleChangeType(txType)}
              >
                <Text style={[styles.typeBtnText, type === txType && styles.typeBtnTextActive]}>
                  {txType === 'expense'
                    ? t('common.expense')
                    : txType === 'income'
                      ? t('common.income')
                      : t('addTransaction.typeTransfer')}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {!isTransfer ? (
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
          ) : null}

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

          {!isTransfer ? (
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
              {errors.category ? <Text style={styles.errorText}>{errors.category}</Text> : null}
            </View>
          ) : null}

          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>
              {isTransfer ? t('addTransaction.sourceWallet') : t('addTransaction.selectWallet')}
            </Text>
            {wallets.length > 0 ? (
              <>
                <TouchableOpacity
                  style={[styles.categorySelector, errors.wallet && styles.fieldError]}
                  onPress={() => openWalletPicker('source')}
                >
                  {selectedWallet ? (
                    <View style={styles.selectedCategory}>
                      <Ionicons name="wallet-outline" size={18} color={colors.primary} />
                      <Text style={styles.selectedCategoryName} numberOfLines={1}>{selectedWallet.name}</Text>
                    </View>
                  ) : (
                    <Text style={styles.categoryPlaceholder} numberOfLines={1}>
                      {isTransfer ? t('addTransaction.selectSourceWallet') : t('addTransaction.selectWallet')}
                    </Text>
                  )}
                  <Ionicons name="chevron-down" size={20} color={colors.textMuted} />
                </TouchableOpacity>
                {errors.wallet ? <Text style={styles.errorText}>{errors.wallet}</Text> : null}
              </>
            ) : (
              <View style={styles.emptyWalletCard}>
                <View style={styles.emptyWalletTextWrap}>
                  <Text style={styles.emptyWalletTitle}>{t('addTransaction.noWalletTitle')}</Text>
                  <Text style={styles.emptyWalletSubtitle}>{walletHelperText}</Text>
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

          {isTransfer ? (
            <View style={styles.fieldContainer}>
              <Text style={styles.fieldLabel}>{t('addTransaction.destinationWallet')}</Text>
              {wallets.length >= 2 ? (
                <>
                  <TouchableOpacity
                    style={[styles.categorySelector, errors.destinationWallet && styles.fieldError]}
                    onPress={() => openWalletPicker('destination')}
                  >
                    {selectedDestinationWallet ? (
                      <View style={styles.selectedCategory}>
                        <Ionicons name="swap-horizontal-outline" size={18} color={colors.primary} />
                        <Text style={styles.selectedCategoryName} numberOfLines={1}>
                          {selectedDestinationWallet.name}
                        </Text>
                      </View>
                    ) : (
                      <Text style={styles.categoryPlaceholder} numberOfLines={1}>
                        {t('addTransaction.selectDestinationWallet')}
                      </Text>
                    )}
                    <Ionicons name="chevron-down" size={20} color={colors.textMuted} />
                  </TouchableOpacity>
                  {errors.destinationWallet ? <Text style={styles.errorText}>{errors.destinationWallet}</Text> : null}
                </>
              ) : (
                <View style={styles.emptyWalletCard}>
                  <View style={styles.emptyWalletTextWrap}>
                    <Text style={styles.emptyWalletTitle}>{t('addTransaction.noWalletTitle')}</Text>
                    <Text style={styles.emptyWalletSubtitle}>{t('addTransaction.transferNeedsTwoWallets')}</Text>
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
          ) : null}

          {isTransfer ? (
            <>
              <Input
                label={t('addTransaction.adminFee')}
                value={adminFee}
                onChangeText={setAdminFee}
                placeholder={t('addTransaction.adminFeePlaceholder')}
                keyboardType="numeric"
                icon="cash-outline"
                formatAsRupiah
                hint={t('addTransaction.adminFeeHint')}
              />
              {(selectedWallet || selectedDestinationWallet || transferAdminFee > 0) && (
                <View style={styles.transferSummaryCard}>
                  <View style={styles.transferSummaryRow}>
                    <Text style={styles.transferSummaryLabel}>{t('addTransaction.sourceWallet')}</Text>
                    <Text style={styles.transferSummaryValue}>{selectedWallet?.name || '-'}</Text>
                  </View>
                  <View style={styles.transferSummaryRow}>
                    <Text style={styles.transferSummaryLabel}>{t('addTransaction.destinationWallet')}</Text>
                    <Text style={styles.transferSummaryValue}>{selectedDestinationWallet?.name || '-'}</Text>
                  </View>
                  <View style={styles.transferSummaryRow}>
                    <Text style={styles.transferSummaryLabel}>{t('transaction.transferAmount')}</Text>
                    <Text style={styles.transferSummaryValue}>
                      Rp {parseAmount(amount).toLocaleString(language === 'en' ? 'en-US' : 'id-ID')}
                    </Text>
                  </View>
                  <View style={styles.transferSummaryRow}>
                    <Text style={styles.transferSummaryLabel}>{t('transaction.adminFee')}</Text>
                    <Text style={styles.transferSummaryValue}>
                      Rp {transferAdminFee.toLocaleString(language === 'en' ? 'en-US' : 'id-ID')}
                    </Text>
                  </View>
                  <View style={[styles.transferSummaryRow, styles.transferSummaryRowStrong]}>
                    <Text style={styles.transferSummaryLabelStrong}>{t('transaction.totalDeducted')}</Text>
                    <Text style={styles.transferSummaryValueStrong}>
                      Rp {transferSourceDeduction.toLocaleString(language === 'en' ? 'en-US' : 'id-ID')}
                    </Text>
                  </View>
                </View>
              )}
            </>
          ) : null}

          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>{t('common.date')}</Text>
            <TouchableOpacity style={styles.dateSelector} onPress={() => setShowDatePicker(true)}>
              <Ionicons name="calendar-outline" size={18} color={colors.textMuted} />
              <Text style={styles.dateText} numberOfLines={1}>
                {formatDate(date, 'EEEE, dd MMMM yyyy', language)}
              </Text>
              <Ionicons name="chevron-down" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          {showDatePicker && (
            <DateTimePicker
              value={date}
              mode="date"
              display="default"
              maximumDate={new Date()}
              onChange={(event, selectedDate) => {
                setShowDatePicker(false);
                if (selectedDate) setDate(selectedDate);
              }}
            />
          )}

          <Input
            label={t('addTransaction.description')}
            value={description}
            onChangeText={setDescription}
            placeholder={isTransfer ? t('addTransaction.transferDescriptionPlaceholder') : t('addTransaction.descriptionPlaceholder')}
            icon="document-text-outline"
            multiline
            numberOfLines={3}
          />

          <Button
            title={isEditMode
              ? (isTransfer ? t('addTransaction.updateTransferBtn') : t('addTransaction.updateBtn'))
              : (isTransfer ? t('addTransaction.addTransferBtn') : t('addTransaction.addBtn'))}
            onPress={handleSubmit}
            loading={loading}
            style={styles.submitBtn}
          />
        </ScrollView>

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
                    onPress={() => {
                      setSelectedCategory(item);
                      setErrors((prev) => ({ ...prev, category: null }));
                      setShowCategoryModal(false);
                    }}
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
                <Text style={styles.modalTitle}>{walletModalTitle}</Text>
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
                      activeWalletSelection?.id === item.id && styles.walletItemSelected,
                    ]}
                    onPress={() => {
                      if (walletPickerTarget === 'destination') {
                        setSelectedDestinationWallet(item);
                        setErrors((prev) => ({ ...prev, destinationWallet: null }));
                      } else {
                        setSelectedWallet(item);
                        setErrors((prev) => ({ ...prev, wallet: null }));
                      }
                      setShowWalletModal(false);
                    }}
                  >
                    <View style={styles.walletItemIcon}>
                      <Ionicons
                        name={walletPickerTarget === 'destination' ? 'swap-horizontal-outline' : 'wallet-outline'}
                        size={18}
                        color={colors.primary}
                      />
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
    borderWidth: 1,
    borderColor: colors.border,
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
  amountContainer: { marginBottom: SPACING.lg },
  amountLabel: {
    color: colors.textSecondary,
    fontSize: FONT_SIZE.sm,
    fontWeight: '500',
    fontFamily: FONT_FAMILY.medium,
    marginBottom: 6,
  },
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
  fieldLabel: {
    color: colors.textSecondary,
    fontSize: FONT_SIZE.sm,
    fontWeight: '500',
    fontFamily: FONT_FAMILY.medium,
    marginBottom: 6,
  },
  categorySelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  transferSummaryCard: {
    backgroundColor: colors.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...SHADOWS.sm,
  },
  transferSummaryRow: {
    flexDirection: isCompact ? 'column' : 'row',
    alignItems: isCompact ? 'flex-start' : 'center',
    justifyContent: 'space-between',
    gap: SPACING.md,
    paddingVertical: 6,
  },
  transferSummaryRowStrong: {
    marginTop: 4,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  transferSummaryLabel: {
    color: colors.textSecondary,
    fontSize: FONT_SIZE.sm,
    fontFamily: FONT_FAMILY.medium,
    flex: 1,
  },
  transferSummaryValue: {
    color: colors.textPrimary,
    fontSize: FONT_SIZE.sm,
    fontFamily: FONT_FAMILY.semibold,
    textAlign: isCompact ? 'left' : 'right',
    width: isCompact ? '100%' : 'auto',
  },
  transferSummaryLabelStrong: {
    color: colors.textPrimary,
    fontSize: FONT_SIZE.sm,
    fontFamily: FONT_FAMILY.bold,
    flex: 1,
  },
  transferSummaryValueStrong: {
    color: colors.primary,
    fontSize: FONT_SIZE.sm,
    fontFamily: FONT_FAMILY.bold,
    textAlign: isCompact ? 'left' : 'right',
    width: isCompact ? '100%' : 'auto',
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
  categoryPlaceholder: {
    color: colors.textMuted,
    fontSize: FONT_SIZE.md,
    fontFamily: FONT_FAMILY.regular,
    flex: 1,
    paddingRight: SPACING.sm,
  },
  errorText: { color: colors.expense, fontSize: FONT_SIZE.xs, fontFamily: FONT_FAMILY.regular, marginTop: 4 },
  dateSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: colors.surface,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dateText: { flex: 1, color: colors.textPrimary, fontSize: FONT_SIZE.sm, fontFamily: FONT_FAMILY.regular },
  submitBtn: { marginTop: SPACING.lg, marginBottom: SPACING.md },
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
