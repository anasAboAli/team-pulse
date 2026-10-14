import { ROLES, TASK_STATUSES } from './constants';

/** يصف عملية من سجل النشاط بجملة عربية */
export function describeActivity(a) {
  const m = a.meta || {};
  const q = (s) => (s ? `«${s}»` : '');
  switch (a.action) {
    case 'user.created':
      return `أضاف ${ROLES[m.role]?.label ?? 'مستخدماً'} جديداً ${q(m.name)}`;
    case 'user.updated':
      return `عدّل بيانات ${q(m.name)}${m.role ? ` وغيّر دوره إلى ${ROLES[m.role]?.label}` : ''}`;
    case 'user.transferred':
      return `نقل ${q(m.name)} إلى قسم آخر`;
    case 'user.activated':
      return `فعّل حساب ${q(m.name)}`;
    case 'user.deactivated':
      return `عطّل حساب ${q(m.name)}`;
    case 'user.password_reset':
      return `أعاد تعيين كلمة مرور ${q(m.name)}`;
    case 'user.deleted':
      return `حذف المستخدم ${q(m.name)}`;
    case 'department.created':
      return `أنشأ قسم ${q(m.name)}`;
    case 'department.updated':
      return `عدّل بيانات قسم ${q(m.name)}`;
    case 'department.deleted':
      return `حذف قسم ${q(m.name)}`;
    case 'department.manager_assigned':
      return `عيّن مديراً لقسم ${q(m.name)}`;
    case 'department.manager_removed':
      return `أزال مدير قسم ${q(m.name)}`;
    case 'task.created':
      return `أسند مهمة ${q(m.title)}${m.assignee ? ` إلى ${m.assignee}` : ''}`;
    case 'task.updated':
      return `عدّل المهمة ${q(m.title)}`;
    case 'task.deleted':
      return `حذف المهمة ${q(m.title)}`;
    case 'task.status_changed':
      return `نقل المهمة ${q(m.title)} إلى «${TASK_STATUSES[m.to]?.label ?? m.to}»`;
    case 'task.files_uploaded':
      return `رفع ${m.count ?? ''} ملف على المهمة ${q(m.title)}`;
    case 'evaluation.created':
      return `قيّم ${q(m.name)}${m.score != null ? ` بدرجة ${m.score}` : ''}`;
    case 'evaluation.updated':
      return `عدّل تقييم ${q(m.name)}`;
    case 'evaluation.deleted':
      return `حذف تقييم ${q(m.name)}`;
    case 'company.updated':
      return 'حدّث بيانات الشركة';
    default:
      return a.action;
  }
}

export function activityLink(a) {
  if (!a.entity_id) return null;
  switch (a.entity_type) {
    case 'task':
      return a.action === 'task.deleted' ? null : `/tasks/${a.entity_id}`;
    case 'user':
      return a.action === 'user.deleted' ? null : `/users/${a.entity_id}`;
    case 'evaluation':
      return a.action === 'evaluation.deleted' ? null : `/evaluations/${a.entity_id}`;
    case 'department':
      return a.action === 'department.deleted' ? null : `/departments/${a.entity_id}`;
    default:
      return null;
  }
}
