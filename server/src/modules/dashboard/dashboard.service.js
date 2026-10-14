import { db } from '../../config/db.js';
import { parseJson, percent, toNumber } from '../../utils/helpers.js';

const OPEN = ['completed', 'cancelled'];

/** مفاتيح آخر n شهر بصيغة YYYY-MM من الأقدم للأحدث */
function lastMonths(n) {
  const now = new Date();
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (n - 1 - i), 1));
    return d.toISOString().slice(0, 7);
  });
}

/** ملخص المهام لاستعلام مُقيَّد مسبقاً */
async function taskSummary(scope) {
  const row = await scope(db('tasks').whereNull('deleted_at'))
    .select(
      db.raw('COUNT(*) AS total'),
      db.raw("SUM(status = 'completed') AS completed"),
      db.raw("SUM(status = 'cancelled') AS cancelled"),
      db.raw("SUM(status = 'submitted') AS submitted"),
      db.raw("SUM(status NOT IN ('completed','cancelled')) AS open"),
      db.raw("SUM(status NOT IN ('completed','cancelled') AND due_date < CURRENT_DATE) AS overdue"),
      db.raw("SUM(status = 'completed' AND (due_date IS NULL OR DATE(completed_at) <= due_date)) AS on_time"),
      db.raw("SUM(status = 'completed' AND completed_at >= DATE_FORMAT(UTC_TIMESTAMP(), '%Y-%m-01')) AS completed_this_month"),
    )
    .first();
  const n = (k) => Number(row?.[k] ?? 0);
  return {
    total: n('total'),
    open: n('open'),
    submitted: n('submitted'),
    overdue: n('overdue'),
    completed: n('completed'),
    completed_this_month: n('completed_this_month'),
    completion_rate: percent(n('completed'), n('total') - n('cancelled')),
    on_time_rate: percent(n('on_time'), n('completed')),
  };
}

async function statusDistribution(scope) {
  const rows = await scope(db('tasks').whereNull('deleted_at')).select('status').count({ c: '*' }).groupBy('status');
  return Object.fromEntries(rows.map((r) => [r.status, Number(r.c)]));
}

/** المهام المنشأة والمكتملة شهرياً */
async function monthlyTasks(scope, months) {
  const keys = lastMonths(months);
  const from = `${keys[0]}-01`;
  const created = await scope(db('tasks').whereNull('deleted_at'))
    .where('created_at', '>=', from)
    .select(db.raw("DATE_FORMAT(created_at, '%Y-%m') AS m"))
    .count({ c: '*' })
    .groupBy('m');
  const completed = await scope(db('tasks').whereNull('deleted_at'))
    .where('status', 'completed')
    .where('completed_at', '>=', from)
    .select(db.raw("DATE_FORMAT(completed_at, '%Y-%m') AS m"))
    .count({ c: '*' })
    .groupBy('m');
  const toMap = (rows) => new Map(rows.map((r) => [r.m, Number(r.c)]));
  const c1 = toMap(created);
  const c2 = toMap(completed);
  return keys.map((m) => ({ month: m, created: c1.get(m) ?? 0, completed: c2.get(m) ?? 0 }));
}

async function recentActivity(scope, limit = 8) {
  const rows = await scope(
    db({ l: 'activity_logs' })
      .leftJoin({ u: 'users' }, 'u.id', 'l.actor_id')
      .select('l.*', 'u.full_name as actor_name', 'u.role as actor_role'),
  )
    .orderBy('l.created_at', 'desc')
    .orderBy('l.id', 'desc')
    .limit(limit);
  return rows.map(toActivity);
}

export function toActivity(r) {
  return {
    id: r.id,
    action: r.action,
    entity_type: r.entity_type,
    entity_id: r.entity_id,
    department_id: r.department_id,
    meta: parseJson(r.meta) ?? {},
    created_at: r.created_at,
    actor: r.actor_id ? { id: r.actor_id, full_name: r.actor_name, role: r.actor_role } : null,
  };
}

