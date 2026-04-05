// ============================================================
// Add Debt Screen
// ============================================================
import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Alert,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useSelector } from 'react-redux';
import { selectWallets } from '@store/walletSlice';
import { selectDebts } from '@store/debtSlice';
import { useDebts } from '@hooks/useDebts';
import { useTranslation } from '@hooks/useTranslation';
import { useAppTheme } from '@hooks/useAppTheme';
import Input from '@components/common/Input';
import Button from '@components/common/Button';
import { formatDate, formatRupiahInput, parseAmount } from '@utils/formatters';
import {
  BORDER_RADIUS,
  FONT_FAMILY,
  FONT_SIZE,
  SPACING,
  SHADOWS,
} from '@constants/theme';
import {
  calculateSuggestedInstallments,
  DEBT_INSTALLMENT_FREQUENCIES,
} from '@utils/debts';

const DEBT_TYPES = ['debt', 'receivable'];
const PAYMENT_SCHEMES = ['full', 'installment'];
const FREQUENCIES = ['monthly', 'weekly'];

export const AddDebtScreen = ({ navigation, route }) => {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isCompact = width < 380;
  const { colors } = useAppTheme();
  const { t, language } = useTranslation();
  const styles = createStyles(colors, { isCompact, bottomInset: insets.bottom });
  const wallets = useSelector(selectWallets);
  const debts = useSelector(selectDebts);
  const { addDebt, updateDebt } = useDebts();
  const debtId = route.params?.debtId || route.params?.debt?.id || null;
  const debt = debts.find((item) => item.id === debtId) || route.params?.debt || null;
  const isEditMode = Boolean(debtId && debt);
  const hasPayments = (debt?.paymentHistory || []).length > 0 || (debt?.paidAmount || 0) > 0;

  const [type, setType] = useState('debt');
  const [title, setTitle] = useState('');
  const [counterpartName, setCounterpartName] = useState('');
  const [principalAmount, setPrincipalAmount] = useState('');
  const [paymentScheme, setPaymentScheme] = useState('full');
  const [installmentAmount, setInstallmentAmount] = useState('');
  const [installmentFrequency, setInstallmentFrequency] = useState(DEBT_INSTALLMENT_FREQUENCIES.monthly);
  const [selectedWallet, setSelectedWallet] = useState(null);
  const [dueDate, setDueDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [remindDaysBefore, setRemindDaysBefore] = useState('3');
  const [description, setDescription] = useState('');
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!debt) return;

    setType(debt.type || 'debt');
    setTitle(debt.title || '');
    setCounterpartName(debt.counterpartName || '');
    setPrincipalAmount(formatRupiahInput(debt.principalAmount));
    setPaymentScheme(debt.paymentScheme || 'full');
    setInstallmentAmount(formatRupiahInput(debt.installmentAmount));
    setInstallmentFrequency(debt.installmentFrequency || DEBT_INSTALLMENT_FREQUENCIES.monthly);
    setSelectedWallet(
      wallets.find((wallet) => wallet.id === debt.walletId) || (
        debt.walletId || debt.walletName
          ? { id: debt.walletId || `wallet-${debt.walletName}`, name: debt.walletName || t('wallets.wallet') }
          : null
      )
    );
    setDueDate(debt.dueDate ? new Date(debt.dueDate) : new Date());
    setRemindDaysBefore(String(debt.remindDaysBefore ?? 3));
    setDescription(debt.description || '');
  }, [debt, t, wallets]);

  const estimatedInstallments = useMemo(
    () => calculateSuggestedInstallments(parseAmount(principalAmount), parseAmount(installmentAmount)),
    [installmentAmount, principalAmount]
  );

  const validate = () => {
    const nextErrors = {};
    if (!title.trim()) nextErrors.title = t('debts.errors.titleRequired');
    if (!counterpartName.trim()) nextErrors.counterpartName = t('debts.errors.counterpartRequired');
    if (parseAmount(principalAmount) <= 0) nextErrors.principalAmount = t('debts.errors.amountRequired');
    if (paymentScheme === 'installment' && parseAmount(installmentAmount) <= 0) {
      nextErrors.installmentAmount = t('debts.errors.installmentAmountRequired');
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (loading) return;
    if (!validate()) return;

    setLoading(true);
    const payload = {
      type,
      title: title.trim(),
      counterpartName: counterpartName.trim(),
      principalAmount: parseAmount(principalAmount),
      paymentScheme,
      installmentAmount: paymentScheme === 'installment' ? parseAmount(installmentAmount) : null,
      installmentFrequency,
      totalInstallments: paymentScheme === 'installment' ? estimatedInstallments : null,
      dueDate: dueDate.toISOString(),
      remindDaysBefore: Number(String(remindDaysBefore).replace(/\D/g, '')) || 0,
      walletId: selectedWallet?.id || null,
      walletName: selectedWallet?.name || null,
      description: description.trim(),
      startDate: debt?.startDate || new Date().toISOString(),
      paidAmount: debt?.paidAmount || 0,
      paymentHistory: debt?.paymentHistory || [],
      paidInstallments: debt?.paidInstallments || 0,
      lastPaymentDate: debt?.lastPaymentDate || null,
    };

    const result = isEditMode
      ? await updateDebt(debtId, payload)
      : await addDebt(payload);

    setLoading(false);

    if (result?.error) {
      Alert.alert(t('common.error'), result.error);
      return;
    }

    navigation.goBack();
  };

  const accentColor = type === 'receivable' ? colors.income : colors.expense;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <LinearGradient colors={colors.gradients.header} style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerIconBtn}>
            <Ionicons name="close" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {isEditMode ? t('debts.editTitle') : t('debts.addDebt')}
          </Text>
          <View style={styles.headerIconBtn} />
        </LinearGradient>

        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.toggleGroup}>
            {DEBT_TYPES.map((value) => {
              const active = type === value;
              return (
                <TouchableOpacity
                  key={value}
                  style={[
                    styles.toggleButton,
                    active && { backgroundColor: accentColor },
                    hasPayments && isEditMode && value !== type && styles.disabledToggle,
                  ]}
                  disabled={hasPayments && isEditMode && value !== type}
                  onPress={() => setType(value)}
                >
                  <Text style={[styles.toggleButtonText, active && styles.toggleButtonTextActive]}>
                    {t(`debts.form.types.${value}`)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {hasPayments ? (
            <View style={styles.infoCard}>
              <Ionicons name="information-circle-outline" size={18} color={colors.warning} />
              <Text style={styles.infoText}>{t('debts.form.typeLockedHint')}</Text>
            </View>
          ) : null}

          <Input
            label={t('debts.form.title')}
            value={title}
            onChangeText={setTitle}
            placeholder={t('debts.form.titlePlaceholder')}
            icon="document-text-outline"
            error={errors.title}
          />
          <Input
            label={type === 'receivable' ? t('debts.form.borrowerName') : t('debts.form.creditorName')}
            value={counterpartName}
            onChangeText={setCounterpartName}
            placeholder={t('debts.form.counterpartPlaceholder')}
            icon="person-outline"
            error={errors.counterpartName}
          />
          <Input
            label={t('debts.form.principalAmount')}
            value={principalAmount}
            onChangeText={setPrincipalAmount}
            placeholder="0"
            keyboardType="numeric"
            prefix="Rp"
            formatAsRupiah
            error={errors.principalAmount}
          />

          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>{t('debts.form.paymentScheme')}</Text>
            <View style={styles.optionRow}>
              {PAYMENT_SCHEMES.map((value) => {
                const active = paymentScheme === value;
                return (
                  <TouchableOpacity
                    key={value}
                    style={[styles.optionChip, active && { backgroundColor: `${accentColor}15`, borderColor: accentColor }]}
                    onPress={() => setPaymentScheme(value)}
                  >
                    <Text style={[styles.optionChipText, active && { color: accentColor }]}>
                      {t(`debts.form.paymentSchemes.${value}`)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {paymentScheme === 'installment' ? (
              <>
                <Input
                  label={t('debts.form.installmentAmount')}
                  value={installmentAmount}
                  onChangeText={setInstallmentAmount}
                  placeholder="0"
                  keyboardType="numeric"
                  prefix="Rp"
                  formatAsRupiah
                  error={errors.installmentAmount}
                />
                <View style={styles.optionRow}>
                  {FREQUENCIES.map((value) => {
                    const active = installmentFrequency === value;
                    return (
                      <TouchableOpacity
                        key={value}
                        style={[styles.optionChip, active && { backgroundColor: `${accentColor}15`, borderColor: accentColor }]}
                        onPress={() => setInstallmentFrequency(value)}
                      >
                        <Text style={[styles.optionChipText, active && { color: accentColor }]}>
                          {t(`debts.form.frequencies.${value}`)}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
                <Text style={styles.helperText}>
                  {estimatedInstallments
                    ? t('debts.form.estimatedInstallments', { count: estimatedInstallments })
                    : t('debts.form.installmentHint')}
                </Text>
              </>
            ) : null}
          </View>

          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>{t('debts.form.defaultWallet')}</Text>
            <TouchableOpacity style={styles.selector} onPress={() => setShowWalletModal(true)}>
              <View style={styles.selectorLead}>
                <Ionicons name="wallet-outline" size={18} color={colors.primary} />
                <Text style={styles.selectorText} numberOfLines={1}>
                  {selectedWallet?.name || t('debts.form.defaultWalletPlaceholder')}
                </Text>
              </View>
              <Ionicons name="chevron-down" size={18} color={colors.textMuted} />
            </TouchableOpacity>
            <Text style={styles.helperText}>{t('debts.form.defaultWalletHint')}</Text>
          </View>

          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>{t('debts.form.dueDate')}</Text>
            <TouchableOpacity style={styles.selector} onPress={() => setShowDatePicker(true)}>
              <View style={styles.selectorLead}>
                <Ionicons name="calendar-outline" size={18} color={colors.primary} />
                <Text style={styles.selectorText} numberOfLines={1}>
                  {formatDate(dueDate, 'EEEE, dd MMMM yyyy', language)}
                </Text>
              </View>
              <Ionicons name="chevron-down" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          {showDatePicker ? (
            <DateTimePicker
              value={dueDate}
              mode="date"
              display="default"
              onChange={(event, nextDate) => {
                setShowDatePicker(false);
                if (nextDate) {
                  setDueDate(nextDate);
                }
              }}
            />
          ) : null}

          <Input
            label={t('debts.form.remindDaysBefore')}
            value={remindDaysBefore}
            onChangeText={setRemindDaysBefore}
            keyboardType="numeric"
            placeholder="3"
            icon="notifications-outline"
            hint={t('debts.form.remindDaysHint')}
          />

          <Input
            label={t('common.description')}
            value={description}
            onChangeText={setDescription}
            placeholder={t('debts.form.descriptionPlaceholder')}
            icon="document-outline"
            multiline
            numberOfLines={4}
          />

          <Button
            title={isEditMode ? t('debts.saveChanges') : t('debts.saveDebt')}
            onPress={handleSubmit}
            loading={loading}
            style={styles.submitButton}
          />
        </ScrollView>

        <Modal visible={showWalletModal} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{t('debts.form.defaultWallet')}</Text>
                <TouchableOpacity onPress={() => setShowWalletModal(false)}>
                  <Ionicons name="close" size={24} color={colors.textPrimary} />
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={[styles.walletItem, !selectedWallet && styles.walletItemSelected]}
                onPress={() => {
                  setSelectedWallet(null);
                  setShowWalletModal(false);
                }}
              >
                <View style={styles.walletItemIcon}>
                  <Ionicons name="close-circle-outline" size={18} color={colors.textMuted} />
                </View>
                <Text style={styles.walletItemName}>{t('debts.form.noDefaultWallet')}</Text>
              </TouchableOpacity>

              <FlatList
                data={wallets}
                keyExtractor={(item) => item.id}
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
                    <Text style={styles.walletItemName}>{item.name}</Text>
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

const createStyles = (colors, { isCompact, bottomInset }) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
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
  content: { flex: 1 },
  contentContainer: {
    padding: SPACING.lg,
    paddingBottom: Math.max(bottomInset + SPACING.xl, SPACING.xxl),
  },
  toggleGroup: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 4,
    marginBottom: SPACING.md,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
  },
  toggleButtonText: {
    color: colors.textMuted,
    fontSize: FONT_SIZE.sm,
    fontFamily: FONT_FAMILY.medium,
  },
  toggleButtonTextActive: {
    color: '#FFFFFF',
  },
  disabledToggle: {
    opacity: 0.5,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: `${colors.warning}12`,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  infoText: {
    flex: 1,
    color: colors.textSecondary,
    fontSize: FONT_SIZE.xs,
    fontFamily: FONT_FAMILY.regular,
    lineHeight: 18,
  },
  sectionCard: {
    backgroundColor: colors.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: SPACING.md,
    ...SHADOWS.sm,
  },
  sectionTitle: {
    color: colors.textPrimary,
    fontSize: FONT_SIZE.md,
    fontFamily: FONT_FAMILY.semibold,
    marginBottom: SPACING.sm,
  },
  optionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  optionChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: BORDER_RADIUS.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  optionChipText: {
    color: colors.textSecondary,
    fontSize: FONT_SIZE.sm,
    fontFamily: FONT_FAMILY.medium,
  },
  helperText: {
    color: colors.textMuted,
    fontSize: FONT_SIZE.xs,
    fontFamily: FONT_FAMILY.regular,
    marginTop: 2,
  },
  fieldContainer: {
    marginBottom: SPACING.md,
  },
  fieldLabel: {
    color: colors.textSecondary,
    fontSize: FONT_SIZE.sm,
    fontFamily: FONT_FAMILY.medium,
    marginBottom: 6,
  },
  selector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: SPACING.md,
    paddingVertical: isCompact ? 14 : 16,
  },
  selectorLead: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: SPACING.sm,
  },
  selectorText: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: FONT_SIZE.sm,
    fontFamily: FONT_FAMILY.regular,
  },
  submitButton: {
    marginTop: SPACING.sm,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.background,
    borderTopLeftRadius: BORDER_RADIUS.xl,
    borderTopRightRadius: BORDER_RADIUS.xl,
    padding: SPACING.lg,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  modalTitle: {
    color: colors.textPrimary,
    fontSize: FONT_SIZE.lg,
    fontFamily: FONT_FAMILY.bold,
  },
  walletItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: colors.surface,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
  },
  walletItemSelected: {
    borderColor: colors.primary,
    backgroundColor: `${colors.primary}10`,
  },
  walletItemIcon: {
    width: 36,
    height: 36,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  walletItemName: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: FONT_SIZE.sm,
    fontFamily: FONT_FAMILY.medium,
  },
});

export default AddDebtScreen;
