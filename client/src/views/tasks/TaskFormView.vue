<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { Save } from 'lucide-vue-next';
import { tasksApi, usersApi } from '@/api';
import { errorMessage, fieldErrors } from '@/api/http';
import PageHeader from '@/components/common/PageHeader.vue';
import LoadingState from '@/components/common/LoadingState.vue';
import { useAuthStore } from '@/stores/auth';
import { useUiStore } from '@/stores/ui';
import { TASK_PRIORITIES } from '@/utils/constants';
import { todayISO } from '@/utils/format';

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();
const ui = useUiStore();

const isEdit = computed(() => !!route.params.id);
const form = reactive({
  title: '',
  description: '',
  assignee_id: route.query.assignee_id ? Number(route.query.assignee_id) : '',
  priority: 'medium',
  due_date: '',
  requires_attachment: false,
});
const employees = ref([]);
const errors = ref({});
const loading = ref(true);
const saving = ref(false);

// تجميع الموظفين حسب القسم للمشرف
const groups = computed(() => {
  const map = new Map();
  for (const e of employees.value) {
    const key = e.department_name || 'بدون قسم';
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(e);
  }
  return [...map.entries()];
});

onMounted(async () => {
  try {
    employees.value = (await usersApi.options({ role: 'employee' })).data;
    if (isEdit.value) {
      const { data } = await tasksApi.get(route.params.id);
      if (!data.permissions.can_edit) {
        ui.error('لا يمكن تعديل هذه المهمة');
        return router.replace(`/tasks/${data.id}`);
      }
      Object.assign(form, {
        title: data.title,
        description: data.description || '',
        assignee_id: data.assignee_id,
        priority: data.priority,
        due_date: data.due_date || '',
        requires_attachment: data.requires_attachment,
      });
      // الموظف الحالي قد يكون خارج القائمة (منقول) — نضيفه للعرض
      if (!employees.value.some((e) => e.id === data.assignee_id)) {
        employees.value.push({ id: data.assignee_id, full_name: data.assignee.full_name, department_name: data.department?.name });
      }
    }
  } catch (e) {
    ui.error(errorMessage(e));
    router.replace('/tasks');
  } finally {
    loading.value = false;
  }
});

async function submit() {
  errors.value = {};
  saving.value = true;
  const body = { ...form, assignee_id: Number(form.assignee_id) || undefined, due_date: form.due_date || null };
  try {
    const { data } = isEdit.value ? await tasksApi.update(route.params.id, body) : await tasksApi.create(body);
    ui.success(isEdit.value ? 'تم حفظ التعديلات' : 'تم إسناد المهمة وإشعار الموظف');
    router.push(`/tasks/${data.id}`);
  } catch (e) {
    errors.value = fieldErrors(e);
    ui.error(errorMessage(e));
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <div>
    <PageHeader
      :title="isEdit ? 'تعديل المهمة' : 'إسناد مهمة جديدة'"
      :subtitle="auth.isManager ? 'يمكنك إسناد المهام لموظفي قسمك فقط' : 'يمكنك إسناد المهام لأي موظف في الشركة'"
      :back="isEdit ? `/tasks/${route.params.id}` : '/tasks'"
    />

    <div class="card" style="max-width: 820px">
      <LoadingState v-if="loading" :rows="5" />
      <form v-else class="form-grid" novalidate @submit.prevent="submit">
        <div class="field full">
          <label for="title" class="req">عنوان المهمة</label>
          <input id="title" v-model="form.title" class="input" :class="{ invalid: errors.title }" maxlength="200" placeholder="مثال: إعداد تقرير المبيعات الشهري" />
          <span v-if="errors.title" class="error">{{ errors.title }}</span>
        </div>

        <div class="field full">
          <label for="desc">الوصف والتفاصيل</label>
          <textarea id="desc" v-model="form.description" class="textarea" rows="5" maxlength="5000" placeholder="اشرح المطلوب ومعايير التسليم…" />
          <span v-if="errors.description" class="error">{{ errors.description }}</span>
        </div>

        <div class="field">
          <label for="assignee" class="req">الموظف المُسند إليه</label>
          <select id="assignee" v-model="form.assignee_id" class="select" :class="{ invalid: errors.assignee_id }">
            <option value="" disabled>اختر موظفاً…</option>
            <template v-if="auth.isAdmin">
              <optgroup v-for="[dept, list] in groups" :key="dept" :label="dept">
                <option v-for="e in list" :key="e.id" :value="e.id">{{ e.full_name }}{{ e.job_title ? ` — ${e.job_title}` : '' }}</option>
              </optgroup>
            </template>
            <template v-else>
              <option v-for="e in employees" :key="e.id" :value="e.id">{{ e.full_name }}{{ e.job_title ? ` — ${e.job_title}` : '' }}</option>
            </template>
          </select>
          <span v-if="errors.assignee_id" class="error">{{ errors.assignee_id }}</span>
          <span v-else-if="!employees.length" class="hint">لا يوجد موظفون نشطون متاحون للإسناد.</span>
        </div>

        <div class="field">
          <label for="priority">الأولوية</label>
          <select id="priority" v-model="form.priority" class="select">
            <option v-for="(p, key) in TASK_PRIORITIES" :key="key" :value="key">{{ p.label }}</option>
          </select>
        </div>

        <div class="field">
          <label for="due">موعد التسليم</label>
          <input id="due" v-model="form.due_date" type="date" class="input" :min="isEdit ? undefined : todayISO()" :class="{ invalid: errors.due_date }" />
          <span v-if="errors.due_date" class="error">{{ errors.due_date }}</span>
        </div>

        <div class="field" style="justify-content: flex-end">
          <label class="checkbox">
            <input v-model="form.requires_attachment" type="checkbox" />
            تتطلب رفع ملف عند التسليم
          </label>
          <span class="hint">لن يتمكن الموظف من التسليم دون إرفاق ملف.</span>
        </div>

        <div class="full row" style="justify-content: flex-end; margin-top: 8px">
          <RouterLink :to="isEdit ? `/tasks/${route.params.id}` : '/tasks'" class="btn">إلغاء</RouterLink>
          <button type="submit" class="btn btn-primary" :disabled="saving"><Save /> {{ saving ? 'جارٍ الحفظ…' : isEdit ? 'حفظ التعديلات' : 'إسناد المهمة' }}</button>
        </div>
      </form>
    </div>
  </div>
</template>
