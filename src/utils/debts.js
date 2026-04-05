// ============================================================
// Debt Utilities
// ============================================================
import { addMonths, addWeeks, endOfDay, startOfDay } from 'date-fns';

export const DEBT_TYPES = {
  debt: 'debt',
  receivable: 'receivable',
};

export const DEBT_PAYMENT_SCHEMES = {
  full: 'full',
  installment: 'installment',
};

export const DEBT_INSTALLMENT_FREQUENCIES = {
  weekly: 'weekly',
  monthly: 'monthly',
};

export const toValidDate = (value) => {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

export const normalizeIsoDate = (value) => {
  const date = toValidDate(value);
  return date ? date.toISOString() : null;
};

export const roundCurrency = (value) => Math.max(0, Math.round(Number(value) || 0));

export const getDebtStatus = (debt, now = new Date()) => {
  const outstandingAmount = roundCurrency(debt?.outstandingAmount);
  if (outstandingAmount <= 0) {
    return 'paid';
  }

  const dueDate = toValidDate(debt?.dueDate);
  if (dueDate && endOfDay(dueDate) < startOfDay(now)) {
    return 'overdue';
  }

  return 'active';
};

export const isDebtDueSoon = (debt, days = 7, now = new Date()) => {
  if (!debt || roundCurrency(debt.outstandingAmount) <= 0) {
    return false;
  }

  const dueDate = toValidDate(debt.dueDate);
  if (!dueDate) {
    return false;
  }

  const start = startOfDay(now);
  const end = endOfDay(new Date(now.getTime() + (days * 24 * 60 * 60 * 1000)));

  return dueDate >= start && dueDate <= end;
};

export const calculateSuggestedInstallments = (principalAmount, installmentAmount) => {
  const principal = roundCurrency(principalAmount);
  const installment = roundCurrency(installmentAmount);

  if (!principal || !installment) {
    return null;
  }

  return Math.max(1, Math.ceil(principal / installment));
};

export const getDebtPaymentCount = (debt) =>
  Array.isArray(debt?.paymentHistory) ? debt.paymentHistory.length : 0;

export const getDebtProgress = (debt) => {
  const principalAmount = roundCurrency(debt?.principalAmount);
  const paidAmount = roundCurrency(debt?.paidAmount);
  const outstandingAmount = roundCurrency(
    debt?.outstandingAmount ?? Math.max(principalAmount - paidAmount, 0)
  );

  const safePrincipal = Math.max(principalAmount, paidAmount + outstandingAmount);
  const ratio = safePrincipal > 0 ? Math.min(paidAmount / safePrincipal, 1) : 0;
  const totalInstallments = debt?.paymentScheme === DEBT_PAYMENT_SCHEMES.installment
    ? Math.max(1, debt?.totalInstallments || calculateSuggestedInstallments(safePrincipal, debt?.installmentAmount) || 1)
    : 1;
  const paidInstallments = debt?.paymentScheme === DEBT_PAYMENT_SCHEMES.installment
    ? Math.min(totalInstallments, debt?.paidInstallments || getDebtPaymentCount(debt))
    : ratio >= 1 ? 1 : 0;

  return {
    principalAmount: safePrincipal,
    paidAmount,
    outstandingAmount,
    ratio,
    totalInstallments,
    paidInstallments,
  };
};

export const getNextDebtDueDate = (currentDueDate, frequency, referenceDate = null) => {
  const baseDate = toValidDate(referenceDate) || toValidDate(currentDueDate);
  if (!baseDate) {
    return null;
  }

  if (frequency === DEBT_INSTALLMENT_FREQUENCIES.weekly) {
    return addWeeks(baseDate, 1).toISOString();
  }

  return addMonths(baseDate, 1).toISOString();
};

export const getDebtReminderAmount = (debt, outstandingAmount = null) => {
  const remaining = roundCurrency(outstandingAmount ?? debt?.outstandingAmount);
  if (remaining <= 0) {
    return 0;
  }

  if (debt?.paymentScheme === DEBT_PAYMENT_SCHEMES.installment) {
    const installmentAmount = roundCurrency(debt?.installmentAmount);
    return installmentAmount > 0 ? Math.min(remaining, installmentAmount) : remaining;
  }

  return remaining;
};

export const buildDebtSnapshot = (debt) => {
  const principalAmount = roundCurrency(debt?.principalAmount);
  const paidAmount = roundCurrency(debt?.paidAmount);
  const outstandingAmount = roundCurrency(
    debt?.outstandingAmount ?? Math.max(principalAmount - paidAmount, 0)
  );
  const totalInstallments = debt?.paymentScheme === DEBT_PAYMENT_SCHEMES.installment
    ? Math.max(
        1,
        debt?.totalInstallments
          || calculateSuggestedInstallments(principalAmount, debt?.installmentAmount)
          || 1
      )
    : null;
  const paidInstallments = debt?.paymentScheme === DEBT_PAYMENT_SCHEMES.installment
    ? Math.min(totalInstallments, debt?.paidInstallments || getDebtPaymentCount(debt))
    : outstandingAmount === 0 && principalAmount > 0 ? 1 : 0;
  const dueDate = normalizeIsoDate(debt?.dueDate);
  const paymentHistory = Array.isArray(debt?.paymentHistory)
    ? debt.paymentHistory
        .map((entry) => ({
          ...entry,
          amount: roundCurrency(entry?.amount),
          date: normalizeIsoDate(entry?.date) || normalizeIsoDate(entry?.createdAt),
          createdAt: normalizeIsoDate(entry?.createdAt) || normalizeIsoDate(entry?.date),
        }))
        .filter((entry) => entry.amount > 0)
    : [];

  return {
    ...debt,
    type: debt?.type === DEBT_TYPES.receivable ? DEBT_TYPES.receivable : DEBT_TYPES.debt,
    title: String(debt?.title || '').trim(),
    counterpartName: String(debt?.counterpartName || '').trim(),
    description: String(debt?.description || '').trim(),
    principalAmount,
    paidAmount,
    outstandingAmount,
    paymentScheme: debt?.paymentScheme === DEBT_PAYMENT_SCHEMES.installment
      ? DEBT_PAYMENT_SCHEMES.installment
      : DEBT_PAYMENT_SCHEMES.full,
    installmentAmount: debt?.paymentScheme === DEBT_PAYMENT_SCHEMES.installment
      ? roundCurrency(debt?.installmentAmount)
      : null,
    installmentFrequency: debt?.installmentFrequency === DEBT_INSTALLMENT_FREQUENCIES.weekly
      ? DEBT_INSTALLMENT_FREQUENCIES.weekly
      : DEBT_INSTALLMENT_FREQUENCIES.monthly,
    totalInstallments,
    paidInstallments,
    dueDate,
    startDate: normalizeIsoDate(debt?.startDate) || normalizeIsoDate(new Date()),
    remindDaysBefore: Math.max(0, Math.round(Number(debt?.remindDaysBefore) || 3)),
    walletId: debt?.walletId || null,
    walletName: debt?.walletName || null,
    lastPaymentDate: normalizeIsoDate(debt?.lastPaymentDate),
    paymentHistory,
    status: getDebtStatus({ ...debt, outstandingAmount, dueDate }),
  };
};
