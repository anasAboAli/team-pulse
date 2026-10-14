<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import { departmentsApi, usersApi } from '@/api';
import { errorMessage, fieldErrors } from '@/api/http';
import BaseModal from '@/components/common/BaseModal.vue';
import { useAuthStore } from '@/stores/auth';
import { useUiStore } from '@/stores/ui';
import { ROLES } from '@/utils/constants';

/** إنشاء أو تعديل مستخدم — المدير يرى حقول موظف قسمه فقط */
const props = defineProps({
  user: { type: Object, default: null },
  defaultRole: { type: String, default: 'employee' },
  defaultDepartment: { type: Number, default: null },
});
const emit = defineEmits(['close', 'saved']);

const auth = useAuthStore();
const ui = useUiStore();
const isEdit = computed(() => !!props.user);

const form = reactive({
  full_name: props.user?.full_name ?? '',
  email: props.user?.email ?? '',
  job_title: props.user?.job_title ?? '',
  phone: props.user?.phone ?? '',
  hire_date: props.user?.hire_date ?? '',
  role: props.user?.role ?? (['admin', 'manager', 'employee'].includes(props.defaultRole) ? props.defaultRole : 'employee'),
  department_id: props.user?.department_id ?? props.defaultDepartment ?? '',
  password: '',
});
const departments = ref([]);
const errors = ref({});
const saving = ref(false);

const managerDeptTaken = computed(() => {
  if (form.role !== 'manager' || !form.department_id) return null;
  const d = departments.value.find((x) => x.id === Number(form.department_id));
  return d?.manager && d.manager.id !== props.user?.id ? d.manager.full_name : null;
});

onMounted(async () => {
  if (auth.isAdmin) departments.value = (await departmentsApi.list()).data;
});

async function submit() {
  errors.value = {};
  saving.value = true;
  try {
    let res;
    if (isEdit.value) {
      const body = { full_name: form.full_name, email: form.email, job_title: form.job_title, phone: form.phone, hire_date: form.hire_date || null };
      if (auth.isAdmin && props.user.id !== auth.user.id) body.role = form.role;
      res = await usersApi.update(props.user.id, body);
    } else {
      res = await usersApi.create({
        ...form,
        department_id: auth.isAdmin && form.role !== 'admin' ? Number(form.department_id) || null : undefined,
        role: auth.isAdmin ? form.role : undefined,
        hire_date: form.hire_date || null,
        password: form.password || undefined,
      });
    }
    ui.success(isEdit.value ? 'تم حفظ التعديلات' : 'تم إنشاء الحساب');
    emit('saved', res);
  } catch (e) {
    errors.value = fieldErrors(e);
    ui.error(errorMessage(e));
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <BaseModal :title="isEdit ? 'تعديل بيانات المستخدم' : auth.isManager ? 'إضافة موظف للقسم' : 'إضافة مستخدم'" size="lg" @close="emit('close')">
    <form id="user-form" class="form-grid" novalidate @submit.prevent="submit">
      <div class="field">
        <label for="u-name" class="req">الاسم الكامل</label>
        <input id="u-name" v-model="form.full_name" class="input" :class="{ invalid: errors.full_name }" />
        <span v-if="errors.full_name" class="error">{{ errors.full_name }}</span>
      </div>
      <div class="field">
        <label for="u-email" class="req">البريد الإلكتروني</label>
        <input id="u-email" v-model="form.email" type="email" dir="ltr" class="input" :class="{ invalid: errors.email }" />
        <span v-if="errors.email" class="error">{{ errors.email }}</span>
      </div>

      <template v-if="auth.isAdmin && (!isEdit || user.id !== auth.user.id)">
        <div class="field">
          <label for="u-role">الدور</label>
          <select id="u-role" v-model="form.role" class="select">
            <option v-for="(r, key) in ROLES" :key="key" :value="key">{{ r.label }}</option>
          </select>
          <span v-if="isEdit && form.role !== user.role" class="hint">
            {{ user.role === 'manager' ? 'سيُزال من رئاسة قسمه.' : form.role === 'manager' && user.department_id ? 'سيصبح رئيس قسمه الحالي.' : '' }}
          </span>
        </div>
        <div v-if="!isEdit && form.role !== 'admin'" class="field">
          <label for="u-dept">{{ form.role === 'manager' ? 'القسم الذي سيرأسه' : 'القسم' }}</label>
          <select id="u-dept" v-model="form.department_id" class="select" :class="{ invalid: errors.department_id }">
            <option value="">— بدون قسم —</option>
            <option v-for="d in departments" :key="d.id" :value="d.id">{{ d.name }}</option>
          </select>
          <span v-if="errors.department_id" class="error">{{ errors.department_id }}</span>
          <span v-else-if="managerDeptTaken" class="hint" style="color: var(--warning)">سيحل محل المدير الحالي ({{ managerDeptTaken }}).</span>
        </div>
      </template>
      <div v-else-if="!isEdit" class="field">
        <label>القسم</label>
        <input class="input" :value="auth.user.department?.name" disabled />
      </div>

      <div class="field">
        <label for="u-job">المسمّى الوظيفي</label>
        <input id="u-job" v-model="form.job_title" class="input" />
      </div>
      <div class="field">
        <label for="u-phone">الهاتف</label>
        <input id="u-phone" v-model="form.phone" class="input" dir="ltr" />
      </div>
      <div class="field">
        <label for="u-hire">تاريخ التعيين</label>
        <input id="u-hire" v-model="form.hire_date" type="date" class="input" />
      </div>

      <div v-if="!isEdit" class="field">
        <label for="u-pw">كلمة مرور أولية</label>
        <input id="u-pw" v-model="form.password" type="text" dir="ltr" class="input" autocomplete="off" :class="{ invalid: errors.password }" placeholder="اتركها فارغة لتوليد كلمة مؤقتة" />
        <span v-if="errors.password" class="error">{{ errors.password }}</span>
        <span v-else class="hint">سيُطلب من المستخدم تغييرها عند أول دخول.</span>
      </div>
    </form>
    <template #footer>
      <button class="btn" @click="emit('close')">إلغاء</button>
      <button type="submit" form="user-form" class="btn btn-primary" :disabled="saving">{{ saving ? 'جارٍ الحفظ…' : isEdit ? 'حفظ' : 'إنشاء الحساب' }}</button>
    </template>
  </BaseModal>
</template>
