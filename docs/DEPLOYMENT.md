# نشر TeamPulse مجاناً (Vercel + TiDB Cloud)

الترتيب: **مشروع واحد على Vercel**: الواجهة المبنية تُخدم كملفات ثابتة من CDN، والـ API يعمل كدالة serverless واحدة على نفس النطاق، فلا توجد مشاكل CORS أو كوكي. وقاعدة البيانات **MySQL مجانية على TiDB Cloud**.

```
المتصفح ──HTTPS──► Vercel
                    ├─ /*            ← client/dist (Vue، ملفات ثابتة)
                    ├─ /api/v1/*     ┐
                    ├─ /uploads/*    ┴► api/index.js (Express كدالة serverless)
                    └──SSL──► TiDB Cloud Serverless (MySQL + محتوى الملفات المرفوعة)
```

| الخدمة | الخطة المجانية (Hobby) |
|---|---|
| Vercel | لا ينام ولا يوجد حد ساعات · أول طلب بعد خمول ~1 ثانية (cold start) · حجم الطلب ≤ 4.5MB |
| TiDB Cloud Serverless | 5GB تخزين · متوافق مع MySQL · SSL بشهادة عامة (لا يحتاج ملف CA) |

> **لا تستخدم خدمة ping** (UptimeRobot وغيرها) مع Vercel. لا حاجة لها، وكل طلب منها يُحسب من حصة الدوال المجانية.

---

## 1) قاعدة البيانات: TiDB Cloud

1. أنشئ حساباً على <https://tidbcloud.com> ثم **Create Cluster → Serverless**.
   - اختر المنطقة **Frankfurt (eu-central-1)**، فدالة Vercel مضبوطة على `fra1` في [`vercel.json`](../vercel.json).
2. افتح الـ cluster ← **Connect**:
   - Connect With: **General**
   - اضغط **Generate Password** واحفظ كلمة المرور.
3. كوّن رابط الاتصال بهذا الشكل:

   ```
   mysql://USER:PASSWORD@HOST:4000/teampulse?ssl=true
   ```

   - `USER` يكون بصيغة `xxxxxxxx.root`
   - `HOST` يكون بصيغة `gateway01.eu-central-1.prod.aws.tidbcloud.com`
   - إذا احتوت كلمة المرور على رموز خاصة (`@ : / ? #`) استبدلها بترميز URL (مثلاً `@` ← `%40`).
   - قاعدة `teampulse` تُنشأ تلقائياً أثناء البناء.

> إذا كانت القاعدة موجودة من نشر سابق (Render) فاستخدم نفس الرابط. البيانات تبقى كما هي، والـ migration الجديدة (`file_blobs`) تُنفَّذ تلقائياً.

> **بديل: Aiven MySQL** (مجاني أيضاً). يعطيك Service URI جاهزاً؛ استخدمه كـ `DATABASE_URL`، وانسخ محتوى **CA certificate** إلى متغير `DB_SSL_CA`.

---

## 2) المشروع: Vercel

1. أنشئ حساباً على <https://vercel.com> واربطه بحساب GitHub.
2. **Add New → Project** ← اختر المستودع `anasAboAli/team-pulse`.
   - **Root Directory:** اتركه على جذر المستودع (`./`).
   - Framework وأوامر البناء تُقرأ من [`vercel.json`](../vercel.json)، فلا تغيّر شيئاً.
3. **Environment Variables** (قبل الضغط على Deploy):

   | المتغير | القيمة |
   |---|---|
   | `NODE_ENV` | `production` |
   | `DATABASE_URL` | رابط الاتصال من الخطوة 1 |
   | `JWT_ACCESS_SECRET` | قيمة عشوائية طويلة (مثلاً `openssl rand -hex 32`) |
   | `JWT_REFRESH_SECRET` | قيمة عشوائية طويلة أخرى |
   | `SEED_DEMO_DATA` | `true` |
   | `SEED_ADMIN_PASSWORD` | كلمة مرور حساب المشرف |
   | `SEED_DEMO_PASSWORD` | كلمة مرور حسابات المدراء والموظفين التجريبية |
   | `DEMO_MODE` | `true` |
   | `VITE_DEMO_LOGIN` | `true` |
   | `VITE_DEMO_ADMIN_PASSWORD` | نفس `SEED_ADMIN_PASSWORD` |
   | `VITE_DEMO_PASSWORD` | نفس `SEED_DEMO_PASSWORD` |

   > إذا انتقلت من Render ومعك قاعدة فيها بيانات، فانسخ قيم `JWT_*_SECRET` القديمة من Render → Environment، وإلا تُطلب إعادة تسجيل الدخول فقط.