/** متوسط التقييمات لكل موظف، مرتباً */
async function rankedEmployees(scope, direction, limit = 5) {
  const rows = await scope(
    db({ u: 'users' })
      .join({ ev: 'evaluations' }, 'ev.evaluatee_id', 'u.id')
      .leftJoin({ d: 'departments' }, 'd.id', 'u.department_id')
      .where('u.role', 'employee')
      .whereNull('u.deleted_at')
      .where('u.is_active', true),
  )
    .select('u.id', 'u.full_name', 'u.job_title', 'u.avatar_path', 'd.name as department_name')
    .avg({ avg: 'ev.overall_score' })
    .count({ evaluations: 'ev.id' })
    .groupBy('u.id', 'u.full_name', 'u.job_title', 'u.avatar_path', 'd.name')
    .orderBy('avg', direction)
    .limit(limit);
  return rows.map((r) => ({
    id: r.id,
    full_name: r.full_name,
    job_title: r.job_title,
    department_name: r.department_name,
    avatar_url: r.avatar_path ? `/uploads/public/${r.avatar_path}` : null,
    average_score: toNumber(r.avg, 2),
    evaluations: Number(r.evaluations),
  }));
}

async function averageScore(scope) {
  const row = await scope(db({ ev: 'evaluations' }).join({ u: 'users' }, 'u.id', 'ev.evaluatee_id'))
    .avg({ avg: 'ev.overall_score' })
    .first();
  return toNumber(row?.avg, 2);
}

/** اتجاه متوسط التقييم شهرياً */
async function scoreTrend(scope, months = 12) {
  const keys = lastMonths(months);
  const rows = await scope(db({ ev: 'evaluations' }).join({ u: 'users' }, 'u.id', 'ev.evaluatee_id'))
    .where('ev.period_start', '>=', `${keys[0]}-01`)
    .select(db.raw("DATE_FORMAT(ev.period_start, '%Y-%m') AS m"))
    .avg({ avg: 'ev.overall_score' })
    .groupBy('m');
  const map = new Map(rows.map((r) => [r.m, toNumber(r.avg, 2)]));
  return keys.map((m) => ({ month: m, average: map.get(m) ?? null }));
}

// ═══════════════════════ لوحة المشرف ═══════════════════════
export async function adminDashboard() {
  const all = (q) => q;
  const counts = await db('users')
    .whereNull('deleted_at')
    .select(
      db.raw("SUM(role = 'manager') AS managers"),
      db.raw("SUM(role = 'employee' AND is_active = 1) AS employees_active"),
      db.raw("SUM(role = 'employee') AS employees"),
    )
    .first();
  const departmentsCount = await db('departments').whereNull('deleted_at').count({ c: '*' }).first();

  const [tasks, monthly, avgEmployees, avgManagers, top, bottom, activity, statuses] = await Promise.all([
    taskSummary(all),
    monthlyTasks(all, 12),
    averageScore((q) => q.where('u.role', 'employee')),
    averageScore((q) => q.where('u.role', 'manager')),
    rankedEmployees(all, 'desc'),
    rankedEmployees(all, 'asc'),
    recentActivity(all, 10),
    statusDistribution(all),
  ]);

  // مقارنة الأقسام
  const departments = await db({ d: 'departments' }).whereNull('d.deleted_at').leftJoin({ m: 'users' }, 'm.id', 'd.manager_id').select('d.id', 'd.name', 'm.full_name as manager_name').orderBy('d.name');
  const deptStats = await Promise.all(
    departments.map(async (d) => {
      const [t, avg, emp] = await Promise.all([
        taskSummary((q) => q.where('department_id', d.id)),
        averageScore((q) => q.where('u.department_id', d.id).where('u.role', 'employee')),
        db('users').where({ department_id: d.id, role: 'employee' }).whereNull('deleted_at').count({ c: '*' }).first(),
      ]);
      return {
        id: d.id,
        name: d.name,
        manager_name: d.manager_name,
        employees: Number(emp.c),
        tasks_total: t.total,
        tasks_open: t.open,
        completion_rate: t.completion_rate,
        on_time_rate: t.on_time_rate,
        average_score: avg,
      };
    }),
  );

  // تقييمات المدراء
  const managers = await db({ u: 'users' })
    .leftJoin({ d: 'departments' }, 'd.manager_id', 'u.id')
    .leftJoin({ ev: 'evaluations' }, 'ev.evaluatee_id', 'u.id')
    .where('u.role', 'manager')
    .whereNull('u.deleted_at')
    .select('u.id', 'u.full_name', 'u.avatar_path', 'd.id as department_id', 'd.name as department_name')
    .avg({ avg: 'ev.overall_score' })
    .count({ evaluations: 'ev.id' })
    .max({ last_period: 'ev.period_start' })
    .groupBy('u.id', 'u.full_name', 'u.avatar_path', 'd.id', 'd.name')
    .orderBy('u.full_name');

  return {
    kpis: {
      departments: Number(departmentsCount.c),
      managers: Number(counts.managers ?? 0),
      employees: Number(counts.employees ?? 0),
      employees_active: Number(counts.employees_active ?? 0),
      ...Object.fromEntries(Object.entries(tasks).map(([k, v]) => [`tasks_${k}`, v])),
      average_score_employees: avgEmployees,
      average_score_managers: avgManagers,
    },
    status_distribution: statuses,
    monthly_tasks: monthly,
    departments: deptStats,
    top_employees: top,
    bottom_employees: bottom,
    managers: managers.map((m) => ({
      id: m.id,
      full_name: m.full_name,
      avatar_url: m.avatar_path ? `/uploads/public/${m.avatar_path}` : null,
      department: m.department_id ? { id: m.department_id, name: m.department_name } : null,
      average_score: toNumber(m.avg, 2),
      evaluations: Number(m.evaluations),
      last_period: m.last_period,
    })),
    score_trend: await scoreTrend((q) => q.where('u.role', 'employee')),
    recent_activity: activity,
  };
}

