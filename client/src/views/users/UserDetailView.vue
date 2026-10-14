<script setup>
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import {
  AlertTriangle,
  ArrowLeftRight,
  ClipboardList,
  KeyRound,
  Mail,
  Pencil,
  Phone,
  Plus,
  Power,
  Star,
  Trash2,
} from 'lucide-vue-next';
import { departmentsApi, evaluationsApi, tasksApi, usersApi } from '@/api';
import { errorMessage } from '@/api/http';
import PageHeader from '@/components/common/PageHeader.vue';
import LoadingState from '@/components/common/LoadingState.vue';
import EmptyState from '@/components/common/EmptyState.vue';
import UserAvatar from '@/components/common/UserAvatar.vue';
import BaseModal from '@/components/common/BaseModal.vue';
import { ActiveBadge, PriorityBadge, RoleBadge, ScoreBadge, StatusBadge } from '@/components/common/Badges';
import UserFormModal from '@/components/users/UserFormModal.vue';
import TempPasswordModal from '@/components/users/TempPasswordModal.vue';
import { useAuthStore } from '@/stores/auth';
import { useUiStore } from '@/stores/ui';
import { PERIOD_TYPES } from '@/utils/constants';
import { formatDate, formatDue, formatMonth, formatRelative } from '@/utils/format';

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();
const ui = useUiStore();

const user = ref(null);
const perms = ref({});
const error = ref('');
const tab = ref('tasks');
const tasks = ref([]);
const evaluations = ref([]);
const showEdit = ref(false);
const showTransfer = ref(false);
const transferTo = ref('');
const departments = ref([]);
const tempPassword = ref(null);

const stats = computed(() => user.value?.stats ?? {});
const isEmployeeTarget = computed(() => user.value?.role === 'employee');

async function load() {
  error.value = '';
  try {
    const res = await usersApi.get(route.params.id);
    user.value = res.data;
    perms.value = res.permissions;
    tab.value = res.data.role === 'employee' ? 'tasks' : 'evaluations';
    const [t, e] = await Promise.all([
      res.data.role === 'employee' ? tasksApi.list({ assignee_id: res.data.id, per_page: 10 }) : Promise.resolve({ data: [] }),
      res.data.role !== 'admin' ? evaluationsApi.list({ evaluatee_id: res.data.id, per_page: 10 }) : Promise.resolve({ data: [] }),
    ]);
    tasks.value = t.data;
    evaluations.value = e.data;
  } catch (e) {
    error.value = e.response?.status === 404 ? 'المستخدم غير موجود أو خارج نطاق صلاحياتك' : errorMessage(e);
  }
}

async function toggleActive() {
  const activate = !user.value.is_active;
  const ok = await ui.confirm({
    title: activate ? 'تفعيل الحساب' : 'تعطيل الحساب',
    message: activate ? `سيتمكن ${user.value.full_name} من الدخول مجدداً.` : `لن يتمكن ${user.value.full_name} من الدخول، وستُنهى جلساته الحالية.`,
    confirmText: activate ? 'تفعيل' : 'تعطيل',
    danger: !activate,
  });
  if (!ok) return;
  try {
    user.value = { ...(await usersApi.setStatus(user.value.id, activate)).data, stats: user.value.stats };
    ui.success(activate ? 'تم تفعيل الحساب' : 'تم تعطيل الحساب');
  } catch (e) {
    ui.error(errorMessage(e));
  }
}

async function resetPassword() {
  if (!(await ui.confirm({ title: 'إعادة تعيين كلمة المرور', message: 'سيتم توليد كلمة مرور مؤقتة جديدة وإنهاء جلسات المستخدم الحالية.', confirmText: 'إعادة التعيين' }))) return;
  try {
    const { temp_password } = await usersApi.resetPassword(user.value.id);
    tempPassword.value = temp_password;
  } catch (e) {
    ui.error(errorMessage(e));
  }
}

async function openTransfer() {
  departments.value = (await departmentsApi.list()).data;
  transferTo.value = user.value.department_id ?? '';
  showTransfer.value = true;
}

async function transfer() {
  try {
    await usersApi.transfer(user.value.id, transferTo.value ? Number(transferTo.value) : null);
    showTransfer.value = false;
    ui.success('تم نقل المستخدم');
    load();
  } catch (e) {
    ui.error(errorMessage(e));
  }
}

