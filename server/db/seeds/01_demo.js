/**
 * بيانات تجريبية: شركة + مشرف + 4 أقسام بمدرائها وموظفيها + مهام وتقييمات لستة أشهر.
 * ⚠️ يمسح كل البيانات الحالية — للتطوير فقط.
 * كلمات المرور من .env (SEED_ADMIN_PASSWORD / SEED_DEMO_PASSWORD).
 */
import bcrypt from 'bcryptjs';
import { env } from '../../src/config/env.js';
import { normalizePeriod } from '../../src/utils/helpers.js';

// مولّد أرقام شبه عشوائي ثابت لنتائج قابلة للتكرار
let state = 20261014;
const rand = () => {
  state = (state * 1664525 + 1013904223) % 4294967296;
  return state / 4294967296;
};
const pick = (arr) => arr[Math.floor(rand() * arr.length)];
const between = (min, max) => min + Math.floor(rand() * (max - min + 1));

const DAY = 24 * 60 * 60 * 1000;
const daysAgo = (n) => new Date(Date.now() - n * DAY);
const dateOnly = (d) => d.toISOString().slice(0, 10);

const DEPARTMENTS = [
  {
    name: 'تقنية المعلومات',
    slug: 'it',
    description: 'تطوير الأنظمة والبنية التحتية والدعم الفني',
    manager: ['م. خالد العمري', 'مدير تقنية المعلومات'],
    employees: [
      ['أحمد الزعبي', 'مطوّر واجهات'],
      ['سارة الخطيب', 'مطوّرة خوادم'],
      ['يوسف حدّاد', 'مهندس بنية تحتية'],
      ['ليان مصطفى', 'مختبرة جودة'],
      ['عمر النجار', 'مسؤول دعم فني'],
    ],
    tasks: [
      'تحديث نظام النسخ الاحتياطي',
      'إصلاح مشكلة تسجيل الدخول في البوابة',
      'تصميم صفحة التقارير الجديدة',
      'ترقية خوادم قاعدة البيانات',
      'كتابة اختبارات وحدة لوحدة الفواتير',
      'مراجعة صلاحيات المستخدمين في النظام',
      'إعداد مراقبة الأداء للخوادم',
      'توثيق واجهات API الداخلية',
      'تجهيز أجهزة الموظفين الجدد',
      'تحسين سرعة تحميل الموقع',
    ],
  },
  {
    name: 'الموارد البشرية',
    slug: 'hr',
    description: 'التوظيف وشؤون الموظفين والتدريب',
    manager: ['أ. ريم السعدي', 'مديرة الموارد البشرية'],
    employees: [
      ['هبة القاسم', 'أخصائية توظيف'],
      ['محمود عيسى', 'أخصائي رواتب'],
      ['نور الهدى سليمان', 'منسّقة تدريب'],
      ['طارق البدوي', 'أخصائي علاقات موظفين'],
    ],
    tasks: [
      'فرز طلبات التوظيف لوظيفة محاسب',
      'إعداد خطة التدريب الربعية',
      'تحديث دليل سياسات الموظفين',
      'تنظيم يوم التعريف للموظفين الجدد',
      'مراجعة كشوف الرواتب الشهرية',
      'إجراء استبيان رضا الموظفين',
      'تحديث ملفات الموظفين',
      'إعداد تقرير الإجازات السنوية',
    ],
  },
  {
    name: 'المبيعات',
    slug: 'sales',
    description: 'إدارة العملاء وتحقيق أهداف المبيعات',
    manager: ['أ. فادي منصور', 'مدير المبيعات'],
    employees: [
      ['رنا الحسن', 'مندوبة مبيعات'],
      ['باسل عودة', 'مندوب مبيعات'],
      ['دانة يوسف', 'مسؤولة علاقات عملاء'],
      ['كريم شاهين', 'محلل مبيعات'],
      ['جود الأحمد', 'مندوبة مبيعات'],
      ['سامر داود', 'مسؤول حسابات كبرى'],
    ],
    tasks: [
      'متابعة العملاء المحتملين من المعرض',
      'إعداد عرض سعر لشركة النور',
      'تحليل مبيعات الربع الماضي',
      'تحديث قائمة الأسعار',
      'زيارة ميدانية للعملاء في الشمال',
      'إعداد تقرير المبيعات الشهري',
      'تجديد عقود العملاء السنوية',
      'تدريب الفريق على المنتج الجديد',
    ],
  },
  {
    name: 'المالية',
    slug: 'finance',
    description: 'المحاسبة والميزانيات والتدقيق',
    manager: ['أ. منى الجبوري', 'مديرة المالية'],
    employees: [
      ['إياد الصالح', 'محاسب'],
      ['ريتاج عبد الله', 'محاسبة'],
      ['حسام زيدان', 'مدقق داخلي'],
    ],
    tasks: [
      'إقفال الحسابات الشهرية',
      'إعداد الميزانية التقديرية',
      'مطابقة كشوف البنك',
      'مراجعة فواتير الموردين',
      'إعداد الإقرار الضريبي',
      'تدقيق مصروفات الأقسام',
    ],
  },
];

