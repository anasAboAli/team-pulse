import multer from 'multer';
import { ZodError } from 'zod';
import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';

const MULTER_MESSAGES = {
  LIMIT_FILE_SIZE: `حجم الملف يتجاوز الحد المسموح (${env.uploadMaxMb} ميغابايت)`,
  LIMIT_FILE_COUNT: 'عدد الملفات يتجاوز الحد المسموح (5 ملفات)',
  LIMIT_UNEXPECTED_FILE: 'حقل الملف غير متوقع',
};

export function notFoundHandler(req, _res, next) {
  next(ApiError.notFound(`المسار غير موجود: ${req.method} ${req.originalUrl}`));
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, _next) {
  let error = err;

  if (err instanceof ZodError) {
    const details = {};
    for (const issue of err.issues) {
      const key = issue.path.join('.') || '_';
      details[key] ??= issue.message;
    }
    error = ApiError.unprocessable('البيانات المدخلة غير صحيحة', details);
  } else if (err instanceof multer.MulterError) {
    error = ApiError.badRequest(MULTER_MESSAGES[err.code] || 'تعذّر رفع الملف');
  } else if (err?.code === 'ER_DUP_ENTRY') {
    error = ApiError.conflict('القيمة مستخدمة مسبقاً');
  } else if (err?.type === 'entity.parse.failed') {
    error = ApiError.badRequest('صيغة JSON غير صالحة');
  } else if (!(err instanceof ApiError)) {
    console.error(err);
    error = new ApiError(500, 'حدث خطأ غير متوقع في الخادم', 'SERVER_ERROR');
    if (!env.isProd) error.details = { debug: err.message };
  }

  res.status(error.status).json({
    error: { code: error.code, message: error.message, ...(error.details ? { details: error.details } : {}) },
  });
}
