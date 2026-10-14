/**
 * أوامر قاعدة البيانات:
 *   node db/cli.js create    إنشاء قاعدة البيانات إن لم تكن موجودة
 *   node db/cli.js migrate   تنفيذ الـ migrations
 *   node db/cli.js rollback  التراجع عن آخر دفعة
 *   node db/cli.js seed      تعبئة البيانات التجريبية (يمسح البيانات الحالية)
 *   node db/cli.js reset     حذف كل الجداول ثم migrate + seed
 *   node db/cli.js bootstrap للإنتاج: migrate، ثم إن كانت القاعدة فارغة
 *                            تعبئة تجريبية (SEED_DEMO_DATA=true) أو إنشاء حساب المشرف فقط
 */
import knex from 'knex';
import bcrypt from 'bcryptjs';
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
    case 'bootstrap': {
      const [, files] = await db.migrate.latest(knexConfig.migrations);
      console.log(files.length ? `✔ migrations: ${files.join(', ')}` : '✔ القاعدة محدّثة');
      const { c } = await db('users').count({ c: '*' }).first();
      if (Number(c) > 0) break;

      // في الإنتاج لا نستخدم كلمات المرور الافتراضية أبداً
      if (env.isProd && (!process.env.SEED_ADMIN_PASSWORD || (env.seed.demoData && !process.env.SEED_DEMO_PASSWORD))) {
        throw new Error('يجب ضبط SEED_ADMIN_PASSWORD (و SEED_DEMO_PASSWORD عند SEED_DEMO_DATA=true) قبل أول تشغيل');
      }
      if (env.seed.demoData) {
        await db.seed.run(knexConfig.seeds);
        console.log('✔ قاعدة فارغة: تمت تعبئة البيانات التجريبية');
      } else {
        await db('company_settings').insert({ name: 'شركتي' });
        await db('users').insert({
          full_name: 'مشرف النظام',
          email: env.seed.adminEmail,
          password_hash: await bcrypt.hash(env.seed.adminPassword, 12),
          role: 'admin',
          must_change_password: true,
        });
        console.log(`✔ قاعدة فارغة: تم إنشاء حساب المشرف ${env.seed.adminEmail}`);
      }
      break;
    }
    default:
      console.log('الأوامر المتاحة: create | migrate | rollback | seed | reset | bootstrap');
  }
}

main()
  .catch((err) => {
    console.error('✖', err.message);
    process.exitCode = 1;
  })
  .finally(() => db.destroy());