4. **Deploy**. أثناء البناء (في نشر Production فقط):
   - تُنشأ القاعدة إن لم تكن موجودة وتُنفَّذ الـ migrations (`npm run db:deploy`)
   - إذا كانت القاعدة فارغة و`SEED_DEMO_DATA=true`، تُعبّأ البيانات التجريبية (4 أقسام، 18 موظفاً، مهام وتقييمات)
   - ثم تُبنى الواجهة إلى `client/dist`
5. افتح الرابط `https://<اسم-المشروع>.vercel.app` وسجّل الدخول:
   - مشرف: `admin@teampulse.test`
   - مدير: `manager@teampulse.test`
   - موظف: `employee@teampulse.test`

بعد ذلك، كل `git push` على `main` ينشر تلقائياً. الفروع الأخرى تحصل على Preview لا يشغّل الـ migrations.

---

## الملفات المرفوعة

لا يملك Vercel قرصاً دائماً، لذلك تُحفظ الصور الشخصية وشعار الشركة ومرفقات المهام **داخل قاعدة البيانات** (جدول `file_blobs`). يحدث هذا تلقائياً عند وجود متغير `VERCEL`. محلياً تبقى في مجلد `server/uploads` كالمعتاد.

- الحد الأقصى للملف على Vercel **4MB** (حد الطلب في Vercel هو 4.5MB)، وللصور 2MB.
- يمكن فرض أي وضع عبر `STORAGE_DRIVER=db` أو `STORAGE_DRIVER=disk`.

---

## إعدادات اختيارية

| المتغير | الأثر |
|---|---|
| `SEED_DEMO_DATA=false` | (قبل أول نشر) يُنشئ حساب المشرف فقط بدل البيانات التجريبية، ويُطلب تغيير كلمة المرور عند أول دخول. للاستخدام الحقيقي. |
| `VITE_DEMO_LOGIN=true` + `VITE_DEMO_ADMIN_PASSWORD` + `VITE_DEMO_PASSWORD` | يُظهر أزرار «دخول تجريبي سريع» في الموقع المنشور (يتطلب إعادة البناء). ⚠️ كلمات المرور تصبح مكشوفة في ملفات الواجهة، وأي زائر يستطيع الدخول كمشرف. لموقع عرض (Portfolio) فقط، ومع `DEMO_MODE=true`. |
| `DEMO_MODE=true` | يحمي الحسابات التجريبية الثلاثة: لا تغيير لكلمة مرورها، ولا تعديل أو تعطيل أو حذف أو نقل، ولا استبدال للمدير التجريبي، حتى تبقى أزرار الدخول السريع تعمل دائماً. باقي البيانات قابلة للتعديل. |
| `DB_SSL_CA` | شهادة CA للمزوّدات التي تستخدم شهادة خاصة (Aiven). |
| `UPLOAD_MAX_MB` | الحد الأقصى لحجم المرفق (الافتراضي 4 على Vercel و10 محلياً). |
| `STORAGE_DRIVER` | `db` أو `disk` (انظر «الملفات المرفوعة»). |

---

## إعادة تعيين البيانات التجريبية

من جهازك، مع رابط قاعدة الإنتاج:

```bash
DATABASE_URL="mysql://..." DB_SSL=true node server/db/cli.js reset
```

⚠️ يمسح كل البيانات (ومنها الملفات المرفوعة) ويعيد التعبئة.

---

## استكشاف الأخطاء

| العَرَض | السبب المرجّح |
|---|---|
| `JWT secrets must be configured in production` | متغيرات `JWT_*_SECRET` غير مضبوطة في Vercel. |
| `يجب ضبط SEED_ADMIN_PASSWORD…` (فشل البناء) | لم تُدخل كلمات المرور في Environment Variables. |
| `Access denied` / `connect ETIMEDOUT` | رابط `DATABASE_URL` خاطئ أو كلمة المرور تحتوي رموزاً غير مُرمَّزة. |
| `self-signed certificate` | المزوّد يحتاج `DB_SSL_CA` (Aiven). |
| `413 Payload Too Large` عند رفع ملف | حجم الطلب تجاوز 4.5MB (حد Vercel). |
| أزرار الدخول السريع لا تظهر | متغيرات `VITE_*` أُضيفت بعد البناء. أعد النشر (Redeploy). |

السجلات: سجلات البناء في Vercel → Deployments → النشر، وسجلات الـ API في Vercel → المشروع → **Logs**.
