<script setup>
import { onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { AlertTriangle, CheckCircle2, ClipboardList, Star, UserCog, UserPlus, Users } from 'lucide-vue-next';
import { departmentsApi, usersApi } from '@/api';
import { errorMessage } from '@/api/http';
import PageHeader from '@/components/common/PageHeader.vue';
import LoadingState from '@/components/common/LoadingState.vue';
import EmptyState from '@/components/common/EmptyState.vue';
import StatCard from '@/components/common/StatCard.vue';
import BaseModal from '@/components/common/BaseModal.vue';
import UserCell from '@/components/common/UserCell.vue';
import { ActiveBadge } from '@/components/common/Badges';
import UserFormModal from '@/components/users/UserFormModal.vue';
import TempPasswordModal from '@/components/users/TempPasswordModal.vue';
import { useAuthStore } from '@/stores/auth';
import { useUiStore } from '@/stores/ui';
import { formatDate, formatPercent, formatScore } from '@/utils/format';

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();
const ui = useUiStore();

const dept = ref(null);
const error = ref('');
const showManager = ref(false);
const managerId = ref('');
const candidates = ref([]);
const showAdd = ref(false);
const tempPassword = ref(null);

async function load() {
  try {
    dept.value = (await departmentsApi.get(route.params.id)).data;
  } catch (e) {
    error.value = e.response?.status === 404 ? 'القسم غير موجود أو خارج نطاق صلاحياتك' : errorMessage(e);
  }
}

async function openManager() {
  const list = (await usersApi.options()).data;
  candidates.value = list.filter((u) => u.role !== 'admin');
  managerId.value = dept.value.manager?.id ?? '';
  showManager.value = true;
}

async function saveManager() {
  try {
    await departmentsApi.setManager(dept.value.id, managerId.value ? Number(managerId.value) : null);
    showManager.value = false;
    ui.success('تم تحديث مدير القسم');
    load();
  } catch (e) {
    ui.error(errorMessage(e));
  }
}

function onCreated(res) {
  showAdd.value = false;
  if (res.temp_password) tempPassword.value = { password: res.temp_password, name: res.data.full_name };
  load();
}

onMounted(load);
</script>

<template>
  <div>
    <LoadingState v-if="!dept && !error" variant="dashboard" />
    <div v-else-if="error" class="card"><EmptyState :icon="AlertTriangle" title="تعذّر عرض القسم" :message="error" /></div>

    <template v-else>
      <PageHeader :title="`قسم ${dept.name}`" :subtitle="dept.description" :back="auth.isAdmin ? '/departments' : '/manager/dashboard'">
        <button v-if="auth.isAdmin" class="btn" @click="openManager"><UserCog /> {{ dept.manager ? 'تغيير المدير' : 'تعيين مدير' }}</button>
        <button class="btn btn-primary" @click="showAdd = true"><UserPlus /> إضافة موظف</button>
      </PageHeader>

      <div class="stack" style="gap: 20px">
        <div class="grid-kpi">
          <div class="card manager-card">
            <span class="muted small">مدير القسم</span>
            <UserCell v-if="dept.manager" :name="dept.manager.full_name" :sub="dept.manager.email" :avatar="dept.manager.avatar_url" :to="auth.isAdmin ? `/users/${dept.manager.id}` : '/profile'" />
            <span v-else class="badge badge-warning">بدون مدير — يديره المشرف</span>
          </div>
          <StatCard label="الموظفون" :value="dept.employees_count" :icon="Users" />
          <StatCard label="مهام مفتوحة" :value="dept.tasks_open" :icon="ClipboardList" tone="warning" :to="{ path: '/tasks', query: auth.isAdmin ? { department_id: dept.id, status: 'open' } : { status: 'open' } }" />
          <StatCard label="نسبة الإنجاز" :value="formatPercent(dept.completion_rate)" :icon="CheckCircle2" tone="success" />
          <StatCard label="متوسط التقييم" :value="formatScore(dept.average_score)" :icon="Star" tone="violet" hint="من 5" />
        </div>

        <section class="card card-flush">
          <div class="card-header" style="padding-bottom: 16px"><h2>موظفو القسم</h2></div>
          <div v-if="dept.members.length" class="table-wrap">
            <table class="table">
              <thead><tr><th>الموظف</th><th>المسمّى</th><th>الحالة</th><th>تاريخ التعيين</th><th /></tr></thead>
              <tbody>
                <tr v-for="m in dept.members" :key="m.id" class="clickable" @click="router.push(`/users/${m.id}`)">
                  <td><UserCell :name="m.full_name" :sub="m.email" :avatar="m.avatar_url" :to="`/users/${m.id}`" /></td>
                  <td class="small">{{ m.job_title || '—' }}</td>
                  <td><ActiveBadge :active="m.is_active" /></td>
                  <td class="small muted">{{ formatDate(m.hire_date) }}</td>
                  <td class="actions">
                    <RouterLink v-if="m.is_active" :to="{ path: '/tasks/new', query: { assignee_id: m.id } }" class="btn btn-sm btn-soft" @click.stop>إسناد مهمة</RouterLink>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <EmptyState v-else :icon="Users" title="لا يوجد موظفون في هذا القسم" />
        </section>
      </div>

      <BaseModal v-if="showManager" title="مدير القسم" size="sm" @close="showManager = false">
        <div class="field">
          <label for="m-select">اختر المدير</label>
          <select id="m-select" v-model="managerId" class="select">
            <option value="">— بدون مدير —</option>
            <option v-for="u in candidates" :key="u.id" :value="u.id">
              {{ u.full_name }} — {{ u.role === 'manager' ? 'مدير' : 'موظف' }}{{ u.department_name ? ` (${u.department_name})` : '' }}
            </option>
          </select>
          <span class="hint">المدير السابق يصبح بلا قسم. اختيار موظف يرقّيه إلى مدير، واختيار مدير قسم آخر يُفرغ ذلك القسم.</span>
        </div>
        <template #footer>
          <button class="btn" @click="showManager = false">إلغاء</button>
          <button class="btn btn-primary" @click="saveManager">حفظ</button>
        </template>
      </BaseModal>

      <UserFormModal v-if="showAdd" default-role="employee" :default-department="dept.id" @close="showAdd = false" @saved="onCreated" />
      <TempPasswordModal v-if="tempPassword" :password="tempPassword.password" :name="tempPassword.name" @close="tempPassword = null" />
    </template>
  </div>
</template>

<style scoped>
.manager-card { display: flex; flex-direction: column; gap: 10px; justify-content: center; }
</style>
