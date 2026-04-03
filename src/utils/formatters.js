// ============================================================
// Utility: Formatters
// ============================================================
import { format, formatDistanceToNow, isToday, isYesterday } from 'date-fns';
import { enUS, id as localeId } from 'date-fns/locale';

const getDateLocale = (language = 'id') => (language === 'en' ? enUS : localeId);
const getIntlLocale = (language = 'id') => (language === 'en' ? 'en-US' : 'id-ID');

// ─── Currency ────────────────────────────────────────────────
export const formatCurrency = (amount, currency = 'IDR', language = 'id') => {
  return new Intl.NumberFormat(getIntlLocale(language), {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.abs(amount));
};

export const formatCurrencyFull = (amount, currency = 'IDR', language = 'id') => {
  // Format lengkap dengan separator ribuan tapi tanpa singkatan
  const formatted = new Intl.NumberFormat(getIntlLocale(language), {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.abs(amount));

  return `${currency === 'IDR' ? 'Rp' : '$'} ${formatted}`;
};

export const formatCurrencyCompact = (amount, currency = 'IDR', language = 'id') => {
  const absAmount = Math.abs(amount);
  const prefix = currency === 'IDR' ? 'Rp' : '$';
  
  if (language === 'id') {
    if (absAmount >= 1_000_000_000) return `${prefix} ${(amount / 1_000_000_000).toFixed(1)}M`;
    if (absAmount >= 1_000_000) return `${prefix} ${(amount / 1_000_000).toFixed(1)}JT`;
    if (absAmount >= 1_000) return `${prefix} ${(amount / 1_000).toFixed(0)}RB`;
    return formatCurrency(amount, currency, language);
  } else {
    if (absAmount >= 1_000_000_000) return `${prefix} ${(amount / 1_000_000_000).toFixed(1)}B`;
    if (absAmount >= 1_000_000) return `${prefix} ${(amount / 1_000_000).toFixed(1)}M`;
    if (absAmount >= 1_000) return `${prefix} ${(amount / 1_000).toFixed(0)}K`;
    return formatCurrency(amount, currency, language);
  }
};

// ─── Date ─────────────────────────────────────────────────────
export const formatDate = (date, fmt = 'dd MMM yyyy', language = 'id') => {
  if (!date) return '';
  const d = date instanceof Date ? date : new Date(date);
  return format(d, fmt, { locale: getDateLocale(language) });
};

export const formatDateSmart = (date, language = 'id', labels = {}) => {
  if (!date) return '';
  const d = date instanceof Date ? date : new Date(date);
  if (isToday(d)) return labels.today || (language === 'en' ? 'Today' : 'Hari ini');
  if (isYesterday(d)) return labels.yesterday || (language === 'en' ? 'Yesterday' : 'Kemarin');
  return format(d, 'dd MMM yyyy', { locale: getDateLocale(language) });
};

export const formatRelativeTime = (date, language = 'id') => {
  if (!date) return '';
  const d = date instanceof Date ? date : new Date(date);
  return formatDistanceToNow(d, { addSuffix: true, locale: getDateLocale(language) });
};

export const formatTime = (date, language = 'id') => {
  if (!date) return '';
  const d = date instanceof Date ? date : new Date(date);
  return format(d, 'HH:mm', { locale: getDateLocale(language) });
};

// ─── Numbers ─────────────────────────────────────────────────
export const formatPercentage = (value, total) => {
  if (!total || total === 0) return '0%';
  return `${Math.round((value / total) * 100)}%`;
};

export const formatRupiahInput = (value) => {
  const digits = String(value ?? '').replace(/\D/g, '');
  if (!digits) return '';

  const normalizedDigits = digits.replace(/^0+(?=\d)/, '');
  return (normalizedDigits || '0').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
};

export const parseAmount = (value) => {
  const digits = String(value ?? '').replace(/\D/g, '');
  return Number(digits) || 0;
};

// ─── Insight Text ─────────────────────────────────────────────
export const formatInsightChange = (current, previous) => {
  if (!previous || previous === 0) return null;
  const change = ((current - previous) / previous) * 100;
  const direction = change > 0 ? 'increased' : 'decreased';
  return { direction, percentage: Math.abs(Math.round(change)), change };
};
