import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';

export const hashPassword = (plain) => bcrypt.hash(plain, 12);
export const verifyPassword = (plain, hash) => bcrypt.compare(plain, hash);

/** كلمة مرور مؤقتة مقروءة: أحرف + أرقام + رمز */
export function generateTempPassword() {
  const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz';
  const digits = '23456789';
  const pick = (set, n) => Array.from({ length: n }, () => set[crypto.randomInt(set.length)]).join('');
  return `${pick(letters, 6)}${pick(digits, 3)}@`;
}

export const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');

/** يحذف المفاتيح ذات القيمة undefined (للتحديث الجزئي) */
export function compact(obj) {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined));
}

export function parseJson(value) {
  if (value == null || typeof value === 'object') return value ?? null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

export const toNumber = (v, digits = null) => {
  if (v == null) return null;
  const n = Number(v);
  return digits == null ? n : Number(n.toFixed(digits));
};

/** نسبة مئوية آمنة من القسمة على صفر */
export const percent = (part, whole) => (whole > 0 ? Math.round((part / whole) * 100) : 0);

export function today() {
  return new Date().toISOString().slice(0, 10);
}

/** بداية ونهاية فترة التقييم حسب نوعها */
export function normalizePeriod(type, dateStr) {
  const [y, m] = dateStr.split('-').map(Number);
  const fmt = (d) => d.toISOString().slice(0, 10);
  let start;
  let end;
  if (type === 'monthly') {
    start = new Date(Date.UTC(y, m - 1, 1));
    end = new Date(Date.UTC(y, m, 0));
  } else if (type === 'quarterly') {
    const q = Math.floor((m - 1) / 3);
    start = new Date(Date.UTC(y, q * 3, 1));
    end = new Date(Date.UTC(y, q * 3 + 3, 0));
  } else {
    start = new Date(Date.UTC(y, 0, 1));
    end = new Date(Date.UTC(y, 11, 31));
  }
  return { start: fmt(start), end: fmt(end) };
}

/** تحويل صفوف إلى CSV مع BOM ليفتحه Excel بالعربية بشكل صحيح */
export function toCsv(columns, rows) {
  const esc = (v) => {
    if (v == null) return '';
    const s = String(v);
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [columns.map((c) => esc(c.label)).join(',')];
  for (const row of rows) lines.push(columns.map((c) => esc(c.value ? c.value(row) : row[c.key])).join(','));
  return '﻿' + lines.join('\r\n');
}
