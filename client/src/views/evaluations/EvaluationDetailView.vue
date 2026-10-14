<script setup>
import { onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { AlertTriangle, Pencil, Trash2 } from 'lucide-vue-next';
import { evaluationsApi } from '@/api';
import { errorMessage } from '@/api/http';
import PageHeader from '@/components/common/PageHeader.vue';
import LoadingState from '@/components/common/LoadingState.vue';
import EmptyState from '@/components/common/EmptyState.vue';
import UserCell from '@/components/common/UserCell.vue';
import { RoleBadge, ScoreBadge } from '@/components/common/Badges';
import { useAuthStore } from '@/stores/auth';
import { useUiStore } from '@/stores/ui';
import { PERIOD_TYPES, RATING_LABELS } from '@/utils/constants';
import { formatDate, formatDateTime, formatScore } from '@/utils/format';

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();
const ui = useUiStore();

const ev = ref(null);
const error = ref('');

onMounted(async () => {
  try {
    ev.value = (await evaluationsApi.get(route.params.id)).data;
  } catch (e) {
    error.value = e.response?.status === 404 ? 'التقييم غير موجود أو ليس لديك صلاحية الوصول إليه' : errorMessage(e);
  }
});

async function remove() {
  if (!(await ui.confirm({ title: 'حذف التقييم', message: 'سيتم حذف التقييم نهائياً.', confirmText: 'حذف', danger: true }))) return;
  try {
    await evaluationsApi.remove(ev.value.id);
    ui.success('تم حذف التقييم');
    router.replace('/evaluations');
  } catch (e) {
    ui.error(errorMessage(e));
  }
}
</script>

<template>
  <div>
    <LoadingState v-if="!ev && !error" :rows="5" />
    <div v-else-if="error" class="card">
      <EmptyState :icon="AlertTriangle" title="تعذّر عرض التقييم" :message="error">
        <RouterLink to="/evaluations" class="btn">العودة للتقييمات</RouterLink>
      </EmptyState>
    </div>

    <template v-else>
      <PageHeader :title="`تقييم ${ev.evaluatee.full_name}`" :subtitle="`${PERIOD_TYPES[ev.period_type]} · ${formatDate(ev.period_start)} – ${formatDate(ev.period_end)}`" back="/evaluations">
        <RouterLink v-if="ev.permissions.can_edit" :to="`/evaluations/${ev.id}/edit`" class="btn"><Pencil /> تعديل</RouterLink>
        <button v-if="ev.permissions.can_delete" class="btn btn-ghost" style="color: var(--danger)" @click="remove"><Trash2 /> حذف</button>
      </PageHeader>

      <div class="grid-3">
        <section class="card summary">
          <UserCell :name="ev.evaluatee.full_name" :sub="ev.department?.name" :avatar="ev.evaluatee.avatar_url" :size="48" :to="auth.canManage && ev.evaluatee.id !== auth.user.id ? `/users/${ev.evaluatee.id}` : null" />
          <RoleBadge :role="ev.evaluatee.role" style="width: fit-content" />
          <div class="big-score">
            <span class="num">{{ formatScore(ev.overall_score) }}</span>
            <span class="muted">من 5</span>
          </div>
          <ScoreBadge :score="ev.overall_score" />
          <hr class="divider" />
          <dl class="dl small">
            <dt>المُقيِّم</dt>
            <dd>{{ ev.evaluator.full_name }}</dd>
            <dt>تاريخ التقييم</dt>
            <dd>{{ formatDateTime(ev.created_at) }}</dd>
          </dl>
        </section>

        <section class="card span-2">
          <div class="card-header"><h2>تفاصيل المعايير</h2></div>
          <ul class="list">
            <li v-for="s in ev.scores" :key="s.criterion_id" class="criterion">
              <div class="row-between">
                <strong>{{ s.name }}</strong>
                <span class="small"><strong class="num">{{ s.score }}</strong>/5 · <span class="muted">{{ RATING_LABELS[s.score] }}</span></span>
              </div>
              <div class="progress" :aria-label="`${s.score} من 5`"><span :style="{ width: `${(s.score / 5) * 100}%` }" /></div>
            </li>
          </ul>
          <div v-if="ev.notes" class="notes">
            <h3>الملاحظات</h3>
            <p>{{ ev.notes }}</p>
          </div>
        </section>
      </div>
    </template>
  </div>
</template>

<style scoped>
.summary { display: flex; flex-direction: column; gap: 12px; }
.big-score { display: flex; align-items: baseline; gap: 8px; }
.big-score .num { font-size: 2.6rem; font-weight: 700; line-height: 1; }
.criterion { display: flex; flex-direction: column; gap: 8px; }
.notes { margin-top: 16px; padding: 16px; background: var(--surface-2); border-radius: var(--radius); }
.notes h3 { font-size: 0.9rem; margin-bottom: 6px; }
.notes p { white-space: pre-wrap; color: var(--text-2); }
</style>
