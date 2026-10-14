# TeamPulse — وثيقة مواصفات المشروع (قبل التنفيذ)

> نظام ويب عربي (RTL) لإدارة شركة: الأقسام، الموظفين، المهام، التقييمات، والتقارير — بثلاث صلاحيات: **مشرف**، **مدير قسم**، **موظف**. يدعم الوضعين الداكن والفاتح.

---

## 1. فهم الفكرة

| العنصر | الوصف |
|---|---|
| الشركة | كيان واحد له بيانات عامة (الاسم، الشعار، معلومات التواصل…) يديرها المشرف فقط. |
| القسم | وحدة تنظيمية لها **مدير واحد فقط** يرأسها، وعدد من الموظفين. |
| المشرف (Admin) | صلاحيات كاملة على كل شيء في النظام. |
| المدير (Manager) | رئيس قسم واحد، صلاحياته محصورة في **قسمه وموظفيه فقط**. لا يرى المدراء الآخرين ولا أقسامهم. |
| الموظف (Employee) | ينتمي لقسم واحد، ومديره يُعرَف **تلقائياً من القسم**. صلاحياته على نفسه فقط. |
| المهمة | تُسند للموظف من **المشرف أو مدير قسمه فقط**. قد تتطلب رفع ملفات من الموظف. |
| التقييم | يُقيَّم الموظف من **مدير قسمه أو المشرف**. ويُقيَّم المدير من **المشرف**. |
| لوحة المشرف | إنجازات الشركة العامة + تقييمات الموظفين والمدراء. |
| لوحة المدير | تقييمات موظفي قسمه + نشاط القسم وتحليلاته. |

### القواعد الأساسية (Business Rules)

1. **BR-01** كل قسم له مدير واحد على الأكثر، وكل مدير يرأس قسماً واحداً فقط.
2. **BR-02** كل موظف ينتمي لقسم واحد فقط، ومديره = مدير ذلك القسم (لا يُخزَّن `manager_id` على الموظف لتجنّب التعارض).
3. **BR-03** المهمة تُسند لموظف واحد، والمُسنِد إما المشرف أو مدير قسم الموظف. يُرفض الطلب إن حاول مدير إسناد مهمة لموظف خارج قسمه.
4. **BR-04** التقييم: المدير يقيّم موظفي قسمه فقط؛ المشرف يقيّم الجميع (موظفين ومدراء). لا أحد يقيّم نفسه.
5. **BR-05** الموظف يرفع ملفات فقط على مهمة مُسندة له، وإذا كانت المهمة مُعلَّمة بـ "تتطلب مرفقات" يُمنع تسليمها بدون ملف.
6. **BR-06** نقل موظف إلى قسم آخر يغيّر مديره تلقائياً؛ مهامه المفتوحة تبقى معه (ويظهر سجلها للمشرف)، ولا يراها المدير الجديد إلا إن أُعيد إسنادها.
7. **BR-07** إذا أصبح قسم بلا مدير، يبقى المشرف وحده قادراً على إدارة موظفيه وإسناد المهام لهم.
8. **BR-08** **الصلاحيات تُفرض في الخادم دائماً**؛ حماية الواجهة (إخفاء الأزرار وحراسة المسارات) للتجربة فقط وليست أماناً.

---

## 2. مصفوفة الصلاحيات

الرموز: ✅ مسموح · 🔸 مسموح ضمن النطاق (قسمه / نفسه) · ❌ ممنوع

