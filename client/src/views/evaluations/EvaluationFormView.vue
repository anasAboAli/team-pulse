<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { Save } from 'lucide-vue-next';
import { criteriaApi, evaluationsApi, usersApi } from '@/api';
import { errorMessage, fieldErrors } from '@/api/http';
import PageHeader from '@/components/common/PageHeader.vue';
import LoadingState from '@/components/common/LoadingState.vue';
import RatingInput from '@/components/common/RatingInput.vue';
import UserCell from '@/components/common/UserCell.vue';
import { ScoreBadge } from '@/components/common/Badges';
import { useAuthStore } from '@/stores/auth';
import { useUiStore } from '@/stores/ui';
import { PERIOD_TYPES } from '@/utils/constants';
import { formatMonth, formatScore } from '@/utils/format';

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();
const ui = useUiStore();

const isEdit = computed(() => !!route.params.id);
const now = new Date();
// الافتراضي: تقييم الشهر الماضي
const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

const form = reactive({
  evaluatee_id: route.query.evaluatee_id ? Number(route.query.evaluatee_id) : '',
  period_type: 'monthly',
  period_month: `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, '0')}`,
  notes: '',
});
const scores = reactive({});
const criteria = ref([]);
const people = ref([]);
const existing = ref(null);
const errors = ref({});
const loading = ref(true);
const saving = ref(false);

const overall = computed(() => {
  let sum = 0;
  let weights = 0;
  for (const c of criteria.value) {
    if (!scores[c.id]) return null;
    sum += scores[c.id] * c.weight;
    weights += c.weight;
  }
  return weights ? Number((sum / weights).toFixed(2)) : null;
});

const periodHint = computed(() => {
  if (!form.period_month) return '';
  const [y, m] = form.period_month.split('-').map(Number);
  if (form.period_type === 'monthly') return `فترة التقييم: ${formatMonth(form.period_month)}`;
  if (form.period_type === 'quarterly') return `فترة التقييم: الربع ${Math.floor((m - 1) / 3) + 1} من عام ${y}`;
  return `فترة التقييم: عام ${y}`;
});

const groups = computed(() => {
  const managers = people.value.filter((p) => p.role === 'manager');
  const employees = people.value.filter((p) => p.role === 'employee');
  return [
    ['المدراء', managers],
    ['الموظفون', employees],
  ].filter(([, list]) => list.length);
});

onMounted(async () => {
  try {
    criteria.value = (await criteriaApi.list()).data.filter((c) => c.is_active);
    if (isEdit.value) {
      const { data } = await evaluationsApi.get(route.params.id);
      if (!data.permissions.can_edit) {
        ui.error('لا يمكنك تعديل هذا التقييم');
        return router.replace(`/evaluations/${data.id}`);
      }
      existing.value = data;
      form.notes = data.notes || '';
      for (const s of data.scores) scores[s.criterion_id] = s.score;
      // إضافة معايير قديمة غير مفعّلة إن وُجدت في التقييم
      for (const s of data.scores) {
        if (!criteria.value.some((c) => c.id === s.criterion_id)) criteria.value.push({ id: s.criterion_id, name: s.name, weight: s.weight });
      }
    } else {
      const list = (await usersApi.options()).data;
      people.value = list.filter((p) => p.role !== 'admin' && p.id !== auth.user.id);
      if (route.query.role === 'manager') people.value = people.value.filter((p) => p.role === 'manager');
    }
  } catch (e) {
    ui.error(errorMessage(e));
  } finally {
    loading.value = false;
  }
});

