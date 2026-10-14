import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import multer from 'multer';
import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';

export const PRIVATE_DIR = path.join(env.uploadsDir, 'private');
export const PUBLIC_DIR = path.join(env.uploadsDir, 'public');
for (const dir of [PRIVATE_DIR, PUBLIC_DIR]) fs.mkdirSync(dir, { recursive: true });

const ATTACHMENT_EXT = new Set([
  '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt', '.csv',
  '.png', '.jpg', '.jpeg', '.webp', '.zip', '.rar',
]);
const IMAGE_EXT = new Set(['.png', '.jpg', '.jpeg', '.webp']);

const storage = (dir) =>
  multer.diskStorage({
    destination: dir,
    // اسم عشوائي لا يمكن تخمينه، ويُحفظ الاسم الأصلي في قاعدة البيانات
    filename: (_req, file, cb) =>
      cb(null, crypto.randomBytes(16).toString('hex') + path.extname(file.originalname).toLowerCase()),
  });

const extFilter = (allowed) => (_req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowed.has(ext)) return cb(null, true);
  cb(ApiError.badRequest(`نوع الملف غير مسموح: ${file.originalname}`));
};

export const uploadAttachments = multer({
  storage: storage(PRIVATE_DIR),
  limits: { fileSize: env.uploadMaxMb * 1024 * 1024, files: 5 },
  fileFilter: extFilter(ATTACHMENT_EXT),
  defParamCharset: 'utf8',
}).array('files', 5);

export const uploadImage = multer({
  storage: storage(PUBLIC_DIR),
  limits: { fileSize: 2 * 1024 * 1024, files: 1 },
  fileFilter: extFilter(IMAGE_EXT),
  defParamCharset: 'utf8',
}).single('image');

/** يحذف ملفاً من مجلد الرفع بهدوء */
export function removeUpload(dir, name) {
  if (!name) return;
  fs.promises.unlink(path.join(dir, path.basename(name))).catch(() => {});
}
