/**
 * اختبارات تكامل لحدود الصلاحيات (أهم ما في النظام).
 * تعمل على قاعدة بيانات منفصلة: <DB_NAME>_test ويُعاد بناؤها في كل تشغيل.
 */
import assert from 'node:assert/strict';
import { after, before, describe, test } from 'node:test';
import knex from 'knex';
import request from 'supertest';

process.env.NODE_ENV = 'test';
process.env.DB_NAME = `${process.env.DB_NAME || 'teampulse'}_test`;
process.env.DEMO_MODE = 'true';

const { env } = await import('../src/config/env.js');
const { db, knexConfig } = await import('../src/config/db.js');
const { createApp } = await import('../src/app.js');

const app = createApp();
const api = () => request(app);
const tokens = {};
let ids = {};

async function login(email, password) {
  const res = await api().post('/api/v1/auth/login').send({ email, password });
  assert.equal(res.status, 200, `login failed for ${email}: ${JSON.stringify(res.body)}`);
  return res.body.accessToken;
}
const as = (who) => ({
  get: (url) => api().get(url).set('Authorization', `Bearer ${tokens[who]}`),
  post: (url, body) => api().post(url).set('Authorization', `Bearer ${tokens[who]}`).send(body),
  put: (url, body) => api().put(url).set('Authorization', `Bearer ${tokens[who]}`).send(body),
  patch: (url, body) => api().patch(url).set('Authorization', `Bearer ${tokens[who]}`).send(body),
  del: (url) => api().delete(url).set('Authorization', `Bearer ${tokens[who]}`),
});

