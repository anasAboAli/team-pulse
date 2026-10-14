<script setup>
import { computed, onMounted, ref } from 'vue';
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  ClipboardList,
  Download,
  Hourglass,
  Star,
  UserCog,
  Users,
} from 'lucide-vue-next';
import { dashboardApi } from '@/api';
import { errorMessage } from '@/api/http';
import PageHeader from '@/components/common/PageHeader.vue';
import StatCard from '@/components/common/StatCard.vue';
import LoadingState from '@/components/common/LoadingState.vue';
import EmptyState from '@/components/common/EmptyState.vue';
import ActivityFeed from '@/components/common/ActivityFeed.vue';
import RankList from '@/components/common/RankList.vue';
import UserCell from '@/components/common/UserCell.vue';
import { ScoreBadge } from '@/components/common/Badges';
import LineChart from '@/components/charts/LineChart.vue';
import BarChart from '@/components/charts/BarChart.vue';
import StatusBreakdown from '@/components/charts/StatusBreakdown.vue';
import { useReportDownload } from '@/composables/useDownload';
import { formatDate, formatMonthShort, formatPercent, formatScore } from '@/utils/format';

const data = ref(null);
const error = ref('');
const view = ref('chart'); // chart | table لمقارنة الأقسام
const { busy, download } = useReportDownload();

const k = computed(() => data.value?.kpis ?? {});
const monthLabels = computed(() => data.value?.monthly_tasks.map((m) => formatMonthShort(m.month)) ?? []);
const deptLabels = computed(() => data.value?.departments.map((d) => d.name) ?? []);

onMounted(async () => {
  try {
    data.value = (await dashboardApi.admin()).data;
  } catch (e) {
    error.value = errorMessage(e);
  }
});
</script>

