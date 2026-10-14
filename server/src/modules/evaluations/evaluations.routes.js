import { Router } from 'express';
import { db } from '../../config/db.js';
import { authorize } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { z, dateString, id, idParam, optText, pagination } from '../../lib/z.js';
import {
  canEditEvaluation,
  canEvaluate,
  canViewEvaluation,
  isAdmin,
  isManager,
} from '../../policies/index.js';
import { ApiError } from '../../utils/ApiError.js';
import { logActivity, notify } from '../../utils/events.js';
import { normalizePeriod, toNumber } from '../../utils/helpers.js';
import { paginate } from '../../utils/pagination.js';
import { findUser } from '../users/users.service.js';

const router = Router();
const PERIODS = ['monthly', 'quarterly', 'yearly'];

const scoresSchema = z
  .array(z.object({ criterion_id: id, score: z.coerce.number().int().min(1).max(5) }))
  .min(1, 'يجب تقييم المعايير');

const createBody = z.object({
  evaluatee_id: id,
  period_type: z.enum(PERIODS).default('monthly'),
  period_date: dateString,
  notes: optText(3000),
  scores: scoresSchema,
});

const listQuery = z.object({
  ...pagination,
  evaluatee_id: id.optional(),
  department_id: id.optional(),
  period_type: z.enum(PERIODS).optional(),
  role: z.enum(['manager', 'employee']).optional(),
  q: z.string().trim().max(100).optional(),
});

function evaluationsQuery() {
  return db({ ev: 'evaluations' })
    .join({ e: 'users' }, 'e.id', 'ev.evaluatee_id')
    .join({ r: 'users' }, 'r.id', 'ev.evaluator_id')
    .leftJoin({ d: 'departments' }, 'd.id', 'e.department_id')
    .select(
      'ev.*',
      'e.full_name as evaluatee_name',
      'e.role as evaluatee_role',
      'e.department_id as evaluatee_department_id',
      'e.avatar_path as evaluatee_avatar',
      'r.full_name as evaluator_name',
      'r.role as evaluator_role',
      'd.name as department_name',
    );
}

const toEvaluation = (row) => ({
  id: row.id,
  period_type: row.period_type,
  period_start: row.period_start,
  period_end: row.period_end,
  overall_score: toNumber(row.overall_score, 2),
  notes: row.notes,
  created_at: row.created_at,
  updated_at: row.updated_at,
  evaluatee: {
    id: row.evaluatee_id,
    full_name: row.evaluatee_name,
    role: row.evaluatee_role,
    avatar_url: row.evaluatee_avatar ? `/uploads/public/${row.evaluatee_avatar}` : null,
  },
  evaluator: { id: row.evaluator_id, full_name: row.evaluator_name, role: row.evaluator_role },
  department: row.evaluatee_department_id ? { id: row.evaluatee_department_id, name: row.department_name } : null,
});

/** نطاق التقييمات: المدير يرى تقييمات موظفي قسمه + تقييماته هو (D-4) */
function scopeEvaluations(qb, actor) {
  if (isAdmin(actor)) return qb;
  if (isManager(actor)) {
    return qb.where((w) => {
      w.where('ev.evaluatee_id', actor.id);
      if (actor.department_id) w.orWhere((x) => x.where('e.department_id', actor.department_id).where('e.role', 'employee'));
    });
  }
  return qb.where('ev.evaluatee_id', actor.id);
}

/** يتحقق من المعايير ويحسب الدرجة الكلية الموزونة */
async function computeScores(scores) {
  const criteria = await db('evaluation_criteria').where({ is_active: true });
  const byId = new Map(criteria.map((c) => [c.id, c]));
  const given = new Map(scores.map((s) => [s.criterion_id, s.score]));
  const missing = criteria.filter((c) => !given.has(c.id));
  if (missing.length) {
    throw ApiError.unprocessable('البيانات المدخلة غير صحيحة', { scores: `يجب تقييم كل المعايير: ${missing.map((c) => c.name).join('، ')}` });
  }
  if ([...given.keys()].some((cid) => !byId.has(cid))) {
    throw ApiError.unprocessable('البيانات المدخلة غير صحيحة', { scores: 'معيار غير معروف أو غير مفعّل' });
  }
  let weighted = 0;
  let weights = 0;
  for (const [cid, score] of given) {
    const w = Number(byId.get(cid).weight);
    weighted += score * w;
    weights += w;
  }
  return { overall: Number((weighted / weights).toFixed(2)), rows: [...given].map(([criterion_id, score]) => ({ criterion_id, score })) };
}

