import { Router } from 'express';
import { db } from '../../config/db.js';
import { PUBLIC_DIR, removeUpload, uploadImage } from '../../middleware/upload.js';
import { validate } from '../../middleware/validate.js';
import { z, optText } from '../../lib/z.js';
import { ApiError } from '../../utils/ApiError.js';
import { compact } from '../../utils/helpers.js';
import { getUserDetail, getUserStats } from '../users/users.service.js';

const router = Router();

router.get('/', async (req, res) => {
  const [user, stats] = await Promise.all([getUserDetail(req.user.id), getUserStats(req.user.id)]);
  res.json({ data: { ...user, stats } });
});

// A-12: الموظف يعدّل بياناته الشخصية فقط (الهاتف والصورة)، والمشرف يعدّل اسمه أيضاً
router.put(
  '/',
  validate({ body: z.object({ phone: optText(40), full_name: z.string().trim().min(3).max(150).optional() }) }),
  async (req, res) => {
    const { phone, full_name } = req.valid.body;
    const update = compact({ phone, full_name: req.user.role === 'admin' ? full_name : undefined });
    if (Object.keys(update).length) await db('users').where({ id: req.user.id }).update(update);
    res.json({ data: await getUserDetail(req.user.id) });
  },
);

router.post('/avatar', uploadImage, async (req, res) => {
  if (!req.file) throw ApiError.badRequest('يرجى اختيار صورة');
  const current = await db('users').where({ id: req.user.id }).first('avatar_path');
  await db('users').where({ id: req.user.id }).update({ avatar_path: req.file.filename });
  removeUpload(PUBLIC_DIR, current?.avatar_path);
  res.json({ data: await getUserDetail(req.user.id) });
});

router.delete('/avatar', async (req, res) => {
  const current = await db('users').where({ id: req.user.id }).first('avatar_path');
  await db('users').where({ id: req.user.id }).update({ avatar_path: null });
  removeUpload(PUBLIC_DIR, current?.avatar_path);
  res.json({ data: await getUserDetail(req.user.id) });
});

export default router;
