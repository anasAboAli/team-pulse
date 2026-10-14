import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import AppLayout from '@/layouts/AppLayout.vue';

const ADMIN = ['admin'];
const MANAGERS = ['admin', 'manager'];

/**
 * meta.roles: الأدوار المسموح لها — حراسة للتجربة فقط؛ الصلاحيات الحقيقية في الخادم.
 * meta.title: عنوان الصفحة
 */
const routes = [
  {
    path: '/login',
    name: 'login',
    component: () => import('@/views/shared/LoginView.vue'),
    meta: { guest: true, title: 'تسجيل الدخول' },
  },
  {
    path: '/change-password',
    name: 'change-password',
    component: () => import('@/views/shared/ChangePasswordView.vue'),
    meta: { title: 'تغيير كلمة المرور', allowPasswordChange: true },
  },
  {
    path: '/',
    component: AppLayout,
    children: [
      { path: '', name: 'home', redirect: () => useAuthStore().homeRoute },

      // ── المشرف ──
      { path: 'admin/dashboard', name: 'admin-dashboard', component: () => import('@/views/admin/AdminDashboard.vue'), meta: { roles: ADMIN, title: 'لوحة الشركة' } },
      { path: 'admin/company', name: 'company', component: () => import('@/views/admin/CompanyView.vue'), meta: { roles: ADMIN, title: 'بيانات الشركة' } },
      { path: 'admin/criteria', name: 'criteria', component: () => import('@/views/admin/CriteriaView.vue'), meta: { roles: ADMIN, title: 'معايير التقييم' } },
      { path: 'departments', name: 'departments', component: () => import('@/views/admin/DepartmentsView.vue'), meta: { roles: ADMIN, title: 'الأقسام' } },
      { path: 'departments/:id(\\d+)', name: 'department', component: () => import('@/views/admin/DepartmentDetailView.vue'), meta: { roles: MANAGERS, title: 'القسم' } },

      // ── المدير ──
      { path: 'manager/dashboard', name: 'manager-dashboard', component: () => import('@/views/manager/ManagerDashboard.vue'), meta: { roles: ['manager'], title: 'لوحة القسم' } },

      // ── الموظف ──
      { path: 'my/dashboard', name: 'employee-dashboard', component: () => import('@/views/employee/EmployeeDashboard.vue'), meta: { roles: ['employee'], title: 'لوحتي' } },

      // ── المستخدمون ──
      { path: 'users', name: 'users', component: () => import('@/views/users/UsersView.vue'), meta: { roles: MANAGERS, title: 'المستخدمون' } },
      { path: 'users/:id(\\d+)', name: 'user', component: () => import('@/views/users/UserDetailView.vue'), meta: { roles: MANAGERS, title: 'ملف المستخدم' } },

      // ── المهام ──
      { path: 'tasks', name: 'tasks', component: () => import('@/views/tasks/TasksView.vue'), meta: { title: 'المهام' } },
      { path: 'tasks/new', name: 'task-new', component: () => import('@/views/tasks/TaskFormView.vue'), meta: { roles: MANAGERS, title: 'مهمة جديدة' } },
      { path: 'tasks/:id(\\d+)', name: 'task', component: () => import('@/views/tasks/TaskDetailView.vue'), meta: { title: 'تفاصيل المهمة' } },
      { path: 'tasks/:id(\\d+)/edit', name: 'task-edit', component: () => import('@/views/tasks/TaskFormView.vue'), meta: { roles: MANAGERS, title: 'تعديل المهمة' } },

      // ── التقييمات ──
      { path: 'evaluations', name: 'evaluations', component: () => import('@/views/evaluations/EvaluationsView.vue'), meta: { title: 'التقييمات' } },
      { path: 'evaluations/new', name: 'evaluation-new', component: () => import('@/views/evaluations/EvaluationFormView.vue'), meta: { roles: MANAGERS, title: 'تقييم جديد' } },
      { path: 'evaluations/:id(\\d+)', name: 'evaluation', component: () => import('@/views/evaluations/EvaluationDetailView.vue'), meta: { title: 'تفاصيل التقييم' } },
      { path: 'evaluations/:id(\\d+)/edit', name: 'evaluation-edit', component: () => import('@/views/evaluations/EvaluationFormView.vue'), meta: { roles: MANAGERS, title: 'تعديل التقييم' } },

      // ── مشترك ──
      { path: 'activity', name: 'activity', component: () => import('@/views/shared/ActivityView.vue'), meta: { roles: MANAGERS, title: 'سجل النشاط' } },
      { path: 'notifications', name: 'notifications', component: () => import('@/views/shared/NotificationsView.vue'), meta: { title: 'الإشعارات' } },
      { path: 'profile', name: 'profile', component: () => import('@/views/shared/ProfileView.vue'), meta: { title: 'ملفي الشخصي' } },
      { path: 'forbidden', name: 'forbidden', component: () => import('@/views/shared/ForbiddenView.vue'), meta: { title: 'غير مصرّح' } },
      { path: ':pathMatch(.*)*', name: 'not-found', component: () => import('@/views/shared/NotFoundView.vue'), meta: { title: 'الصفحة غير موجودة' } },
    ],
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior: (_to, _from, saved) => saved || { top: 0 },
});

router.beforeEach(async (to) => {
  const auth = useAuthStore();
  await auth.init();

  if (to.meta.guest) return auth.isAuthenticated ? auth.homeRoute : true;
  if (!auth.isAuthenticated) return { name: 'login', query: to.fullPath !== '/' ? { redirect: to.fullPath } : {} };
  if (auth.mustChangePassword && !to.meta.allowPasswordChange) return { name: 'change-password' };
  if (to.meta.roles && !to.meta.roles.includes(auth.role)) return { name: 'forbidden' };
  return true;
});

router.afterEach((to) => {
  document.title = to.meta.title ? `${to.meta.title} — TeamPulse` : 'TeamPulse';
});

export default router;
