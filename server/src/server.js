import { createApp } from './app.js';
import { db } from './config/db.js';
import { env } from './config/env.js';

const app = createApp();

try {
  await db.raw('SELECT 1');
} catch (err) {
  console.error(`✖ تعذّر الاتصال بقاعدة البيانات (${env.db.host}:${env.db.port}/${env.db.database}): ${err.message}`);
  process.exit(1);
}

const server = app.listen(env.port, () => {
  console.log(`✔ TeamPulse API يعمل على http://localhost:${env.port}/api/v1`);
});

const shutdown = () => server.close(() => db.destroy().then(() => process.exit(0)));
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