async function remove() {
  const ok = await ui.confirm({
    title: 'حذف المستخدم',
    message: `سيتم حذف حساب ${user.value.full_name}. تبقى مهامه وتقييماته في السجل.`,
    confirmText: 'حذف',
    danger: true,
  });
  if (!ok) return;
  try {
    await usersApi.remove(user.value.id);
    ui.success('تم حذف المستخدم');
    router.replace('/users');
  } catch (e) {
    ui.error(errorMessage(e));
  }
}

function onSaved() {
  showEdit.value = false;
  load();
}

onMounted(load);
watch(() => route.params.id, (id) => id && load());
</script>

<template>
  <div>
    <LoadingState v-if="!user && !error" variant="dashboard" />
    <div v-else-if="error" class="card">
      <EmptyState :icon="AlertTriangle" title="تعذّر عرض المستخدم" :message="error">
        <RouterLink to="/users" class="btn">العودة للقائمة</RouterLink>
      </EmptyState>
    </div>

    <template v-else>
      <PageHeader :title="user.full_name" :back="{ path: '/users', query: auth.isAdmin ? { role: user.role } : {} }">
        <RouterLink v-if="isEmployeeTarget && auth.canManage && user.is_active" :to="{ path: '/tasks/new', query: { assignee_id: user.id } }" class="btn btn-soft"><Plus /> إسناد مهمة</RouterLink>
        <RouterLink v-if="user.role !== 'admin' && (auth.isAdmin || isEmployeeTarget) && user.is_active && user.id !== auth.user.id" :to="{ path: '/evaluations/new', query: { evaluatee_id: user.id } }" class="btn btn-soft"><Star /> تقييم</RouterLink>
      </PageHeader>

      <div class="layout">
        <!-- البطاقة الشخصية -->
        <aside class="card profile">
          <div class="head">
            <UserAvatar :name="user.full_name" :src="user.avatar_url" :size="72" />
            <h2>{{ user.full_name }}</h2>
            <span class="muted">{{ user.job_title || '—' }}</span>
            <div class="row" style="justify-content: center; gap: 6px">
              <RoleBadge :role="user.role" />
              <ActiveBadge :active="user.is_active" />
            </div>
          </div>
          <hr class="divider" />
          <dl class="dl small">
            <dt><Mail :size="15" /></dt>
            <dd dir="ltr" style="text-align: end">{{ user.email }}</dd>
            <dt><Phone :size="15" /></dt>
            <dd dir="ltr" style="text-align: end">{{ user.phone || '—' }}</dd>
            <dt>القسم</dt>
            <dd>
              <RouterLink v-if="user.department" :to="`/departments/${user.department.id}`">{{ user.department.name }}</RouterLink>
              <span v-else class="badge badge-warning">غير معيّن</span>
            </dd>
            <template v-if="user.manager">
              <dt>المدير</dt>
              <dd>{{ user.manager.full_name }}</dd>
            </template>
            <dt>التعيين</dt>
            <dd>{{ formatDate(user.hire_date) }}</dd>
            <dt>آخر دخول</dt>
            <dd>{{ user.last_login_at ? formatRelative(user.last_login_at) : 'لم يدخل بعد' }}</dd>
          </dl>

          <template v-if="perms.can_manage">
            <hr class="divider" />
            <div class="stack-sm">
              <button class="btn btn-block" @click="showEdit = true"><Pencil /> تعديل البيانات</button>
              <button v-if="auth.isAdmin && user.role !== 'admin'" class="btn btn-block" @click="openTransfer"><ArrowLeftRight /> نقل إلى قسم آخر</button>
              <button class="btn btn-block" @click="resetPassword"><KeyRound /> إعادة تعيين كلمة المرور</button>
              <button class="btn btn-block" @click="toggleActive"><Power /> {{ user.is_active ? 'تعطيل الحساب' : 'تفعيل الحساب' }}</button>
              <button v-if="perms.can_delete" class="btn btn-block btn-ghost" style="color: var(--danger)" @click="remove"><Trash2 /> حذف المستخدم</button>
            </div>
          </template>
        </aside>

        <div class="stack" style="gap: 20px; min-width: 0">
          <div class="grid-kpi">
            <div v-if="isEmployeeTarget" class="card mini"><span class="muted small">إجمالي المهام</span><strong class="num">{{ stats.tasks_total }}</strong></div>
            <div v-if="isEmployeeTarget" class="card mini"><span class="muted small">المكتملة</span><strong class="num">{{ stats.tasks_by_status?.completed ?? 0 }}</strong></div>
            <div v-if="isEmployeeTarget" class="card mini"><span class="muted small">المتأخرة</span><strong class="num" :style="{ color: stats.tasks_overdue ? 'var(--danger)' : '' }">{{ stats.tasks_overdue }}</strong></div>
            <div class="card mini"><span class="muted small">متوسط التقييم</span><ScoreBadge :score="stats.average_score" /></div>
          </div>

          <section class="card card-flush">
            <div class="card-header" style="padding-bottom: 12px">
              <div class="tabs" role="tablist">
                <button v-if="isEmployeeTarget" class="tab" :class="{ active: tab === 'tasks' }" @click="tab = 'tasks'"><ClipboardList :size="15" /> المهام</button>
                <button v-if="user.role !== 'admin'" class="tab" :class="{ active: tab === 'evaluations' }" @click="tab = 'evaluations'"><Star :size="15" /> التقييمات</button>
              </div>
              <RouterLink v-if="tab === 'tasks' && isEmployeeTarget" :to="{ path: '/tasks', query: { assignee_id: user.id } }" class="btn btn-sm btn-ghost">كل المهام</RouterLink>
            </div>

            <template v-if="tab === 'tasks' && isEmployeeTarget">
              <div v-if="tasks.length" class="table-wrap">
                <table class="table">
                  <thead><tr><th>المهمة</th><th>الحالة</th><th>الأولوية</th><th>الموعد</th></tr></thead>
                  <tbody>
                    <tr v-for="t in tasks" :key="t.id" class="clickable" @click="router.push(`/tasks/${t.id}`)">
                      <td><RouterLink :to="`/tasks/${t.id}`" @click.stop>{{ t.title }}</RouterLink></td>
                      <td><StatusBadge :status="t.status" /></td>
                      <td><PriorityBadge :priority="t.priority" /></td>
                      <td class="small nowrap" :style="{ color: t.is_overdue ? 'var(--danger)' : '' }">{{ t.due_date ? formatDue(t.due_date) : '—' }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <EmptyState v-else :icon="ClipboardList" title="لا توجد مهام" />
            </template>

            <template v-else-if="user.role !== 'admin'">
              <div v-if="evaluations.length" class="table-wrap">
                <table class="table">
                  <thead><tr><th>الفترة</th><th>الدرجة</th><th>المُقيِّم</th></tr></thead>
                  <tbody>
                    <tr v-for="e in evaluations" :key="e.id" class="clickable" @click="router.push(`/evaluations/${e.id}`)">
                      <td class="small">{{ PERIOD_TYPES[e.period_type] }} · {{ formatMonth(e.period_start) }}</td>
                      <td><ScoreBadge :score="e.overall_score" /></td>
                      <td class="small">{{ e.evaluator.full_name }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <EmptyState v-else :icon="Star" title="لا توجد تقييمات" />
            </template>
          </section>
        </div>
      </div>

      <UserFormModal v-if="showEdit" :user="user" @close="showEdit = false" @saved="onSaved" />
      <TempPasswordModal v-if="tempPassword" :password="tempPassword" :name="user.full_name" @close="tempPassword = null" />

      <BaseModal v-if="showTransfer" title="نقل إلى قسم آخر" size="sm" @close="showTransfer = false">
        <div class="field">
          <label for="t-dept">القسم الجديد</label>
          <select id="t-dept" v-model="transferTo" class="select">
            <option value="">— بدون قسم —</option>
            <option v-for="d in departments" :key="d.id" :value="d.id">{{ d.name }}{{ d.manager ? ` (المدير: ${d.manager.full_name})` : '' }}</option>
          </select>
          <span class="hint">
            {{ user.role === 'manager' ? 'سيصبح مديراً للقسم الجديد ويحل محل مديره الحالي إن وُجد.' : 'سيتغير مديره تلقائياً إلى مدير القسم الجديد. مهامه الحالية تبقى معه.' }}
          </span>
        </div>
        <template #footer>
          <button class="btn" @click="showTransfer = false">إلغاء</button>
          <button class="btn btn-primary" @click="transfer">نقل</button>
        </template>
      </BaseModal>
    </template>
  </div>
</template>

<style scoped>
.layout { display: grid; grid-template-columns: 300px minmax(0, 1fr); gap: 20px; align-items: start; }
@media (max-width: 1000px) { .layout { grid-template-columns: minmax(0, 1fr); } }
.profile { display: flex; flex-direction: column; gap: 12px; }
.head { display: flex; flex-direction: column; align-items: center; text-align: center; gap: 6px; }
.dl dt { display: flex; align-items: center; }
.mini { display: flex; flex-direction: column; gap: 4px; padding: 14px 16px; }
.mini strong { font-size: 1.4rem; }
.tab { display: inline-flex; align-items: center; gap: 6px; }
</style>