// ═══════════════════════ لوحة المدير ═══════════════════════
export async function managerDashboard(actor) {
  const deptId = actor.department_id;
  if (!deptId) return { department: null };

  const department = await db('departments').where({ id: deptId }).first('id', 'name', 'description');
  const inDept = (q) => q.where('department_id', deptId);
  const deptEmployees = (q) => q.where('u.department_id', deptId).where('u.role', 'employee');

  const [tasks, statuses, monthly, avg, trend, activity, ownLatest] = await Promise.all([
    taskSummary(inDept),
    statusDistribution(inDept),
    monthlyTasks(inDept, 6),
    averageScore(deptEmployees),
    scoreTrend(deptEmployees),
    recentActivity((q) => q.where('l.department_id', deptId), 10),
    db('evaluations').where({ evaluatee_id: actor.id }).orderBy('period_start', 'desc').first('id', 'overall_score', 'period_start', 'period_type'),
  ]);

  // أداء كل موظف
  const employees = await db({ u: 'users' })
    .leftJoin({ t: 'tasks' }, function joinTasks() {
      this.on('t.assignee_id', 'u.id').andOn('t.department_id', 'u.department_id').andOnNull('t.deleted_at');
    })
    .where('u.department_id', deptId)
    .where('u.role', 'employee')
    .whereNull('u.deleted_at')
    .select(
      'u.id',
      'u.full_name',
      'u.job_title',
      'u.avatar_path',
      'u.is_active',
      db.raw("SUM(t.status IS NOT NULL AND t.status <> 'cancelled') AS assigned"),
      db.raw("SUM(t.status = 'completed') AS completed"),
      db.raw("SUM(t.status NOT IN ('completed','cancelled')) AS open"),
      db.raw("SUM(t.status NOT IN ('completed','cancelled') AND t.due_date < CURRENT_DATE) AS overdue"),
      db.raw("SUM(t.status = 'completed' AND (t.due_date IS NULL OR DATE(t.completed_at) <= t.due_date)) AS on_time"),
    )
    .groupBy('u.id', 'u.full_name', 'u.job_title', 'u.avatar_path', 'u.is_active')
    .orderBy('u.full_name');

  const scores = await db('evaluations')
    .whereIn('evaluatee_id', employees.map((e) => e.id))
    .select('evaluatee_id')
    .avg({ avg: 'overall_score' })
    .groupBy('evaluatee_id');
  const scoreMap = new Map(scores.map((s) => [s.evaluatee_id, toNumber(s.avg, 2)]));

  const pending = await db({ t: 'tasks' })
    .join({ a: 'users' }, 'a.id', 't.assignee_id')
    .where('t.department_id', deptId)
    .where('t.status', 'submitted')
    .whereNull('t.deleted_at')
    .select('t.id', 't.title', 't.priority', 't.due_date', 't.submitted_at', 'a.full_name as assignee_name')
    .orderBy('t.submitted_at')
    .limit(6);

  return {
    department,
    kpis: {
      employees: employees.length,
      ...Object.fromEntries(Object.entries(tasks).map(([k, v]) => [`tasks_${k}`, v])),
      average_score: avg,
      my_latest_score: ownLatest ? toNumber(ownLatest.overall_score, 2) : null,
    },
    status_distribution: statuses,
    monthly_tasks: monthly,
    score_trend: trend,
    employees: employees.map((e) => {
      const n = (k) => Number(e[k] ?? 0);
      return {
        id: e.id,
        full_name: e.full_name,
        job_title: e.job_title,
        is_active: !!e.is_active,
        avatar_url: e.avatar_path ? `/uploads/public/${e.avatar_path}` : null,
        assigned: n('assigned'),
        completed: n('completed'),
        open: n('open'),
        overdue: n('overdue'),
        completion_rate: percent(n('completed'), n('assigned')),
        on_time_rate: percent(n('on_time'), n('completed')),
        average_score: scoreMap.get(e.id) ?? null,
      };
    }),
    pending_review: pending,
    recent_activity: activity,
  };
}

