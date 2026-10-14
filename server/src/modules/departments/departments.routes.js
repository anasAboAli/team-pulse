import { Router } from 'express';
import { db } from '../../config/db.js';
import { authorize } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { z, id, idParam, optText } from '../../lib/z.js';
import { canViewDepartment, isAdmin, isEmployee } from '../../policies/index.js';
import { ApiError } from '../../utils/ApiError.js';
import { logActivity, notify } from '../../utils/events.js';
import { compact, percent, toNumber } from '../../utils/helpers.js';
import { assertNotDemoAccount, clearHeadship, findUser, setDepartmentHead, toPublicUser, usersQuery } from '../users/users.service.js';

const router = Router();

const bodySchema = z.object({
  name: z.string().trim().min(2).max(120),
  description: optText(1000),
});

/** الأقسام مع المدير وعدد الموظفين وإحصاءات المهام */
function departmentsQuery() {
  const employees = db('users')
    .select('department_id')
    .count({ c: '*' })
    .where({ role: 'employee' })
    .whereNull('deleted_at')
    .groupBy('department_id')
    .as('e');
  const tasks = db('tasks')
    .select('department_id')
    .count({ total: '*' })
    .select(db.raw("SUM(status = 'completed') AS completed"))
    .select(db.raw("SUM(status NOT IN ('completed','cancelled')) AS open"))
    .select(db.raw("SUM(status = 'cancelled') AS cancelled"))
    .whereNull('deleted_at')
    .groupBy('department_id')
    .as('t');

  return db({ d: 'departments' })
    .leftJoin({ m: 'users' }, 'm.id', 'd.manager_id')
    .leftJoin(employees, 'e.department_id', 'd.id')
    .leftJoin(tasks, 't.department_id', 'd.id')
    .select(
      'd.id',
      'd.name',
      'd.description',
      'd.manager_id',
      'd.created_at',
      'm.full_name as manager_name',
      'm.email as manager_email',
      'm.avatar_path as manager_avatar',
      db.raw('COALESCE(e.c, 0) AS employees_count'),
      db.raw('COALESCE(t.total, 0) AS tasks_total'),
      db.raw('COALESCE(t.completed, 0) AS tasks_completed'),
      db.raw('COALESCE(t.open, 0) AS tasks_open'),
      db.raw('COALESCE(t.cancelled, 0) AS tasks_cancelled'),
    )
    .whereNull('d.deleted_at')
    .orderBy('d.name');
}

function toDepartment(row) {
  const total = Number(row.tasks_total) - Number(row.tasks_cancelled);
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    created_at: row.created_at,
    manager: row.manager_id
      ? {
          id: row.manager_id,
          full_name: row.manager_name,
          email: row.manager_email,
          avatar_url: row.manager_avatar ? `/uploads/public/${row.manager_avatar}` : null,
        }
      : null,
    employees_count: Number(row.employees_count),
    tasks_open: Number(row.tasks_open),
    tasks_completed: Number(row.tasks_completed),
    completion_rate: percent(Number(row.tasks_completed), total),
  };
}

async function loadDepartment(deptId) {
  const dept = await db('departments').where({ id: deptId }).whereNull('deleted_at').first();
  if (!dept) throw ApiError.notFound('القسم غير موجود');
  return dept;
}

router.get('/', async (req, res) => {
  const qb = departmentsQuery();
  if (!isAdmin(req.user)) qb.where('d.id', req.user.department_id ?? 0);
  const rows = (await qb).map(toDepartment);
  // الموظف يرى اسم قسمه ومديره فقط (D-3)
  res.json({ data: isEmployee(req.user) ? rows.map(({ id: dId, name, description, manager }) => ({ id: dId, name, description, manager })) : rows });
});

router.get('/:id', validate({ params: idParam }), async (req, res) => {
  const deptId = req.valid.params.id;
  if (!canViewDepartment(req.user, deptId)) throw ApiError.notFound('القسم غير موجود');
  const row = await departmentsQuery().where('d.id', deptId).first();
  if (!row) throw ApiError.notFound('القسم غير موجود');
  const department = toDepartment(row);

  if (isEmployee(req.user)) {
    const { id: dId, name, description, manager } = department;
    return res.json({ data: { id: dId, name, description, manager } });
  }

  const members = (await usersQuery().where('u.department_id', deptId).where('u.role', 'employee').orderBy('u.full_name')).map(
    toPublicUser,
  );
  const avg = await db({ ev: 'evaluations' })
    .join({ u: 'users' }, 'u.id', 'ev.evaluatee_id')
    .where('u.department_id', deptId)
    .where('u.role', 'employee')
    .avg({ avg: 'ev.overall_score' })
    .first();

  res.json({ data: { ...department, average_score: toNumber(avg.avg, 2), members } });
});

