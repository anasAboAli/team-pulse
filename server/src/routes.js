import { Router } from 'express';
import { authenticate, enforcePasswordChange } from './middleware/auth.js';
import activityRoutes from './modules/activity/activity.routes.js';
import authRoutes from './modules/auth/auth.routes.js';
import companyRoutes, { getCompany } from './modules/company/company.routes.js';
import dashboardRoutes from './modules/dashboard/dashboard.routes.js';
import departmentsRoutes from './modules/departments/departments.routes.js';
import evaluationsRoutes, { criteriaRouter } from './modules/evaluations/evaluations.routes.js';
import notificationsRoutes from './modules/notifications/notifications.routes.js';
import profileRoutes from './modules/profile/profile.routes.js';
import reportsRoutes from './modules/reports/reports.routes.js';
import tasksRoutes, { attachmentsRouter } from './modules/tasks/tasks.routes.js';
import usersRoutes from './modules/users/users.routes.js';

const router = Router();

// ── عام ───────────────────────────────────
router.get('/health', (_req, res) => res.json({ status: 'ok' }));
router.get('/company/public', async (_req, res) => {
  const { name, logo_url } = await getCompany();
  res.json({ data: { name, logo_url } });
});
router.use('/auth', authRoutes);

// ── يتطلب تسجيل الدخول ─────────────────────
router.use(authenticate, enforcePasswordChange);
router.use('/profile', profileRoutes);
router.use('/company', companyRoutes);
router.use('/departments', departmentsRoutes);
router.use('/users', usersRoutes);
router.use('/tasks', tasksRoutes);
router.use('/attachments', attachmentsRouter);
router.use('/evaluation-criteria', criteriaRouter);
router.use('/evaluations', evaluationsRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/notifications', notificationsRoutes);
router.use('/activity', activityRoutes);
router.use('/reports', reportsRoutes);

export default router;
