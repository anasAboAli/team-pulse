import fs from 'node:fs';
import path from 'node:path';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { env, SERVER_ROOT } from './config/env.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { PUBLIC_DIR, sendUpload } from './middleware/upload.js';
import apiRoutes from './routes.js';

export function createApp() {
  const app = express();

  app.disable('x-powered-by');
  if (env.trustProxy) app.set('trust proxy', 1);
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use(cors({ origin: env.clientOrigin, credentials: true }));
  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());

  // الصور العامة فقط (الشعار والصور الشخصية) — المرفقات تُنزَّل عبر API محمي
  if (env.storageDriver === 'db') {
    app.get('/uploads/public/:name', (req, res) => sendUpload(res, PUBLIC_DIR, req.params.name, { maxAge: 7 * 86400_000 }));
  } else {
    app.use('/uploads/public', express.static(PUBLIC_DIR, { maxAge: '7d', index: false }));
  }

  app.use('/api/v1', apiRoutes);
  app.use('/api', notFoundHandler);

  // في الإنتاج يخدم الخادم نسخة الواجهة المبنية
  const clientDist = path.resolve(SERVER_ROOT, '../client/dist');
  if (env.isProd && fs.existsSync(clientDist)) {
    app.use(express.static(clientDist, { index: false }));
    app.get('/{*splat}', (_req, res) => res.sendFile(path.join(clientDist, 'index.html')));
  }

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
