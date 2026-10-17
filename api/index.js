// دالة Vercel واحدة تخدم كل الـ API و /uploads (التوجيه في vercel.json)
import { createApp } from '../server/src/app.js';

export default createApp();
