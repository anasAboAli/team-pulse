<script setup>
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { AlertTriangle, ClipboardList, Download, Paperclip, Plus, Search } from 'lucide-vue-next';
import { departmentsApi, tasksApi, usersApi } from '@/api';
import PageHeader from '@/components/common/PageHeader.vue';
import LoadingState from '@/components/common/LoadingState.vue';
import EmptyState from '@/components/common/EmptyState.vue';
import PaginationBar from '@/components/common/PaginationBar.vue';
import UserCell from '@/components/common/UserCell.vue';
import { PriorityBadge, StatusBadge } from '@/components/common/Badges';
import { useListQuery } from '@/composables/useListQuery';
import { useReportDownload } from '@/composables/useDownload';
import { useAuthStore } from '@/stores/auth';
import { TASK_PRIORITIES, TASK_STATUSES } from '@/utils/constants';
import { formatDate, formatDue } from '@/utils/format';

const auth = useAuthStore();
const router = useRouter();
const { busy, download } = useReportDownload();

const { filters, rows, meta, loading, error } = useListQuery(tasksApi.list, {
  q: '',
  status: '',
  priority: '',
  assignee_id: '',
  department_id: '',
  overdue: '',
  sort: 'newest',
});

const assignees = ref([]);
const departments = ref([]);

const title = computed(() => (auth.isEmployee ? 'مهامي' : auth.isManager ? 'مهام القسم' : 'المهام'));
const STATUS_TABS = [
  { value: '', label: 'الكل' },
  { value: 'open', label: 'المفتوحة' },
  { value: 'submitted', label: 'بانتظار المراجعة' },
  { value: 'returned', label: 'المُعادة' },
  { value: 'completed', label: 'المكتملة' },
];

onMounted(async () => {
  if (!auth.canManage) return;
  assignees.value = (await usersApi.options({ role: 'employee' })).data;
  if (auth.isAdmin) departments.value = (await departmentsApi.list()).data;
});
</script>

<template>
  <div>
    <PageHeader :title="title" :subtitle="auth.isEmployee ? 'المهام المُسندة إليك من مديرك أو المشرف' : 'إسناد ومتابعة المهام ومراجعة التسليمات'">
      <button v-if="auth.canManage" class="btn" :disabled="busy === 'tasks'" @click="download('tasks')"><Download /> تصدير CSV</button>
      <RouterLink v-if="auth.canManage" to="/tasks/new" class="btn btn-primary"><Plus /> مهمة جديدة</RouterLink>
    </PageHeader>

    <div class="tabs" style="margin-bottom: 16px" role="tablist">
      <button
        v-for="t in STATUS_TABS"
        :key="t.value"
        class="tab"
        role="tab"
        :class="{ active: (filters.status || '') === t.value }"
        :aria-selected="(filters.status || '') === t.value"
        @click="filters.status = t.value"
      >
        {{ t.label }}
      </button>
    </div>

    <section class="card card-flush">
      <div class="toolbar">
        <div class="input-icon">
          <Search />
          <input v-model="filters.q" class="input" type="search" placeholder="ابحث بعنوان المهمة أو اسم الموظف…" aria-label="بحث" />
        </div>
        <select v-model="filters.status" class="select" aria-label="الحالة">
          <option value="">كل الحالات</option>
          <option value="open">المفتوحة</option>
          <option v-for="(s, key) in TASK_STATUSES" :key="key" :value="key">{{ s.label }}</option>
        </select>
        <select v-model="filters.priority" class="select" aria-label="الأولوية">
          <option value="">كل الأولويات</option>
          <option v-for="(p, key) in TASK_PRIORITIES" :key="key" :value="key">{{ p.label }}</option>
        </select>
        <select v-if="auth.canManage" v-model="filters.assignee_id" class="select" aria-label="الموظف">
          <option value="">كل الموظفين</option>
          <option v-for="u in assignees" :key="u.id" :value="String(u.id)">{{ u.full_name }}</option>
        </select>
        <select v-if="auth.isAdmin" v-model="filters.department_id" class="select" aria-label="القسم">
          <option value="">كل الأقسام</option>
          <option v-for="d in departments" :key="d.id" :value="String(d.id)">{{ d.name }}</option>
        </select>
        <label class="checkbox small">
          <input type="checkbox" :checked="filters.overdue === 'true'" @change="filters.overdue = $event.target.checked ? 'true' : ''" />
          المتأخرة فقط
        </label>
        <div class="spacer" />
        <select v-model="filters.sort" class="select" aria-label="الترتيب">
          <option value="newest">الأحدث</option>
          <option value="due_date">أقرب موعد</option>
          <option value="priority">الأولوية</option>
        </select>
      </div>

      <LoadingState v-if="loading && !rows.length" />
      <EmptyState v-else-if="error" :icon="AlertTriangle" title="تعذّر تحميل المهام" :message="error" />
      <EmptyState v-else-if="!rows.length" :icon="ClipboardList" title="لا توجد مهام" message="جرّب تغيير الفلاتر.">
        <RouterLink v-if="auth.canManage" to="/tasks/new" class="btn btn-primary"><Plus /> إسناد مهمة</RouterLink>
      </EmptyState>

      <div v-else class="table-wrap" :style="{ opacity: loading ? 0.6 : 1 }">
        <table class="table">
          <thead>
            <tr>
              <th>المهمة</th>
              <th v-if="!auth.isEmployee">الموظف</th>
              <th v-if="auth.isAdmin">القسم</th>
              <th>الحالة</th>
              <th>الأولوية</th>
              <th>الموعد</th>
              <th>أُنشئت</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="t in rows" :key="t.id" class="clickable" @click="router.push(`/tasks/${t.id}`)">
              <td style="max-width: 340px">
                <RouterLink :to="`/tasks/${t.id}`" class="title truncate" @click.stop>{{ t.title }}</RouterLink>
                <div class="muted small row" style="gap: 8px">
                  <span>من {{ t.assigner.full_name }}</span>
                  <span v-if="t.attachments_count" class="row" style="gap: 2px"><Paperclip :size="13" /> {{ t.attachments_count }}</span>
                  <span v-if="t.requires_attachment" class="badge" style="padding: 0 8px">يتطلب ملفاً</span>
                </div>
              </td>
              <td v-if="!auth.isEmployee"><UserCell :name="t.assignee.full_name" :avatar="t.assignee.avatar_url" :size="30" /></td>
              <td v-if="auth.isAdmin" class="small">{{ t.department?.name || '—' }}</td>
              <td><StatusBadge :status="t.status" /></td>
              <td><PriorityBadge :priority="t.priority" /></td>
              <td class="nowrap small" :class="{ overdue: t.is_overdue }">
                {{ t.due_date ? formatDate(t.due_date) : '—' }}
                <div v-if="t.due_date && !['completed', 'cancelled'].includes(t.status)" class="muted">{{ formatDue(t.due_date) }}</div>
              </td>
              <td class="muted small nowrap">{{ formatDate(t.created_at) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <PaginationBar :meta="meta" @change="filters.page = $event" />
    </section>
  </div>
</template>

<style scoped>
.title { font-weight: 600; color: var(--text); display: block; }
.overdue, .overdue .muted { color: var(--danger); font-weight: 600; }
</style>