const CRITERIA = [
  ['جودة العمل', 'دقة المخرجات وإتقانها', 1.5],
  ['الالتزام بالمواعيد', 'تسليم المهام في وقتها', 1.25],
  ['التعاون والعمل الجماعي', 'التعاون مع الزملاء ودعم الفريق', 1],
  ['المبادرة', 'اقتراح الحلول والتحسينات', 1],
  ['التواصل', 'وضوح التواصل وسرعة الاستجابة', 1],
];

const PRIORITIES = ['low', 'medium', 'medium', 'high', 'high', 'urgent'];

/** الحسابات التجريبية الثلاثة (كلمات المرور من .env) */
export const DEMO_ACCOUNTS = {
  admin: env.seed.adminEmail,
  manager: 'manager@teampulse.test',
  employee: 'employee@teampulse.test',
};

/** مهام مفتوحة ثابتة للموظف التجريبي حتى تظهر لوحته بمحتوى في كل الحالات */
const DEMO_EMPLOYEE_TASKS = [
  { title: 'إعداد تقرير أداء النظام الأسبوعي', status: 'new', priority: 'high', due: 3, requires_attachment: true },
  { title: 'مراجعة شيفرة صفحة تسجيل الدخول', status: 'in_progress', priority: 'medium', due: 5, requires_attachment: false },
  { title: 'توثيق خطوات نشر النسخة الجديدة', status: 'returned', priority: 'urgent', due: 1, requires_attachment: true },
  { title: 'تحديث مكتبات الواجهة الأمامية', status: 'in_progress', priority: 'low', due: -2, requires_attachment: false },
];

