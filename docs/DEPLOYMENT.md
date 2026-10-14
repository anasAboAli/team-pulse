# نشر TeamPulse مجاناً (Render + TiDB Cloud)

الترتيب: **خدمة ويب واحدة على Render** تشغّل Express، وهو يخدم الـ API والواجهة المبنية معاً (نفس النطاق، فلا مشاكل CORS أو كوكي) + **قاعدة MySQL مجانية على TiDB Cloud**.

```
المتصفح ──HTTPS──► Render (Node 22)
                    ├─ /api/v1/*  ← Express API
                    ├─ /*         ← client/dist (Vue)
                    └──SSL──► TiDB Cloud Serverless (MySQL)
```

| الخدمة | الخطة المجانية |
|---|---|
| Render Web Service | 750 ساعة/شهر · 512MB RAM · ينام بعد 15 دقيقة بلا زيارات (أول طلب بعدها ~30–50 ثانية) |
| TiDB Cloud Serverless | 5GB تخزين · متوافق مع MySQL · SSL بشهادة عامة (لا يحتاج ملف CA) |

---

## 1) قاعدة البيانات — TiDB Cloud

1. أنشئ حساباً على <https://tidbcloud.com> ثم **Create Cluster → Serverless**.
   - اختر المنطقة **Frankfurt (eu-central-1)** لتكون قريبة من خادم Render.
2. افتح الـ cluster ← **Connect**:
   - Connect With: **General**
   - اضغط **Generate Password** واحفظ كلمة المرور.
3. انسخ القيم وكوّن رابط الاتصال بهذا الشكل:

   ```
   mysql://USER:PASSWORD@HOST:4000/teampulse?ssl=true
   ```

   - `USER` يكون بصيغة `xxxxxxxx.root`
   - `HOST` يكون بصيغة `gateway01.eu-central-1.prod.aws.tidbcloud.com`
   - إذا احتوت كلمة المرور على رموز خاصة (`@ : / ? #`) استبدلها بترميز URL (مثلاً `@` ← `%40`).
   - قاعدة `teampulse` تُنشأ تلقائياً عند أول تشغيل.

> **بديل: Aiven MySQL** (مجاني أيضاً). يعطيك Service URI جاهزاً؛ استخدمه كـ `DATABASE_URL`، وانسخ محتوى **CA certificate** إلى متغير `DB_SSL_CA` في Render.

---

## 2) الخادم — Render

1. أنشئ حساباً على <https://render.com> واربطه بحساب GitHub.
2. **New → Blueprint** ← اختر المستودع `anasAboAli/team-pulse`.
   Render يقرأ ملف [`render.yaml`](../render.yaml) وينشئ الخدمة تلقائياً.
3. سيطلب منك القيم السرية:

   | المتغير | القيمة |
   |---|---|
   | `DATABASE_URL` | رابط الاتصال من الخطوة 1 |
   | `SEED_ADMIN_PASSWORD` | كلمة مرور قوية لحساب المشرف |
   | `SEED_DEMO_PASSWORD` | كلمة مرور حسابات المدراء والموظفين التجريبية |

   أسرار JWT يولّدها Render تلقائياً.
4. **Apply**. البناء يستغرق ~3–5 دقائق. عند أول تشغيل:
   - تُنفَّذ الـ migrations
   - القاعدة فارغة و`SEED_DEMO_DATA=true` ← تُعبّأ البيانات التجريبية (4 أقسام، 18 موظفاً، مهام وتقييمات)
5. افتح الرابط `https://team-pulse-xxxx.onrender.com` وسجّل الدخول:
   - مشرف: `admin@teampulse.test`
   - مدير: `manager@teampulse.test`
   - موظف: `employee@teampulse.test`

---

## إعدادات اختيارية

| المتغير | الأثر |
|---|---|
| `SEED_DEMO_DATA=false` | (قبل أول تشغيل) يُنشئ حساب المشرف فقط بدل البيانات التجريبية، ويُطلب تغيير كلمة المرور عند أول دخول — للاستخدام الحقيقي. |
| `VITE_DEMO_LOGIN=true` + `VITE_DEMO_ADMIN_PASSWORD` + `VITE_DEMO_PASSWORD` | يُظهر أزرار «دخول تجريبي سريع» في الموقع المنشور (يتطلب إعادة البناء). ⚠️ كلمات المرور تصبح مكشوفة في ملفات الواجهة، وأي زائر يستطيع الدخول كمشرف — لموقع عرض (Portfolio) فقط، ومع `DEMO_MODE=true`. |
| `DEMO_MODE=true` | يحمي الحسابات التجريبية الثلاثة: لا تغيير لكلمة مرورها، ولا تعديل أو تعطيل أو حذف أو نقل، ولا استبدال للمدير التجريبي — حتى تبقى أزرار الدخول السريع تعمل دائماً. باقي البيانات قابلة للتعديل. |
| `DB_SSL_CA` | شهادة CA للمزوّدات التي تستخدم شهادة خاصة (Aiven). |
| `UPLOAD_MAX_MB` | الحد الأقصى لحجم الملف المرفوع (الافتراضي 10). |

---

## قيود الخطة المجانية

- **الملفات المرفوعة مؤقتة:** قرص Render المجاني يُمسح عند كل نشر أو إعادة تشغيل، فتضيع المرفقات والصور الشخصية (تبقى سجلاتها في القاعدة لكن التنزيل يعيد «الملف غير موجود»). الحل الدائم: تخزين خارجي (Cloudinary أو S3/R2) — يحتاج تعديلاً على `server/src/middleware/upload.js`.
- **النوم:** أول زيارة بعد 15 دقيقة خمول بطيئة. يمكن إبقاؤه مستيقظاً بخدمة ping مجانية (مثل UptimeRobot على `/api/v1/health`)، مع مراعاة حد الـ 750 ساعة.
- **إعادة تعيين البيانات التجريبية:** من Render → Shell:
  ```bash
  cd server && node db/cli.js reset
  ```
  ⚠️ يمسح كل البيانات ويعيد التعبئة.

---

## استكشاف الأخطاء

| العَرَض | السبب المرجّح |
|---|---|
| `JWT secrets must be configured in production` | متغيرات `JWT_*_SECRET` غير موجودة — تأكد أن الخدمة أُنشئت من الـ Blueprint. |
| `يجب ضبط SEED_ADMIN_PASSWORD…` | لم تُدخل كلمات المرور في Environment. |
| `Access denied` / `connect ETIMEDOUT` | رابط `DATABASE_URL` خاطئ أو كلمة المرور تحتوي رموزاً غير مُرمَّزة. |
| `self-signed certificate` | المزوّد يحتاج `DB_SSL_CA` (Aiven). |

السجلات: Render → الخدمة → **Logs**.
