<script setup>
import { computed, onMounted, ref } from 'vue';
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  ClipboardList,
  Clock,
  Download,
  Hourglass,
  Plus,
  Star,
  Users,
} from 'lucide-vue-next';
import { dashboardApi } from '@/api';
import { errorMessage } from '@/api/http';
import PageHeader from '@/components/common/PageHeader.vue';
import StatCard from '@/components/common/StatCard.vue';
import LoadingState from '@/components/common/LoadingState.vue';
import EmptyState from '@/components/common/EmptyState.vue';
import ActivityFeed from '@/components/common/ActivityFeed.vue';
import UserCell from '@/components/common/UserCell.vue';
import { PriorityBadge, ScoreBadge } from '@/components/common/Badges';
import LineChart from '@/components/charts/LineChart.vue';
import BarChart from '@/components/charts/BarChart.vue';
import StatusBreakdown from '@/components/charts/StatusBreakdown.vue';
import { useReportDownload } from '@/composables/useDownload';
import { formatMonthShort, formatPercent, formatRelative, formatScore } from '@/utils/format';

const data = ref(null);
const error = ref('');
const view = ref('chart');
const { busy, download } = useReportDownload();

const k = computed(() => data.value?.kpis ?? {});
const employees = computed(() => data.value?.employees ?? []);
const firstName = (n) => n.split(' ')[0];

onMounted(async () => {
  try {
    data.value = (await dashboardApi.manager()).data;
  } catch (e) {
    error.value = errorMessage(e);
  }
});
</script>

