<script setup>
import { onMounted, reactive, ref } from 'vue';
import { Building, ImageUp, Save } from 'lucide-vue-next';
import { companyApi } from '@/api';
import { errorMessage, fieldErrors } from '@/api/http';
import PageHeader from '@/components/common/PageHeader.vue';
import LoadingState from '@/components/common/LoadingState.vue';
import { useCompanyStore } from '@/stores/company';
import { useUiStore } from '@/stores/ui';

const ui = useUiStore();
const companyStore = useCompanyStore();

const form = reactive({ name: '', email: '', phone: '', website: '', address: '', description: '', founded_at: '' });
const logo = ref(null);
const loading = ref(true);
const saving = ref(false);
const errors = ref({});
const fileInput = ref(null);

function fill(data) {
  for (const key of Object.keys(form)) form[key] = data[key] ?? '';
  logo.value = data.logo_url;
  companyStore.set(data);
}

onMounted(async () => {
  try {
    fill((await companyApi.get()).data);
  } finally {
    loading.value = false;
  }
});

async function save() {
  saving.value = true;
  errors.value = {};
  try {
    fill((await companyApi.update({ ...form, founded_at: form.founded_at || null })).data);
    ui.success('تم حفظ بيانات الشركة');
  } catch (e) {
    errors.value = fieldErrors(e);
    ui.error(errorMessage(e));
  } finally {
    saving.value = false;
  }
}

async function uploadLogo(e) {
  const file = e.target.files[0];
  e.target.value = '';
  if (!file) return;
  try {
    fill((await companyApi.uploadLogo(file)).data);
    ui.success('تم تحديث الشعار');
  } catch (err) {
    ui.error(errorMessage(err));
  }
}
</script>

<template>
  <div>
    <PageHeader title="بيانات الشركة" subtitle="المعلومات العامة التي تظهر في النظام" />

    <div class="card" style="max-width: 860px">
      <LoadingState v-if="loading" :rows="6" />
      <form v-else class="stack" style="gap: 24px" novalidate @submit.prevent="save">
        <div class="row" style="gap: 16px">
          <div class="logo">
            <img v-if="logo" :src="logo" alt="شعار الشركة" />
            <Building v-else />
          </div>
          <div class="stack-sm">
            <strong>شعار الشركة</strong>
            <span class="muted small">PNG أو JPG أو WEBP — حتى 2 ميغابايت</span>
            <button type="button" class="btn btn-sm" style="width: fit-content" @click="fileInput.click()"><ImageUp /> رفع شعار</button>
            <input ref="fileInput" type="file" accept=".png,.jpg,.jpeg,.webp" hidden @change="uploadLogo" />
          </div>
        </div>

        <div class="form-grid">
          <div class="field">
            <label for="c-name" class="req">اسم الشركة</label>
            <input id="c-name" v-model="form.name" class="input" :class="{ invalid: errors.name }" />
            <span v-if="errors.name" class="error">{{ errors.name }}</span>
          </div>
          <div class="field">
            <label for="c-founded">تاريخ التأسيس</label>
            <input id="c-founded" v-model="form.founded_at" type="date" class="input" />
          </div>
          <div class="field">
            <label for="c-email">البريد الإلكتروني</label>
            <input id="c-email" v-model="form.email" type="email" dir="ltr" class="input" :class="{ invalid: errors.email }" />
            <span v-if="errors.email" class="error">{{ errors.email }}</span>
          </div>
          <div class="field">
            <label for="c-phone">الهاتف</label>
            <input id="c-phone" v-model="form.phone" dir="ltr" class="input" />
          </div>
          <div class="field">
            <label for="c-web">الموقع الإلكتروني</label>
            <input id="c-web" v-model="form.website" dir="ltr" class="input" />
          </div>
          <div class="field">
            <label for="c-address">العنوان</label>
            <input id="c-address" v-model="form.address" class="input" />
          </div>
          <div class="field full">
            <label for="c-desc">نبذة عن الشركة</label>
            <textarea id="c-desc" v-model="form.description" class="textarea" rows="4" />
          </div>
        </div>

        <div class="row" style="justify-content: flex-end">
          <button type="submit" class="btn btn-primary" :disabled="saving"><Save /> {{ saving ? 'جارٍ الحفظ…' : 'حفظ' }}</button>
        </div>
      </form>
    </div>
  </div>
</template>

<style scoped>
.logo { width: 88px; height: 88px; border-radius: 18px; background: var(--surface-3); display: grid; place-items: center; overflow: hidden; color: var(--text-muted); border: 1px solid var(--border); }
.logo img { width: 100%; height: 100%; object-fit: cover; }
.logo svg { width: 36px; height: 36px; }
</style>