// ═══════════════════════ لوحة الموظف ═══════════════════════
export async function employeeDashboard(actor) {
  const mine = (q) => q.where('assignee_id', actor.id);
  const [tasks, statuses] = await Promise.all([taskSummary(mine), statusDistribution(mine)]);

  const openTasks = await db({ t: 'tasks' })
    .leftJoin({ b: 'users' }, 'b.id', 't.assigned_by')
    .where('t.assignee_id', actor.id)
    .whereNull('t.deleted_at')
    .whereNotIn('t.status', OPEN)
    .select('t.id', 't.title', 't.status', 't.priority', 't.due_date', 't.requires_attachment', 'b.full_name as assigned_by_name')
    .select(db.raw('(t.due_date < CURRENT_DATE) AS is_overdue'))
    .orderByRaw("t.status = 'returned' DESC, t.due_date IS NULL, t.due_date ASC")
    .limit(8);

  const evaluations = await db({ ev: 'evaluations' })
    .join({ r: 'users' }, 'r.id', 'ev.evaluator_id')
    .where('ev.evaluatee_id', actor.id)
    .select('ev.id', 'ev.period_type', 'ev.period_start', 'ev.overall_score', 'ev.notes', 'r.full_name as evaluator_name')
    .orderBy('ev.period_start', 'desc')
    .limit(12);

  let latest = null;
  if (evaluations[0]) {
    const scores = await db({ s: 'evaluation_scores' })
      .join({ c: 'evaluation_criteria' }, 'c.id', 's.criterion_id')
      .where('s.evaluation_id', evaluations[0].id)
      .select('c.name', 's.score')
      .orderBy('c.id');
    latest = { ...evaluations[0], overall_score: toNumber(evaluations[0].overall_score, 2), scores };
  }

  const unread = await db('notifications').where({ user_id: actor.id }).whereNull('read_at').count({ c: '*' }).first();

  return {
    kpis: {
      ...Object.fromEntries(Object.entries(tasks).map(([k, v]) => [`tasks_${k}`, v])),
      average_score: evaluations.length
        ? toNumber(evaluations.reduce((s, e) => s + Number(e.overall_score), 0) / evaluations.length, 2)
        : null,
      unread_notifications: Number(unread.c),
    },
    status_distribution: statuses,
    open_tasks: openTasks.map((t) => ({ ...t, requires_attachment: !!t.requires_attachment, is_overdue: !!Number(t.is_overdue) })),
    latest_evaluation: latest,
    score_trend: evaluations
      .slice()
      .reverse()
      .map((e) => ({ period: e.period_start, average: toNumber(e.overall_score, 2) })),
  };
}