| العملية | المشرف | المدير | الموظف |
|---|:-:|:-:|:-:|
| تعديل بيانات الشركة | ✅ | ❌ | ❌ |
| إنشاء/تعديل/حذف قسم | ✅ | ❌ | ❌ |
| عرض الأقسام | ✅ | 🔸 قسمه فقط | 🔸 قسمه فقط (الاسم + المدير) |
| تعيين مدير لقسم | ✅ | ❌ | ❌ |
| إنشاء حساب مدير | ✅ | ❌ | ❌ |
| عرض/تعديل بيانات المدراء | ✅ | 🔸 نفسه فقط | ❌ |
| إنشاء حساب موظف | ✅ | 🔸 في قسمه *(انظر قرار D-1)* | ❌ |
| عرض بيانات الموظفين | ✅ | 🔸 موظفي قسمه | 🔸 نفسه |
| تعديل بيانات موظف (عمل) | ✅ | 🔸 موظفي قسمه | ❌ |
| تعديل بيانات شخصية (هاتف، صورة، كلمة مرور) | ✅ | 🔸 نفسه | 🔸 نفسه |
| تعطيل/حذف موظف | ✅ | 🔸 تعطيل فقط *(D-1)* | ❌ |
| نقل موظف بين الأقسام | ✅ | ❌ | ❌ |
| إنشاء مهمة وإسنادها | ✅ | 🔸 لموظفي قسمه | ❌ |
| تعديل/إلغاء مهمة | ✅ | 🔸 مهام قسمه | ❌ |
| تحديث حالة مهمة / رفع ملفات | ✅ | 🔸 مراجعة مهام قسمه | 🔸 مهامه فقط |
| اعتماد/إرجاع مهمة مُسلَّمة | ✅ | 🔸 مهام قسمه | ❌ |
| تقييم موظف | ✅ | 🔸 موظفي قسمه | ❌ |
| تقييم مدير | ✅ | ❌ | ❌ |
| عرض التقييمات | ✅ الكل | 🔸 موظفي قسمه + تقييماته هو | 🔸 تقييماته |
| لوحة التحكم | لوحة الشركة | لوحة القسم | لوحتي الشخصية |
| سجل النشاط (Audit) | ✅ الكل | 🔸 قسمه | ❌ |

---

## 3. الإضافات والتعديلات المقترحة

هذه إضافات لم تُذكر صراحة لكنها لازمة ليكون النظام متكاملاً:

| # | الإضافة | السبب |
|---|---|---|
| A-1 | **دورة حياة للمهمة**: جديدة ← قيد التنفيذ ← مُسلَّمة (بانتظار المراجعة) ← مكتملة / مُعادة للتعديل ← (ملغاة) | بدون مراجعة لا يمكن قياس "الإنجاز" ولا ربطه بالتقييم. |
| A-2 | **أولوية وموعد تسليم** لكل مهمة + تمييز المتأخرة | أساس تحليلات الالتزام بالمواعيد. |
| A-3 | **تعليقات على المهمة** بين المُسنِد والموظف | التواصل حول التسليم والإرجاع. |
| A-4 | **تقييم بمعايير** (الجودة، الالتزام بالوقت، التعاون، المبادرة، التواصل) من 1–5 + ملاحظات + فترة التقييم (شهري/ربع سنوي) | تقييم رقمي قابل للتحليل بدل نص حر. |
| A-5 | **إشعارات داخل النظام** (مهمة جديدة، تسليم، إرجاع، تقييم جديد) | الموظف يعرف بما أُسند له فوراً. |
| A-6 | **سجل نشاط (Audit Log)** لكل عملية إضافة/تعديل/حذف | المشرف يرى من فعل ماذا ومتى؛ ومصدر "نشاط القسم". |
| A-7 | **الحذف الناعم (Soft delete) + تعطيل الحساب** | عدم ضياع التاريخ والتقييمات عند حذف موظف. |
| A-8 | **أول دخول بكلمة مرور مؤقتة** يُطلب تغييرها، و"إعادة تعيين كلمة المرور" من المشرف | لا يوجد تسجيل ذاتي؛ المشرف/المدير ينشئ الحسابات. |
| A-9 | **بحث وتصفية وترقيم صفحات** في كل الجداول | قابلية التوسّع. |
| A-10 | **تصدير CSV** للتقارير والتقييمات (للمشرف والمدير) | استخدام التقارير خارج النظام. |
| A-11 | **قيود على الملفات**: أنواع مسموحة (pdf, docx, xlsx, png, jpg, zip)، حجم أقصى 10MB، تخزين بأسماء عشوائية، تنزيل عبر API محمي | أمان الرفع. |
| A-12 | **ملف شخصي** لكل مستخدم (صورة، هاتف، تغيير كلمة المرور) | صلاحية "على نفسه". |

> خارج النطاق في الإصدار الأول (يمكن إضافتها لاحقاً): الحضور والانصراف، الإجازات، الرواتب، المحادثة الفورية، تطبيق جوال.

---

## 4. التقنيات

### الواجهة (client)
| التقنية | الاستخدام |
|---|---|
| Vue 3 (Composition API, `<script setup>`) + Vite + JavaScript | إطار الواجهة |
| Pinia | الحالة: `auth`, `theme`, `notifications`, + store لكل مورد |
| Vue Router | المسارات + حراسة حسب الدور (`meta.roles`) |
| Axios | طبقة API مع interceptor للتوثيق والأخطاء |
| Chart.js + vue-chartjs | رسوم اللوحات |
| خط **IBM Plex Sans Arabic** أو **Cairo** | خط عربي |
| CSS Variables + خصائص منطقية (`margin-inline-start`…) | الثيمات و RTL بدون مكتبة UI ثقيلة |

