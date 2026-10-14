<script setup>
import { reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { KeyRound, LogOut } from 'lucide-vue-next';
import { authApi } from '@/api';
import { errorMessage, fieldErrors } from '@/api/http';
import { useAuthStore } from '@/stores/auth';
import { useUiStore } from '@/stores/ui';

const auth = useAuthStore();
const ui = useUiStore();
const router = useRouter();

const form = reactive({ current_password: '', new_password: '', confirm: '' });
const errors = ref({});
const loading = ref(false);

async function submit() {
  errors.value = {};
  if (form.new_password !== form.confirm) {
    errors.value = { confirm: 'كلمتا المرور غير متطابقتين' };
    return;
  }
  loading.value = true;
  try {
    const { data } = await authApi.changePassword({ current_password: form.current_password, new_password: form.new_password });
    auth.setUser(data);
    ui.success('تم تغيير كلمة المرور بنجاح');
    router.replace(auth.homeRoute);
  } catch (e) {
    errors.value = fieldErrors(e);
    if (!Object.keys(errors.value).length) ui.error(errorMessage(e));
  } finally {
    loading.value = false;
  }
}

async function logout() {
  await auth.logout();
  router.replace('/login');
}
</script>

<template>
  <div class="wrap">
    <form class="card box" novalidate @submit.prevent="submit">
      <div class="head">
        <span class="icon"><KeyRound /></span>
        <h1>تغيير كلمة المرور</h1>
        <p class="muted">
          {{ auth.mustChangePassword ? 'هذا أول دخول لك أو تمت إعادة تعيين كلمة المرور. يرجى اختيار كلمة مرور جديدة للمتابعة.' : 'اختر كلمة مرور جديدة.' }}
        </p>
      </div>

      <div class="field">
        <label for="cur" class="req">كلمة المرور الحالية (المؤقتة)</label>
        <input id="cur" v-model="form.current_password" type="password" class="input" dir="ltr" autocomplete="current-password" :class="{ invalid: errors.current_password }" />
        <span v-if="errors.current_password" class="error">{{ errors.current_password }}</span>
      </div>
      <div class="field">
        <label for="new" class="req">كلمة المرور الجديدة</label>
        <input id="new" v-model="form.new_password" type="password" class="input" dir="ltr" autocomplete="new-password" :class="{ invalid: errors.new_password }" />
        <span v-if="errors.new_password" class="error">{{ errors.new_password }}</span>
        <span v-else class="hint">8 أحرف على الأقل، وتحتوي على حرف إنجليزي ورقم</span>
      </div>
      <div class="field">
        <label for="confirm" class="req">تأكيد كلمة المرور</label>
        <input id="confirm" v-model="form.confirm" type="password" class="input" dir="ltr" autocomplete="new-password" :class="{ invalid: errors.confirm }" />
        <span v-if="errors.confirm" class="error">{{ errors.confirm }}</span>
      </div>

      <button type="submit" class="btn btn-primary btn-block" :disabled="loading">{{ loading ? 'جارٍ الحفظ…' : 'حفظ كلمة المرور' }}</button>
      <button v-if="auth.mustChangePassword" type="button" class="btn btn-ghost btn-block" @click="logout"><LogOut /> تسجيل الخروج</button>
      <RouterLink v-else :to="auth.homeRoute" class="btn btn-ghost btn-block">رجوع</RouterLink>
    </form>
  </div>
</template>

<style scoped>
.wrap { min-height: 100vh; display: grid; place-items: center; padding: 24px 16px; }
.box { width: 100%; max-width: 440px; padding: 32px; display: flex; flex-direction: column; gap: 16px; }
.head { text-align: center; display: flex; flex-direction: column; align-items: center; gap: 6px; }
.icon { width: 52px; height: 52px; border-radius: 50%; background: var(--primary-soft); color: var(--primary-text); display: grid; place-items: center; margin-block-end: 6px; }
</style>
