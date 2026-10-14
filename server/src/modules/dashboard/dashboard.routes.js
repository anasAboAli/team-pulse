import { Router } from 'express';
import { authorize } from '../../middleware/auth.js';
import { adminDashboard, employeeDashboard, managerDashboard } from './dashboard.service.js';

const router = Router();

router.get('/admin', authorize('admin'), async (_req, res) => {
  res.json({ data: await adminDashboard() });
});

router.get('/manager', authorize('manager'), async (req, res) => {
  res.json({ data: await managerDashboard(req.user) });
});

// لوحة شخصية — متاحة للموظف وللمدير لرؤية مهامه وتقييماته
router.get('/employee', authorize('employee', 'manager'), async (req, res) => {
  res.json({ data: await employeeDashboard(req.user) });
});

export default router;
