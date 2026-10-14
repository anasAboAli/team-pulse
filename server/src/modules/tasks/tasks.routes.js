import fs from 'node:fs';
import path from 'node:path';
import { Router } from 'express';
import { db } from '../../config/db.js';
import { authorize } from '../../middleware/auth.js';
import { PRIVATE_DIR, removeUpload, uploadAttachments } from '../../middleware/upload.js';
import { validate } from '../../middleware/validate.js';
import { z, boolish, id, idParam, optDate, optText, pagination } from '../../lib/z.js';
import { canAssignTask, canManageTask, emptyScope, isAdmin, isEmployee, isManager } from '../../policies/index.js';
import { ApiError } from '../../utils/ApiError.js';
import { logActivity, notify } from '../../utils/events.js';
import { compact } from '../../utils/helpers.js';
import { paginate } from '../../utils/pagination.js';
import { findUser } from '../users/users.service.js';
import {
  STATUS_LABELS,
  allowedTransitions,
  isOpen,
  loadAccessibleTask,
  loadManageableTask,
  taskStakeholders,
  tasksQuery,
  toTask,
} from './tasks.service.js';

const router = Router();

const STATUSES = Object.keys(STATUS_LABELS);
const PRIORITIES = ['low', 'medium', 'high', 'urgent'];

const listQuery = z.object({
  ...pagination,
  q: z.string().trim().max(100).optional(),
  status: z.enum([...STATUSES, 'open']).optional(),
  priority: z.enum(PRIORITIES).optional(),
  assignee_id: id.optional(),
  department_id: id.optional(),
  overdue: boolish.optional(),
  sort: z.enum(['newest', 'due_date', 'priority']).default('newest'),
});

const taskBody = z.object({
  title: z.string().trim().min(3).max(200),
  description: optText(5000),
  assignee_id: id,
  priority: z.enum(PRIORITIES).default('medium'),
  due_date: optDate,
  requires_attachment: z.boolean().default(false),
});

/** يطبّق نطاق رؤية المهام حسب الدور */
function scopeTasks(qb, actor) {
  if (isAdmin(actor)) return qb;
  if (isManager(actor)) return actor.department_id ? qb.where('t.department_id', actor.department_id) : emptyScope(qb);
  return qb.where('t.assignee_id', actor.id);
}

async function loadAssignee(actor, assigneeId) {
  const assignee = await findUser(assigneeId);
  if (!canAssignTask(actor, assignee)) {
    throw ApiError.unprocessable('البيانات المدخلة غير صحيحة', {
      assignee_id: 'لا يمكنك إسناد مهمة لهذا المستخدم',
    });
  }
  return assignee;
}

async function taskDetail(actor, taskId) {
  const row = await tasksQuery().where('t.id', taskId).first();
  const task = toTask(row);
  const attachments = await db({ f: 'task_attachments' })
    .join({ u: 'users' }, 'u.id', 'f.uploaded_by')
    .select('f.id', 'f.original_name', 'f.mime_type', 'f.size_bytes', 'f.created_at', 'f.uploaded_by', 'u.full_name as uploaded_by_name')
    .where('f.task_id', taskId)
    .orderBy('f.created_at');
  const manage = canManageTask(actor, task);
  return {
    ...task,
    attachments,
    permissions: {
      can_edit: manage && isOpen(task),
      can_delete: manage,
      can_upload: isOpen(task) && (manage || (task.assignee_id === actor.id && task.status !== 'submitted')),
      can_comment: true,
      transitions: allowedTransitions(actor, task),
    },
  };
}

// ── القائمة ────────────────────────────────────────────────
router.get('/', validate({ query: listQuery }), async (req, res) => {
  const { q, status, priority, assignee_id, department_id, overdue, sort, ...pg } = req.valid.query;
  const qb = scopeTasks(tasksQuery(), req.user);

  if (status === 'open') qb.whereNotIn('t.status', ['completed', 'cancelled']);
  else if (status) qb.where('t.status', status);
  if (priority) qb.where('t.priority', priority);
  if (assignee_id && !isEmployee(req.user)) qb.where('t.assignee_id', assignee_id);
  if (department_id && isAdmin(req.user)) qb.where('t.department_id', department_id);
  if (overdue) qb.where('t.due_date', '<', db.raw('CURRENT_DATE')).whereNotIn('t.status', ['completed', 'cancelled']);
  if (q) qb.where((w) => w.whereLike('t.title', `%${q}%`).orWhereLike('a.full_name', `%${q}%`));

  if (sort === 'due_date') qb.orderByRaw('t.due_date IS NULL, t.due_date ASC');
  else if (sort === 'priority') qb.orderByRaw("FIELD(t.priority, 'urgent','high','medium','low')").orderBy('t.created_at', 'desc');
  else qb.orderBy('t.created_at', 'desc');

  res.json(await paginate(qb, pg, toTask));
});