### الخادم (server)
| التقنية | الاستخدام |
|---|---|
| Node.js + Express | API REST |
| MySQL 8 + `mysql2` | قاعدة البيانات |
| Knex | Migrations + Seeds + Query builder |
| JWT (access قصير + refresh في كوكي httpOnly) + bcrypt | التوثيق |
| Zod | التحقق من المدخلات |
| Multer | رفع الملفات |
| helmet, cors, express-rate-limit | الأمان |
| dotenv | الإعدادات |

---

## 5. قاعدة البيانات (MySQL)

```
company_settings (id, name, logo_path, email, phone, address, founded_at, updated_at)

users (
  id, full_name, email UNIQUE, password_hash,
  role ENUM('admin','manager','employee'),
  department_id FK→departments NULL,      -- للمدير والموظف
  job_title, phone, avatar_path, hire_date,
  is_active BOOL DEFAULT 1, must_change_password BOOL DEFAULT 1,
  last_login_at, created_at, updated_at, deleted_at NULL
)

departments (
  id, name UNIQUE, description,
  manager_id FK→users NULL UNIQUE,         -- BR-01: مدير واحد لكل قسم ولا يرأس قسمين
  created_at, updated_at, deleted_at NULL
)

tasks (
  id, title, description,
  assignee_id FK→users, assigned_by FK→users, department_id FK→departments,  -- قسم الموظف لحظة الإسناد
  priority ENUM('low','medium','high','urgent'),
  status ENUM('new','in_progress','submitted','completed','returned','cancelled'),
  requires_attachment BOOL, due_date DATE, submitted_at, completed_at,
  created_at, updated_at, deleted_at NULL
)

task_attachments (id, task_id FK, uploaded_by FK, original_name, stored_name, mime_type, size_bytes, created_at)

task_comments (id, task_id FK, user_id FK, body, created_at)

evaluation_criteria (id, name, weight, is_active)       -- الجودة، الالتزام، التعاون…

evaluations (
  id, evaluatee_id FK→users, evaluator_id FK→users,
  period_type ENUM('monthly','quarterly','yearly'), period_start DATE, period_end DATE,
  overall_score DECIMAL(3,2),   -- محسوب من المعايير
  notes, created_at, updated_at,
  UNIQUE(evaluatee_id, evaluator_id, period_start)
)

evaluation_scores (id, evaluation_id FK, criterion_id FK, score TINYINT 1..5)

notifications (id, user_id FK, type, title, body, link, read_at NULL, created_at)

activity_logs (id, actor_id FK, action, entity_type, entity_id, department_id NULL, meta JSON, created_at)

refresh_tokens (id, user_id FK, token_hash, expires_at, revoked_at)
```

**ملاحظات:**
- `users.department_id` للمدير = القسم الذي يرأسه، ويُفرَض تطابقه مع `departments.manager_id` داخل transaction عند التعيين.
- `activity_logs.department_id` يسمح بفلترة "نشاط القسم" للمدير بسرعة.
- فهارس على: `tasks(assignee_id,status)`, `tasks(department_id,status)`, `evaluations(evaluatee_id)`, `notifications(user_id,read_at)`.

---

## 6. طبقة الصلاحيات في الخادم (القلب الأمني)

```
request → authenticate (JWT) → authorize(roles[]) → loadScope → controller → service (policy checks) → repository
```

- `authorize('admin','manager')` يتحقق من الدور.
- **Policies** دوال صريحة يُعاد استخدامها:
  - `canViewUser(actor, target)` — admin: دائماً · manager: `target.department_id === actor.department_id && target.role === 'employee'` أو نفسه · employee: نفسه فقط.
  - `canManageEmployee(actor, target)` — admin أو مدير قسم الموظف.
  - `canAssignTask(actor, assignee)` — admin أو مدير قسم الـ assignee (و assignee دوره employee).
  - `canEvaluate(actor, target)` — admin لأي شخص عدا نفسه · manager لموظفي قسمه.
  - `canAccessTask(actor, task)` — admin · مدير قسم المهمة · الموظف المُسند له.
- **Scoping في الاستعلامات**: كل قائمة تمر عبر `applyScope(query, actor)` فلا يمكن جلب بيانات خارج النطاق حتى بالتلاعب بالـ query params.
- عند الرفض: `404` بدل `403` للموارد خارج النطاق (حتى لا يُكشف وجودها).