before(async () => {
  const { database, ...conn } = env.db;
  const root = knex({ client: 'mysql2', connection: conn });
  await root.raw(`DROP DATABASE IF EXISTS \`${database}\``);
  await root.raw(`CREATE DATABASE \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  await root.destroy();
  await db.migrate.latest(knexConfig.migrations);
  await db.seed.run(knexConfig.seeds);

  const pw = env.seed.demoPassword;
  tokens.admin = await login(env.seed.adminEmail, env.seed.adminPassword);
  tokens.itManager = await login('manager@teampulse.test', pw);
  tokens.hrManager = await login('manager.hr@teampulse.test', pw);
  tokens.itEmp = await login('employee@teampulse.test', pw);
  tokens.itEmp2 = await login('it2@teampulse.test', pw);

  const user = (email) => db('users').where({ email }).first();
  ids = {
    itManager: (await user('manager@teampulse.test')).id,
    hrManager: (await user('manager.hr@teampulse.test')).id,
    itEmp: (await user('employee@teampulse.test')).id,
    itEmp2: (await user('it2@teampulse.test')).id,
    hrEmp: (await user('hr1@teampulse.test')).id,
    itDept: (await user('employee@teampulse.test')).department_id,
    hrDept: (await user('hr1@teampulse.test')).department_id,
  };
}, { timeout: 120_000 });

after(() => db.destroy());

describe('التوثيق', () => {
  test('رفض كلمة مرور خاطئة', async () => {
    const res = await api().post('/api/v1/auth/login').send({ email: env.seed.adminEmail, password: 'wrong-pass1' });
    assert.equal(res.status, 401);
    assert.equal(res.body.error.code, 'INVALID_CREDENTIALS');
  });

  test('رفض الطلبات بدون رمز', async () => {
    assert.equal((await api().get('/api/v1/users')).status, 401);
  });
});

describe('المدير', () => {
  test('يرى موظفي قسمه فقط في القائمة', async () => {
    const res = await as('itManager').get('/api/v1/users?per_page=100');
    assert.equal(res.status, 200);
    assert.ok(res.body.data.length > 0);
    assert.ok(res.body.data.every((u) => u.department_id === ids.itDept && u.role === 'employee'));
  });

  test('الفلاتر لا تتجاوز النطاق (role=manager يعيد موظفي قسمه فقط)', async () => {
    const res = await as('itManager').get(`/api/v1/users?role=manager&department_id=${ids.hrDept}`);
    assert.ok(res.body.data.every((u) => u.department_id === ids.itDept && u.role === 'employee'));
  });

  test('لا يصل لموظف في قسم آخر (404)', async () => {
    assert.equal((await as('itManager').get(`/api/v1/users/${ids.hrEmp}`)).status, 404);
  });

  test('لا يصل لبيانات مدير آخر', async () => {
    assert.equal((await as('itManager').get(`/api/v1/users/${ids.hrManager}`)).status, 404);
  });

  test('لا يعدّل موظفاً في قسم آخر', async () => {
    const res = await as('itManager').put(`/api/v1/users/${ids.hrEmp}`, { full_name: 'اختراق', email: 'x@x.test' });
    assert.equal(res.status, 404);
  });

  test('لا يرى قسماً آخر', async () => {
    assert.equal((await as('itManager').get(`/api/v1/departments/${ids.hrDept}`)).status, 404);
    const list = await as('itManager').get('/api/v1/departments');
    assert.deepEqual(list.body.data.map((d) => d.id), [ids.itDept]);
  });

  test('لا يسند مهمة لموظف خارج قسمه', async () => {
    const res = await as('itManager').post('/api/v1/tasks', { title: 'مهمة غير مسموحة', assignee_id: ids.hrEmp });
    assert.equal(res.status, 422);
  });

  test('لا يقيّم موظفاً خارج قسمه ولا مديراً', async () => {
    const criteria = (await as('itManager').get('/api/v1/evaluation-criteria')).body.data;
    const scores = criteria.map((c) => ({ criterion_id: c.id, score: 4 }));
    for (const target of [ids.hrEmp, ids.hrManager]) {
      const res = await as('itManager').post('/api/v1/evaluations', { evaluatee_id: target, period_date: '2026-01-01', scores });
      assert.equal(res.status, 422);
    }
  });

  test('المهام والتقييمات والنشاط محصورة بقسمه', async () => {
    const tasks = await as('itManager').get('/api/v1/tasks?per_page=100');
    assert.ok(tasks.body.data.every((t) => t.department_id === ids.itDept));
    const activity = await as('itManager').get('/api/v1/activity?per_page=100');
    assert.ok(activity.body.data.every((a) => a.department_id === ids.itDept));
  });

  test('لا يصل للوحة المشرف', async () => {
    assert.equal((await as('itManager').get('/api/v1/dashboard/admin')).status, 403);
  });

  test('ينشئ موظفاً في قسمه حتى لو طلب قسماً/دوراً آخر', async () => {
    const res = await as('itManager').post('/api/v1/users', {
      full_name: 'موظف جديد',
      email: 'new.it@teampulse.test',
      role: 'admin',
      department_id: ids.hrDept,
    });
    assert.equal(res.status, 201);
    assert.equal(res.body.data.role, 'employee');
    assert.equal(res.body.data.department_id, ids.itDept);
    assert.ok(res.body.temp_password);
  });
});

describe('الموظف', () => {
  test('لا يصل لقائمة المستخدمين', async () => {
    assert.equal((await as('itEmp').get('/api/v1/users')).status, 403);
  });

  test('لا يرى بيانات زميله', async () => {
    assert.equal((await as('itEmp').get(`/api/v1/users/${ids.itEmp2}`)).status, 404);
  });

  test('يرى مهامه فقط ولا يصل لمهمة زميله', async () => {
    const mine = await as('itEmp').get('/api/v1/tasks?per_page=100');
    assert.ok(mine.body.data.every((t) => t.assignee_id === ids.itEmp));
    const other = await db('tasks').where({ assignee_id: ids.itEmp2 }).first();
    assert.equal((await as('itEmp').get(`/api/v1/tasks/${other.id}`)).status, 404);
  });

  test('لا يرى إلا تقييماته', async () => {
    const res = await as('itEmp').get('/api/v1/evaluations?per_page=100');
    assert.ok(res.body.data.length > 0);
    assert.ok(res.body.data.every((e) => e.evaluatee.id === ids.itEmp));
  });

  test('لا ينشئ مهاماً ولا تقييمات', async () => {
    assert.equal((await as('itEmp').post('/api/v1/tasks', { title: 'x', assignee_id: ids.itEmp })).status, 403);
    assert.equal((await as('itEmp').post('/api/v1/evaluations', {})).status, 403);
  });
});

describe('دورة حياة المهمة', () => {
  let taskId;

  test('المدير يسند مهمة تتطلب مرفقاً لموظف قسمه', async () => {
    const res = await as('itManager').post('/api/v1/tasks', {
      title: 'مهمة اختبار',
      assignee_id: ids.itEmp,
      requires_attachment: true,
      priority: 'high',
    });
    assert.equal(res.status, 201);
    taskId = res.body.data.id;
  });

  test('لا يمكن التسليم بدون ملف', async () => {
    await as('itEmp').patch(`/api/v1/tasks/${taskId}/status`, { status: 'in_progress' });
    const res = await as('itEmp').patch(`/api/v1/tasks/${taskId}/status`, { status: 'submitted' });
    assert.equal(res.status, 422);
  });

  test('الموظف يرفع ملفاً ويسلّم، والزميل لا يستطيع الرفع', async () => {
    const denied = await api()
      .post(`/api/v1/tasks/${taskId}/attachments`)
      .set('Authorization', `Bearer ${tokens.itEmp2}`)
      .attach('files', Buffer.from('test'), 'report.pdf');
    assert.equal(denied.status, 404);

    const up = await api()
      .post(`/api/v1/tasks/${taskId}/attachments`)
      .set('Authorization', `Bearer ${tokens.itEmp}`)
      .attach('files', Buffer.from('%PDF-1.4 test'), 'تقرير.pdf');
    assert.equal(up.status, 201);
    assert.equal(up.body.data.attachments[0].original_name, 'تقرير.pdf');

    const res = await as('itEmp').patch(`/api/v1/tasks/${taskId}/status`, { status: 'submitted' });
    assert.equal(res.status, 200);
  });

  test('الموظف لا يستطيع اعتماد مهمته', async () => {
    assert.equal((await as('itEmp').patch(`/api/v1/tasks/${taskId}/status`, { status: 'completed' })).status, 403);
  });

  test('مدير قسم آخر لا يصل للمهمة', async () => {
    assert.equal((await as('hrManager').patch(`/api/v1/tasks/${taskId}/status`, { status: 'completed' })).status, 404);
  });

  test('الإرجاع يتطلب سبباً، ثم الاعتماد', async () => {
    assert.equal((await as('itManager').patch(`/api/v1/tasks/${taskId}/status`, { status: 'returned' })).status, 422);
    assert.equal(
      (await as('itManager').patch(`/api/v1/tasks/${taskId}/status`, { status: 'returned', comment: 'أكمل الجدول' })).status,
      200,
    );
    await as('itEmp').patch(`/api/v1/tasks/${taskId}/status`, { status: 'submitted' });
    const done = await as('itManager').patch(`/api/v1/tasks/${taskId}/status`, { status: 'completed' });
    assert.equal(done.status, 200);
    assert.equal(done.body.data.status, 'completed');
  });

  test('الموظف تلقّى إشعاراً بالمهمة', async () => {
    const res = await as('itEmp').get('/api/v1/notifications');
    assert.ok(res.body.data.some((n) => n.link === `/tasks/${taskId}`));
  });
});

describe('المشرف', () => {
  test('يرى كل المستخدمين واللوحة العامة', async () => {
    const users = await as('admin').get('/api/v1/users?per_page=100');
    assert.ok(users.body.data.some((u) => u.role === 'manager'));
    const dash = await as('admin').get('/api/v1/dashboard/admin');
    assert.equal(dash.status, 200);
    assert.ok(dash.body.data.departments.length >= 4);
  });

  test('يقيّم مديراً', async () => {
    const criteria = (await as('admin').get('/api/v1/evaluation-criteria')).body.data.filter((c) => c.is_active);
    const res = await as('admin').post('/api/v1/evaluations', {
      evaluatee_id: ids.hrManager,
      period_type: 'monthly',
      period_date: '2026-09-15',
      scores: criteria.map((c) => ({ criterion_id: c.id, score: 5 })),
    });
    assert.equal(res.status, 201);
    assert.equal(res.body.data.overall_score, 5);
    assert.equal(res.body.data.period_start, '2026-09-01');
  });

  test('تعيين مدير جديد لقسم يحافظ على مدير واحد لكل قسم', async () => {
    const res = await as('admin').put(`/api/v1/departments/${ids.hrDept}/manager`, { manager_id: ids.hrEmp });
    assert.equal(res.status, 200);
    assert.equal(res.body.data.manager.id, ids.hrEmp);
    const oldManager = await db('users').where({ id: ids.hrManager }).first();
    assert.equal(oldManager.department_id, null);
    const promoted = await db('users').where({ id: ids.hrEmp }).first();
    assert.equal(promoted.role, 'manager');
  });

  test('المدير المعزول لا يرى أي موظف', async () => {
    const res = await as('hrManager').get('/api/v1/users');
    assert.equal(res.body.data.length, 0);
  });

  test('لا يمكن حذف قسم فيه موظفون', async () => {
    assert.equal((await as('admin').del(`/api/v1/departments/${ids.itDept}`)).status, 409);
  });

  test('تعطيل الحساب يمنع الدخول', async () => {
    await as('admin').patch(`/api/v1/users/${ids.itEmp2}/status`, { is_active: false });
    assert.equal((await as('itEmp2').get('/api/v1/profile')).status, 401);
  });
});

describe('وضع العرض (DEMO_MODE)', () => {
  test('الحسابات التجريبية لا تُعطَّل ولا تُحذف ولا يُعاد تعيين كلمة مرورها', async () => {
    const r1 = await as('admin').patch(`/api/v1/users/${ids.itEmp}/status`, { is_active: false });
    assert.equal(r1.status, 403);
    assert.equal(r1.body.error.code, 'DEMO_PROTECTED');
    assert.equal((await as('admin').post(`/api/v1/users/${ids.itEmp}/reset-password`)).status, 403);
    assert.equal((await as('admin').del(`/api/v1/users/${ids.itManager}`)).status, 403);
    assert.equal((await as('itManager').put(`/api/v1/users/${ids.itEmp}`, { full_name: 'تغيير', email: 'x@y.test' })).status, 403);
  });

  test('لا يمكن استبدال المدير التجريبي', async () => {
    const res = await as('admin').put(`/api/v1/departments/${ids.itDept}/manager`, { manager_id: ids.itEmp2 });
    assert.equal(res.status, 403);
  });

  test('الحساب التجريبي لا يغيّر كلمة مروره', async () => {
    const res = await as('itEmp').put('/api/v1/auth/password', { current_password: env.seed.demoPassword, new_password: 'Changed123' });
    assert.equal(res.status, 403);
  });

  test('الحسابات غير التجريبية تُدار بشكل طبيعي', async () => {
    assert.equal((await as('admin').post(`/api/v1/users/${ids.hrEmp}/reset-password`)).status, 200);
  });
});