<template>
  <div>
    <PageHeader title="لوحة الشركة" subtitle="نظرة عامة على إنجازات الشركة وأداء الأقسام والتقييمات">
      <button class="btn" :disabled="busy === 'tasks'" @click="download('tasks')"><Download /> تقرير المهام</button>
      <button class="btn" :disabled="busy === 'evaluations'" @click="download('evaluations')"><Download /> تقرير التقييمات</button>
    </PageHeader>

    <LoadingState v-if="!data && !error" variant="dashboard" />
    <div v-else-if="error" class="card"><EmptyState :icon="AlertTriangle" title="تعذّر تحميل اللوحة" :message="error" /></div>

    <div v-else class="stack" style="gap: 20px">
      <!-- المؤشرات -->
      <div class="grid-kpi">
        <StatCard label="الأقسام" :value="k.departments" :icon="Building2" to="/departments" />
        <StatCard label="المدراء" :value="k.managers" :icon="UserCog" tone="violet" :to="{ path: '/users', query: { role: 'manager' } }" />
        <StatCard label="الموظفون النشطون" :value="k.employees_active" :icon="Users" tone="success" :hint="`من أصل ${k.employees} موظف`" :to="{ path: '/users', query: { role: 'employee' } }" />
        <StatCard label="المهام المفتوحة" :value="k.tasks_open" :icon="ClipboardList" tone="warning" :to="{ path: '/tasks', query: { status: 'open' } }">
          <span :class="{ 'overdue-hint': k.tasks_overdue }">{{ k.tasks_overdue }} متأخرة</span>
        </StatCard>
        <StatCard label="بانتظار المراجعة" :value="k.tasks_submitted" :icon="Hourglass" tone="violet" :to="{ path: '/tasks', query: { status: 'submitted' } }" hint="مهام سلّمها الموظفون" />
        <StatCard label="نسبة الإنجاز" :value="formatPercent(k.tasks_completion_rate)" :icon="CheckCircle2" tone="success" :hint="`${formatPercent(k.tasks_on_time_rate)} منها في الموعد`" />
        <StatCard label="متوسط تقييم الموظفين" :value="formatScore(k.average_score_employees)" :icon="Star" tone="warning" hint="من 5" />
        <StatCard label="متوسط تقييم المدراء" :value="formatScore(k.average_score_managers)" :icon="Star" tone="violet" hint="من 5" />
      </div>

      <!-- الإنجاز الشهري + الحالات -->
      <div class="grid-3">
        <section class="card span-2">
          <div class="card-header">
            <div>
              <h2>المهام شهرياً</h2>
              <p class="card-sub">المهام المُسندة مقابل المكتملة — آخر 12 شهراً</p>
            </div>
          </div>
          <LineChart
            :labels="monthLabels"
            :series="[
              { label: 'المُسندة', data: data.monthly_tasks.map((m) => m.created) },
              { label: 'المكتملة', data: data.monthly_tasks.map((m) => m.completed) },
            ]"
            aria-label="رسم خطي للمهام المسندة والمكتملة شهرياً"
          />
        </section>
        <section class="card">
          <div class="card-header"><h2>المهام حسب الحالة</h2></div>
          <StatusBreakdown :distribution="data.status_distribution" />
        </section>
      </div>

      <!-- مقارنة الأقسام -->
      <section class="card">
        <div class="card-header">
          <div>
            <h2>مقارنة الأقسام</h2>
            <p class="card-sub">نسبة إنجاز المهام ومتوسط تقييم الموظفين لكل قسم</p>
          </div>
          <div class="tabs" role="tablist">
            <button class="tab" :class="{ active: view === 'chart' }" role="tab" :aria-selected="view === 'chart'" @click="view = 'chart'">رسم</button>
            <button class="tab" :class="{ active: view === 'table' }" role="tab" :aria-selected="view === 'table'" @click="view = 'table'">جدول</button>
          </div>
        </div>
        <div v-if="view === 'chart'" class="grid-2">
          <div>
            <h3 class="chart-title">نسبة الإنجاز</h3>
            <BarChart :labels="deptLabels" :series="[{ label: 'نسبة الإنجاز', data: data.departments.map((d) => d.completion_rate) }]" horizontal suffix="%" :max="100" :height="Math.max(200, deptLabels.length * 52)" aria-label="نسبة الإنجاز لكل قسم" />
          </div>
          <div>
            <h3 class="chart-title">متوسط التقييم (من 5)</h3>
            <BarChart :labels="deptLabels" :series="[{ label: 'متوسط التقييم', data: data.departments.map((d) => d.average_score) }]" horizontal :max="5" :step-size="1" :height="Math.max(200, deptLabels.length * 52)" aria-label="متوسط التقييم لكل قسم" />
          </div>
        </div>
        <div v-else class="table-wrap">
          <table class="table">
            <thead>
              <tr><th>القسم</th><th>المدير</th><th>الموظفون</th><th>مهام مفتوحة</th><th>نسبة الإنجاز</th><th>في الموعد</th><th>متوسط التقييم</th></tr>
            </thead>
            <tbody>
              <tr v-for="d in data.departments" :key="d.id">
                <td><RouterLink :to="`/departments/${d.id}`">{{ d.name }}</RouterLink></td>
                <td>{{ d.manager_name || '—' }}</td>
                <td class="num">{{ d.employees }}</td>
                <td class="num">{{ d.tasks_open }}</td>
                <td class="num">{{ formatPercent(d.completion_rate) }}</td>
                <td class="num">{{ formatPercent(d.on_time_rate) }}</td>
                <td><ScoreBadge :score="d.average_score" /></td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <!-- أفضل الموظفين / بحاجة لمتابعة -->
      <div class="grid-2">
        <section class="card">
          <div class="card-header"><h2>الأعلى تقييماً</h2></div>
          <RankList :items="data.top_employees" />
        </section>
        <section class="card">
          <div class="card-header"><h2>بحاجة إلى متابعة</h2></div>
          <RankList :items="data.bottom_employees" />
        </section>
      </div>

      <!-- تقييمات المدراء + اتجاه التقييم -->
      <div class="grid-2">
        <section class="card card-flush">
          <div class="card-header">
            <h2>تقييمات المدراء</h2>
            <RouterLink :to="{ path: '/evaluations/new', query: { role: 'manager' } }" class="btn btn-sm btn-soft">تقييم مدير</RouterLink>
          </div>
          <div class="table-wrap">
            <table class="table">
              <thead><tr><th>المدير</th><th>متوسط التقييم</th><th>آخر فترة</th></tr></thead>
              <tbody>
                <tr v-for="m in data.managers" :key="m.id">
                  <td><UserCell :name="m.full_name" :sub="m.department?.name || 'غير معيّن على قسم'" :avatar="m.avatar_url" :to="`/users/${m.id}`" /></td>
                  <td><ScoreBadge :score="m.average_score" /></td>
                  <td class="muted small">{{ m.last_period ? formatDate(m.last_period) : '—' }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
        <section class="card">
          <div class="card-header">
            <div>
              <h2>متوسط تقييم الموظفين</h2>
              <p class="card-sub">حسب فترة التقييم — من 5</p>
            </div>
          </div>
          <LineChart
            :labels="data.score_trend.map((s) => formatMonthShort(s.month))"
            :series="[{ label: 'متوسط التقييم', data: data.score_trend.map((s) => s.average) }]"
            :max="5"
            :step-size="1"
            :height="260"
            aria-label="اتجاه متوسط التقييم"
          />
        </section>
      </div>

      <section class="card">
        <div class="card-header">
          <h2>آخر النشاطات</h2>
          <RouterLink to="/activity" class="btn btn-sm btn-ghost">عرض السجل الكامل</RouterLink>
        </div>
        <ActivityFeed :items="data.recent_activity" />
      </section>
    </div>
  </div>
</template>

<style scoped>
.chart-title { font-size: 0.88rem; color: var(--text-2); font-weight: 600; margin-block-end: 8px; }
.overdue-hint { color: var(--danger); font-weight: 600; }
</style>
