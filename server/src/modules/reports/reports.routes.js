import { Router } from 'express';
import { db } from '../../config/db.js';
import { authorize } from '../../middleware/auth.js';
import { emptyScope, isManager } from '../../policies/index.js';
import { toCsv } from '../../utils/helpers.js';
import { STATUS_LABELS } from '../tasks/tasks.service.js';

const router = Router();
router.use(authorize('admin', 'manager'));

const PRIORITY_LABELS = { low: 'منخفضة', medium: 'متوسطة', high: 'عالية', urgent: 'عاجلة' };
const PERIOD_LABELS = { monthly: 'شهري', quarterly: 'ربع سنوي', yearly: 'سنوي' };
const fmtDate = (v) => (v instanceof Date ? v.toISOString().slice(0, 10) : (v ?? ''));

function sendCsv(res, name, csv) {
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${name}-${new Date().toISOString().slice(0, 10)}.csv"`);
  res.send(csv);
}

router.get('/tasks.csv', async (req, res) => {
  const qb = db({ t: 'tasks' })
    .join({ a: 'users' }, 'a.id', 't.assignee_id')
    .join({ b: 'users' }, 'b.id', 't.assigned_by')
    .leftJoin({ d: 'departments' }, 'd.id', 't.department_id')
    .whereNull('t.deleted_at')
    .select('t.*', 'a.full_name as assignee', 'b.full_name as assigner', 'd.name as department')
    .orderBy('t.created_at', 'desc');
  if (isManager(req.user)) {
    if (!req.user.department_id) emptyScope(qb);
    qb.where('t.department_id', req.user.department_id);
  }
  const rows = await qb;
  sendCsv(
    res,
    'tasks',
    toCsv(
      [
        { key: 'id', label: 'الرقم' },
        { key: 'title', label: 'العنوان' },
        { key: 'department', label: 'القسم' },
        { key: 'assignee', label: 'الموظف' },
        { key: 'assigner', label: 'أسندها' },
        { label: 'الأولوية', value: (r) => PRIORITY_LABELS[r.priority] },
        { label: 'الحالة', value: (r) => STATUS_LABELS[r.status] },
        { key: 'due_date', label: 'موعد التسليم' },
        { label: 'تاريخ الإنشاء', value: (r) => fmtDate(r.created_at) },
        { label: 'تاريخ الإكمال', value: (r) => fmtDate(r.completed_at) },
      ],
      rows,
    ),
  );
});

router.get('/evaluations.csv', async (req, res) => {
  const qb = db({ ev: 'evaluations' })
    .join({ e: 'users' }, 'e.id', 'ev.evaluatee_id')
    .join({ r: 'users' }, 'r.id', 'ev.evaluator_id')
    .leftJoin({ d: 'departments' }, 'd.id', 'e.department_id')
    .select('ev.*', 'e.full_name as evaluatee', 'e.role as evaluatee_role', 'r.full_name as evaluator', 'd.name as department')
    .orderBy('ev.period_start', 'desc');
  if (isManager(req.user)) {
    if (!req.user.department_id) emptyScope(qb);
    qb.where('e.department_id', req.user.department_id).where('e.role', 'employee');
  }
  const rows = await qb;
  sendCsv(
    res,
    'evaluations',
    toCsv(
      [
        { key: 'evaluatee', label: 'المُقيَّم' },
        { label: 'الدور', value: (r) => (r.evaluatee_role === 'manager' ? 'مدير' : 'موظف') },
        { key: 'department', label: 'القسم' },
        { key: 'evaluator', label: 'المُقيِّم' },
        { label: 'نوع الفترة', value: (r) => PERIOD_LABELS[r.period_type] },
        { key: 'period_start', label: 'بداية الفترة' },
        { key: 'period_end', label: 'نهاية الفترة' },
        { key: 'overall_score', label: 'الدرجة (من 5)' },
        { key: 'notes', label: 'ملاحظات' },
      ],
      rows,
    ),
  );
});

export default router;
