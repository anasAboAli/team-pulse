import crypto from 'node:crypto';
import { Router } from 'express';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import { db } from '../../config/db.js';
import { env } from '../../config/env.js';
import { authenticate } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { z, password } from '../../lib/z.js';
import { ApiError } from '../../utils/ApiError.js';
import { hashPassword, sha256, verifyPassword } from '../../utils/helpers.js';
import { assertNotDemoAccount, getUserDetail } from '../users/users.service.js';

const router = Router();

const REFRESH_COOKIE = 'tp_refresh';
const cookieOptions = {
  httpOnly: true,
  secure: env.isProd,
  sameSite: 'strict',
  path: '/api/v1/auth',
};

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: env.isProd ? 10 : 100,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  handler: (_req, res) =>
    res.status(429).json({ error: { code: 'TOO_MANY_REQUESTS', message: 'محاولات كثيرة، حاول بعد قليل' } }),
});

const signAccessToken = (user) => jwt.sign({ sub: user.id, role: user.role }, env.jwt.accessSecret, { expiresIn: env.jwt.accessTtl });

async function issueSession(res, user, userAgent) {
  const refreshToken = crypto.randomBytes(48).toString('hex');
  const expiresAt = new Date(Date.now() + env.jwt.refreshDays * 24 * 60 * 60 * 1000);
  await db('refresh_tokens').insert({
    user_id: user.id,
    token_hash: sha256(refreshToken),
    user_agent: userAgent?.slice(0, 255) ?? null,
    expires_at: expiresAt,
  });
  res.cookie(REFRESH_COOKIE, refreshToken, { ...cookieOptions, expires: expiresAt });
  return { accessToken: signAccessToken(user), user: await getUserDetail(user.id) };
}

router.post(
  '/login',
  loginLimiter,
  validate({ body: z.object({ email: z.string().trim().toLowerCase().email(), password: z.string().min(1) }) }),
  async (req, res) => {
    const { email, password: plain } = req.valid.body;
    const user = await db('users').where({ email }).whereNull('deleted_at').first();
    const ok = user && (await verifyPassword(plain, user.password_hash));
    if (!ok) throw ApiError.unauthorized('البريد الإلكتروني أو كلمة المرور غير صحيحة', 'INVALID_CREDENTIALS');
    if (!user.is_active) throw ApiError.forbidden('هذا الحساب معطّل، تواصل مع المشرف', 'ACCOUNT_DISABLED');

    await db('users').where({ id: user.id }).update({ last_login_at: new Date() });
    res.json(await issueSession(res, user, req.get('user-agent')));
  },
);

router.post('/refresh', async (req, res) => {
  const token = req.cookies?.[REFRESH_COOKIE];
  if (!token) throw ApiError.unauthorized('لا توجد جلسة', 'NO_SESSION');

  const stored = await db('refresh_tokens').where({ token_hash: sha256(token) }).first();
  if (!stored || stored.revoked_at || new Date(stored.expires_at) < new Date()) {
    res.clearCookie(REFRESH_COOKIE, cookieOptions);
    throw ApiError.unauthorized('انتهت الجلسة، سجّل الدخول مجدداً', 'SESSION_EXPIRED');
  }
  const user = await db('users').where({ id: stored.user_id }).whereNull('deleted_at').first();
  if (!user || !user.is_active) {
    res.clearCookie(REFRESH_COOKIE, cookieOptions);
    throw ApiError.unauthorized('الحساب غير متاح', 'ACCOUNT_DISABLED');
  }

  // تدوير الرمز: كل refresh token يُستخدم مرة واحدة
  await db('refresh_tokens').where({ id: stored.id }).update({ revoked_at: new Date() });
  res.json(await issueSession(res, user, req.get('user-agent')));
});

router.post('/logout', async (req, res) => {
  const token = req.cookies?.[REFRESH_COOKIE];
  if (token) await db('refresh_tokens').where({ token_hash: sha256(token) }).update({ revoked_at: new Date() });
  res.clearCookie(REFRESH_COOKIE, cookieOptions);
  res.status(204).end();
});

router.get('/me', authenticate, async (req, res) => {
  res.json({ data: await getUserDetail(req.user.id) });
});

router.put(
  '/password',
  authenticate,
  validate({
    body: z
      .object({ current_password: z.string().min(1), new_password: password })
      .refine((b) => b.current_password !== b.new_password, {
        message: 'كلمة المرور الجديدة يجب أن تختلف عن الحالية',
        path: ['new_password'],
      }),
  }),
  async (req, res) => {
    const { current_password, new_password } = req.valid.body;
    const user = await db('users').where({ id: req.user.id }).first();
    assertNotDemoAccount(user);
    if (!(await verifyPassword(current_password, user.password_hash))) {
      throw ApiError.unprocessable('البيانات المدخلة غير صحيحة', { current_password: 'كلمة المرور الحالية غير صحيحة' });
    }
    await db('users')
      .where({ id: user.id })
      .update({ password_hash: await hashPassword(new_password), must_change_password: false });
    res.json({ data: await getUserDetail(user.id) });
  },
);

export default router;
