import { Router } from 'express';
import { db } from '../../config/db.js';
import { authorize } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { z, id, pagination } from '../../lib/z.js';
import { emptyScope, isManager } from '../../policies/index.js';
import { paginate } from '../../utils/pagination.js';
import { toActivity } from '../dashboard/dashboard.service.js';

const router = Router();

router.get(
  '/',
  authorize('admin', 'manager'),
  validate({
    query: z.object({
      ...pagination,
      department_id: id.optional(),
      actor_id: id.optional(),
      entity_type: z.enum(['user', 'department', 'task', 'evaluation', 'company']).optional(),
    }),
  }),
  async (req, res) => {
    const { department_id, actor_id, entity_type, ...pg } = req.valid.query;
    const qb = db({ l: 'activity_logs' })
      .leftJoin({ u: 'users' }, 'u.id', 'l.actor_id')
      .leftJoin({ d: 'departments' }, 'd.id', 'l.department_id')
      .select('l.*', 'u.full_name as actor_name', 'u.role as actor_role', 'd.name as department_name')
      .orderBy('l.created_at', 'desc')
      .orderBy('l.id', 'desc');

    if (isManager(req.user)) {
      // المدير يرى نشاط قسمه فقط
      if (!req.user.department_id) emptyScope(qb);
      qb.where('l.department_id', req.user.department_id);
    } else if (department_id) {
      qb.where('l.department_id', department_id);
    }
    if (actor_id) qb.where('l.actor_id', actor_id);
    if (entity_type) qb.where('l.entity_type', entity_type);

    res.json(await paginate(qb, pg, (r) => ({ ...toActivity(r), department_name: r.department_name })));
  },
);

export default router;