async function evaluationDetail(actor, evaluationId) {
  const row = await evaluationsQuery().where('ev.id', evaluationId).first();
  const scores = await db({ s: 'evaluation_scores' })
    .join({ c: 'evaluation_criteria' }, 'c.id', 's.criterion_id')
    .select('s.criterion_id', 's.score', 'c.name', 'c.weight')
    .where('s.evaluation_id', evaluationId)
    .orderBy('c.id');
  return {
    ...toEvaluation(row),
    scores: scores.map((s) => ({ ...s, weight: toNumber(s.weight) })),
    permissions: { can_edit: canEditEvaluation(actor, row), can_delete: canEditEvaluation(actor, row) },
  };
}

async function loadVisibleEvaluation(actor, evaluationId) {
  const evaluation = await db('evaluations').where({ id: evaluationId }).first();
  if (!evaluation) throw ApiError.notFound('التقييم غير موجود');
  const evaluatee = await db('users').where({ id: evaluation.evaluatee_id }).first();
  if (!canViewEvaluation(actor, evaluation, evaluatee)) throw ApiError.notFound('التقييم غير موجود');
  return { evaluation, evaluatee };
}

// ── القائمة ────────────────────────────────────────────────
router.get('/', validate({ query: listQuery }), async (req, res) => {
  const { evaluatee_id, department_id, period_type, role, q, ...pg } = req.valid.query;
  const qb = scopeEvaluations(evaluationsQuery(), req.user);
  if (evaluatee_id) qb.where('ev.evaluatee_id', evaluatee_id);
  if (department_id && isAdmin(req.user)) qb.where('e.department_id', department_id);
  if (period_type) qb.where('ev.period_type', period_type);
  if (role && isAdmin(req.user)) qb.where('e.role', role);
  if (q) qb.whereLike('e.full_name', `%${q}%`);
  qb.orderBy('ev.period_start', 'desc').orderBy('ev.id', 'desc');
  res.json(await paginate(qb, pg, toEvaluation));
});

// ── إنشاء ──────────────────────────────────────────────────
router.post('/', authorize('admin', 'manager'), validate({ body: createBody }), async (req, res) => {
  const input = req.valid.body;
  const evaluatee = await findUser(input.evaluatee_id);
  if (!canEvaluate(req.user, evaluatee)) {
    throw ApiError.unprocessable('البيانات المدخلة غير صحيحة', { evaluatee_id: 'لا يمكنك تقييم هذا المستخدم' });
  }
  const period = normalizePeriod(input.period_type, input.period_date);
  const exists = await db('evaluations')
    .where({ evaluatee_id: evaluatee.id, evaluator_id: req.user.id, period_type: input.period_type, period_start: period.start })
    .first();
  if (exists) throw ApiError.conflict('قمت بتقييم هذا الشخص في نفس الفترة مسبقاً، يمكنك تعديل التقييم الموجود');

  const { overall, rows } = await computeScores(input.scores);

  const evaluationId = await db.transaction(async (trx) => {
    const [newId] = await trx('evaluations').insert({
      evaluatee_id: evaluatee.id,
      evaluator_id: req.user.id,
      period_type: input.period_type,
      period_start: period.start,
      period_end: period.end,
      overall_score: overall,
      notes: input.notes ?? null,
    });
    await trx('evaluation_scores').insert(rows.map((r) => ({ ...r, evaluation_id: newId })));
    await notify(trx, evaluatee.id, {
      type: 'evaluation.created',
      title: 'لديك تقييم أداء جديد',
      body: `الدرجة: ${overall} من 5 — بواسطة ${req.user.full_name}`,
      link: `/evaluations/${newId}`,
    });
    await logActivity(trx, {
      actor: req.user,
      action: 'evaluation.created',
      entityType: 'evaluation',
      entityId: newId,
      departmentId: evaluatee.department_id,
      meta: { name: evaluatee.full_name, score: overall },
    });
    return newId;
  });

  res.status(201).json({ data: await evaluationDetail(req.user, evaluationId) });
});

