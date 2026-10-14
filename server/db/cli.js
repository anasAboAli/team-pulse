/**
 * أوامر قاعدة البيانات:
 *   node db/cli.js create    إنشاء قاعدة البيانات إن لم تكن موجودة
 *   node db/cli.js migrate   تنفيذ الـ migrations
 *   node db/cli.js rollback  التراجع عن آخر دفعة
 *   node db/cli.js seed      تعبئة البيانات التجريبية (يمسح البيانات الحالية)
 *   node db/cli.js reset     حذف كل الجداول ثم migrate + seed
 */
import knex from 'knex';
import { env } from '../src/config/env.js';
import { db, knexConfig } from '../src/config/db.js';

const command = process.argv[2];

async function main() {
  switch (command) {
    case 'create': {
      const { database, ...conn } = env.db;
      const root = knex({ client: 'mysql2', connection: conn });
      await root.raw(
        `CREATE DATABASE IF NOT EXISTS \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
      );
      await root.destroy();
      console.log(`✔ قاعدة البيانات "${database}" جاهزة`);
      break;
    }
    case 'migrate': {
      const [batch, files] = await db.migrate.latest(knexConfig.migrations);
      console.log(files.length ? `✔ الدفعة ${batch}: ${files.join(', ')}` : '✔ لا توجد migrations جديدة');
      break;
    }
    case 'rollback': {
      const [batch, files] = await db.migrate.rollback(knexConfig.migrations);
      console.log(files.length ? `✔ تم التراجع عن الدفعة ${batch}` : '✔ لا يوجد ما يُتراجع عنه');
      break;
    }
    case 'seed': {
      await db.seed.run(knexConfig.seeds);
      console.log('✔ تمت تعبئة البيانات التجريبية');
      break;
    }
    case 'reset': {
      await db.migrate.rollback(knexConfig.migrations, true);
      await db.migrate.latest(knexConfig.migrations);
      await db.seed.run(knexConfig.seeds);
      console.log('✔ تمت إعادة بناء قاعدة البيانات وتعبئتها');
      break;
    }
    default:
      console.log('الأوامر المتاحة: create | migrate | rollback | seed | reset');
  }
}

main()
  .catch((err) => {
    console.error('✖', err.message);
    process.exitCode = 1;
  })
  .finally(() => db.destroy());
