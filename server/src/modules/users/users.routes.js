import { Router } from 'express';
import { db } from '../../config/db.js';
import { authorize } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { z, id, idParam, optText, optDate, pagination, password } from '../../lib/z.js';
import { canManageUser, canViewUser, emptyScope, isAdmin, isManager } from '../../policies/index.js';
import { ApiError } from '../../utils/ApiError.js';
import { logActivity, notify } from '../../utils/events.js';
import { compact, generateTempPassword, hashPassword } from '../../utils/helpers.js';
import { paginate } from '../../utils/pagination.js';
import {
  assertEmailFree,
  assertNotDemoAccount,
  clearHeadship,
  countActiveAdmins,
  findUser,
  getUserDetail,
  getUserStats,
  revokeUserTokens,
  setDepartmentHead,
  toPublicUser,
  usersQuery,
} from './users.service.js';

const router = Router();
const ROLES = ['admin', 'manager', 'employee'];

const listQuery = z.object({
  ...pagination,
  q: z.string().trim().max(100).optional(),
  role: z.enum(ROLES).optional(),
  department_id: id.optional(),
  status: z.enum(['active', 'inactive']).optional(),
  sort: z.enum(['name', 'newest']).default('name'),
});

const baseFields = {
  full_name: z.string().trim().min(3).max(150),
  email: z.string().trim().toLowerCase().email().max(190),
  job_title: optText(120),
  phone: optText(40),
  hire_date: optDate,
};

const createBody = z.object({
  ...baseFields,
  role: z.enum(ROLES).default('employee'),
  department_id: id.nullish(),
  password: password.optional().or(z.literal('').transform(() => undefined)),
});

const updateBody = z.object({
  ...baseFields,
  role: z.enum(ROLES).optional(),
});

/** يجلب المستخدم المستهدف ويطبّق سياسة العرض (404 خارج النطاق) */
async function loadVisibleUser(actor, userId) {
  const target = await findUser(userId);
  if (!canViewUser(actor, target)) throw ApiError.notFound('المستخدم غير موجود');
  return target;
}

async function loadManageableUser(actor, userId) {
  const target = await loadVisibleUser(actor, userId);
  if (!canManageUser(actor, target)) throw ApiError.forbidden();
  assertNotDemoAccount(target);
  return target;
}

// ── القائمة ────────────────────────────────────────────────
router.get('/', authorize('admin', 'manager'), validate({ query: listQuery }), async (req, res) => {
  const { q, role, department_id, status, sort, ...pg } = req.valid.query;
  const actor = req.user;
  const qb = usersQuery();

  if (isManager(actor)) {
    // المدير يرى موظفي قسمه فقط مهما كانت الفلاتر
    if (!actor.department_id) emptyScope(qb);
    qb.where('u.role', 'employee').where('u.department_id', actor.department_id);
  } else {
    if (role) qb.where('u.role', role);
    if (department_id) qb.where('u.department_id', department_id);
  }
  if (status) qb.where('u.is_active', status === 'active');
  if (q) qb.where((w) => w.whereLike('u.full_name', `%${q}%`).orWhereLike('u.email', `%${q}%`).orWhereLike('u.job_title', `%${q}%`));
  qb.orderBy(sort === 'newest' ? [{ column: 'u.created_at', order: 'desc' }] : ['u.full_name']);

  res.json(await paginate(qb, pg, toPublicUser));
});

// ── قائمة مختصرة للاختيار (إسناد مهمة / تقييم) ─────────────
router.get(
  '/options',
  authorize('admin', 'manager'),
  validate({ query: z.object({ role: z.enum(ROLES).optional(), department_id: id.optional() }) }),
  async (req, res) => {
    const actor = req.user;
    const qb = db({ u: 'users' })
      .leftJoin({ d: 'departments' }, 'd.id', 'u.department_id')
      .select('u.id', 'u.full_name', 'u.role', 'u.job_title', 'u.department_id', 'd.name as department_name')
      .whereNull('u.deleted_at')
      .where('u.is_active', true)
      .orderBy('u.full_name');
    if (isManager(actor)) {
      if (!actor.department_id) emptyScope(qb);
      qb.where('u.role', 'employee').where('u.department_id', actor.department_id);
    } else {
      const { role, department_id } = req.valid.query;
      if (role) qb.where('u.role', role);
      if (department_id) qb.where('u.department_id', department_id);
    }
    res.json({ data: await qb });
  },
);

