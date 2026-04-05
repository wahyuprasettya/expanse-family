// ============================================================
// Debt Detail Screen
// ============================================================
import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  FlatList,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useSelector } from 'react-redux';
import { selectDebts, selectDebtsLoading } from '@store/debtSlice';
import { selectWallets } from '@store/walletSlice';
import { useDebts } from '@hooks/useDebts';
import { useTranslation } from '@hooks/useTranslation';
import { useAppTheme } from '@hooks/useAppTheme';
import Input from '@components/common/Input';
import Button from '@components/common/Button';
import LoadingState from '@components/common/LoadingState';
import { formatCurrency, formatDate, formatDateSmart } from '@utils/formatters';
import { getDebtProgress, getDebtStatus, isDebtDueSoon } from '@utils/debts';
import { BORDER_RADIUS, FONT_FAMILY, FONT_SIZE, SPACING, SHADOWS } from '@constants/theme';

const DetailRow = ({ label, value, styles, valueColor }) => (
  <View style={styles.detailRow}>
    <Text style={styles.detailLabel}>{label}</Text>
    <Text style={[styles.detailValue, valueColor && { color: valueColor }]}>{value}</Text>
  </View>
);

export const DebtDetailScreen = ({ navigation, route }) => {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isCompact = width < 380;
  const { colors } = useAppTheme();
  const { t, language } = useTranslation();
  const styles = createStyles(colors, { isCompact, bottomInset: insets.bottom });
  const { recordDebtPayment, deleteDebt } = useDebts();
  const wallets = useSelector(selectWallets);
  const debts = useSelector(selectDebts);
  const debtsLoading = useSelector(selectDebtsLoading);
  const debtId = route.params?.debtId || route.params?.debt?.id;
  const debt = debts.find((item) => item.id === debtId) || route.params?.debt || null;

  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentNote, setPaymentNote] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date());
  const [selectedWallet, setSelectedWallet] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const progress = useMemo(() => getDebtProgress(debt), [debt]);
  const status = debt ? getDebtStatus(debt) : 'active';

  if (!debt && debtsLoading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <LoadingState />
      </SafeAreaView>
    );
  }

  if (!debt) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.emptyWrap}>
          <Ionicons name="folder-open-outline" size={36} color={colors.textMuted} />
          <Text style={styles.emptyTitle}>{t('debts.notFoundTitle')}</Text>
          <Text style={styles.emptyText}>{t('debts.notFoundSubtitle')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  const isReceivable = debt.type === 'receivable';
  const accentColor = isReceivable ? colors.income : colors.expense;
  const gradient = isReceivable ? colors.gradients.income : colors.gradients.expense;
  const canRecordPayment = debt.outstandingAmount > 0;
  const canDelete = (debt.paymentHistory || []).length === 0 && (debt.paidAmount || 0) === 0;
  const paymentActionLabel = isReceivable ? t('debts.collectPayment') : t('debts.recordPayment');
  const dueSoon = isDebtDueSoon(debt, 7);
  const statusLabel = t(`debts.status.${status}`);
  const paymentHint = isReceivable
    ? t('debts.collectionHint')
    : t('debts.paymentHint');

  const resetPaymentForm = () => {
    setPaymentAmount('');
    setPaymentNote('');
    setPaymentDate(new Date());
    setSelectedWallet(
      wallets.find((item) => item.id === debt.walletId)
      || (debt.walletId || debt.walletName ? { id: debt.walletId, name: debt.walletName } : null)
    );
    setErrors({});
  };

  const openPaymentModal = () => {
    resetPaymentForm();
    setShowPaymentModal(true);
  };

  const validatePayment = () => {
    const nextErrors = {};
    const parsedAmount = Number(String(paymentAmount).replace(/\D/g, '')) || 0;
    if (parsedAmount <= 0) {
      nextErrors.amount = t('debts.errors.paymentAmountRequired');
    } else if (parsedAmount > debt.outstandingAmount) {
      nextErrors.amount = t('debts.errors.paymentTooLarge');
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSavePayment = async () => {
    if (loading) return;
    if (!validatePayment()) return;

    setLoading(true);
    const result = await recordDebtPayment(debt.id, {
      amount: Number(String(paymentAmount).replace(/\D/g, '')) || 0,
      date: paymentDate.toISOString(),
      walletId: selectedWallet?.id || null,
      walletName: selectedWallet?.name || null,
      note: paymentNote.trim(),
    });
    setLoading(false);

    if (result?.error) {
      Alert.alert(t('common.error'), result.error);
      return;
    }

    setShowPaymentModal(false);
  };

  const handleDelete = () => {
    Alert.alert(t('debts.deleteTitle'), t('debts.deleteMessage'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          const result = await deleteDebt(debt.id);
          if (result?.error) {
            Alert.alert(t('common.error'), result.error);
            return;
          }
          navigation.goBack();
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <LinearGradient colors={gradient} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerIconBtn}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{debt.title}</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            onPress={() => navigation.navigate('AddDebt', { debtId: debt.id, debt })}
            style={styles.headerIconBtn}
          >
            <Ionicons name="create-outline" size={21} color="#FFFFFF" />
          </TouchableOpacity>
          {canDelete ? (
            <TouchableOpacity onPress={handleDelete} style={styles.headerIconBtn}>
              <Ionicons name="trash-outline" size={22} color="#FFFFFF" />
            </TouchableOpacity>
          ) : null}
        </View>
      </LinearGradient>

      <View style={styles.heroSection}>
        <LinearGradient colors={gradient} style={styles.heroCard}>
          <View style={styles.heroBadgeRow}>
            <View style={styles.heroTypeBadge}>
              <Text style={styles.heroTypeBadgeText}>{t(`debts.form.types.${debt.type}`)}</Text>
            </View>
            <View style={styles.heroTypeBadge}>
              <Text style={styles.heroTypeBadgeText}>{statusLabel}</Text>
            </View>
          </View>

          <Text style={styles.heroAmountLabel}>{t('debts.outstanding')}</Text>
          <Text style={styles.heroAmount} numberOfLines={1}>
            {formatCurrency(debt.outstandingAmount, 'IDR', language)}
          </Text>
          <Text style={styles.heroSubtitle}>
            {isReceivable
              ? t('debts.fromLabel', { name: debt.counterpartName })
              : t('debts.toLabel', { name: debt.counterpartName })}
          </Text>

          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                { width: `${Math.max(progress.ratio * 100, progress.ratio > 0 ? 8 : 0)}%` },
              ]}
            />
          </View>

          <View style={styles.progressMetaRow}>
            <Text style={styles.progressMetaText}>
              {debt.paymentScheme === 'installment'
                ? t('debts.installmentProgress', {
                    current: progress.paidInstallments,
                    total: progress.totalInstallments,
                  })
                : t('debts.paidAmountLabel', {
                    amount: formatCurrency(debt.paidAmount, 'IDR', language),
                  })}
            </Text>
            <Text style={styles.progressMetaText}>
              {t('debts.dueLabelShort', {
                date: debt.dueDate
                  ? formatDateSmart(debt.dueDate, language, {
                      today: t('common.today'),
                      yesterday: t('common.yesterday'),
                    })
                  : t('debts.noDueDate'),
              })}
            </Text>
          </View>
        </LinearGradient>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.actionsRow}>
          <Button
            title={paymentActionLabel}
            onPress={openPaymentModal}
            disabled={!canRecordPayment}
            style={styles.primaryAction}
          />
          <Button
            title={t('debts.editAction')}
            variant="secondary"
            onPress={() => navigation.navigate('AddDebt', { debtId: debt.id, debt })}
            style={styles.secondaryAction}
          />
        </View>

        <View style={styles.noticeCard}>
          <Ionicons
            name={status === 'overdue' ? 'alert-circle-outline' : 'information-circle-outline'}
            size={18}
            color={status === 'overdue' ? colors.expense : dueSoon ? colors.warning : colors.primary}
          />
          <Text style={styles.noticeText}>
            {status === 'overdue'
              ? t('debts.overdueNotice')
              : dueSoon
                ? t('debts.dueSoonNotice')
                : paymentHint}
          </Text>
        </View>

        <View style={styles.detailCard}>
          <DetailRow
            label={t('debts.totalAmount')}
            value={formatCurrency(debt.principalAmount, 'IDR', language)}
            styles={styles}
          />
          <DetailRow
            label={t('debts.paidAmount')}
            value={formatCurrency(debt.paidAmount, 'IDR', language)}
            styles={styles}
          />
          <DetailRow
            label={t('debts.form.paymentScheme')}
            value={t(`debts.form.paymentSchemes.${debt.paymentScheme}`)}
            styles={styles}
          />
          {debt.paymentScheme === 'installment' ? (
            <>
              <DetailRow
                label={t('debts.form.installmentAmount')}
                value={formatCurrency(debt.installmentAmount || 0, 'IDR', language)}
                styles={styles}
              />
              <DetailRow
                label={t('debts.form.installmentFrequency')}
                value={t(`debts.form.frequencies.${debt.installmentFrequency || 'monthly'}`)}
                styles={styles}
              />
            </>
          ) : null}
          <DetailRow
            label={t('debts.form.dueDate')}
            value={debt.dueDate ? formatDate(debt.dueDate, 'EEEE, dd MMMM yyyy', language) : t('debts.noDueDate')}
            styles={styles}
            valueColor={status === 'overdue' ? colors.expense : dueSoon ? colors.warning : undefined}
          />
          <DetailRow
            label={t('debts.form.remindDaysBefore')}
            value={t('debts.reminderValue', { count: debt.remindDaysBefore ?? 0 })}
            styles={styles}
          />
          {debt.walletName ? (
            <DetailRow
              label={t('debts.form.defaultWallet')}
              value={debt.walletName}
              styles={styles}
            />
          ) : null}
          {debt.lastPaymentDate ? (
            <DetailRow
              label={t('debts.lastPaymentDate')}
              value={formatDate(debt.lastPaymentDate, 'EEEE, dd MMMM yyyy', language)}
              styles={styles}
            />
          ) : null}
          {debt.description ? (
            <DetailRow
              label={t('common.description')}
              value={debt.description}
              styles={styles}
            />
          ) : null}
        </View>

        <View style={styles.historySection}>
          <Text style={styles.sectionTitle}>{t('debts.paymentHistory')}</Text>
          {(debt.paymentHistory || []).length === 0 ? (
            <View style={styles.emptyHistoryCard}>
              <Text style={styles.emptyHistoryText}>{t('debts.emptyHistory')}</Text>
            </View>
          ) : (
            (debt.paymentHistory || []).map((payment) => (
              <TouchableOpacity
                key={payment.id}
                style={styles.historyCard}
                activeOpacity={payment.transactionId ? 0.85 : 1}
                onPress={() => {
                  if (payment.transactionId) {
                    navigation.navigate('TransactionDetail', { transactionId: payment.transactionId });
                  }
                }}
              >
                <View style={styles.historyLead}>
                  <View style={[styles.historyIconWrap, { backgroundColor: `${accentColor}14` }]}>
                    <Ionicons
                      name={isReceivable ? 'arrow-down-outline' : 'arrow-up-outline'}
                      size={18}
                      color={accentColor}
                    />
                  </View>
                  <View style={styles.historyTextWrap}>
                    <Text style={styles.historyTitle}>
                      {formatCurrency(payment.amount, 'IDR', language)}
                    </Text>
                    <Text style={styles.historySubtitle}>
                      {formatDate(payment.date, 'dd MMM yyyy', language)}
                    </Text>
                    {payment.note ? (
                      <Text style={styles.historyNote}>{payment.note}</Text>
                    ) : null}
                  </View>
                </View>
                <View style={styles.historyMeta}>
                  {payment.walletName ? (
                    <Text style={styles.historyMetaText}>{payment.walletName}</Text>
                  ) : null}
                  {payment.transactionId ? (
                    <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                  ) : null}
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>

      <Modal visible={showPaymentModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{paymentActionLabel}</Text>
              <TouchableOpacity onPress={() => setShowPaymentModal(false)}>
                <Ionicons name="close" size={24} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <Input
              label={t('debts.paymentAmount')}
              value={paymentAmount}
              onChangeText={setPaymentAmount}
              placeholder="0"
              keyboardType="numeric"
              prefix="Rp"
              formatAsRupiah
              error={errors.amount}
            />

            <View style={styles.modalField}>
              <Text style={styles.modalFieldLabel}>{t('debts.paymentDate')}</Text>
              <TouchableOpacity style={styles.selector} onPress={() => setShowDatePicker(true)}>
                <View style={styles.selectorLead}>
                  <Ionicons name="calendar-outline" size={18} color={colors.primary} />
                  <Text style={styles.selectorText}>{formatDate(paymentDate, 'EEEE, dd MMMM yyyy', language)}</Text>
                </View>
                <Ionicons name="chevron-down" size={18} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            {showDatePicker ? (
              <DateTimePicker
                value={paymentDate}
                mode="date"
                display="default"
                maximumDate={new Date()}
                onChange={(event, nextDate) => {
                  setShowDatePicker(false);
                  if (nextDate) {
                    setPaymentDate(nextDate);
                  }
                }}
              />
            ) : null}

            <View style={styles.modalField}>
              <Text style={styles.modalFieldLabel}>{t('debts.paymentWallet')}</Text>
              <TouchableOpacity style={styles.selector} onPress={() => setShowWalletModal(true)}>
                <View style={styles.selectorLead}>
                  <Ionicons name="wallet-outline" size={18} color={colors.primary} />
                  <Text style={styles.selectorText} numberOfLines={1}>
                    {selectedWallet?.name || t('debts.paymentWalletPlaceholder')}
                  </Text>
                </View>
                <Ionicons name="chevron-down" size={18} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <Input
              label={t('debts.paymentNote')}
              value={paymentNote}
              onChangeText={setPaymentNote}
              placeholder={t('debts.paymentNotePlaceholder')}
              icon="document-text-outline"
              multiline
              numberOfLines={3}
            />

            <Button
              title={paymentActionLabel}
              onPress={handleSavePayment}
              loading={loading}
            />
          </View>
        </View>
      </Modal>

      <Modal visible={showWalletModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('debts.paymentWallet')}</Text>
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
              <View style={styles.walletIcon}>
                <Ionicons name="close-circle-outline" size={18} color={colors.textMuted} />
              </View>
              <Text style={styles.walletName}>{t('debts.form.noDefaultWallet')}</Text>
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
                  <View style={styles.walletIcon}>
                    <Ionicons name="wallet-outline" size={18} color={colors.primary} />
                  </View>
                  <Text style={styles.walletName}>{item.name}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
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
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    color: '#FFFFFF',
    fontSize: FONT_SIZE.lg,
    fontFamily: FONT_FAMILY.bold,
    marginHorizontal: SPACING.sm,
  },
  heroSection: {
    paddingHorizontal: SPACING.lg,
    marginTop: 20,
    marginBottom: SPACING.lg,
  },
  heroCard: {
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.xl,
    ...SHADOWS.lg,
  },
  heroBadgeRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  heroTypeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  heroTypeBadgeText: {
    color: '#FFFFFF',
    fontSize: FONT_SIZE.xs,
    fontFamily: FONT_FAMILY.semibold,
  },
  heroAmountLabel: {
    color: 'rgba(255,255,255,0.78)',
    fontSize: FONT_SIZE.sm,
    fontFamily: FONT_FAMILY.medium,
  },
  heroAmount: {
    color: '#FFFFFF',
    fontSize: isCompact ? FONT_SIZE.xxxl : FONT_SIZE.display,
    fontFamily: FONT_FAMILY.extrabold,
    marginTop: 6,
  },
  heroSubtitle: {
    color: 'rgba(255,255,255,0.88)',
    fontSize: FONT_SIZE.sm,
    fontFamily: FONT_FAMILY.regular,
    marginTop: 6,
  },
  progressTrack: {
    height: 8,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: 'rgba(255,255,255,0.18)',
    overflow: 'hidden',
    marginTop: SPACING.md,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: BORDER_RADIUS.full,
  },
  progressMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: SPACING.sm,
    marginTop: SPACING.sm,
  },
  progressMetaText: {
    flex: 1,
    color: 'rgba(255,255,255,0.88)',
    fontSize: FONT_SIZE.xs,
    fontFamily: FONT_FAMILY.medium,
  },
  content: { flex: 1 },
  contentContainer: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: Math.max(bottomInset + SPACING.xl, SPACING.xxl),
  },
  actionsRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  primaryAction: { flex: 1 },
  secondaryAction: { flex: 1 },
  noticeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: colors.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: SPACING.md,
    ...SHADOWS.sm,
  },
  noticeText: {
    flex: 1,
    color: colors.textSecondary,
    fontSize: FONT_SIZE.xs,
    fontFamily: FONT_FAMILY.regular,
    lineHeight: 18,
  },
  detailCard: {
    backgroundColor: colors.surface,
    borderRadius: BORDER_RADIUS.xl,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    marginBottom: SPACING.lg,
    ...SHADOWS.sm,
  },
  detailRow: {
    flexDirection: isCompact ? 'column' : 'row',
    justifyContent: 'space-between',
    gap: SPACING.sm,
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  detailLabel: {
    color: colors.textMuted,
    fontSize: FONT_SIZE.sm,
    fontFamily: FONT_FAMILY.regular,
    flex: 1,
  },
  detailValue: {
    color: colors.textPrimary,
    fontSize: FONT_SIZE.sm,
    fontFamily: FONT_FAMILY.semibold,
    flex: isCompact ? 0 : 1.2,
    textAlign: isCompact ? 'left' : 'right',
  },
  historySection: {
    marginBottom: SPACING.md,
  },
  sectionTitle: {
    color: colors.textPrimary,
    fontSize: FONT_SIZE.md,
    fontFamily: FONT_FAMILY.semibold,
    marginBottom: SPACING.sm,
  },
  emptyHistoryCard: {
    backgroundColor: colors.surface,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: SPACING.md,
  },
  emptyHistoryText: {
    color: colors.textMuted,
    fontSize: FONT_SIZE.sm,
    fontFamily: FONT_FAMILY.regular,
  },
  historyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.sm,
    backgroundColor: colors.surface,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    ...SHADOWS.sm,
  },
  historyLead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    flex: 1,
  },
  historyIconWrap: {
    width: 42,
    height: 42,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyTextWrap: {
    flex: 1,
  },
  historyTitle: {
    color: colors.textPrimary,
    fontSize: FONT_SIZE.sm,
    fontFamily: FONT_FAMILY.semibold,
  },
  historySubtitle: {
    color: colors.textSecondary,
    fontSize: FONT_SIZE.xs,
    fontFamily: FONT_FAMILY.regular,
    marginTop: 2,
  },
  historyNote: {
    color: colors.textMuted,
    fontSize: FONT_SIZE.xs,
    fontFamily: FONT_FAMILY.regular,
    marginTop: 4,
  },
  historyMeta: {
    alignItems: 'flex-end',
    gap: 4,
  },
  historyMetaText: {
    color: colors.primary,
    fontSize: FONT_SIZE.xs,
    fontFamily: FONT_FAMILY.medium,
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
    maxHeight: '78%',
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
  modalField: {
    marginBottom: SPACING.md,
  },
  modalFieldLabel: {
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
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: 15,
  },
  selectorLead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    flex: 1,
  },
  selectorText: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: FONT_SIZE.sm,
    fontFamily: FONT_FAMILY.regular,
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
  walletIcon: {
    width: 38,
    height: 38,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  walletName: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: FONT_SIZE.sm,
    fontFamily: FONT_FAMILY.medium,
  },
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.xl,
    gap: SPACING.sm,
  },
  emptyTitle: {
    color: colors.textPrimary,
    fontSize: FONT_SIZE.lg,
    fontFamily: FONT_FAMILY.bold,
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: FONT_SIZE.sm,
    fontFamily: FONT_FAMILY.regular,
    textAlign: 'center',
  },
});

export default DebtDetailScreen;