// ── إنشاء وإسناد ───────────────────────────────────────────
router.post('/', authorize('admin', 'manager'), validate({ body: taskBody }), async (req, res) => {
  const input = req.valid.body;
  const assignee = await loadAssignee(req.user, input.assignee_id);

  const taskId = await db.transaction(async (trx) => {
    const [newId] = await trx('tasks').insert(
      compact({ ...input, assigned_by: req.user.id, department_id: assignee.department_id, status: 'new' }),
    );
    await notify(trx, assignee.id, {
      type: 'task.assigned',
      title: `مهمة جديدة: ${input.title}`,
      body: `أسندها إليك ${req.user.full_name}`,
      link: `/tasks/${newId}`,
    });
    await logActivity(trx, {
      actor: req.user,
      action: 'task.created',
      entityType: 'task',
      entityId: newId,
      departmentId: assignee.department_id,
      meta: { title: input.title, assignee: assignee.full_name },
    });
    return newId;
  });

  res.status(201).json({ data: await taskDetail(req.user, taskId) });
});

// ── التفاصيل ───────────────────────────────────────────────
router.get('/:id', validate({ params: idParam }), async (req, res) => {
  const task = await loadAccessibleTask(req.user, req.valid.params.id);
  res.json({ data: await taskDetail(req.user, task.id) });
});

// ── التعديل (المُسنِد / مدير القسم / المشرف) ───────────────
router.put('/:id', authorize('admin', 'manager'), validate({ params: idParam, body: taskBody }), async (req, res) => {
  const task = await loadManageableTask(req.user, req.valid.params.id);
  if (!isOpen(task)) throw ApiError.conflict('لا يمكن تعديل مهمة مكتملة أو ملغاة');
  const input = req.valid.body;

  await db.transaction(async (trx) => {
    const update = compact(input);
    if (input.assignee_id !== task.assignee_id) {
      const assignee = await loadAssignee(req.user, input.assignee_id);
      update.department_id = assignee.department_id;
      await notify(trx, assignee.id, {
        type: 'task.assigned',
        title: `مهمة جديدة: ${input.title}`,
        body: `أسندها إليك ${req.user.full_name}`,
        link: `/tasks/${task.id}`,
      });
    }
    await trx('tasks').where({ id: task.id }).update(update);
    await logActivity(trx, {
      actor: req.user,
      action: 'task.updated',
      entityType: 'task',
      entityId: task.id,
      departmentId: update.department_id ?? task.department_id,
      meta: { title: input.title },
    });
  });

  res.json({ data: await taskDetail(req.user, task.id) });
});

// ── تغيير الحالة ───────────────────────────────────────────
router.patch(
  '/:id/status',
  validate({
    params: idParam,
    body: z.object({ status: z.enum(STATUSES), comment: optText(2000) }),
  }),
  async (req, res) => {
    const task = await loadAccessibleTask(req.user, req.valid.params.id);
    const { status, comment } = req.valid.body;

    if (!allowedTransitions(req.user, task).includes(status)) {
      throw ApiError.forbidden(`لا يمكنك نقل المهمة من "${STATUS_LABELS[task.status]}" إلى "${STATUS_LABELS[status]}"`);
    }
    if (status === 'returned' && !comment) {
      throw ApiError.unprocessable('البيانات المدخلة غير صحيحة', { comment: 'يرجى توضيح سبب الإرجاع' });
    }
    if (status === 'submitted' && task.requires_attachment) {
      const files = await db('task_attachments').where({ task_id: task.id, uploaded_by: task.assignee_id }).count({ c: '*' }).first();
      if (Number(files.c) === 0) throw ApiError.unprocessable('هذه المهمة تتطلب إرفاق ملف قبل التسليم', { files: 'أرفق ملفاً واحداً على الأقل' });
    }

    await db.transaction(async (trx) => {
      const update = { status };
      if (status === 'submitted') update.submitted_at = new Date();
      if (status === 'completed') update.completed_at = new Date();
      await trx('tasks').where({ id: task.id }).update(update);

      await trx('task_comments').insert({
        task_id: task.id,
        user_id: req.user.id,
        is_system: true,
        body: `غيّر الحالة من "${STATUS_LABELS[task.status]}" إلى "${STATUS_LABELS[status]}"${comment ? ` — ${comment}` : ''}`,
      });

      const recipients = status === 'submitted' ? (await taskStakeholders(task)).slice(1) : [task.assignee_id];
      await notify(trx, recipients, {
        type: `task.${status}`,
        title: `${STATUS_LABELS[status]}: ${task.title}`,
        body: comment || `بواسطة ${req.user.full_name}`,
        link: `/tasks/${task.id}`,
        exclude: req.user.id,
      });
      await logActivity(trx, {
        actor: req.user,
        action: 'task.status_changed',
        entityType: 'task',
        entityId: task.id,
        departmentId: task.department_id,
        meta: { title: task.title, from: task.status, to: status },
      });
    });

    res.json({ data: await taskDetail(req.user, task.id) });
  },
);