// ── إنشاء ──────────────────────────────────────────────────
router.post('/', authorize('admin', 'manager'), validate({ body: createBody }), async (req, res) => {
  const actor = req.user;
  const input = { ...req.valid.body };

  if (isManager(actor)) {
    // D-1: المدير ينشئ موظفين في قسمه فقط
    if (!actor.department_id) throw ApiError.forbidden('لست معيّناً على قسم');
    input.role = 'employee';
    input.department_id = actor.department_id;
  }
  if (input.role === 'admin') input.department_id = null;
  if (input.department_id) {
    const dept = await db('departments').where({ id: input.department_id }).whereNull('deleted_at').first();
    if (!dept) throw ApiError.unprocessable('البيانات المدخلة غير صحيحة', { department_id: 'القسم غير موجود' });
  }

  await assertEmailFree(input.email);
  const tempPassword = input.password ? null : generateTempPassword();
  const passwordHash = await hashPassword(input.password || tempPassword);

  const userId = await db.transaction(async (trx) => {
    const [newId] = await trx('users').insert(
      compact({
        full_name: input.full_name,
        email: input.email,
        password_hash: passwordHash,
        role: input.role,
        department_id: input.role === 'manager' ? null : input.department_id ?? null,
        job_title: input.job_title,
        phone: input.phone,
        hire_date: input.hire_date,
        must_change_password: true,
      }),
    );
    if (input.role === 'manager' && input.department_id) await setDepartmentHead(trx, input.department_id, newId);
    await logActivity(trx, {
      actor,
      action: 'user.created',
      entityType: 'user',
      entityId: newId,
      departmentId: input.department_id ?? null,
      meta: { name: input.full_name, role: input.role },
    });
    return newId;
  });

  res.status(201).json({ data: await getUserDetail(userId), temp_password: tempPassword });
});

// ── التفاصيل ───────────────────────────────────────────────
router.get('/:id', validate({ params: idParam }), async (req, res) => {
  const target = await loadVisibleUser(req.user, req.valid.params.id);
  const [user, stats] = await Promise.all([getUserDetail(target.id), getUserStats(target.id)]);
  res.json({
    data: { ...user, stats },
    permissions: { can_manage: canManageUser(req.user, target), can_delete: isAdmin(req.user) && req.user.id !== target.id },
  });
});

// ── التعديل ────────────────────────────────────────────────
router.put('/:id', authorize('admin', 'manager'), validate({ params: idParam, body: updateBody }), async (req, res) => {
  const actor = req.user;
  const target = await loadManageableUser(actor, req.valid.params.id);
  const { role, ...fields } = req.valid.body;

  await assertEmailFree(fields.email, target.id);

  await db.transaction(async (trx) => {
    const update = compact(fields);

    if (role && role !== target.role) {
      if (!isAdmin(actor)) throw ApiError.forbidden('تغيير الدور من صلاحيات المشرف فقط');
      if (target.role === 'admin' && (await countActiveAdmins(trx, target.id)) === 0) {
        throw ApiError.conflict('لا يمكن تغيير دور آخر مشرف في النظام');
      }
      update.role = role;
      if (target.role === 'manager') await clearHeadship(trx, target.id);
      if (role === 'admin') update.department_id = null;
      if (role === 'manager' && target.department_id) {
        // الموظف المرقّى يصبح رئيس قسمه الحالي
        await setDepartmentHead(trx, target.department_id, target.id);
      }
    }
    await trx('users').where({ id: target.id }).update(update);
    await logActivity(trx, {
      actor,
      action: 'user.updated',
      entityType: 'user',
      entityId: target.id,
      departmentId: target.department_id,
      meta: { name: fields.full_name, ...(update.role ? { role: update.role } : {}) },
    });
  });

  res.json({ data: await getUserDetail(target.id) });
});

