<script setup>
import { onMounted, reactive, ref } from 'vue';
import { AlertTriangle, Building2, ClipboardList, Pencil, Plus, Trash2, Users } from 'lucide-vue-next';
import { departmentsApi, usersApi } from '@/api';
import { errorMessage, fieldErrors } from '@/api/http';
import PageHeader from '@/components/common/PageHeader.vue';
import LoadingState from '@/components/common/LoadingState.vue';
import EmptyState from '@/components/common/EmptyState.vue';
import BaseModal from '@/components/common/BaseModal.vue';
import UserCell from '@/components/common/UserCell.vue';
import { useUiStore } from '@/stores/ui';

const ui = useUiStore();
const departments = ref([]);
const loading = ref(true);
const error = ref('');

const modal = ref(null); // null | { mode: 'create' | 'edit', id }
const form = reactive({ name: '', description: '', manager_id: '' });
const errors = ref({});
const saving = ref(false);
const candidates = ref([]);

async function load() {
  loading.value = true;
  try {
    departments.value = (await departmentsApi.list()).data;
  } catch (e) {
    error.value = errorMessage(e);
  } finally {
    loading.value = false;
  }
}

async function openCreate() {
  Object.assign(form, { name: '', description: '', manager_id: '' });
  errors.value = {};
  modal.value = { mode: 'create' };
  const list = (await usersApi.options()).data;
  candidates.value = list.filter((u) => u.role !== 'admin');
}

function openEdit(d) {
  Object.assign(form, { name: d.name, description: d.description || '', manager_id: '' });
  errors.value = {};
  modal.value = { mode: 'edit', id: d.id };
}

async function save() {
  saving.value = true;
  errors.value = {};
  try {
    if (modal.value.mode === 'create') {
      await departmentsApi.create({ name: form.name, description: form.description, manager_id: Number(form.manager_id) || null });
      ui.success('تم إنشاء القسم');
    } else {
      await departmentsApi.update(modal.value.id, { name: form.name, description: form.description });
      ui.success('تم حفظ التعديلات');
    }
    modal.value = null;
    load();
  } catch (e) {
    errors.value = fieldErrors(e);
    ui.error(errorMessage(e));
  } finally {
    saving.value = false;
  }
}

async function remove(d) {
  if (!(await ui.confirm({ title: 'حذف القسم', message: `هل تريد حذف قسم "${d.name}"؟ يجب ألا يحتوي على موظفين أو مدير.`, confirmText: 'حذف', danger: true }))) return;
  try {
    await departmentsApi.remove(d.id);
    ui.success('تم حذف القسم');
    load();
  } catch (e) {
    ui.error(errorMessage(e));
  }
}

onMounted(load);
</script>

<template>
  <div>
    <PageHeader title="الأقسام" subtitle="لكل قسم مدير واحد يشرف على موظفيه">
      <button class="btn btn-primary" @click="openCreate"><Plus /> قسم جديد</button>
    </PageHeader>

    <LoadingState v-if="loading && !departments.length" variant="dashboard" />
    <div v-else-if="error" class="card"><EmptyState :icon="AlertTriangle" title="تعذّر التحميل" :message="error" /></div>
    <div v-else-if="!departments.length" class="card">
      <EmptyState :icon="Building2" title="لا توجد أقسام بعد" message="ابدأ بإنشاء أول قسم في الشركة.">
        <button class="btn btn-primary" @click="openCreate"><Plus /> قسم جديد</button>
      </EmptyState>
    </div>

    <div v-else class="dept-grid">
      <article v-for="d in departments" :key="d.id" class="card dept">
        <div class="row-between">
          <RouterLink :to="`/departments/${d.id}`" class="name"><Building2 :size="18" /> {{ d.name }}</RouterLink>
          <div class="row" style="gap: 2px">
            <button class="btn btn-ghost btn-icon btn-sm" aria-label="تعديل" @click="openEdit(d)"><Pencil /></button>
            <button class="btn btn-ghost btn-icon btn-sm" aria-label="حذف" style="color: var(--danger)" @click="remove(d)"><Trash2 /></button>
          </div>
        </div>
        <p class="muted small desc">{{ d.description || 'بدون وصف' }}</p>

        <div class="manager">
          <UserCell v-if="d.manager" :name="d.manager.full_name" sub="مدير القسم" :avatar="d.manager.avatar_url" :to="`/users/${d.manager.id}`" />
          <span v-else class="badge badge-warning">بدون مدير</span>
        </div>

        <div class="stats">
          <span><Users :size="15" /> <strong class="num">{{ d.employees_count }}</strong> موظف</span>
          <span><ClipboardList :size="15" /> <strong class="num">{{ d.tasks_open }}</strong> مهمة مفتوحة</span>
        </div>
        <div class="stack-sm" style="gap: 4px">
          <div class="row-between small"><span class="muted">نسبة الإنجاز</span><strong class="num">{{ d.completion_rate }}%</strong></div>
          <div class="progress"><span :style="{ width: `${d.completion_rate}%` }" /></div>
        </div>
        <RouterLink :to="`/departments/${d.id}`" class="btn btn-sm btn-soft">إدارة القسم</RouterLink>
      </article>
    </div>

    <BaseModal v-if="modal" :title="modal.mode === 'create' ? 'قسم جديد' : 'تعديل القسم'" @close="modal = null">
      <form id="dept-form" class="stack" novalidate @submit.prevent="save">
        <div class="field">
          <label for="d-name" class="req">اسم القسم</label>
          <input id="d-name" v-model="form.name" class="input" :class="{ invalid: errors.name }" />
          <span v-if="errors.name" class="error">{{ errors.name }}</span>
        </div>
        <div class="field">
          <label for="d-desc">الوصف</label>
          <textarea id="d-desc" v-model="form.description" class="textarea" rows="3" />
        </div>
        <div v-if="modal.mode === 'create'" class="field">
          <label for="d-manager">مدير القسم (اختياري)</label>
          <select id="d-manager" v-model="form.manager_id" class="select" :class="{ invalid: errors.manager_id }">
            <option value="">— لاحقاً —</option>
            <option v-for="u in candidates" :key="u.id" :value="u.id">
              {{ u.full_name }} — {{ u.role === 'manager' ? 'مدير' : 'موظف' }}{{ u.department_name ? ` (${u.department_name})` : '' }}
            </option>
          </select>
          <span v-if="errors.manager_id" class="error">{{ errors.manager_id }}</span>
          <span v-else class="hint">اختيار مدير يرأس قسماً آخر سيُفرغ ذلك القسم. اختيار موظف يرقّيه إلى مدير.</span>
        </div>
      </form>
      <template #footer>
        <button class="btn" @click="modal = null">إلغاء</button>
        <button type="submit" form="dept-form" class="btn btn-primary" :disabled="saving">{{ saving ? 'جارٍ الحفظ…' : 'حفظ' }}</button>
      </template>
    </BaseModal>
  </div>
</template>

<style scoped>
.dept-grid { display: grid; gap: 16px; grid-template-columns: repeat(auto-fill, minmax(290px, 1fr)); }
.dept { display: flex; flex-direction: column; gap: 14px; }
.name { display: inline-flex; align-items: center; gap: 8px; font-weight: 700; font-size: 1.05rem; color: var(--text); }
.desc { min-height: 2.6em; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.manager { min-height: 36px; display: flex; align-items: center; }
.stats { display: flex; gap: 16px; flex-wrap: wrap; font-size: 0.88rem; color: var(--text-2); }
.stats span { display: inline-flex; align-items: center; gap: 6px; }
</style>