---

## 7. واجهات API

البادئة: `/api/v1` — الاستجابة الموحّدة: `{ data, meta }` أو `{ error: { code, message, details } }` (رسائل الخطأ بالعربية).

| المجموعة | المسارات | الأدوار |
|---|---|---|
| Auth | `POST /auth/login` · `POST /auth/refresh` · `POST /auth/logout` · `GET /auth/me` · `PUT /auth/password` | الكل |
| Company | `GET /company` · `PUT /company` | GET: الكل · PUT: admin |
| Departments | `GET /departments` · `POST` · `GET /:id` · `PUT /:id` · `DELETE /:id` · `PUT /:id/manager` | admin (والـ GET بنطاق) |
| Users | `GET /users?role&department&q&page` · `POST /users` · `GET /:id` · `PUT /:id` · `PATCH /:id/status` · `PATCH /:id/department` · `POST /:id/reset-password` · `DELETE /:id` | بنطاق حسب السياسات |
| Profile | `GET /profile` · `PUT /profile` · `POST /profile/avatar` | الكل |
| Tasks | `GET /tasks?status&assignee&priority&overdue&page` · `POST /tasks` · `GET /:id` · `PUT /:id` · `PATCH /:id/status` · `DELETE /:id` | بنطاق |
| Task files | `POST /tasks/:id/attachments` · `GET /attachments/:id/download` · `DELETE /attachments/:id` | بنطاق |
| Task comments | `GET /tasks/:id/comments` · `POST /tasks/:id/comments` | بنطاق |
| Evaluations | `GET /evaluations?evaluatee&period` · `POST /evaluations` · `GET /:id` · `PUT /:id` · `DELETE /:id` · `GET /evaluation-criteria` · CRUD المعايير (admin) | بنطاق |
| Dashboards | `GET /dashboard/admin` · `GET /dashboard/manager` · `GET /dashboard/employee` | كل دور لوحته |
| Notifications | `GET /notifications` · `PATCH /:id/read` · `PATCH /read-all` | الكل (لنفسه) |
| Activity | `GET /activity?department&actor&page` | admin، manager (قسمه) |
| Reports | `GET /reports/evaluations.csv` · `GET /reports/tasks.csv` | admin، manager (قسمه) |

### انتقالات حالة المهمة

| من → إلى | من يملك الانتقال |
|---|---|
| new → in_progress | الموظف |
| in_progress / returned → submitted | الموظف (مع ملف إن `requires_attachment`) |
| submitted → completed | المُسنِد/مدير القسم/المشرف |
| submitted → returned | المُسنِد/مدير القسم/المشرف (مع تعليق إلزامي) |
| أي حالة غير مكتملة → cancelled | مدير القسم/المشرف |

---

## 8. اللوحات والتحليلات

### لوحة المشرف
- بطاقات KPI: عدد الأقسام، المدراء، الموظفين النشطين، المهام المفتوحة، نسبة الإنجاز الشهرية، المهام المتأخرة.
- رسم خطي: المهام المكتملة شهرياً (آخر 12 شهر).
- رسم أعمدة: نسبة الإنجاز ومتوسط التقييم **لكل قسم** (مقارنة الأقسام).
- جدول: أعلى/أدنى 5 موظفين تقييماً، وتقييمات المدراء.
- آخر النشاطات في الشركة.

### لوحة المدير
- بطاقات KPI لقسمه: عدد الموظفين، مهام مفتوحة/مُسلَّمة بانتظار المراجعة/متأخرة، نسبة الإنجاز، متوسط تقييم القسم.
- رسم دائري: توزيع المهام حسب الحالة.
- رسم أعمدة: إنجاز كل موظف (مكتملة مقابل مُسندة) + نسبة التسليم في الموعد.
- رسم خطي: متوسط تقييم القسم عبر الفترات.
- قائمة "بانتظار مراجعتي" + نشاط القسم الأخير.

### لوحة الموظف
- مهامي حسب الحالة، أقرب المواعيد، المهام المُعادة.
- آخر تقييم + تطور تقييماتي.
- الإشعارات.

**مؤشرات محسوبة:**
- نسبة الإنجاز = المكتملة ÷ (المُسندة − الملغاة) في الفترة.
- الالتزام بالموعد = المكتملة قبل/في `due_date` ÷ المكتملة.
- متوسط التقييم = Σ(score × weight) ÷ Σ(weight).