async function submit() {
  errors.value = {};
  const missing = criteria.value.filter((c) => !scores[c.id]);
  if (missing.length) {
    errors.value = { scores: `يرجى تقييم: ${missing.map((c) => c.name).join('، ')}` };
    return;
  }
  saving.value = true;
  const scoreList = criteria.value.map((c) => ({ criterion_id: c.id, score: scores[c.id] }));
  try {
    const { data } = isEdit.value
      ? await evaluationsApi.update(route.params.id, { notes: form.notes, scores: scoreList })
      : await evaluationsApi.create({
          evaluatee_id: Number(form.evaluatee_id) || undefined,
          period_type: form.period_type,
          period_date: `${form.period_month}-01`,
          notes: form.notes,
          scores: scoreList,
        });
    ui.success(isEdit.value ? 'تم تحديث التقييم' : 'تم حفظ التقييم وإشعار الموظف');
    router.push(`/evaluations/${data.id}`);
  } catch (e) {
    errors.value = fieldErrors(e);
    ui.error(errorMessage(e));
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <div>
    <PageHeader
      :title="isEdit ? 'تعديل التقييم' : 'تقييم أداء جديد'"
      :subtitle="auth.isManager ? 'يمكنك تقييم موظفي قسمك فقط' : 'يمكنك تقييم الموظفين والمدراء'"
      :back="isEdit ? `/evaluations/${route.params.id}` : '/evaluations'"
    />

    <div class="card" style="max-width: 820px">
      <LoadingState v-if="loading" :rows="6" />
      <form v-else class="stack" style="gap: 24px" novalidate @submit.prevent="submit">
        <!-- المُقيَّم والفترة -->
        <div v-if="!isEdit" class="form-grid">
          <div class="field full">
            <label for="evaluatee" class="req">الشخص المُقيَّم</label>
            <select id="evaluatee" v-model="form.evaluatee_id" class="select" :class="{ invalid: errors.evaluatee_id }">
              <option value="" disabled>اختر…</option>
              <optgroup v-for="[label, list] in groups" :key="label" :label="label">
                <option v-for="p in list" :key="p.id" :value="p.id">{{ p.full_name }}{{ p.department_name ? ` — ${p.department_name}` : '' }}</option>
              </optgroup>
            </select>
            <span v-if="errors.evaluatee_id" class="error">{{ errors.evaluatee_id }}</span>
          </div>
          <div class="field">
            <label for="ptype">نوع الفترة</label>
            <select id="ptype" v-model="form.period_type" class="select">
              <option v-for="(label, key) in PERIOD_TYPES" :key="key" :value="key">{{ label }}</option>
            </select>
          </div>
          <div class="field">
            <label for="pmonth" class="req">الشهر المرجعي</label>
            <input id="pmonth" v-model="form.period_month" type="month" class="input" :class="{ invalid: errors.period_date }" />
            <span v-if="errors.period_date" class="error">{{ errors.period_date }}</span>
            <span v-else class="hint">{{ periodHint }}</span>
          </div>
        </div>
        <div v-else class="row-between existing">
          <UserCell :name="existing.evaluatee.full_name" :sub="existing.department?.name" :avatar="existing.evaluatee.avatar_url" />
          <span class="muted small">{{ PERIOD_TYPES[existing.period_type] }} · {{ formatMonth(existing.period_start) }}</span>
        </div>

        <!-- المعايير -->
        <div class="stack-sm">
          <div class="row-between">
            <h2>معايير التقييم</h2>
            <span class="row" style="gap: 8px">
              <span class="muted small">الدرجة الكلية (موزونة):</span>
              <ScoreBadge v-if="overall != null" :score="overall" />
              <span v-else class="muted">—</span>
            </span>
          </div>
          <ul class="list criteria">
            <li v-for="c in criteria" :key="c.id">
              <div class="c-meta">
                <strong>{{ c.name }}</strong>
                <span class="muted small">{{ c.description }}<template v-if="c.weight !== 1"> · الوزن {{ c.weight }}</template></span>
              </div>
              <RatingInput v-model="scores[c.id]" :label="c.name" />
            </li>
          </ul>
          <span v-if="errors.scores" class="error small">{{ errors.scores }}</span>
        </div>

        <div class="field">
          <label for="notes">ملاحظات وتوصيات</label>
          <textarea id="notes" v-model="form.notes" class="textarea" rows="4" maxlength="3000" placeholder="نقاط القوة، مجالات التحسين، الأهداف للفترة القادمة…" />
        </div>

        <div class="row" style="justify-content: flex-end">
          <RouterLink :to="isEdit ? `/evaluations/${route.params.id}` : '/evaluations'" class="btn">إلغاء</RouterLink>
          <button type="submit" class="btn btn-primary" :disabled="saving">
            <Save /> {{ saving ? 'جارٍ الحفظ…' : 'حفظ التقييم' }}
            <span v-if="overall != null" class="num">({{ formatScore(overall) }})</span>
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<style scoped>
.criteria > li { display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
.c-meta { display: flex; flex-direction: column; min-width: 200px; }
.existing { padding: 12px 16px; background: var(--surface-2); border-radius: var(--radius); }
</style>
