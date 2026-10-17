# TeamPulse — نظام إدارة الشركة

نظام ويب عربي (RTL) لإدارة الأقسام والموظفين والمهام وتقييم الأداء، بثلاث صلاحيات: **مشرف**، **مدير قسم**، **موظف**. يدعم الوضعين الداكن والفاتح.

| | |
|---|---|
| الواجهة | Vue 3 · Vite · Pinia · Vue Router · Chart.js |
| الخادم | Node.js · Express 5 · Knex · MySQL / MariaDB |
| الأمان | JWT (access + refresh في كوكي httpOnly) · bcrypt · Zod · Helmet · Rate limit |

> 🌐 **نسخة العرض:** <https://team-pulse-amber-five.vercel.app> — استخدم أزرار «دخول تجريبي سريع».
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
| `npm test` | اختبارات تكامل الصلاحيات (35 اختباراً، على قاعدة `teampulse_test` منفصلة) |
| `npm run build` | بناء الواجهة إلى `client/dist` |

**النشر المجاني (Vercel + TiDB Cloud):** اتبع [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) — ملف [`vercel.json`](vercel.json) جاهز.

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

### 1. إعادة البيانات التجريبية تلقائياً
**المشكلة:** زوار نسخة العرض يعدّلون المهام والتقييمات والمستخدمين، فتتراكم التغييرات.
**الحل:** إعادة تعبئة القاعدة دورياً (مثلاً يومياً).
- أمر جاهز: `node db/cli.js reset` (يحذف كل شيء ويعيد التعبئة).
- التشغيل الدوري: endpoint محمي بمفتاح سري (`POST /api/v1/admin/demo-reset`) يستدعيه Vercel Cron (الخطة المجانية تسمح بمهمة يومية) عبر `crons` في `vercel.json`.
- يُفعَّل فقط عند `DEMO_MODE=true`.
