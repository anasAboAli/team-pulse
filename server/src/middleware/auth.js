import jwt from 'jsonwebtoken';
import { db } from '../config/db.js';
import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';

/** يتحقق من access token ويحمّل المستخدم الحالي من قاعدة البيانات في كل طلب */
export async function authenticate(req, _res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) throw ApiError.unauthorized();

  let payload;
  try {
    payload = jwt.verify(token, env.jwt.accessSecret);
  } catch (err) {
    throw err.name === 'TokenExpiredError'
      ? ApiError.unauthorized('انتهت صلاحية الجلسة', 'TOKEN_EXPIRED')
      : ApiError.unauthorized('رمز الدخول غير صالح', 'TOKEN_INVALID');
  }

  const user = await db('users')
    .select('id', 'full_name', 'email', 'role', 'department_id', 'is_active', 'must_change_password')
    .where({ id: payload.sub })
    .whereNull('deleted_at')
    .first();

  if (!user || !user.is_active) throw ApiError.unauthorized('الحساب غير متاح', 'ACCOUNT_DISABLED');

  req.user = { ...user, is_active: !!user.is_active, must_change_password: !!user.must_change_password };
  next();
}

/** يسمح فقط للأدوار المحددة */
export const authorize =
  (...roles) =>
  (req, _res, next) => {
    if (!roles.includes(req.user?.role)) throw ApiError.forbidden();
    next();
  };

/** يمنع استخدام النظام قبل تغيير كلمة المرور المؤقتة */
export function enforcePasswordChange(req, _res, next) {
  if (req.user.must_change_password && !req.path.startsWith('/profile')) {
    throw ApiError.forbidden('يجب تغيير كلمة المرور المؤقتة أولاً', 'PASSWORD_CHANGE_REQUIRED');
  }
  next();
}