export async function seed(knex) {
  // تفريغ الجداول بالترتيب
  await knex.raw('SET FOREIGN_KEY_CHECKS = 0');
  for (const table of [
    'activity_logs',
    'notifications',
    'evaluation_scores',
    'evaluations',
    'evaluation_criteria',
    'task_comments',
    'task_attachments',
    'tasks',
    'refresh_tokens',
    'users',
    'departments',
    'company_settings',
  ]) {
    await knex(table).truncate();
  }
  await knex.raw('SET FOREIGN_KEY_CHECKS = 1');

  const adminHash = await bcrypt.hash(env.seed.adminPassword, 12);
  const demoHash = await bcrypt.hash(env.seed.demoPassword, 12);

  await knex('company_settings').insert({
    name: 'شركة النبض للحلول التقنية',
    email: 'info@teampulse.test',
    phone: '+962 6 555 0100',
    website: 'https://teampulse.test',
    address: 'عمّان — شارع المدينة المنورة',
    description: 'شركة متخصصة في تقديم الحلول التقنية وخدمات الأعمال.',
    founded_at: '2015-03-01',
  });

  const [adminId] = await knex('users').insert({
    full_name: 'مشرف النظام',
    email: env.seed.adminEmail,
    password_hash: adminHash,
    role: 'admin',
    job_title: 'المدير العام',
    hire_date: '2015-03-01',
    must_change_password: false,
    created_at: daysAgo(400),
  });

  const criteriaIds = [];
  for (const [name, description, weight] of CRITERIA) {
    const [cid] = await knex('evaluation_criteria').insert({ name, description, weight });
    criteriaIds.push({ id: cid, weight });
  }

  const activity = [];
  const notifications = [];

  for (const dept of DEPARTMENTS) {
    const [deptId] = await knex('departments').insert({ name: dept.name, description: dept.description, created_at: daysAgo(380) });

    const [managerId] = await knex('users').insert({
      full_name: dept.manager[0],
      // الحساب التجريبي للمدير: مدير القسم الأول
      email: dept.slug === 'it' ? DEMO_ACCOUNTS.manager : `manager.${dept.slug}@teampulse.test`,
      password_hash: demoHash,
      role: 'manager',
      department_id: deptId,
      job_title: dept.manager[1],
      phone: `+962 79 ${between(100, 999)} ${between(1000, 9999)}`,
      hire_date: dateOnly(daysAgo(between(500, 1500))),
      must_change_password: false,
      created_at: daysAgo(370),
    });
    await knex('departments').where({ id: deptId }).update({ manager_id: managerId });
    activity.push({ actor_id: adminId, action: 'department.manager_assigned', entity_type: 'department', entity_id: deptId, department_id: deptId, meta: JSON.stringify({ name: dept.name, manager_id: managerId }), created_at: daysAgo(200) });

    const employeeIds = [];
    for (const [i, [name, title]] of dept.employees.entries()) {
      const [empId] = await knex('users').insert({
        full_name: name,
        // الحساب التجريبي للموظف: أول موظف في القسم الأول
        email: dept.slug === 'it' && i === 0 ? DEMO_ACCOUNTS.employee : `${dept.slug}${i + 1}@teampulse.test`,
        password_hash: demoHash,
        role: 'employee',
        department_id: deptId,
        job_title: title,
        phone: `+962 78 ${between(100, 999)} ${between(1000, 9999)}`,
        hire_date: dateOnly(daysAgo(between(90, 1200))),
        must_change_password: false,
        created_at: daysAgo(between(180, 360)),
      });
      employeeIds.push(empId);
    }
    // كل موظف لديه "مستوى أداء" يجعل البيانات واقعية
    const skill = new Map(employeeIds.map((id) => [id, 0.45 + rand() * 0.5]));

    // ── المهام على مدى 6 أشهر ──
    const taskCount = dept.tasks.length * 3;
    for (let n = 0; n < taskCount; n++) {
      const assignee = pick(employeeIds);
      const level = skill.get(assignee);
      const createdDaysAgo = between(2, 180);
      const created = daysAgo(createdDaysAgo);
      const dueIn = between(3, 21);
      const due = new Date(created.getTime() + dueIn * DAY);
      const assignedBy = rand() < 0.85 ? managerId : adminId;

      let status;
      if (createdDaysAgo > 25) status = rand() < 0.08 ? 'cancelled' : 'completed';
      else status = pick(['new', 'in_progress', 'in_progress', 'submitted', 'returned', 'completed']);

      let completedAt = null;
      let submittedAt = null;
      if (status === 'completed') {
        const onTime = rand() < level;
        const offset = onTime ? between(1, dueIn) : dueIn + between(1, 6);
        completedAt = new Date(Math.min(created.getTime() + offset * DAY, Date.now() - DAY));
        submittedAt = new Date(completedAt.getTime() - DAY / 2);
      } else if (status === 'submitted') {
        submittedAt = daysAgo(between(0, 2));
      }

      const title = dept.tasks[n % dept.tasks.length];
      const [taskId] = await knex('tasks').insert({
        title,
        description: `يرجى إنجاز "${title}" وفق المعايير المعتمدة في القسم، وإرفاق ما يلزم عند التسليم.`,
        assignee_id: assignee,
        assigned_by: assignedBy,
        department_id: deptId,
        priority: pick(PRIORITIES),
        status,
        requires_attachment: rand() < 0.35,
        due_date: dateOnly(due),
        submitted_at: submittedAt,
        completed_at: completedAt,
        created_at: created,
      });

      activity.push({ actor_id: assignedBy, action: 'task.created', entity_type: 'task', entity_id: taskId, department_id: deptId, meta: JSON.stringify({ title }), created_at: created });
      if (status === 'completed') {
        activity.push({ actor_id: managerId, action: 'task.status_changed', entity_type: 'task', entity_id: taskId, department_id: deptId, meta: JSON.stringify({ title, from: 'submitted', to: 'completed' }), created_at: completedAt });
      }
      if (status === 'returned') {
        await knex('task_comments').insert({ task_id: taskId, user_id: managerId, is_system: true, body: 'غيّر الحالة من "مُسلَّمة" إلى "مُعادة للتعديل" — يرجى استكمال الملاحظات المرفقة', created_at: daysAgo(1) });
      }
      if (['new', 'returned'].includes(status)) {
        notifications.push({ user_id: assignee, type: status === 'new' ? 'task.assigned' : 'task.returned', title: `${status === 'new' ? 'مهمة جديدة' : 'مُعادة للتعديل'}: ${title}`, link: `/tasks/${taskId}`, created_at: created });
      }
      if (status === 'submitted') {
        notifications.push({ user_id: managerId, type: 'task.submitted', title: `مُسلَّمة: ${title}`, link: `/tasks/${taskId}`, created_at: submittedAt });
      }
    }

    // ── تقييمات شهرية للموظفين (آخر 5 أشهر) من المدير ──
    for (const empId of employeeIds) {
      const level = skill.get(empId);
      for (let m = 5; m >= 1; m--) {
        const d = new Date();
        d.setUTCDate(1);
        d.setUTCMonth(d.getUTCMonth() - m);
        const period = normalizePeriod('monthly', dateOnly(d));
        const scores = criteriaIds.map((c) => ({
          criterion_id: c.id,
          score: Math.max(1, Math.min(5, Math.round(1.5 + level * 3.5 + (rand() - 0.5) * 1.6 + (5 - m) * 0.08))),
        }));
        const overall = scores.reduce((s, x, i) => s + x.score * criteriaIds[i].weight, 0) / criteriaIds.reduce((s, c) => s + c.weight, 0);
        const [evId] = await knex('evaluations').insert({
          evaluatee_id: empId,
          evaluator_id: managerId,
          period_type: 'monthly',
          period_start: period.start,
          period_end: period.end,
          overall_score: overall.toFixed(2),
          notes: overall >= 4 ? 'أداء متميز، استمر على هذا المستوى.' : overall >= 3 ? 'أداء جيد مع مجال للتحسين في الالتزام بالمواعيد.' : 'يحتاج إلى متابعة وخطة تحسين.',
          created_at: new Date(new Date(period.end).getTime() + 2 * DAY),
        });
        await knex('evaluation_scores').insert(scores.map((s) => ({ ...s, evaluation_id: evId })));
      }
    }

    // ── تقييمات ربع سنوية للمدير من المشرف ──
    for (let q = 2; q >= 1; q--) {
      const d = new Date();
      d.setUTCDate(1);
      d.setUTCMonth(d.getUTCMonth() - q * 3);
      const period = normalizePeriod('quarterly', dateOnly(d));
      const scores = criteriaIds.map((c) => ({ criterion_id: c.id, score: between(3, 5) }));
      const overall = scores.reduce((s, x, i) => s + x.score * criteriaIds[i].weight, 0) / criteriaIds.reduce((s, c) => s + c.weight, 0);
      const [evId] = await knex('evaluations').insert({
        evaluatee_id: managerId,
        evaluator_id: adminId,
        period_type: 'quarterly',
        period_start: period.start,
        period_end: period.end,
        overall_score: overall.toFixed(2),
        notes: 'قيادة جيدة للقسم وتحقيق معظم الأهداف.',
      });
      await knex('evaluation_scores').insert(scores.map((s) => ({ ...s, evaluation_id: evId })));
    }
  }

  // ── مهام الموظف التجريبي ──
  const demoEmployee = await knex('users').where({ email: DEMO_ACCOUNTS.employee }).first();
  const demoManager = await knex('users').where({ email: DEMO_ACCOUNTS.manager }).first();
  for (const t of DEMO_EMPLOYEE_TASKS) {
    const [taskId] = await knex('tasks').insert({
      title: t.title,
      description: `يرجى إنجاز "${t.title}" وإرفاق المخرجات عند التسليم.`,
      assignee_id: demoEmployee.id,
      assigned_by: demoManager.id,
      department_id: demoEmployee.department_id,
      priority: t.priority,
      status: t.status,
      requires_attachment: t.requires_attachment,
      due_date: dateOnly(daysAgo(-t.due)),
      created_at: daysAgo(4),
    });
    if (t.status === 'returned') {
      await knex('task_comments').insert({ task_id: taskId, user_id: demoManager.id, is_system: true, body: 'غيّر الحالة من "مُسلَّمة" إلى "مُعادة للتعديل" — أضف خطوات التراجع عن النشر', created_at: daysAgo(1) });
    }
    notifications.push({ user_id: demoEmployee.id, type: 'task.assigned', title: `مهمة جديدة: ${t.title}`, link: `/tasks/${taskId}`, created_at: daysAgo(4) });
  }

  activity.sort((a, b) => a.created_at - b.created_at);
  for (let i = 0; i < activity.length; i += 200) await knex('activity_logs').insert(activity.slice(i, i + 200));
  if (notifications.length) await knex('notifications').insert(notifications);
}