router.post('/', authorize('admin'), validate({ body: bodySchema.extend({ manager_id: id.nullish() }) }), async (req, res) => {
  const { manager_id, ...fields } = req.valid.body;
  const deptId = await db.transaction(async (trx) => {
    const [newId] = await trx('departments').insert(compact(fields));
    if (manager_id) {
      const manager = await findUser(manager_id, trx);
      if (!manager || manager.role === 'admin') throw ApiError.unprocessable('البيانات المدخلة غير صحيحة', { manager_id: 'المستخدم غير صالح لرئاسة القسم' });
      await setDepartmentHead(trx, newId, manager_id);
    }
    await logActivity(trx, { actor: req.user, action: 'department.created', entityType: 'department', entityId: newId, departmentId: newId, meta: { name: fields.name } });
    return newId;
  });
  res.status(201).json({ data: toDepartment(await departmentsQuery().where('d.id', deptId).first()) });
});

router.put('/:id', authorize('admin'), validate({ params: idParam, body: bodySchema }), async (req, res) => {
  const dept = await loadDepartment(req.valid.params.id);
  await db('departments').where({ id: dept.id }).update(compact(req.valid.body));
  await logActivity(null, { actor: req.user, action: 'department.updated', entityType: 'department', entityId: dept.id, departmentId: dept.id, meta: { name: req.valid.body.name } });
  res.json({ data: toDepartment(await departmentsQuery().where('d.id', dept.id).first()) });
});

// تعيين أو إزالة رئيس القسم
router.put(
  '/:id/manager',
  authorize('admin'),
  validate({ params: idParam, body: z.object({ manager_id: id.nullable() }) }),
  async (req, res) => {
    const dept = await loadDepartment(req.valid.params.id);
    const { manager_id } = req.valid.body;
    if (dept.manager_id && dept.manager_id !== manager_id) assertNotDemoAccount(await findUser(dept.manager_id));
    if (manager_id) assertNotDemoAccount(await findUser(manager_id));

    await db.transaction(async (trx) => {
      if (manager_id === null) {
        if (dept.manager_id) {
          await clearHeadship(trx, dept.manager_id);
          await trx('users').where({ id: dept.manager_id }).update({ department_id: null });
        }
      } else {
        const user = await findUser(manager_id, trx);
        if (!user || user.role === 'admin' || !user.is_active) {
          throw ApiError.unprocessable('البيانات المدخلة غير صحيحة', { manager_id: 'المستخدم غير صالح لرئاسة القسم' });
        }
        await setDepartmentHead(trx, dept.id, manager_id);
        await notify(trx, manager_id, { type: 'department.assigned', title: `تم تعيينك مديراً لقسم ${dept.name}`, link: '/manager/dashboard' });
      }
      await logActivity(trx, {
        actor: req.user,
        action: manager_id ? 'department.manager_assigned' : 'department.manager_removed',
        entityType: 'department',
        entityId: dept.id,
        departmentId: dept.id,
        meta: { name: dept.name, manager_id },
      });
    });
    res.json({ data: toDepartment(await departmentsQuery().where('d.id', dept.id).first()) });
  },
);

router.delete('/:id', authorize('admin'), validate({ params: idParam }), async (req, res) => {
  const dept = await loadDepartment(req.valid.params.id);
  const members = await db('users').where({ department_id: dept.id }).whereNull('deleted_at').count({ c: '*' }).first();
  if (Number(members.c) > 0) throw ApiError.conflict('لا يمكن حذف قسم يحتوي على موظفين أو مدير، انقلهم أولاً');

  await db.transaction(async (trx) => {
    await trx('departments')
      .where({ id: dept.id })
      .update({ deleted_at: new Date(), manager_id: null, name: `${dept.name}#deleted#${dept.id}`.slice(0, 120) });
    await logActivity(trx, { actor: req.user, action: 'department.deleted', entityType: 'department', entityId: dept.id, meta: { name: dept.name } });
  });
  res.status(204).end();
});

export default router;
