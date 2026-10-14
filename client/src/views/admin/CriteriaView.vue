<script setup>
import { onMounted, reactive, ref } from 'vue';
import { Pencil, Plus, SlidersHorizontal, Trash2 } from 'lucide-vue-next';
import { criteriaApi } from '@/api';
import { errorMessage, fieldErrors } from '@/api/http';
import PageHeader from '@/components/common/PageHeader.vue';
import LoadingState from '@/components/common/LoadingState.vue';
import EmptyState from '@/components/common/EmptyState.vue';
import BaseModal from '@/components/common/BaseModal.vue';
import { useUiStore } from '@/stores/ui';

const ui = useUiStore();
const items = ref([]);
const loading = ref(true);
const modal = ref(null);
const form = reactive({ name: '', description: '', weight: 1, is_active: true });
const errors = ref({});

async function load() {
  loading.value = true;
  items.value = (await criteriaApi.list()).data;
  loading.value = false;
}

function open(item = null) {
  Object.assign(form, item ? { name: item.name, description: item.description || '', weight: item.weight, is_active: item.is_active } : { name: '', description: '', weight: 1, is_active: true });
  errors.value = {};
  modal.value = { id: item?.id ?? null };
}

async function save() {
  errors.value = {};
  try {
    const body = { ...form, weight: Number(form.weight) };
    if (modal.value.id) await criteriaApi.update(modal.value.id, body);
    else await criteriaApi.create(body);
    modal.value = null;
    ui.success('تم حفظ المعيار');
    load();
  } catch (e) {
    errors.value = fieldErrors(e);
    ui.error(errorMessage(e));
  }
}

async function remove(item) {
  if (!(await ui.confirm({ title: 'حذف المعيار', message: 'إذا كان المعيار مستخدماً في تقييمات سابقة فسيتم تعطيله فقط للحفاظ على السجل.', confirmText: 'حذف', danger: true }))) return;
  try {
    await criteriaApi.remove(item.id);
    ui.success('تم');
    load();
  } catch (e) {
    ui.error(errorMessage(e));
  }
}

onMounted(load);
</script>

<template>
  <div>
    <PageHeader title="معايير التقييم" subtitle="المعايير المفعّلة تظهر في نموذج التقييم، والوزن يحدد أثرها في الدرجة الكلية">
      <button class="btn btn-primary" @click="open()"><Plus /> معيار جديد</button>
    </PageHeader>

    <section class="card card-flush" style="max-width: 900px">
      <LoadingState v-if="loading" />
      <EmptyState v-else-if="!items.length" :icon="SlidersHorizontal" title="لا توجد معايير" />
      <div v-else class="table-wrap">
        <table class="table">
          <thead><tr><th>المعيار</th><th>الوزن</th><th>الحالة</th><th /></tr></thead>
          <tbody>
            <tr v-for="c in items" :key="c.id">
              <td>
                <strong>{{ c.name }}</strong>
                <div class="muted small">{{ c.description }}</div>
              </td>
              <td class="num">× {{ c.weight }}</td>
              <td><span class="badge" :class="c.is_active ? 'badge-success' : ''">{{ c.is_active ? 'مفعّل' : 'معطّل' }}</span></td>
              <td class="actions">
                <button class="btn btn-ghost btn-icon btn-sm" aria-label="تعديل" @click="open(c)"><Pencil /></button>
                <button class="btn btn-ghost btn-icon btn-sm" aria-label="حذف" style="color: var(--danger)" @click="remove(c)"><Trash2 /></button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <BaseModal v-if="modal" :title="modal.id ? 'تعديل المعيار' : 'معيار جديد'" size="sm" @close="modal = null">
      <form id="criterion-form" class="stack" novalidate @submit.prevent="save">
        <div class="field">
          <label for="cr-name" class="req">الاسم</label>
          <input id="cr-name" v-model="form.name" class="input" :class="{ invalid: errors.name }" />
          <span v-if="errors.name" class="error">{{ errors.name }}</span>
        </div>
        <div class="field">
          <label for="cr-desc">الوصف</label>
          <input id="cr-desc" v-model="form.description" class="input" />
        </div>
        <div class="field">
          <label for="cr-weight">الوزن</label>
          <input id="cr-weight" v-model="form.weight" type="number" step="0.25" min="0.1" max="10" class="input" dir="ltr" :class="{ invalid: errors.weight }" />
          <span v-if="errors.weight" class="error">{{ errors.weight }}</span>
          <span v-else class="hint">1 = وزن عادي، 1.5 = أهمية أعلى</span>
        </div>
        <label class="checkbox"><input v-model="form.is_active" type="checkbox" /> مفعّل</label>
      </form>
      <template #footer>
        <button class="btn" @click="modal = null">إلغاء</button>
        <button type="submit" form="criterion-form" class="btn btn-primary">حفظ</button>
      </template>
    </BaseModal>
  </div>
</template>
