import { db } from '../../config/db.js';
import { env } from '../../config/env.js';
import { ApiError } from '../../utils/ApiError.js';
import { toNumber } from '../../utils/helpers.js';

export const USER_COLUMNS = [
  'u.id',
  'u.full_name',
  'u.email',
  'u.role',
  'u.department_id',
  'u.job_title',
  'u.phone',
  'u.avatar_path',
  'u.hire_date',
  'u.is_active',
  'u.must_change_password',
  'u.last_login_at',
  'u.created_at',
];

/** يحوّل صف المستخدم إلى شكل آمن للإرسال */
export function toPublicUser(row) {
  if (!row) return null;
  const { password_hash, deleted_at, department_name, manager_id, manager_name, ...rest } = row;
  return {
    ...rest,
    is_active: !!row.is_active,
    must_change_password: !!row.must_change_password,
    avatar_url: row.avatar_path ? `/uploads/public/${row.avatar_path}` : null,
    department: row.department_id ? { id: row.department_id, name: department_name ?? null } : null,
    manager: manager_id && manager_id !== row.id ? { id: manager_id, full_name: manager_name } : null,
  };
}

/** استعلام أساسي للمستخدمين مع القسم ومدير القسم */
export function usersQuery(conn = db) {
  return conn({ u: 'users' })
    .leftJoin({ d: 'departments' }, 'd.id', 'u.department_id')
    .leftJoin({ m: 'users' }, 'm.id', 'd.manager_id')
    .select(...USER_COLUMNS, 'd.name as department_name', 'd.manager_id', 'm.full_name as manager_name')
    .whereNull('u.deleted_at');
}

export const findUser = (id, conn = db) => conn('users').where({ id }).whereNull('deleted_at').first();

export async function getUserDetail(id) {
  const row = await usersQuery().where('u.id', id).first();
  return toPublicUser(row);
}

/** إحصاءات مختصرة تظهر في صفحة الموظف */
export async function getUserStats(userId) {
  const tasks = await db('tasks')
    .where({ assignee_id: userId })
    .whereNull('deleted_at')
    .select('status')
    .count({ c: '*' })
    .groupBy('status');
  const byStatus = Object.fromEntries(tasks.map((t) => [t.status, Number(t.c)]));
  const ev = await db('evaluations').where({ evaluatee_id: userId }).avg({ avg: 'overall_score' }).count({ c: '*' }).first();
  const overdue = await db('tasks')
    .where({ assignee_id: userId })
    .whereNull('deleted_at')
    .whereNotIn('status', ['completed', 'cancelled'])
    .where('due_date', '<', db.raw('CURRENT_DATE'))
    .count({ c: '*' })
    .first();
  return {
    tasks_by_status: byStatus,
    tasks_total: Object.values(byStatus).reduce((a, b) => a + b, 0),
    tasks_overdue: Number(overdue.c),
    evaluations_count: Number(ev.c),
    average_score: toNumber(ev.avg, 2),
  };
}

/**
 * يجعل المستخدم رئيساً للقسم مع الحفاظ على BR-01:
 * - المدير السابق للقسم يصبح بلا قسم (يعيّنه المشرف لاحقاً)
 * - إن كان المستخدم يرأس قسماً آخر يُفرَّغ ذلك القسم
 */
export async function setDepartmentHead(trx, departmentId, userId) {
  const dept = await trx('departments').where({ id: departmentId }).whereNull('deleted_at').first();
  if (!dept) throw ApiError.notFound('القسم غير موجود');

  if (dept.manager_id && dept.manager_id !== userId) {
    await trx('departments').where({ id: departmentId }).update({ manager_id: null });
    await trx('users').where({ id: dept.manager_id }).update({ department_id: null });
  }
  await trx('departments').where({ manager_id: userId }).whereNot({ id: departmentId }).update({ manager_id: null });
  await trx('departments').where({ id: departmentId }).update({ manager_id: userId });
  await trx('users').where({ id: userId }).update({ role: 'manager', department_id: departmentId });
  return dept;
}

export async function clearHeadship(trx, userId) {
  await trx('departments').where({ manager_id: userId }).update({ manager_id: null });
}

export async function countActiveAdmins(conn = db, excludeId = null) {
  const q = conn('users').where({ role: 'admin', is_active: true }).whereNull('deleted_at');
  if (excludeId) q.whereNot({ id: excludeId });
  const row = await q.count({ c: '*' }).first();
  return Number(row.c);
}

export async function revokeUserTokens(conn, userId) {
  await conn('refresh_tokens').where({ user_id: userId }).whereNull('revoked_at').update({ revoked_at: new Date() });
}

/** في وضع العرض: يمنع أي تغيير يكسر الدخول بالحسابات التجريبية */
export function assertNotDemoAccount(user) {
  if (env.demo.mode && user && env.demo.emails.includes(String(user.email).toLowerCase())) {
    throw ApiError.forbidden('هذا حساب تجريبي محمي في وضع العرض، لا يمكن تعديله أو تعطيله أو حذفه', 'DEMO_PROTECTED');
  }
}

export async function assertEmailFree(email, exceptId = null, conn = db) {
  const q = conn('users').where({ email });
  if (exceptId) q.whereNot({ id: exceptId });
  if (await q.first()) throw ApiError.conflict('البريد الإلكتروني مستخدم مسبقاً', 'EMAIL_TAKEN');
}
