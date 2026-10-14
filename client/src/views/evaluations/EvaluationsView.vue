<script setup>
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { AlertTriangle, Download, Plus, Search, Star } from 'lucide-vue-next';
import { departmentsApi, evaluationsApi } from '@/api';
import PageHeader from '@/components/common/PageHeader.vue';
import LoadingState from '@/components/common/LoadingState.vue';
import EmptyState from '@/components/common/EmptyState.vue';
import PaginationBar from '@/components/common/PaginationBar.vue';
import UserCell from '@/components/common/UserCell.vue';
import { RoleBadge, ScoreBadge } from '@/components/common/Badges';
import { useListQuery } from '@/composables/useListQuery';
import { useReportDownload } from '@/composables/useDownload';
import { useAuthStore } from '@/stores/auth';
import { PERIOD_TYPES } from '@/utils/constants';
import { formatDate, formatMonth } from '@/utils/format';

const auth = useAuthStore();
const router = useRouter();
const { busy, download } = useReportDownload();
const departments = ref([]);

const { filters, rows, meta, loading, error } = useListQuery(evaluationsApi.list, {
  q: '',
  role: '',
  period_type: '',
  department_id: '',
});

const title = computed(() => (auth.isEmployee ? 'تقييماتي' : 'التقييمات'));
const subtitle = computed(() =>
  auth.isEmployee
    ? 'تقييمات الأداء التي حصلت عليها من مديرك أو المشرف'
    : auth.isManager
      ? 'تقييمات موظفي قسمك، وتقييماتك من المشرف'
      : 'تقييمات أداء الموظفين والمدراء في الشركة',
);

function periodLabel(e) {
  if (e.period_type === 'monthly') return formatMonth(e.period_start);
  return `${PERIOD_TYPES[e.period_type]}: ${formatDate(e.period_start)} – ${formatDate(e.period_end)}`;
}

onMounted(async () => {
  if (auth.isAdmin) departments.value = (await departmentsApi.list()).data;
});
</script>

<template>
  <div>
    <PageHeader :title="title" :subtitle="subtitle">
      <button v-if="auth.canManage" class="btn" :disabled="busy === 'evaluations'" @click="download('evaluations')"><Download /> تصدير CSV</button>
      <RouterLink v-if="auth.canManage" to="/evaluations/new" class="btn btn-primary"><Plus /> تقييم جديد</RouterLink>
    </PageHeader>

    <div v-if="auth.isAdmin" class="tabs" style="margin-bottom: 16px" role="tablist">
      <button class="tab" :class="{ active: !filters.role }" @click="filters.role = ''">الكل</button>
      <button class="tab" :class="{ active: filters.role === 'employee' }" @click="filters.role = 'employee'">الموظفون</button>
      <button class="tab" :class="{ active: filters.role === 'manager' }" @click="filters.role = 'manager'">المدراء</button>
    </div>

    <section class="card card-flush">
      <div class="toolbar">
        <div v-if="!auth.isEmployee" class="input-icon">
          <Search />
          <input v-model="filters.q" class="input" type="search" placeholder="ابحث باسم المُقيَّم…" aria-label="بحث" />
        </div>
        <select v-model="filters.period_type" class="select" aria-label="نوع الفترة">
          <option value="">كل الفترات</option>
          <option v-for="(label, key) in PERIOD_TYPES" :key="key" :value="key">{{ label }}</option>
        </select>
        <select v-if="auth.isAdmin" v-model="filters.department_id" class="select" aria-label="القسم">
          <option value="">كل الأقسام</option>
          <option v-for="d in departments" :key="d.id" :value="String(d.id)">{{ d.name }}</option>
        </select>
      </div>

      <LoadingState v-if="loading && !rows.length" />
      <EmptyState v-else-if="error" :icon="AlertTriangle" title="تعذّر تحميل التقييمات" :message="error" />
      <EmptyState v-else-if="!rows.length" :icon="Star" title="لا توجد تقييمات">
        <RouterLink v-if="auth.canManage" to="/evaluations/new" class="btn btn-primary"><Plus /> إضافة تقييم</RouterLink>
      </EmptyState>

      <div v-else class="table-wrap" :style="{ opacity: loading ? 0.6 : 1 }">
        <table class="table">
          <thead>
            <tr>
              <th v-if="!auth.isEmployee">المُقيَّم</th>
              <th>الفترة</th>
              <th>الدرجة</th>
              <th>المُقيِّم</th>
              <th>التاريخ</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="e in rows" :key="e.id" class="clickable" @click="router.push(`/evaluations/${e.id}`)">
              <td v-if="!auth.isEmployee">
                <div class="row" style="gap: 8px; flex-wrap: nowrap">
                  <UserCell :name="e.evaluatee.full_name" :sub="e.department?.name" :avatar="e.evaluatee.avatar_url" />
                  <RoleBadge v-if="e.evaluatee.role === 'manager'" role="manager" />
                </div>
              </td>
              <td class="small">{{ periodLabel(e) }}</td>
              <td><ScoreBadge :score="e.overall_score" /></td>
              <td class="small">{{ e.evaluator.full_name }}</td>
              <td class="muted small nowrap">{{ formatDate(e.created_at) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <PaginationBar :meta="meta" @change="filters.page = $event" />
    </section>
  </div>
</template>