// ── الحذف (ناعم) ───────────────────────────────────────────
router.delete('/:id', authorize('admin', 'manager'), validate({ params: idParam }), async (req, res) => {
  const task = await loadManageableTask(req.user, req.valid.params.id);
  await db('tasks').where({ id: task.id }).update({ deleted_at: new Date() });
  await logActivity(null, {
    actor: req.user,
    action: 'task.deleted',
    entityType: 'task',
    entityId: task.id,
    departmentId: task.department_id,
    meta: { title: task.title },
  });
  res.status(204).end();
});

// ── المرفقات ───────────────────────────────────────────────
router.post('/:id/attachments', validate({ params: idParam }), async (req, res, next) => {
  // التحقق من الصلاحية قبل استقبال الملفات حتى لا تُكتب ملفات مرفوضة على القرص
  const task = await loadAccessibleTask(req.user, req.valid.params.id);
  if (!isOpen(task)) throw ApiError.conflict('لا يمكن إرفاق ملفات بمهمة مغلقة');
  if (task.status === 'submitted' && !canManageTask(req.user, task)) {
    throw ApiError.conflict('المهمة بانتظار المراجعة، لا يمكن تعديل مرفقاتها الآن');
  }
  req.task = task;
  uploadAttachments(req, res, async (err) => {
    try {
      if (err) throw err;
      if (!req.files?.length) throw ApiError.badRequest('يرجى اختيار ملف واحد على الأقل');
      await db('task_attachments').insert(
        req.files.map((f) => ({
          task_id: task.id,
          uploaded_by: req.user.id,
          original_name: f.originalname.slice(0, 255),
          stored_name: f.filename,
          mime_type: f.mimetype,
          size_bytes: f.size,
        })),
      );
      await logActivity(null, {
        actor: req.user,
        action: 'task.files_uploaded',
        entityType: 'task',
        entityId: task.id,
        departmentId: task.department_id,
        meta: { title: task.title, count: req.files.length },
      });
      res.status(201).json({ data: await taskDetail(req.user, task.id) });
    } catch (e) {
      next(e);
    }
  });
});

// ── التعليقات ──────────────────────────────────────────────
router.get('/:id/comments', validate({ params: idParam }), async (req, res) => {
  const task = await loadAccessibleTask(req.user, req.valid.params.id);
  const comments = await db({ c: 'task_comments' })
    .join({ u: 'users' }, 'u.id', 'c.user_id')
    .select('c.id', 'c.body', 'c.is_system', 'c.created_at', 'u.id as user_id', 'u.full_name', 'u.role', 'u.avatar_path')
    .where('c.task_id', task.id)
    .orderBy('c.created_at')
    .orderBy('c.id');
  res.json({
    data: comments.map((c) => ({
      id: c.id,
      body: c.body,
      is_system: !!c.is_system,
      created_at: c.created_at,
      user: { id: c.user_id, full_name: c.full_name, role: c.role, avatar_url: c.avatar_path ? `/uploads/public/${c.avatar_path}` : null },
    })),
  });
});

router.post(
  '/:id/comments',
  validate({ params: idParam, body: z.object({ body: z.string().trim().min(1).max(2000) }) }),
  async (req, res) => {
    const task = await loadAccessibleTask(req.user, req.valid.params.id);
    const [commentId] = await db('task_comments').insert({ task_id: task.id, user_id: req.user.id, body: req.valid.body.body });
    await notify(null, await taskStakeholders(task), {
      type: 'task.comment',
      title: `تعليق جديد على: ${task.title}`,
      body: `${req.user.full_name}: ${req.valid.body.body.slice(0, 120)}`,
      link: `/tasks/${task.id}`,
      exclude: req.user.id,
    });
    res.status(201).json({ data: { id: commentId } });
  },
);

export default router;

// ── مسارات المرفقات المستقلة (/attachments/:id) ────────────
export const attachmentsRouter = Router();

async function loadAttachment(actor, attachmentId) {
  const file = await db('task_attachments').where({ id: attachmentId }).first();
  if (!file) throw ApiError.notFound('الملف غير موجود');
  const task = await loadAccessibleTask(actor, file.task_id);
  return { file, task };
}

attachmentsRouter.get('/:id/download', validate({ params: idParam }), async (req, res) => {
  const { file } = await loadAttachment(req.user, req.valid.params.id);
  const filePath = path.join(PRIVATE_DIR, path.basename(file.stored_name));
  if (!fs.existsSync(filePath)) throw ApiError.notFound('الملف غير موجود على الخادم');
  res.download(filePath, file.original_name);
});

attachmentsRouter.delete('/:id', validate({ params: idParam }), async (req, res) => {
  const { file, task } = await loadAttachment(req.user, req.valid.params.id);
  if (file.uploaded_by !== req.user.id && !isAdmin(req.user)) throw ApiError.forbidden('يمكنك حذف ملفاتك فقط');
  if (!isOpen(task) || (task.status === 'submitted' && !canManageTask(req.user, task))) {
    throw ApiError.conflict('لا يمكن حذف مرفقات هذه المهمة في حالتها الحالية');
  }
  await db('task_attachments').where({ id: file.id }).del();
  removeUpload(PRIVATE_DIR, file.stored_name);
  res.status(204).end();
});