---

## 9. صفحات الواجهة

| المسار | الصفحة | الأدوار |
|---|---|---|
| `/login` | تسجيل الدخول | عام |
| `/change-password` | تغيير كلمة المرور الإلزامي | مسجّل |
| `/` | توجيه للوحة حسب الدور | مسجّل |
| `/admin/dashboard` | لوحة الشركة | admin |
| `/admin/company` | بيانات الشركة | admin |
| `/departments`, `/departments/:id` | الأقسام وتفاصيلها | admin (والمدير لقسمه فقط) |
| `/users?role=manager` | المدراء (تبويب في صفحة المستخدمين) | admin |
| `/admin/criteria` | معايير التقييم | admin |
| `/manager/dashboard` | لوحة القسم | manager |
| `/users`, `/users/:id` | المستخدمون (بنطاق) | admin, manager |
| `/tasks`, `/tasks/new`, `/tasks/:id` | المهام | الكل (بنطاق؛ الإنشاء للمشرف والمدير) |
| `/evaluations`, `/evaluations/new`, `/evaluations/:id` | التقييمات | الكل (بنطاق؛ الإنشاء للمشرف والمدير) |
| `/activity` | سجل النشاط | admin, manager |
| `/my/dashboard` | لوحتي | employee |
| `/profile` | الملف الشخصي | الكل |
| `/notifications` | الإشعارات | الكل |
| `/:pathMatch(.*)*` | 404 | — |

### التصميم
- `<html lang="ar" dir="rtl">`، كل التنسيقات بخصائص منطقية (inline-start/end) لا left/right.
- الثيم: متغيرات CSS على `:root` و `[data-theme="dark"]`؛ الافتراضي يتبع `prefers-color-scheme` ويُحفظ الاختيار في `localStorage`، مع زر تبديل في الشريط العلوي.
- تخطيط: شريط جانبي (يمين) بعناصر حسب الدور + شريط علوي (بحث، إشعارات، الثيم، المستخدم). متجاوب: الشريط الجانبي يتحول لدرج على الجوال.
- التواريخ والأرقام عبر `Intl` بلغة `ar` (مع خيار أرقام لاتينية للجداول).
- مكونات مشتركة: `DataTable`, `Modal`, `ConfirmDialog`, `StatCard`, `ChartCard`, `FileUploader`, `StatusBadge`, `RatingInput`, `EmptyState`, `Toast`, `Pagination`.

---

## 10. هيكل المجلدات

```
TeamPulse/
├── docs/                      وثائق المشروع
├── server/
│   ├── src/
│   │   ├── config/            env, db (knex)
│   │   ├── middleware/        auth, authorize, validate, upload, errorHandler, rateLimit
│   │   ├── policies/          user.policy, task.policy, evaluation.policy
│   │   ├── modules/
│   │   │   ├── auth/          routes, controller, service, schema
│   │   │   ├── company/
│   │   │   ├── departments/
│   │   │   ├── users/
│   │   │   ├── tasks/         (+ attachments, comments)
│   │   │   ├── evaluations/
│   │   │   ├── dashboard/
│   │   │   ├── notifications/
│   │   │   └── activity/
│   │   ├── utils/             ApiError, pagination, csv
│   │   ├── app.js
│   │   └── server.js
│   ├── db/migrations/  db/seeds/
│   ├── uploads/               (خارج public، يُنزَّل عبر API فقط)
│   ├── tests/
│   ├── knexfile.js  .env.example  package.json
└── client/
    ├── src/
    │   ├── api/               axios instance + ملف لكل مورد
    │   ├── stores/            auth, theme, notifications, ...
    │   ├── router/            routes + guards
    │   ├── layouts/           AuthLayout, AppLayout
    │   ├── components/        common/, charts/, tasks/, evaluations/
    │   ├── views/             admin/, manager/, employee/, shared/
    │   ├── composables/       usePermissions, usePagination, useToast
    │   ├── utils/             formatters (تواريخ/أرقام عربية), constants (الحالات والأدوار بالعربي)
    │   ├── assets/styles/     tokens.css, base.css, themes
    │   ├── App.vue  main.js
    ├── index.html  vite.config.js  .env.example  package.json
```

---

## 11. الأمان

