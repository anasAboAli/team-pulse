import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

export const SERVER_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

dotenv.config({ path: path.join(SERVER_ROOT, '.env'), quiet: true });

const nodeEnv = process.env.NODE_ENV || 'development';

export const env = {
  nodeEnv,
  isProd: nodeEnv === 'production',
  isTest: nodeEnv === 'test',
  port: Number(process.env.PORT || 4000),
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  db: {
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'teampulse',
  },
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET || 'change-me-access-secret',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'change-me-refresh-secret',
    accessTtl: process.env.ACCESS_TOKEN_TTL || '15m',
    refreshDays: Number(process.env.REFRESH_TOKEN_DAYS || 7),
  },
  uploadMaxMb: Number(process.env.UPLOAD_MAX_MB || 10),
  uploadsDir: path.join(SERVER_ROOT, 'uploads'),
  seed: {
    adminEmail: process.env.SEED_ADMIN_EMAIL || 'admin@teampulse.test',
    adminPassword: process.env.SEED_ADMIN_PASSWORD || 'Admin@12345',
    demoPassword: process.env.SEED_DEMO_PASSWORD || 'Demo@12345',
  },
};

if (env.isProd && env.jwt.accessSecret.startsWith('change-me')) {
  throw new Error('JWT secrets must be configured in production');
}
