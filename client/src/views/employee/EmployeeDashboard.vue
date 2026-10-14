<script setup>
import { computed, onMounted, ref } from 'vue';
import { AlertTriangle, Bell, CheckCircle2, ClipboardList, Clock, Paperclip, Star } from 'lucide-vue-next';
import { dashboardApi } from '@/api';
import { errorMessage } from '@/api/http';
import PageHeader from '@/components/common/PageHeader.vue';
import StatCard from '@/components/common/StatCard.vue';
import LoadingState from '@/components/common/LoadingState.vue';
import EmptyState from '@/components/common/EmptyState.vue';
import { PriorityBadge, ScoreBadge, StatusBadge } from '@/components/common/Badges';
import LineChart from '@/components/charts/LineChart.vue';
import StatusBreakdown from '@/components/charts/StatusBreakdown.vue';
import { useAuthStore } from '@/stores/auth';
import { PERIOD_TYPES, RATING_LABELS } from '@/utils/constants';
import { formatDue, formatMonth, formatMonthShort, formatPercent, formatScore } from '@/utils/format';

const auth = useAuthStore();
const data = ref(null);
const error = ref('');
const k = computed(() => data.value?.kpis ?? {});
const greeting = computed(() => {
  const h = new Date().getHours();
  return h < 12 ? 'صباح الخير' : 'مساء الخير';
});

onMounted(async () => {
  try {
    data.value = (await dashboardApi.employee()).data;
  } catch (e) {
    error.value = errorMessage(e);
  }
});
</script>

<template>
  <div>
    <PageHeader
      :title="`${greeting}، ${auth.user?.full_name?.split(' ')[0] ?? ''}`"
      :subtitle="auth.user?.department ? `قسم ${auth.user.department.name}${auth.user.manager ? ` · مديرك: ${auth.user.manager.full_name}` : ''}` : 'لم يتم تعيينك على قسم بعد'"
    />

    <LoadingState v-if="!data && !error" variant="dashboard" />
    <div v-else-if="error" class="card"><EmptyState :icon="AlertTriangle" title="تعذّر تحميل اللوحة" :message="error" /></div>

    <div v-else class="stack" style="gap: 20px">
      <div class="grid-kpi">
        <StatCard label="مهام مفتوحة" :value="k.tasks_open" :icon="ClipboardList" tone="warning" :to="{ path: '/tasks', query: { status: 'open' } }">
          <span :class="{ 'overdue-hint': k.tasks_overdue }">{{ k.tasks_overdue }} متأخرة</span>
        </StatCard>
        <StatCard label="مهام مكتملة" :value="k.tasks_completed" :icon="CheckCircle2" tone="success" :hint="`${formatPercent(k.tasks_completion_rate)} نسبة الإنجاز`" />
        <StatCard label="الالتزام بالمواعيد" :value="formatPercent(k.tasks_on_time_rate)" :icon="Clock" hint="من المهام المكتملة" />
        <StatCard label="متوسط تقييمي" :value="formatScore(k.average_score)" :icon="Star" tone="violet" hint="من 5" to="/evaluations" />
        <StatCard label="إشعارات غير مقروءة" :value="k.unread_notifications" :icon="Bell" tone="danger" to="/notifications" />
      </div>

      <div class="grid-3">
        <section class="card span-2 card-flush">
          <div class="card-header">
            <h2>مهامي الحالية</h2>
            <RouterLink to="/tasks" class="btn btn-sm btn-ghost">كل المهام</RouterLink>
          </div>
          <div v-if="data.open_tasks.length" class="table-wrap" style="margin-top: 12px">
            <table class="table">
              <thead><tr><th>المهمة</th><th>الحالة</th><th>الأولوية</th><th>الموعد</th></tr></thead>
              <tbody>
                <tr v-for="t in data.open_tasks" :key="t.id" class="clickable" @click="$router.push(`/tasks/${t.id}`)">
                  <td>
                    <RouterLink :to="`/tasks/${t.id}`" style="font-weight: 600">{{ t.title }}</RouterLink>
                    <div class="muted small row" style="gap: 6px">
                      <span>من {{ t.assigned_by_name }}</span>
                      <span v-if="t.requires_attachment" class="row" style="gap: 2px"><Paperclip :size="13" /> يتطلب ملفاً</span>
                    </div>
                  </td>
                  <td><StatusBadge :status="t.status" /></td>
                  <td><PriorityBadge :priority="t.priority" /></td>
                  <td class="nowrap" :class="{ 'overdue-hint': t.is_overdue }">{{ formatDue(t.due_date) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <EmptyState v-else :icon="CheckCircle2" title="لا توجد مهام مفتوحة" message="أحسنت! لا يوجد ما ينتظرك الآن." />
        </section>

        <section class="card">
          <div class="card-header"><h2>مهامي حسب الحالة</h2></div>
          <StatusBreakdown :distribution="data.status_distribution" />
        </section>
      </div>

      <div class="grid-2">
        <section class="card">
          <div class="card-header">
            <div>
              <h2>آخر تقييم</h2>
              <p v-if="data.latest_evaluation" class="card-sub">
                {{ PERIOD_TYPES[data.latest_evaluation.period_type] }} · {{ formatMonth(data.latest_evaluation.period_start) }} · بواسطة {{ data.latest_evaluation.evaluator_name }}
              </p>
            </div>
            <ScoreBadge v-if="data.latest_evaluation" :score="data.latest_evaluation.overall_score" />
          </div>
          <template v-if="data.latest_evaluation">
            <ul class="list">
              <li v-for="s in data.latest_evaluation.scores" :key="s.name" class="row-between">
                <span>{{ s.name }}</span>
                <span class="row" style="gap: 8px">
                  <span class="muted small">{{ RATING_LABELS[s.score] }}</span>
                  <span class="meter" :aria-label="`${s.score} من 5`"><span v-for="n in 5" :key="n" :class="{ on: n <= s.score }" /></span>
                </span>
              </li>
            </ul>
            <p v-if="data.latest_evaluation.notes" class="note">{{ data.latest_evaluation.notes }}</p>
            <RouterLink :to="`/evaluations/${data.latest_evaluation.id}`" class="btn btn-sm btn-ghost" style="margin-top: 8px">عرض التفاصيل</RouterLink>
          </template>
          <EmptyState v-else :icon="Star" title="لا توجد تقييمات بعد" />
        </section>

        <section class="card">
          <div class="card-header">
            <div>
              <h2>تطوّر تقييماتي</h2>
              <p class="card-sub">من 5</p>
            </div>
          </div>
          <LineChart
            v-if="data.score_trend.length"
            :labels="data.score_trend.map((s) => formatMonthShort(s.period))"
            :series="[{ label: 'التقييم', data: data.score_trend.map((s) => s.average) }]"
            :max="5"
            :step-size="1"
            :height="260"
            aria-label="تطوّر تقييماتي"
          />
          <EmptyState v-else title="لا توجد بيانات كافية" />
        </section>
      </div>
    </div>
  </div>
</template>

<style scoped>
.overdue-hint { color: var(--danger); font-weight: 600; }
.meter { display: inline-flex; gap: 3px; }
.meter span { width: 14px; height: 8px; border-radius: 2px; background: var(--surface-3); }
.meter span.on { background: var(--primary); }
.note { margin-top: 12px; padding: 12px; background: var(--surface-2); border-radius: var(--radius); color: var(--text-2); font-size: 0.9rem; }
</style>
