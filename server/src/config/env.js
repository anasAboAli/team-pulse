import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

export const SERVER_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

dotenv.config({ path: path.join(SERVER_ROOT, '.env'), quiet: true });

const nodeEnv = process.env.NODE_ENV || 'development';
const flag = (v) => ['1', 'true', 'yes'].includes(String(v ?? '').toLowerCase());

/**
 * إعدادات قاعدة البيانات: من DATABASE_URL (الاستضافة) أو من متغيرات DB_* (التطوير).
 * مثال: mysql://user:pass@host:4000/teampulse?ssl=true
 */
function databaseConfig() {
  const url = process.env.DATABASE_URL ? new URL(process.env.DATABASE_URL) : null;
  const sslParam = url?.searchParams.get('ssl') ?? url?.searchParams.get('ssl-mode');
  const ssl = flag(process.env.DB_SSL) || flag(sslParam) || /^(required|verify_ca|verify_identity)$/i.test(sslParam ?? '');
  return {
    host: url?.hostname || process.env.DB_HOST || '127.0.0.1',
    port: Number(url?.port || process.env.DB_PORT || 3306),
    user: url ? decodeURIComponent(url.username) : process.env.DB_USER || 'root',
    password: url ? decodeURIComponent(url.password) : process.env.DB_PASSWORD || '',
    database: url?.pathname.slice(1) || process.env.DB_NAME || 'teampulse',
    // شهادة CA اختيارية (مطلوبة لـ Aiven)؛ TiDB Cloud يستخدم شهادة عامة موثوقة
    ssl: ssl ? { minVersion: 'TLSv1.2', rejectUnauthorized: true, ...(process.env.DB_SSL_CA ? { ca: process.env.DB_SSL_CA } : {}) } : undefined,
  };
}

export const env = {
  nodeEnv,
  isProd: nodeEnv === 'production',
  isTest: nodeEnv === 'test',
  port: Number(process.env.PORT || 4000),
  // Vercel يضبط VERCEL و VERCEL_PROJECT_PRODUCTION_URL تلقائياً
  isVercel: !!process.env.VERCEL,
  clientOrigin:
    process.env.CLIENT_ORIGIN ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : 'http://localhost:5173'),
  // خلف وكيل عكسي (Vercel) لقراءة IP الحقيقي والكوكي الآمن
  trustProxy: process.env.TRUST_PROXY ? flag(process.env.TRUST_PROXY) : nodeEnv === 'production',
  db: databaseConfig(),
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET || 'change-me-access-secret',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'change-me-refresh-secret',
    accessTtl: process.env.ACCESS_TOKEN_TTL || '15m',
    refreshDays: Number(process.env.REFRESH_TOKEN_DAYS || 7),
  },
  // دوال Vercel ترفض الطلبات الأكبر من 4.5MB
  uploadMaxMb: Number(process.env.UPLOAD_MAX_MB || (process.env.VERCEL ? 4 : 10)),
  // disk: مجلد uploads | db: جدول file_blobs (Vercel بلا قرص دائم)
  storageDriver: process.env.STORAGE_DRIVER || (process.env.VERCEL ? 'db' : 'disk'),
  uploadsDir: path.join(SERVER_ROOT, 'uploads'),
  // وضع العرض: الحسابات التجريبية محمية من التعديل والتعطيل والحذف وتغيير كلمة المرور
  demo: {
    mode: flag(process.env.DEMO_MODE),
    emails: [
      (process.env.SEED_ADMIN_EMAIL || 'admin@teampulse.test').toLowerCase(),
      'manager@teampulse.test',
      'employee@teampulse.test',
    ],
  },
  seed: {
    demoData: flag(process.env.SEED_DEMO_DATA),
    adminEmail: process.env.SEED_ADMIN_EMAIL || 'admin@teampulse.test',
    adminPassword: process.env.SEED_ADMIN_PASSWORD || 'Admin@12345',
    demoPassword: process.env.SEED_DEMO_PASSWORD || 'Demo@12345',
  },
};

if (env.isProd && env.jwt.accessSecret.startsWith('change-me')) {
  throw new Error('JWT secrets must be configured in production');
}
