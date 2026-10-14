export const ROLES = {
  admin: { label: 'مشرف', badge: 'badge-violet' },
  manager: { label: 'مدير قسم', badge: 'badge-primary' },
  employee: { label: 'موظف', badge: '' },
};

export const TASK_STATUSES = {
  new: { label: 'جديدة', badge: 'badge-primary', icon: 'Sparkles' },
  in_progress: { label: 'قيد التنفيذ', badge: 'badge-warning', icon: 'Loader' },
  submitted: { label: 'مُسلَّمة', badge: 'badge-violet', icon: 'Send' },
  returned: { label: 'مُعادة للتعديل', badge: 'badge-danger', icon: 'Undo2' },
  completed: { label: 'مكتملة', badge: 'badge-success', icon: 'CheckCircle2' },
  cancelled: { label: 'ملغاة', badge: '', icon: 'Ban' },
};

export const TASK_PRIORITIES = {
  low: { label: 'منخفضة', badge: '' },
  medium: { label: 'متوسطة', badge: 'badge-primary' },
  high: { label: 'عالية', badge: 'badge-warning' },
  urgent: { label: 'عاجلة', badge: 'badge-danger' },
};

/** نص زر الانتقال لكل حالة */
export const TRANSITION_ACTIONS = {
  in_progress: { label: 'بدء العمل', className: 'btn-soft', icon: 'Play' },
  submitted: { label: 'تسليم المهمة', className: 'btn-primary', icon: 'Send' },
  completed: { label: 'اعتماد كمكتملة', className: 'btn-success', icon: 'CheckCircle2' },
  returned: { label: 'إرجاع للتعديل', className: '', icon: 'Undo2' },
  cancelled: { label: 'إلغاء المهمة', className: 'btn-ghost', icon: 'Ban' },
};

export const PERIOD_TYPES = {
  monthly: 'شهري',
  quarterly: 'ربع سنوي',
  yearly: 'سنوي',
};

export const SCORE_LEVELS = [
  { min: 4.5, label: 'ممتاز', badge: 'badge-success' },
  { min: 3.5, label: 'جيد جداً', badge: 'badge-primary' },
  { min: 2.5, label: 'جيد', badge: 'badge-warning' },
  { min: 0, label: 'يحتاج تحسين', badge: 'badge-danger' },
];

export const scoreLevel = (score) => (score == null ? null : SCORE_LEVELS.find((l) => score >= l.min));

export const RATING_LABELS = ['', 'ضعيف', 'مقبول', 'جيد', 'جيد جداً', 'ممتاز'];
