/**
 * سياسات الصلاحيات — المصدر الوحيد لقرارات "من يستطيع ماذا".
 * كل دالة تستقبل المستخدم الحالي (actor) والهدف، وتعيد true/false.
 * القاعدة: المشرف كل شيء · المدير قسمه وموظفيه · الموظف نفسه.
 */

export const isAdmin = (actor) => actor?.role === 'admin';
export const isManager = (actor) => actor?.role === 'manager';
export const isEmployee = (actor) => actor?.role === 'employee';

/** هل الهدف موظف ضمن قسم هذا المدير؟ */
export const isInManagersDepartment = (actor, target) =>
  isManager(actor) &&
  actor.department_id != null &&
  target?.role === 'employee' &&
  target.department_id === actor.department_id;

export function canViewUser(actor, target) {
  if (!target) return false;
  if (isAdmin(actor) || actor.id === target.id) return true;
  return isInManagersDepartment(actor, target);
}

/** تعديل بيانات العمل / التعطيل / إعادة تعيين كلمة المرور */
export function canManageUser(actor, target) {
  if (!target || actor.id === target.id) return false;
  if (isAdmin(actor)) return true;
  return isInManagersDepartment(actor, target);
}

export function canAssignTask(actor, assignee) {
  if (!assignee || assignee.role !== 'employee' || !assignee.is_active) return false;
  return isAdmin(actor) || isInManagersDepartment(actor, assignee);
}

/** إدارة المهمة: تعديل، إلغاء، مراجعة، حذف */
export function canManageTask(actor, task) {
  if (isAdmin(actor)) return true;
  return isManager(actor) && actor.department_id != null && task.department_id === actor.department_id;
}

export function canAccessTask(actor, task) {
  if (!task) return false;
  return task.assignee_id === actor.id || canManageTask(actor, task);
}

/** BR-04: المشرف يقيّم الجميع عدا المشرفين ونفسه، والمدير يقيّم موظفي قسمه */
export function canEvaluate(actor, target) {
  if (!target || actor.id === target.id || !target.is_active) return false;
  if (isAdmin(actor)) return target.role !== 'admin';
  return isInManagersDepartment(actor, target);
}

export function canViewEvaluation(actor, evaluation, evaluatee) {
  if (isAdmin(actor) || evaluation.evaluatee_id === actor.id) return true;
  return isInManagersDepartment(actor, evaluatee);
}

export function canEditEvaluation(actor, evaluation) {
  return isAdmin(actor) || evaluation.evaluator_id === actor.id;
}

export function canViewDepartment(actor, departmentId) {
  return isAdmin(actor) || actor.department_id === departmentId;
}

/** يعيد قيد شرطي يجعل الاستعلام فارغاً عند غياب النطاق */
export const emptyScope = (qb) => qb.whereRaw('1 = 0');
