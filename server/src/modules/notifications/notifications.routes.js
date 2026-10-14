import { Router } from 'express';
import { db } from '../../config/db.js';
import { validate } from '../../middleware/validate.js';
import { z, boolish, idParam, pagination } from '../../lib/z.js';
import { ApiError } from '../../utils/ApiError.js';
import { paginate } from '../../utils/pagination.js';

const router = Router();

const toNotification = (n) => ({ ...n, is_read: !!n.read_at });

const unreadCount = async (userId) =>
  Number((await db('notifications').where({ user_id: userId }).whereNull('read_at').count({ c: '*' }).first()).c);

router.get('/', validate({ query: z.object({ ...pagination, unread: boolish.optional() }) }), async (req, res) => {
  const { unread, ...pg } = req.valid.query;
  const qb = db('notifications').where({ user_id: req.user.id }).orderBy('created_at', 'desc').orderBy('id', 'desc');
  if (unread) qb.whereNull('read_at');
  const result = await paginate(qb, pg, toNotification);
  result.meta.unread = await unreadCount(req.user.id);
  res.json(result);
});

router.get('/unread-count', async (req, res) => {
  res.json({ data: { unread: await unreadCount(req.user.id) } });
});

router.patch('/read-all', async (req, res) => {
  await db('notifications').where({ user_id: req.user.id }).whereNull('read_at').update({ read_at: new Date() });
  res.status(204).end();
});

router.patch('/:id/read', validate({ params: idParam }), async (req, res) => {
  const updated = await db('notifications')
    .where({ id: req.valid.params.id, user_id: req.user.id })
    .update({ read_at: db.raw('COALESCE(read_at, UTC_TIMESTAMP())') });
  if (!updated) throw ApiError.notFound('الإشعار غير موجود');
  res.status(204).end();
});

router.delete('/:id', validate({ params: idParam }), async (req, res) => {
  await db('notifications').where({ id: req.valid.params.id, user_id: req.user.id }).del();
  res.status(204).end();
});

export default router;