// ── التفاصيل ───────────────────────────────────────────────
router.get('/:id', validate({ params: idParam }), async (req, res) => {
  const { evaluation } = await loadVisibleEvaluation(req.user, req.valid.params.id);
  res.json({ data: await evaluationDetail(req.user, evaluation.id) });
});

// ── التعديل (المقيِّم أو المشرف) ────────────────────────────
router.put(
  '/:id',
  authorize('admin', 'manager'),
  validate({ params: idParam, body: z.object({ notes: optText(3000), scores: scoresSchema }) }),
  async (req, res) => {
    const { evaluation, evaluatee } = await loadVisibleEvaluation(req.user, req.valid.params.id);
    if (!canEditEvaluation(req.user, evaluation)) throw ApiError.forbidden('يمكن تعديل التقييم من قِبل المقيِّم أو المشرف فقط');
    const { overall, rows } = await computeScores(req.valid.body.scores);

    await db.transaction(async (trx) => {
      await trx('evaluations').where({ id: evaluation.id }).update({ overall_score: overall, notes: req.valid.body.notes ?? null });
      await trx('evaluation_scores').where({ evaluation_id: evaluation.id }).del();
      await trx('evaluation_scores').insert(rows.map((r) => ({ ...r, evaluation_id: evaluation.id })));
      await logActivity(trx, {
        actor: req.user,
        action: 'evaluation.updated',
        entityType: 'evaluation',
        entityId: evaluation.id,
        departmentId: evaluatee.department_id,
        meta: { name: evaluatee.full_name, score: overall },
      });
    });
    res.json({ data: await evaluationDetail(req.user, evaluation.id) });
  },
);

router.delete('/:id', authorize('admin', 'manager'), validate({ params: idParam }), async (req, res) => {
  const { evaluation, evaluatee } = await loadVisibleEvaluation(req.user, req.valid.params.id);
  if (!canEditEvaluation(req.user, evaluation)) throw ApiError.forbidden();
  await db('evaluations').where({ id: evaluation.id }).del();
  await logActivity(null, {
    actor: req.user,
    action: 'evaluation.deleted',
    entityType: 'evaluation',
    entityId: evaluation.id,
    departmentId: evaluatee.department_id,
    meta: { name: evaluatee.full_name },
  });
  res.status(204).end();
});

export default router;

// ── معايير التقييم ─────────────────────────────────────────
export const criteriaRouter = Router();

const criterionBody = z.object({
  name: z.string().trim().min(2).max(100),
  description: optText(255),
  weight: z.coerce.number().min(0.1).max(10).default(1),
  is_active: z.boolean().default(true),
});

const toCriterion = (c) => ({ ...c, weight: toNumber(c.weight), is_active: !!c.is_active });

criteriaRouter.get('/', async (req, res) => {
  const qb = db('evaluation_criteria').orderBy('id');
  if (!isAdmin(req.user)) qb.where({ is_active: true });
  res.json({ data: (await qb).map(toCriterion) });
});

criteriaRouter.post('/', authorize('admin'), validate({ body: criterionBody }), async (req, res) => {
  const [newId] = await db('evaluation_criteria').insert(req.valid.body);
  res.status(201).json({ data: toCriterion(await db('evaluation_criteria').where({ id: newId }).first()) });
});

criteriaRouter.put('/:id', authorize('admin'), validate({ params: idParam, body: criterionBody }), async (req, res) => {
  const updated = await db('evaluation_criteria').where({ id: req.valid.params.id }).update(req.valid.body);
  if (!updated) throw ApiError.notFound('المعيار غير موجود');
  res.json({ data: toCriterion(await db('evaluation_criteria').where({ id: req.valid.params.id }).first()) });
});

criteriaRouter.delete('/:id', authorize('admin'), validate({ params: idParam }), async (req, res) => {
  const used = await db('evaluation_scores').where({ criterion_id: req.valid.params.id }).first();
  // المعيار المستخدم في تقييمات سابقة يُعطَّل فقط للحفاظ على السجل
  if (used) await db('evaluation_criteria').where({ id: req.valid.params.id }).update({ is_active: false });
  else await db('evaluation_criteria').where({ id: req.valid.params.id }).del();
  res.status(204).end();
});
