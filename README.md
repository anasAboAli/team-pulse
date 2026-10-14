# TeamPulse — نظام إدارة الشركة

نظام ويب عربي (RTL) لإدارة الأقسام والموظفين والمهام وتقييم الأداء، بثلاث صلاحيات: **مشرف**، **مدير قسم**، **موظف**. يدعم الوضعين الداكن والفاتح.

| | |
|---|---|
| الواجهة | Vue 3 · Vite · Pinia · Vue Router · Chart.js |
| الخادم | Node.js · Express 5 · Knex · MySQL / MariaDB |
| الأمان | JWT (access + refresh في كوكي httpOnly) · bcrypt · Zod · Helmet · Rate limit |

> 🌐 **نسخة العرض:** <https://team-pulse-3be4.onrender.com> — استخدم أزرار «دخول تجريبي سريع» (قد يتأخر أول تحميل ~50 ثانية بسبب الاستضافة المجانية).
>
> المواصفات الكاملة والقرارات في [docs/PROJECT_SPEC.md](docs/PROJECT_SPEC.md)، ودليل النشر في [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

---

## التشغيل السريع

**المتطلبات:** Node.js 20+ وMySQL 8 أو MariaDB 10.4+ (مثل MySQL الخاص بـ XAMPP).

```bash
npm run install:all
```

```bash
cp server/.env.example server/.env
```

عدّل بيانات الاتصال بقاعدة البيانات في `server/.env` إن لزم، ثم أنشئ القاعدة وعبّئها بالبيانات التجريبية:

```bash
npm run setup
```

شغّل الخادم والواجهة (كلٌّ في طرفية منفصلة):

```bash
npm run dev:server
```

```bash
npm run dev:client
```

افتح <http://localhost:5173>.

### الحسابات التجريبية

في وضع التطوير تظهر في صفحة الدخول أزرار **«دخول تجريبي سريع»** للحسابات الثلاثة. كلمات المرور معرّفة في `server/.env` (`SEED_ADMIN_PASSWORD` للمشرف و`SEED_DEMO_PASSWORD` للبقية)، ويقرؤها زر الدخول السريع من `client/.env.development`.

| الدور | البريد | ماذا سترى |
|---|---|---|
| مشرف | `admin@teampulse.test` | لوحة الشركة، كل الأقسام والمستخدمين |
| مدير قسم | `manager@teampulse.test` | قسم تقنية المعلومات وموظفوه فقط |
| موظف | `employee@teampulse.test` | مهامه (جديدة، قيد التنفيذ، مُعادة، متأخرة) وتقييماته |

حسابات إضافية لتجربة عزل الأقسام: `manager.hr@` · `manager.sales@` · `manager.finance@` · `it2@`–`it5@` · `hr1@`… · `sales1@`… · `finance1@`… (النطاق `teampulse.test`، بنفس كلمة مرور الحسابات التجريبية).

---|---|
| مشرف | `admin@teampulse.test` |
| مدير تقنية المعلومات | `manager.it@teampulse.test` |
| مدير الموارد البشرية | `manager.hr@teampulse.test` |
| مدير المبيعات / المالية | `manager.sales@teampulse.test` · `manager.finance@teampulse.test` |
| موظفون | `it1@…` حتى `it5@` · `hr1@…` · `sales1@…` · `finance1@…` (النطاق `teampulse.test`) |

---

## الصلاحيات باختصار

- **المشرف:** كل شيء — الشركة، الأقسام، تعيين المدراء، كل المستخدمين، المهام، التقييمات، اللوحة العامة.
- **المدير:** قسمه فقط — موظفوه (إضافة، تعديل، تعطيل، إعادة كلمة المرور)، إسناد المهام لهم ومراجعتها، تقييمهم، لوحة القسم ونشاطه. لا يرى المدراء الآخرين ولا أقسامهم.
- **الموظف:** نفسه فقط — مهامه (بدء، رفع ملفات، تسليم، تعليق)، تقييماته، ملفه الشخصي.

الصلاحيات تُفرض **في الخادم** عبر `server/src/policies/index.js`، والموارد خارج النطاق تُعيد `404`. حراسة المسارات في الواجهة لتحسين التجربة فقط.

### دورة المهمة

```
جديدة ──► قيد التنفيذ ──► مُسلَّمة ──► مكتملة
                ▲              │
                └── مُعادة ◄───┘  (بسبب إلزامي)
      (المدير/المشرف يمكنه الإلغاء في أي مرحلة مفتوحة)
```

المهمة المعلَّمة بـ«تتطلب ملفاً» لا يمكن تسليمها قبل أن يرفع الموظف ملفاً.

---

## الأوامر

| الأمر | الوظيفة |
|---|---|
| `npm run setup` | إنشاء قاعدة البيانات + migrations + بيانات تجريبية |
| `npm run db:reset --prefix server` | مسح كل شيء وإعادة التعبئة |
| `npm run db:migrate --prefix server` | تنفيذ migrations الجديدة فقط |
| `npm test` | اختبارات تكامل الصلاحيات (31 اختباراً، على قاعدة `teampulse_test` منفصلة) |
| `npm run build` | بناء الواجهة إلى `client/dist` |

**النشر المجاني (Render + TiDB Cloud):** اتبع [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) — ملف [`render.yaml`](render.yaml) جاهز.

**الإنتاج يدوياً:** ابنِ الواجهة، واضبط في `server/.env` القيم `NODE_ENV=production` و`JWT_*_SECRET` (قيم عشوائية طويلة) و`CLIENT_ORIGIN`، ثم شغّل `npm start --prefix server`؛ الخادم يخدم `client/dist` تلقائياً.

---

## هيكل المشروع

```
TeamPulse/
├── docs/PROJECT_SPEC.md        المواصفات والقرارات
├── server/
│   ├── db/migrations, seeds    هيكل القاعدة والبيانات التجريبية
│   ├── src/
│   │   ├── policies/           قواعد الصلاحيات (المصدر الوحيد)
│   │   ├── middleware/         توثيق، تحقق، رفع ملفات، أخطاء
│   │   └── modules/            auth, users, departments, tasks, evaluations,
│   │                           dashboard, notifications, activity, reports, …
│   ├── uploads/private         مرفقات المهام (تُنزَّل عبر API محمي فقط)
│   └── tests/                  اختبارات الصلاحيات
└── client/src/
    ├── api/                    عميل HTTP + تجديد الجلسة تلقائياً
    ├── stores/                 auth, theme, notifications, ui, company
    ├── router/                 المسارات وحراسة الأدوار
    ├── components/             مكونات مشتركة + رسوم بيانية
    └── views/                  admin/, manager/, employee/, users/, tasks/, evaluations/, shared/
```

---

## تطويرات مقترحة لاحقاً

تحسينات مؤجّلة — غير مطبّقة حالياً:

### 1. تخزين دائم للملفات (Cloudinary)
**المشكلة:** قرص Render المجاني مؤقت؛ المرفقات والصور الشخصية وشعار الشركة تُحذف مع كل نشر أو إعادة تشغيل (تبقى سجلاتها في القاعدة لكن التنزيل يفشل).
**الحل:** رفع الملفات إلى Cloudinary (خطة مجانية 25GB) بدل القرص.
- تعديل `server/src/middleware/upload.js` لاستخدام تخزين ذاكرة (`multer.memoryStorage`) ثم الرفع عبر حزمة `cloudinary`.
- المرفقات الخاصة: نوع `authenticated` مع روابط موقّعة قصيرة العمر تُولَّد في `GET /attachments/:id/download` بعد التحقق من الصلاحية — لا روابط عامة.
- الصور الشخصية والشعار: رفع عام عادي، وحفظ الرابط بدل اسم الملف في `avatar_path` / `logo_path`.
- متغيرات جديدة: `CLOUDINARY_URL`.

### 2. إعادة البيانات التجريبية تلقائياً
**المشكلة:** زوار نسخة العرض يعدّلون المهام والتقييمات والمستخدمين، فتتراكم التغييرات.
**الحل:** إعادة تعبئة القاعدة دورياً (مثلاً يومياً).
- أمر جاهز: `node db/cli.js reset` (يحذف كل شيء ويعيد التعبئة).
- التشغيل الدوري: Render Cron Job (مدفوع)، أو GitHub Actions مجدول يتصل بالقاعدة ويشغّل الأمر، أو endpoint محمي بمفتاح سري (`POST /api/v1/admin/demo-reset`) يستدعيه cron-job.org المجاني.
- يُفعَّل فقط عند `DEMO_MODE=true`.

### 3. إبقاء الموقع مستيقظاً
**المشكلة:** خدمة Render المجانية تنام بعد 15 دقيقة بلا زيارات، وأول طلب بعدها يأخذ ~30–50 ثانية.
**الحل:** خدمة مراقبة مجانية مثل [UptimeRobot](https://uptimerobot.com) تطلب `https://team-pulse-3be4.onrender.com/api/v1/health` كل 10–14 دقيقة.
- لا يحتاج أي تعديل في الكود.
- انتبه لحد 750 ساعة تشغيل شهرياً في الخطة المجانية (يكفي خدمة واحدة تعمل طوال الشهر).

