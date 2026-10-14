<script setup>
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { AlertTriangle, Search, UserPlus, Users } from 'lucide-vue-next';
import { departmentsApi, usersApi } from '@/api';
import PageHeader from '@/components/common/PageHeader.vue';
import LoadingState from '@/components/common/LoadingState.vue';
import EmptyState from '@/components/common/EmptyState.vue';
import PaginationBar from '@/components/common/PaginationBar.vue';
import UserCell from '@/components/common/UserCell.vue';
import { ActiveBadge, RoleBadge } from '@/components/common/Badges';
import UserFormModal from '@/components/users/UserFormModal.vue';
import TempPasswordModal from '@/components/users/TempPasswordModal.vue';
import { useListQuery } from '@/composables/useListQuery';
import { useAuthStore } from '@/stores/auth';
import { formatDate, formatRelative } from '@/utils/format';

const auth = useAuthStore();
const router = useRouter();

const { filters, rows, meta, loading, error, reload } = useListQuery(usersApi.list, {
  q: '',
  role: '',
  department_id: '',
  status: '',
});

const departments = ref([]);
const showForm = ref(false);
const tempPassword = ref(null);

const title = computed(() => {
  if (auth.isManager) return 'موظفو القسم';
  return { manager: 'المدراء', employee: 'الموظفون', admin: 'المشرفون' }[filters.role] ?? 'كل المستخدمين';
});

function onSaved(res) {
  showForm.value = false;
  if (res.temp_password) tempPassword.value = { password: res.temp_password, name: res.data.full_name };
  reload();
}

onMounted(async () => {
  if (auth.isAdmin) departments.value = (await departmentsApi.list()).data;
});
</script>

<template>
  <div>
    <PageHeader :title="title" :subtitle="auth.isManager ? `الموظفون العاملون في قسم ${auth.user.department?.name ?? ''}` : 'إدارة حسابات المدراء والموظفين وصلاحياتهم'">
      <button class="btn btn-primary" @click="showForm = true"><UserPlus /> {{ auth.isManager ? 'إضافة موظف' : 'إضافة مستخدم' }}</button>
    </PageHeader>

    <div v-if="auth.isAdmin" class="tabs" style="margin-bottom: 16px" role="tablist">
      <button class="tab" :class="{ active: !filters.role }" @click="filters.role = ''">الكل</button>
      <button class="tab" :class="{ active: filters.role === 'manager' }" @click="filters.role = 'manager'">المدراء</button>
      <button class="tab" :class="{ active: filters.role === 'employee' }" @click="filters.role = 'employee'">الموظفون</button>
      <button class="tab" :class="{ active: filters.role === 'admin' }" @click="filters.role = 'admin'">المشرفون</button>
    </div>

    <section class="card card-flush">
      <div class="toolbar">
        <div class="input-icon">
          <Search />
          <input v-model="filters.q" class="input" type="search" placeholder="ابحث بالاسم أو البريد أو المسمّى…" aria-label="بحث" />
        </div>
        <select v-if="auth.isAdmin" v-model="filters.department_id" class="select" aria-label="القسم">
          <option value="">كل الأقسام</option>
          <option v-for="d in departments" :key="d.id" :value="String(d.id)">{{ d.name }}</option>
        </select>
        <select v-model="filters.status" class="select" aria-label="الحالة">
          <option value="">كل الحالات</option>
          <option value="active">النشطون</option>
          <option value="inactive">المعطّلون</option>
        </select>
      </div>

      <LoadingState v-if="loading && !rows.length" />
      <EmptyState v-else-if="error" :icon="AlertTriangle" title="تعذّر تحميل المستخدمين" :message="error" />
      <EmptyState v-else-if="!rows.length" :icon="Users" title="لا يوجد مستخدمون" message="جرّب تغيير الفلاتر أو أضف مستخدماً جديداً." />

      <div v-else class="table-wrap" :style="{ opacity: loading ? 0.6 : 1 }">
        <table class="table">
          <thead>
            <tr>
              <th>الاسم</th>
              <th v-if="auth.isAdmin">الدور</th>
              <th v-if="auth.isAdmin">القسم</th>
              <th>المسمّى الوظيفي</th>
              <th>الحالة</th>
              <th>تاريخ التعيين</th>
              <th>آخر دخول</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="u in rows" :key="u.id" class="clickable" @click="router.push(`/users/${u.id}`)">
              <td><UserCell :name="u.full_name" :sub="u.email" :avatar="u.avatar_url" :to="`/users/${u.id}`" /></td>
              <td v-if="auth.isAdmin"><RoleBadge :role="u.role" /></td>
              <td v-if="auth.isAdmin" class="small">
                {{ u.department?.name || '—' }}
                <span v-if="u.role === 'manager' && !u.department" class="badge badge-warning">غير معيّن</span>
              </td>
              <td class="small">{{ u.job_title || '—' }}</td>
              <td><ActiveBadge :active="u.is_active" /></td>
              <td class="small muted nowrap">{{ formatDate(u.hire_date) }}</td>
              <td class="small muted nowrap">{{ u.last_login_at ? formatRelative(u.last_login_at) : 'لم يدخل بعد' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <PaginationBar :meta="meta" @change="filters.page = $event" />
    </section>

    <UserFormModal
      v-if="showForm"
      :default-role="filters.role || 'employee'"
      :default-department="filters.department_id ? Number(filters.department_id) : null"
      @close="showForm = false"
      @saved="onSaved"
    />
    <TempPasswordModal v-if="tempPassword" :password="tempPassword.password" :name="tempPassword.name" @close="tempPassword = null" />
  </div>
</template>
