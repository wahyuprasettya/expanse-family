// ============================================================
// useDebts Hook
// ============================================================
import { useSelector } from 'react-redux';
import { selectProfile, selectUser } from '@store/authSlice';
import { selectDebts, selectDebtSummary } from '@store/debtSlice';
import { addDebt as addDebtService, deleteDebt as deleteDebtService, updateDebt as updateDebtService } from '@services/firebase/debts';
import { useTransactions } from '@hooks/useTransactions';
import { useTranslation } from '@hooks/useTranslation';
import {
  buildDebtSnapshot,
  DEBT_INSTALLMENT_FREQUENCIES,
  DEBT_PAYMENT_SCHEMES,
  getDebtReminderAmount,
  getDebtStatus,
  getNextDebtDueDate,
  normalizeIsoDate,
  roundCurrency,
} from '@utils/debts';
import { deleteRemindersByDebtId, syncDebtReminder } from '@services/firebase/reminders';

const PAYMENT_CATEGORY = {
  debt: {
    category: 'Debt Payment',
    icon: '💳',
    color: '#EF4444',
    type: 'expense',
  },
  receivable: {
    category: 'Debt Collection',
    icon: '💵',
    color: '#10B981',
    type: 'income',
  },
};

export const useDebts = () => {
  const user = useSelector(selectUser);
  const profile = useSelector(selectProfile);
  const debts = useSelector(selectDebts);
  const summary = useSelector(selectDebtSummary);
  const { t } = useTranslation();
  const { addTransaction } = useTransactions();
  const accountId = profile?.householdId || user?.uid;

  const syncReminderForDebt = async (debt) => {
    if (!user?.uid) return;

    const status = getDebtStatus(debt);
    if (status === 'paid' || !debt?.dueDate) {
      await deleteRemindersByDebtId(debt.id);
      return;
    }

    await syncDebtReminder({
      debtId: debt.id,
      userId: user.uid,
      creditorName: debt.counterpartName,
      category: debt.title,
      amount: getDebtReminderAmount(debt),
      dueDate: debt.dueDate,
      remindDaysBefore: debt.remindDaysBefore ?? 3,
      isActive: true,
    }, t);
  };

  const addDebt = async (data) => {
    if (!user?.uid || !accountId) {
      return { error: 'Not authenticated' };
    }

    const snapshot = buildDebtSnapshot(data);
    const { id, error } = await addDebtService(accountId, user, snapshot);
    if (error) {
      return { id: null, error };
    }

    try {
      await syncReminderForDebt({ ...snapshot, id });
    } catch (sideEffectError) {
      console.warn('Debt reminder sync failed:', sideEffectError);
    }

    return { id, error: null };
  };

  const updateDebt = async (debtId, data) => {
    if (!user?.uid || !accountId) {
      return { error: 'Not authenticated' };
    }

    const previous = debts.find((item) => item.id === debtId);
    if (!previous) {
      return { error: 'Debt not found' };
    }

    if (previous.paymentHistory?.length > 0 && data.type && data.type !== previous.type) {
      return { error: t('debts.errors.typeLocked') };
    }

    const snapshot = buildDebtSnapshot({
      ...previous,
      ...data,
      updatedByUid: user.uid,
      updatedByName: user.displayName || user.email || 'Member',
    });

    if (snapshot.principalAmount < snapshot.paidAmount) {
      return { error: t('debts.errors.principalLessThanPaid') };
    }

    const { error } = await updateDebtService(debtId, snapshot);
    if (error) {
      return { error };
    }

    try {
      await syncReminderForDebt({ ...snapshot, id: debtId });
    } catch (sideEffectError) {
      console.warn('Debt reminder update failed:', sideEffectError);
    }

    return { error: null };
  };

  const recordDebtPayment = async (debtId, paymentData) => {
    if (!user?.uid || !accountId) {
      return { error: 'Not authenticated' };
    }

    const debt = debts.find((item) => item.id === debtId);
    if (!debt) {
      return { error: t('debts.errors.notFound') };
    }

    const paymentAmount = roundCurrency(paymentData.amount);
    if (!paymentAmount) {
      return { error: t('debts.errors.paymentAmountRequired') };
    }
    if (paymentAmount > debt.outstandingAmount) {
      return { error: t('debts.errors.paymentTooLarge') };
    }

    const paymentDate = normalizeIsoDate(paymentData.date) || new Date().toISOString();
    const paymentPreset = PAYMENT_CATEGORY[debt.type] || PAYMENT_CATEGORY.debt;
    const transactionResult = await addTransaction({
      amount: paymentAmount,
      type: paymentPreset.type,
      category: t(debt.type === 'receivable'
        ? 'debts.collectionTransactionCategory'
        : 'debts.paymentTransactionCategory'),
      categoryId: null,
      walletId: paymentData.walletId || debt.walletId || null,
      walletName: paymentData.walletName || debt.walletName || null,
      categoryIcon: paymentPreset.icon,
      categoryColor: paymentPreset.color,
      description: paymentData.note?.trim()
        || t(
          debt.type === 'receivable'
            ? 'debts.collectionTransactionDescription'
            : 'debts.paymentTransactionDescription',
          { title: debt.title }
        ),
      date: paymentDate,
      debtMeta: {
        linkedDebtId: debt.id,
        flow: debt.type === 'receivable' ? 'collection' : 'payment',
        counterpartName: debt.counterpartName,
        title: debt.title,
      },
      transferMeta: null,
    });

    if (transactionResult?.error) {
      return { error: transactionResult.error };
    }

    const paymentHistory = [
      ...(debt.paymentHistory || []),
      {
        id: `payment-${Date.now()}`,
        amount: paymentAmount,
        date: paymentDate,
        createdAt: paymentDate,
        note: paymentData.note?.trim() || '',
        walletId: paymentData.walletId || debt.walletId || null,
        walletName: paymentData.walletName || debt.walletName || null,
        transactionId: transactionResult.id,
      },
    ];
    const paidAmount = roundCurrency(debt.paidAmount + paymentAmount);
    const outstandingAmount = Math.max(0, roundCurrency(debt.principalAmount - paidAmount));
    const isInstallment = debt.paymentScheme === DEBT_PAYMENT_SCHEMES.installment;
    const paidInstallments = isInstallment
      ? Math.min(debt.totalInstallments || paymentHistory.length, paymentHistory.length)
      : outstandingAmount === 0 ? 1 : 0;
    const nextDueDate = isInstallment && outstandingAmount > 0
      ? getNextDebtDueDate(
          debt.dueDate,
          debt.installmentFrequency || DEBT_INSTALLMENT_FREQUENCIES.monthly,
          debt.dueDate && new Date(paymentDate) > new Date(debt.dueDate) ? paymentDate : debt.dueDate
        )
      : outstandingAmount > 0
        ? debt.dueDate
        : null;
    const snapshot = buildDebtSnapshot({
      ...debt,
      paidAmount,
      outstandingAmount,
      paidInstallments,
      dueDate: nextDueDate,
      paymentHistory,
      lastPaymentDate: paymentDate,
      updatedByUid: user.uid,
      updatedByName: user.displayName || user.email || 'Member',
    });

    const { error } = await updateDebtService(debtId, snapshot);
    if (error) {
      return { error };
    }

    try {
      await syncReminderForDebt({ ...snapshot, id: debtId });
    } catch (sideEffectError) {
      console.warn('Debt reminder sync after payment failed:', sideEffectError);
    }

    return { error: null, transactionId: transactionResult.id };
  };

  const deleteDebt = async (debtId) => {
    const debt = debts.find((item) => item.id === debtId);
    if (!debt) {
      return { error: t('debts.errors.notFound') };
    }

    if ((debt.paymentHistory || []).length > 0 || debt.paidAmount > 0) {
      return { error: t('debts.errors.cannotDeleteWithPayments') };
    }

    const { error } = await deleteDebtService(debtId);
    if (error) {
      return { error };
    }

    try {
      await deleteRemindersByDebtId(debtId);
    } catch (sideEffectError) {
      console.warn('Debt reminder delete failed:', sideEffectError);
    }

    return { error: null };
  };

  return {
    debts,
    summary,
    addDebt,
    updateDebt,
    recordDebtPayment,
    deleteDebt,
  };
};

export default useDebts;