// ── نقل بين الأقسام (المشرف فقط) ───────────────────────────
router.patch(
  '/:id/department',
  authorize('admin'),
  validate({ params: idParam, body: z.object({ department_id: id.nullable() }) }),
  async (req, res) => {
    const target = await loadManageableUser(req.user, req.valid.params.id);
    const { department_id } = req.valid.body;
    if (target.role === 'admin') throw ApiError.badRequest('المشرف لا ينتمي لقسم');

    await db.transaction(async (trx) => {
      if (department_id) {
        const dept = await trx('departments').where({ id: department_id }).whereNull('deleted_at').first();
        if (!dept) throw ApiError.notFound('القسم غير موجود');
      }
      if (target.role === 'manager') {
        await clearHeadship(trx, target.id);
        if (department_id) await setDepartmentHead(trx, department_id, target.id);
        else await trx('users').where({ id: target.id }).update({ department_id: null });
      } else {
        await trx('users').where({ id: target.id }).update({ department_id });
      }
      await logActivity(trx, {
        actor: req.user,
        action: 'user.transferred',
        entityType: 'user',
        entityId: target.id,
        departmentId: department_id,
        meta: { name: target.full_name, from: target.department_id, to: department_id },
      });
      await notify(trx, target.id, {
        type: 'user.transferred',
        title: 'تم نقلك إلى قسم جديد',
        link: '/profile',
      });
    });

    res.json({ data: await getUserDetail(target.id) });
  },
);

// ── تفعيل / تعطيل ──────────────────────────────────────────
router.patch(
  '/:id/status',
  authorize('admin', 'manager'),
  validate({ params: idParam, body: z.object({ is_active: z.boolean() }) }),
  async (req, res) => {
    const target = await loadManageableUser(req.user, req.valid.params.id);
    const { is_active } = req.valid.body;
    if (!is_active && target.role === 'admin' && (await countActiveAdmins(db, target.id)) === 0) {
      throw ApiError.conflict('لا يمكن تعطيل آخر مشرف في النظام');
    }
    await db.transaction(async (trx) => {
      await trx('users').where({ id: target.id }).update({ is_active });
      if (!is_active) await revokeUserTokens(trx, target.id);
      await logActivity(trx, {
        actor: req.user,
        action: is_active ? 'user.activated' : 'user.deactivated',
        entityType: 'user',
        entityId: target.id,
        departmentId: target.department_id,
        meta: { name: target.full_name },
      });
    });
    res.json({ data: await getUserDetail(target.id) });
  },
);

// ── إعادة تعيين كلمة المرور ────────────────────────────────
router.post('/:id/reset-password', authorize('admin', 'manager'), validate({ params: idParam }), async (req, res) => {
  const target = await loadManageableUser(req.user, req.valid.params.id);
  const tempPassword = generateTempPassword();
  await db.transaction(async (trx) => {
    await trx('users')
      .where({ id: target.id })
      .update({ password_hash: await hashPassword(tempPassword), must_change_password: true });
    await revokeUserTokens(trx, target.id);
    await logActivity(trx, {
      actor: req.user,
      action: 'user.password_reset',
      entityType: 'user',
      entityId: target.id,
      departmentId: target.department_id,
      meta: { name: target.full_name },
    });
  });
  res.json({ temp_password: tempPassword });
});

// ── حذف (ناعم، المشرف فقط) ────────────────────────────────
router.delete('/:id', authorize('admin'), validate({ params: idParam }), async (req, res) => {
  const target = await loadManageableUser(req.user, req.valid.params.id);
  if (target.role === 'admin' && (await countActiveAdmins(db, target.id)) === 0) {
    throw ApiError.conflict('لا يمكن حذف آخر مشرف في النظام');
  }
  await db.transaction(async (trx) => {
    await clearHeadship(trx, target.id);
    await revokeUserTokens(trx, target.id);
    // تحرير البريد لإعادة استخدامه مع الحفاظ على السجل التاريخي
    await trx('users')
      .where({ id: target.id })
      .update({ deleted_at: new Date(), is_active: false, email: `${target.email}#deleted#${target.id}`.slice(0, 190) });
    await logActivity(trx, {
      actor: req.user,
      action: 'user.deleted',
      entityType: 'user',
      entityId: target.id,
      departmentId: target.department_id,
      meta: { name: target.full_name },
    });
  });
  res.status(204).end();
});

export default router;
