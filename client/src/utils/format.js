const LOCALE = 'ar-EG';
// أرقام لاتينية داخل النص العربي لسهولة القراءة في الجداول
const NUM_OPTS = { numberingSystem: 'latn' };

const dateFmt = new Intl.DateTimeFormat(LOCALE, { ...NUM_OPTS, year: 'numeric', month: 'short', day: 'numeric' });
const dateTimeFmt = new Intl.DateTimeFormat(LOCALE, { ...NUM_OPTS, year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
const monthFmt = new Intl.DateTimeFormat(LOCALE, { ...NUM_OPTS, month: 'short', year: 'numeric' });
const monthShortFmt = new Intl.DateTimeFormat(LOCALE, { ...NUM_OPTS, month: 'short' });
const relFmt = new Intl.RelativeTimeFormat(`${LOCALE}-u-nu-latn`, { numeric: 'auto' });
const numFmt = new Intl.NumberFormat('en-US');

/** يحوّل 'YYYY-MM-DD' أو ISO إلى Date محلي دون انزياح */
function toDate(value) {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [y, m, d] = value.split('-').map(Number);
    return new Date(y, m - 1, d);
  }
  return new Date(value);
}

export const formatDate = (v) => (v ? dateFmt.format(toDate(v)) : '—');
export const formatDateTime = (v) => (v ? dateTimeFmt.format(toDate(v)) : '—');
export const formatMonth = (v) => (v ? monthFmt.format(toDate(v.length === 7 ? `${v}-01` : v)) : '—');
export const formatMonthShort = (v) => (v ? monthShortFmt.format(toDate(v.length === 7 ? `${v}-01` : v)) : '');
export const formatNumber = (v) => (v == null ? '—' : numFmt.format(v));
export const formatScore = (v) => (v == null ? '—' : Number(v).toFixed(2));
export const formatPercent = (v) => (v == null ? '—' : `${v}%`);

export function formatRelative(value) {
  const date = toDate(value);
  if (!date) return '—';
  const diff = (date.getTime() - Date.now()) / 1000;
  const units = [
    ['year', 31536000],
    ['month', 2592000],
    ['week', 604800],
    ['day', 86400],
    ['hour', 3600],
    ['minute', 60],
  ];
  for (const [unit, secs] of units) {
    if (Math.abs(diff) >= secs) return relFmt.format(Math.round(diff / secs), unit);
  }
  return 'الآن';
}

/** عدد الأيام المتبقية حتى تاريخ (سالب = متأخر) */
export function daysUntil(value) {
  const d = toDate(value);
  if (!d) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((d - today) / 86400000);
}

export function formatDue(value) {
  const days = daysUntil(value);
  if (days == null) return 'بدون موعد';
  if (days === 0) return 'اليوم';
  if (days === 1) return 'غداً';
  if (days === -1) return 'متأخرة يوماً';
  if (days < 0) return `متأخرة ${-days} يوم`;
  return `بعد ${days} يوم`;
}

export function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export const initials = (name = '') =>
  name
    .replace(/^(م\.|أ\.|د\.)\s*/, '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join(' ');
