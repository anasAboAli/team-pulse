import { db } from '../../config/db.js';
import { canAccessTask, canManageTask } from '../../policies/index.js';
import { ApiError } from '../../utils/ApiError.js';

export const STATUS_LABELS = {
  new: 'جديدة',
  in_progress: 'قيد التنفيذ',
  submitted: 'مُسلَّمة',
  completed: 'مكتملة',
  returned: 'مُعادة للتعديل',
  cancelled: 'ملغاة',
};

/**
 * انتقالات الحالة المسموحة ومن يملكها:
 *  assignee = الموظف المُسند له · manager = المشرف أو مدير قسم المهمة
 */
const TRANSITIONS = {
  new: { in_progress: 'assignee', submitted: 'assignee', cancelled: 'manager' },
  in_progress: { submitted: 'assignee', cancelled: 'manager' },
  returned: { in_progress: 'assignee', submitted: 'assignee', cancelled: 'manager' },
  submitted: { completed: 'manager', returned: 'manager', cancelled: 'manager' },
  completed: {},
  cancelled: {},
};

export function allowedTransitions(actor, task) {
  const options = TRANSITIONS[task.status] || {};
  return Object.entries(options)
    .filter(([, who]) => (who === 'assignee' ? task.assignee_id === actor.id : canManageTask(actor, task)))
    .map(([to]) => to);
}

export const isOpen = (task) => !['completed', 'cancelled'].includes(task.status);

export function tasksQuery() {
  const attachments = db('task_attachments').select('task_id').count({ c: '*' }).groupBy('task_id').as('ta');
  return db({ t: 'tasks' })
    .join({ a: 'users' }, 'a.id', 't.assignee_id')
    .join({ b: 'users' }, 'b.id', 't.assigned_by')
    .leftJoin({ d: 'departments' }, 'd.id', 't.department_id')
    .leftJoin(attachments, 'ta.task_id', 't.id')
    .select(
      't.*',
      'a.full_name as assignee_name',
      'a.avatar_path as assignee_avatar',
      'b.full_name as assigned_by_name',
      'd.name as department_name',
      db.raw('COALESCE(ta.c, 0) AS attachments_count'),
      db.raw("(t.due_date < CURRENT_DATE AND t.status NOT IN ('completed','cancelled')) AS is_overdue"),
    )
    .whereNull('t.deleted_at');
}

export function toTask(row) {
  const { deleted_at, assignee_name, assignee_avatar, assigned_by_name, department_name, ...rest } = row;
  return {
    ...rest,
    requires_attachment: !!row.requires_attachment,
    is_overdue: !!Number(row.is_overdue),
    attachments_count: Number(row.attachments_count ?? 0),
    assignee: { id: row.assignee_id, full_name: assignee_name, avatar_url: assignee_avatar ? `/uploads/public/${assignee_avatar}` : null },
    assigner: { id: row.assigned_by, full_name: assigned_by_name },
    department: row.department_id ? { id: row.department_id, name: department_name } : null,
  };
}

/** يجلب المهمة ويطبّق سياسة الوصول (404 خارج النطاق) */
export async function loadAccessibleTask(actor, taskId) {
  const task = await db('tasks').where({ id: taskId }).whereNull('deleted_at').first();
  if (!canAccessTask(actor, task)) throw ApiError.notFound('المهمة غير موجودة');
  return task;
}

export async function loadManageableTask(actor, taskId) {
  const task = await loadAccessibleTask(actor, taskId);
  if (!canManageTask(actor, task)) throw ApiError.forbidden();
  return task;
}

/** المستلمون المعنيون بالمهمة: الموظف + من أسندها + مدير القسم */
export async function taskStakeholders(task) {
  const dept = task.department_id ? await db('departments').where({ id: task.department_id }).first('manager_id') : null;
  return [task.assignee_id, task.assigned_by, dept?.manager_id];
}