<template>
  <div>
    <LoadingState v-if="!data && !error" variant="dashboard" />
    <div v-else-if="error" class="card"><EmptyState :icon="AlertTriangle" title="تعذّر تحميل اللوحة" :message="error" /></div>

    <div v-else-if="!data.department" class="card">
      <EmptyState :icon="Building2" title="لست معيّناً على قسم حالياً" message="تواصل مع المشرف لتعيينك مديراً لأحد الأقسام." />
    </div>

    <template v-else>
      <PageHeader :title="`لوحة قسم ${data.department.name}`" subtitle="تقييمات موظفي القسم ونشاطه وتحليلاته">
        <button class="btn" :disabled="busy === 'tasks'" @click="download('tasks')"><Download /> تقرير المهام</button>
        <RouterLink to="/tasks/new" class="btn btn-primary"><Plus /> مهمة جديدة</RouterLink>
      </PageHeader>

      <div class="stack" style="gap: 20px">
        <div class="grid-kpi">
          <StatCard label="موظفو القسم" :value="k.employees" :icon="Users" to="/users" />
          <StatCard label="مهام مفتوحة" :value="k.tasks_open" :icon="ClipboardList" tone="warning" :to="{ path: '/tasks', query: { status: 'open' } }">
            <span :class="{ 'overdue-hint': k.tasks_overdue }">{{ k.tasks_overdue }} متأخرة</span>
          </StatCard>
          <StatCard label="بانتظار مراجعتي" :value="k.tasks_submitted" :icon="Hourglass" tone="violet" :to="{ path: '/tasks', query: { status: 'submitted' } }" />
          <StatCard label="نسبة الإنجاز" :value="formatPercent(k.tasks_completion_rate)" :icon="CheckCircle2" tone="success" :hint="`${k.tasks_completed_this_month} مكتملة هذا الشهر`" />
          <StatCard label="الالتزام بالمواعيد" :value="formatPercent(k.tasks_on_time_rate)" :icon="Clock" tone="primary" hint="من المهام المكتملة" />
          <StatCard label="متوسط تقييم القسم" :value="formatScore(k.average_score)" :icon="Star" tone="warning" :hint="k.my_latest_score != null ? `آخر تقييم لي: ${formatScore(k.my_latest_score)}` : 'من 5'" />
        </div>

        <div class="grid-3">
          <section class="card span-2">
            <div class="card-header">
              <div>
                <h2>نشاط القسم</h2>
                <p class="card-sub">المهام المُسندة مقابل المكتملة — آخر 6 أشهر</p>
              </div>
            </div>
            <LineChart
              :labels="data.monthly_tasks.map((m) => formatMonthShort(m.month))"
              :series="[
                { label: 'المُسندة', data: data.monthly_tasks.map((m) => m.created) },
                { label: 'المكتملة', data: data.monthly_tasks.map((m) => m.completed) },
              ]"
              aria-label="نشاط القسم الشهري"
            />
          </section>
          <section class="card">
            <div class="card-header"><h2>المهام حسب الحالة</h2></div>
            <StatusBreakdown :distribution="data.status_distribution" />
          </section>
        </div>

        <!-- أداء الموظفين -->
        <section class="card" :class="{ 'card-flush': view === 'table' }">
          <div class="card-header">
            <div>
              <h2>أداء الموظفين</h2>
              <p class="card-sub">نسبة الإنجاز ومتوسط التقييم لكل موظف</p>
            </div>
            <div class="tabs" role="tablist">
              <button class="tab" :class="{ active: view === 'chart' }" role="tab" :aria-selected="view === 'chart'" @click="view = 'chart'">رسم</button>
              <button class="tab" :class="{ active: view === 'table' }" role="tab" :aria-selected="view === 'table'" @click="view = 'table'">جدول</button>
            </div>
          </div>

          <EmptyState v-if="!employees.length" title="لا يوجد موظفون في القسم بعد" />
          <div v-else-if="view === 'chart'" class="grid-2">
            <div>
              <h3 class="chart-title">نسبة الإنجاز</h3>
              <BarChart :labels="employees.map((e) => firstName(e.full_name))" :series="[{ label: 'نسبة الإنجاز', data: employees.map((e) => e.completion_rate) }]" horizontal suffix="%" :max="100" :height="Math.max(200, employees.length * 44)" aria-label="نسبة الإنجاز لكل موظف" />
            </div>
            <div>
              <h3 class="chart-title">متوسط التقييم (من 5)</h3>
              <BarChart :labels="employees.map((e) => firstName(e.full_name))" :series="[{ label: 'متوسط التقييم', data: employees.map((e) => e.average_score) }]" horizontal :max="5" :step-size="1" :height="Math.max(200, employees.length * 44)" aria-label="متوسط التقييم لكل موظف" />
            </div>
          </div>
          <div v-else class="table-wrap">
            <table class="table">
              <thead>
                <tr><th>الموظف</th><th>مُسندة</th><th>مكتملة</th><th>مفتوحة</th><th>متأخرة</th><th>الإنجاز</th><th>في الموعد</th><th>التقييم</th><th /></tr>
              </thead>
              <tbody>
                <tr v-for="e in employees" :key="e.id">
                  <td><UserCell :name="e.full_name" :sub="e.job_title" :avatar="e.avatar_url" :to="`/users/${e.id}`" /></td>
                  <td class="num">{{ e.assigned }}</td>
                  <td class="num">{{ e.completed }}</td>
                  <td class="num">{{ e.open }}</td>
                  <td class="num" :class="{ 'overdue-hint': e.overdue }">{{ e.overdue }}</td>
                  <td class="num">{{ formatPercent(e.completion_rate) }}</td>
                  <td class="num">{{ formatPercent(e.on_time_rate) }}</td>
                  <td><ScoreBadge :score="e.average_score" /></td>
                  <td class="actions">
                    <RouterLink :to="{ path: '/evaluations/new', query: { evaluatee_id: e.id } }" class="btn btn-sm btn-soft">تقييم</RouterLink>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <div class="grid-2">
          <section class="card">
            <div class="card-header">
              <h2>بانتظار مراجعتي</h2>
              <RouterLink :to="{ path: '/tasks', query: { status: 'submitted' } }" class="btn btn-sm btn-ghost">عرض الكل</RouterLink>
            </div>
            <ul v-if="data.pending_review.length" class="list">
              <li v-for="t in data.pending_review" :key="t.id" class="row-between">
                <div class="stack-sm" style="gap: 2px; min-width: 0">
                  <RouterLink :to="`/tasks/${t.id}`" class="truncate" style="font-weight: 600">{{ t.title }}</RouterLink>
                  <span class="muted small">{{ t.assignee_name }} · سُلّمت {{ formatRelative(t.submitted_at) }}</span>
                </div>
                <PriorityBadge :priority="t.priority" />
              </li>
            </ul>
            <EmptyState v-else :icon="CheckCircle2" title="لا توجد مهام بانتظار المراجعة" />
          </section>

          <section class="card">
            <div class="card-header">
              <div>
                <h2>متوسط تقييم القسم</h2>
                <p class="card-sub">حسب فترة التقييم — من 5</p>
              </div>
            </div>
            <LineChart
              :labels="data.score_trend.map((s) => formatMonthShort(s.month))"
              :series="[{ label: 'متوسط التقييم', data: data.score_trend.map((s) => s.average) }]"
              :max="5"
              :step-size="1"
              :height="260"
              aria-label="اتجاه متوسط تقييم القسم"
            />
          </section>
        </div>

        <section class="card">
          <div class="card-header">
            <h2>آخر نشاطات القسم</h2>
            <RouterLink to="/activity" class="btn btn-sm btn-ghost">عرض السجل الكامل</RouterLink>
          </div>
          <ActivityFeed :items="data.recent_activity" />
        </section>
      </div>
    </template>
  </div>
</template>

<style scoped>
.chart-title { font-size: 0.88rem; color: var(--text-2); font-weight: 600; margin-block-end: 8px; }
.overdue-hint { color: var(--danger); font-weight: 600; }
</style>