- كلمات المرور bcrypt (cost 12)، سياسة 8 أحرف على الأقل.
- Access token (15 دقيقة) في الذاكرة + Refresh token (7 أيام) في كوكي `httpOnly; SameSite=Strict`، مع إبطال عند الخروج/تعطيل الحساب.
- Rate limit على `/auth/login`.
- التحقق من كل المدخلات بـ Zod؛ استعلامات Knex مُمرَّرة المعاملات (لا SQL injection).
- الملفات: فحص النوع والامتداد والحجم، أسماء عشوائية، لا تُخدَم كملفات ثابتة.
- الحساب المعطَّل لا يستطيع الدخول ولا يُجدَّد توكنه.
- لا يمكن حذف آخر مشرف في النظام.

---

## 12. البيانات الأولية (Seed)

- حساب مشرف افتراضي (البيانات في `.env` / seed، يُطلب تغيير كلمة المرور عند أول دخول).
- 3 أقسام تجريبية (تقنية المعلومات، الموارد البشرية، المبيعات) لكل منها مدير و4–6 موظفين.
- مهام بحالات مختلفة وتقييمات لثلاثة أشهر — حتى تظهر اللوحات بمحتوى حقيقي.
- معايير التقييم الخمسة الافتراضية.

---

## 13. مراحل التنفيذ

| المرحلة | المحتوى | الناتج |
|---|---|---|
| 1. الأساس | إعداد `server` و `client`، Knex + migrations + seeds، هيكل Express، تخطيط الواجهة RTL + الثيمات | مشروعان يعملان + قاعدة بيانات |
| 2. التوثيق والصلاحيات | Login/refresh/logout، middleware، policies، حراسة المسارات، تغيير كلمة المرور | دخول بثلاث أدوار |
| 3. الشركة والأقسام والمستخدمين | CRUD كامل مع النطاقات، تعيين المدير، نقل الموظف، التعطيل | إدارة الهيكل التنظيمي |
| 4. المهام | CRUD، دورة الحالات، المرفقات، التعليقات | إسناد وتسليم ومراجعة |
| 5. التقييمات | المعايير، إنشاء/عرض التقييمات بنطاق | تقييم الموظفين والمدراء |
| 6. اللوحات والتحليلات | استعلامات التجميع + الرسوم لكل دور | ثلاث لوحات |
| 7. الإشعارات والسجل والتقارير | إشعارات، Activity log، تصدير CSV | — |
| 8. الصقل والاختبار | اختبارات الصلاحيات (أهمها)، حالات فارغة، تجاوب، README | نسخة جاهزة |

**أولوية الاختبارات:** اختبارات تكامل للخادم تتحقق أن المدير **لا** يستطيع قراءة/تعديل موظف في قسم آخر، ولا يرى مديراً آخر، وأن الموظف لا يصل لمهام غيره أو ملفاتهم.

---

## 14. القرارات المعتمدة في التنفيذ

| # | القرار |
|---|---|
| D-1 | المدير ينشئ حسابات موظفين في قسمه فقط، ويعدّل بياناتهم ويعطّلهم ويعيد تعيين كلمات مرورهم. الحذف ونقل الموظف بين الأقسام وتغيير الأدوار من صلاحيات المشرف فقط. |
| D-2 | يمكن وجود أكثر من مشرف، ولا يمكن حذف أو تعطيل أو تغيير دور آخر مشرف نشط. |
| D-3 | الموظف لا يرى زملاءه؛ يرى اسم قسمه ومديره فقط. |
| D-4 | المدير يرى تقييماته التي وضعها المشرف (وليس تقييمات المدراء الآخرين). |
| D-5 | فترات التقييم: شهري (افتراضي) أو ربع سنوي أو سنوي، وتقييم واحد لكل مُقيِّم لنفس الشخص في نفس الفترة. |
| D-6 | لم يكن هناك خادم قائم، فبُني من الصفر في `server/` (Express 5 + Knex + MySQL/MariaDB). |

### ملاحظات تنفيذية
- تعيين مدير لقسم له مدير سابق: المدير السابق يبقى بدور «مدير» دون قسم حتى يعيّنه المشرف. اختيار موظف لرئاسة قسم يرقّيه تلقائياً إلى مدير.
- لا يمكن حذف قسم يحتوي على موظفين أو مدير.
- المرفقات تُخزَّن خارج المجلد العام ولا تُنزَّل إلا عبر `GET /attachments/:id/download` بعد التحقق من صلاحية الوصول للمهمة. الصور الشخصية وشعار الشركة عامة بأسماء عشوائية.
- اختبارات التكامل في `server/tests/permissions.test.js` تغطي حدود الصلاحيات ودورة المهمة.
