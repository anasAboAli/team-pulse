import path from 'node:path';
import knex from 'knex';
import { env, SERVER_ROOT } from './env.js';

export const knexConfig = {
  client: 'mysql2',
  connection: {
    ...env.db,
    charset: 'utf8mb4',
    timezone: 'Z',
    // أعمدة DATE تُعاد كنص 'YYYY-MM-DD' لتجنّب انزياح المنطقة الزمنية
    dateStrings: ['DATE'],
  },
  pool: {
    min: 0,
    // كل نسخة serverless تفتح مجمّعها الخاص، فنبقيه صغيراً
    max: env.isVercel ? 2 : 10,
    afterCreate(conn, done) {
      conn.query("SET time_zone = '+00:00'", (err) => done(err, conn));
    },
  },
  migrations: {
    directory: path.join(SERVER_ROOT, 'db/migrations'),
    tableName: 'knex_migrations',
    loadExtensions: ['.js'],
  },
  seeds: {
    directory: path.join(SERVER_ROOT, 'db/seeds'),
    loadExtensions: ['.js'],
  },
};

export const db = knex(knexConfig);
