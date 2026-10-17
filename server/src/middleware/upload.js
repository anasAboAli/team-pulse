import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import multer from 'multer';
import { db } from '../config/db.js';
import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';

export const PRIVATE_DIR = path.join(env.uploadsDir, 'private');
export const PUBLIC_DIR = path.join(env.uploadsDir, 'public');

// disk: مجلد uploads المحلي | db: جدول file_blobs (لاستضافة بلا قرص دائم مثل Vercel)
const useDb = env.storageDriver === 'db';
if (!useDb) for (const dir of [PRIVATE_DIR, PUBLIC_DIR]) fs.mkdirSync(dir, { recursive: true });

const ATTACHMENT_EXT = new Set([
  '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt', '.csv',
  '.png', '.jpg', '.jpeg', '.webp', '.zip', '.rar',
]);
const IMAGE_EXT = new Set(['.png', '.jpg', '.jpeg', '.webp']);

// اسم عشوائي لا يمكن تخمينه، ويُحفظ الاسم الأصلي في قاعدة البيانات
const randomName = (file) => crypto.randomBytes(16).toString('hex') + path.extname(file.originalname).toLowerCase();

/** محرك multer يكتب في الجدول بدل القرص ويعيد filename و size كما في diskStorage */
const dbStorage = {
  async _handleFile(_req, file, cb) {
    try {
      const chunks = [];
      for await (const chunk of file.stream) chunks.push(chunk);
      const data = Buffer.concat(chunks);
      const filename = randomName(file);
      await db('file_blobs').insert({ name: filename, mime_type: file.mimetype, data });
      cb(null, { filename, size: data.length });
    } catch (err) {
      cb(err);
    }
  },
  _removeFile(_req, file, cb) {
    db('file_blobs').where({ name: file.filename }).del().then(() => cb(null), cb);
  },
};

const storage = (dir) =>
  useDb ? dbStorage : multer.diskStorage({ destination: dir, filename: (_req, file, cb) => cb(null, randomName(file)) });

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

/** يحذف ملفاً مرفوعاً بهدوء */
export function removeUpload(dir, name) {
  if (!name) return;
  const op = useDb
    ? db('file_blobs').where({ name: path.basename(name) }).del()
    : fs.promises.unlink(path.join(dir, path.basename(name)));
  op.catch(() => {});
}

/** يرسل ملفاً مرفوعاً؛ مع downloadName يُرسل كتنزيل باسمه الأصلي */
export async function sendUpload(res, dir, name, { downloadName, maxAge } = {}) {
  const base = path.basename(name);
  if (!useDb) {
    const filePath = path.join(dir, base);
    if (!fs.existsSync(filePath)) throw ApiError.notFound('الملف غير موجود على الخادم');
    if (downloadName) return res.download(filePath, downloadName);
    return res.sendFile(filePath, { maxAge });
  }
  const file = await db('file_blobs').where({ name: base }).first('mime_type', 'data');
  if (!file) throw ApiError.notFound('الملف غير موجود على الخادم');
  if (downloadName) res.attachment(downloadName);
  if (maxAge) res.set('Cache-Control', `public, max-age=${Math.floor(maxAge / 1000)}`);
  res.type(file.mime_type || path.extname(base)).send(file.data);
}
