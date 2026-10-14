import { Router } from 'express';
import { db } from '../../config/db.js';
import { authorize } from '../../middleware/auth.js';
import { PUBLIC_DIR, removeUpload, uploadImage } from '../../middleware/upload.js';
import { validate } from '../../middleware/validate.js';
import { z, optDate, optText } from '../../lib/z.js';
import { ApiError } from '../../utils/ApiError.js';
import { logActivity } from '../../utils/events.js';
import { compact } from '../../utils/helpers.js';

const router = Router();

export async function getCompany() {
  let company = await db('company_settings').orderBy('id').first();
  if (!company) {
    const [id] = await db('company_settings').insert({ name: 'شركتي' });
    company = await db('company_settings').where({ id }).first();
  }
  return { ...company, logo_url: company.logo_path ? `/uploads/public/${company.logo_path}` : null };
}

router.get('/', async (_req, res) => {
  res.json({ data: await getCompany() });
});

router.put(
  '/',
  authorize('admin'),
  validate({
    body: z.object({
      name: z.string().trim().min(2).max(150),
      email: z.string().trim().email().max(150).nullish().or(z.literal('')).transform((v) => v || null),
      phone: optText(50),
      website: optText(150),
      address: optText(255),
      description: optText(2000),
      founded_at: optDate,
    }),
  }),
  async (req, res) => {
    const company = await getCompany();
    await db('company_settings').where({ id: company.id }).update(compact(req.valid.body));
    await logActivity(null, { actor: req.user, action: 'company.updated', entityType: 'company', entityId: company.id });
    res.json({ data: await getCompany() });
  },
);

router.post('/logo', authorize('admin'), uploadImage, async (req, res) => {
  if (!req.file) throw ApiError.badRequest('يرجى اختيار صورة');
  const company = await getCompany();
  await db('company_settings').where({ id: company.id }).update({ logo_path: req.file.filename });
  removeUpload(PUBLIC_DIR, company.logo_path);
  res.json({ data: await getCompany() });
});

export default router;
