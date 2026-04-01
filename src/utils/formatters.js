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

export const formatCurrencyCompact = (amount, currency = 'IDR', language = 'id') => {
  if (Math.abs(amount) >= 1_000_000_000) return `Rp ${(amount / 1_000_000_000).toFixed(1)}B`;
  if (Math.abs(amount) >= 1_000_000) return `Rp ${(amount / 1_000_000).toFixed(1)}M`;
  if (Math.abs(amount) >= 1_000) return `Rp ${(amount / 1_000).toFixed(0)}K`;
  return formatCurrency(amount, currency, language);
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

export const parseAmount = (value) => {
  // Remove non-numeric except dot and comma
  const cleaned = String(value).replace(/[^0-9.,]/g, '').replace(',', '.');
  return parseFloat(cleaned) || 0;
};

// ─── Insight Text ─────────────────────────────────────────────
export const formatInsightChange = (current, previous) => {
  if (!previous || previous === 0) return null;
  const change = ((current - previous) / previous) * 100;
  const direction = change > 0 ? 'increased' : 'decreased';
  return { direction, percentage: Math.abs(Math.round(change)), change };
};
