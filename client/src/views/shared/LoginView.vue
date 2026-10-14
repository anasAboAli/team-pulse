<script setup>
import { onMounted, reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { BarChart3, Eye, EyeOff, LogIn, Moon, ShieldCheck, Sun, User, UserCog, Users } from 'lucide-vue-next';
import { errorMessage } from '@/api/http';
import { useAuthStore } from '@/stores/auth';
import { useCompanyStore } from '@/stores/company';
import { useThemeStore } from '@/stores/theme';

const auth = useAuthStore();
const company = useCompanyStore();
const theme = useThemeStore();
const route = useRoute();
const router = useRouter();

const form = reactive({ email: '', password: '' });
const showPassword = ref(false);
const loading = ref(false);
const error = ref('');

/**
 * الدخول السريع: يظهر في التطوير، أو في نسخة منشورة عند البناء بـ VITE_DEMO_LOGIN=true
 * (مناسب لموقع عرض تجريبي فقط — كلمات المرور تُضمَّن في ملفات الواجهة)
 */
const DEMO_ACCOUNTS = import.meta.env.DEV || import.meta.env.VITE_DEMO_LOGIN === 'true'
  ? [
      { label: 'مشرف', hint: 'كل الصلاحيات', icon: ShieldCheck, email: 'admin@teampulse.test', password: import.meta.env.VITE_DEMO_ADMIN_PASSWORD },
      { label: 'مدير قسم', hint: 'تقنية المعلومات', icon: UserCog, email: 'manager@teampulse.test', password: import.meta.env.VITE_DEMO_PASSWORD },
      { label: 'موظف', hint: 'مهامه فقط', icon: User, email: 'employee@teampulse.test', password: import.meta.env.VITE_DEMO_PASSWORD },
    ].filter((a) => a.password)
  : [];

function demoLogin(account) {
  form.email = account.email;
  form.password = account.password;
  submit();
}

async function submit() {
  error.value = '';
  if (!form.email || !form.password) {
    error.value = 'يرجى إدخال البريد الإلكتروني وكلمة المرور';
    return;
  }
  loading.value = true;
  try {
    const user = await auth.login(form.email.trim(), form.password);
    if (user.must_change_password) return router.replace('/change-password');
    const redirect = typeof route.query.redirect === 'string' && route.query.redirect.startsWith('/') ? route.query.redirect : auth.homeRoute;
    router.replace(redirect);
  } catch (e) {
    error.value = errorMessage(e);
  } finally {
    loading.value = false;
  }
}

onMounted(() => company.load());
</script>

<template>
  <div class="auth-page">
    <section class="hero" aria-hidden="true">
      <div class="hero-inner">
        <div class="mark">
          <svg viewBox="0 0 32 32"><path d="M5 17h5l3-7 5 13 3-6h6" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" /></svg>
        </div>
        <h2>نبض فريقك في مكان واحد</h2>
        <p>إدارة الأقسام والمهام وتقييم الأداء بصلاحيات واضحة لكل دور.</p>
        <ul>
          <li><ShieldCheck /> صلاحيات دقيقة: مشرف، مدير قسم، موظف</li>
          <li><Users /> إسناد المهام ومتابعة التسليم والمراجعة</li>
          <li><BarChart3 /> لوحات وتحليلات للأداء والتقييمات</li>
        </ul>
      </div>
    </section>

    <section class="form-side">
      <button class="btn btn-ghost btn-icon theme" :aria-label="theme.isDark ? 'الوضع الفاتح' : 'الوضع الداكن'" @click="theme.toggle()">
        <Sun v-if="theme.isDark" />
        <Moon v-else />
      </button>

      <form class="card login" novalidate @submit.prevent="submit">
        <div class="head">
          <img v-if="company.logo_url" :src="company.logo_url" alt="" class="logo" />
          <h1>تسجيل الدخول</h1>
          <p class="muted">{{ company.name }}</p>
        </div>

        <div v-if="error" class="alert" role="alert">{{ error }}</div>

        <div class="field">
          <label for="email">البريد الإلكتروني</label>
          <input id="email" v-model="form.email" type="email" class="input" dir="ltr" autocomplete="username" placeholder="name@company.com" autofocus />
        </div>

        <div class="field">
          <label for="password">كلمة المرور</label>
          <div class="pw">
            <input
              id="password"
              v-model="form.password"
              :type="showPassword ? 'text' : 'password'"
              class="input"
              dir="ltr"
              autocomplete="current-password"
            />
            <button type="button" class="btn btn-ghost btn-icon btn-sm eye" :aria-label="showPassword ? 'إخفاء' : 'إظهار'" @click="showPassword = !showPassword">
              <EyeOff v-if="showPassword" />
              <Eye v-else />
            </button>
          </div>
        </div>

        <button type="submit" class="btn btn-primary btn-block" :disabled="loading">
          <LogIn />
          {{ loading ? 'جارٍ الدخول…' : 'دخول' }}
        </button>

        <div v-if="DEMO_ACCOUNTS.length" class="demo">
          <span class="demo-title">دخول تجريبي سريع</span>
          <div class="demo-grid">
            <button v-for="a in DEMO_ACCOUNTS" :key="a.email" type="button" class="demo-btn" :disabled="loading" @click="demoLogin(a)">
              <component :is="a.icon" />
              <strong>{{ a.label }}</strong>
              <span class="muted">{{ a.hint }}</span>
            </button>
          </div>
        </div>

        <p class="muted small center">ليس لديك حساب؟ يتم إنشاء الحسابات من قِبل المشرف أو مدير القسم.</p>
      </form>
    </section>
  </div>
</template>

<style scoped>
.auth-page { min-height: 100vh; display: grid; grid-template-columns: 1fr 1fr; }
.hero {
  background: linear-gradient(160deg, #1c5cab, #2a78d6 55%, #4a3aa7);
  color: #fff; display: grid; place-items: center; padding: 48px;
}
.hero-inner { max-width: 420px; display: flex; flex-direction: column; gap: 16px; }
.mark { width: 56px; height: 56px; border-radius: 16px; background: rgba(255, 255, 255, 0.16); display: grid; place-items: center; }
.mark svg { width: 34px; height: 34px; }
.hero h2 { font-size: 1.9rem; }
.hero p { opacity: 0.9; font-size: 1.05rem; }
.hero ul { list-style: none; padding: 0; margin: 12px 0 0; display: flex; flex-direction: column; gap: 12px; }
.hero li { display: flex; align-items: center; gap: 10px; opacity: 0.95; }
.hero li svg { width: 20px; height: 20px; flex-shrink: 0; }

.form-side { position: relative; display: grid; place-items: center; padding: 32px 16px; }
.theme { position: absolute; top: 16px; inset-inline-end: 16px; }
.login { width: 100%; max-width: 400px; padding: 32px; display: flex; flex-direction: column; gap: 18px; }
.head { text-align: center; display: flex; flex-direction: column; align-items: center; gap: 4px; }
.logo { width: 56px; height: 56px; border-radius: 14px; object-fit: cover; margin-block-end: 8px; }
.alert { background: var(--danger-soft); color: var(--danger); padding: 10px 14px; border-radius: var(--radius); font-weight: 500; font-size: 0.9rem; }
.pw { position: relative; }
/* الحقل LTR داخل صفحة RTL: الزر على اليسار فعلياً */
.pw .input { padding-left: 44px; }
.eye { position: absolute; inset-inline-end: 4px; top: 50%; translate: 0 -50%; }
.center { text-align: center; }
.demo { display: flex; flex-direction: column; gap: 10px; padding-top: 16px; border-top: 1px dashed var(--border-strong); }
.demo-title { font-size: 0.8rem; font-weight: 700; color: var(--text-muted); text-align: center; }
.demo-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
.demo-btn {
  display: flex; flex-direction: column; align-items: center; gap: 2px;
  padding: 10px 6px; border: 1px solid var(--border); border-radius: var(--radius);
  background: var(--surface-2); cursor: pointer; font-size: 0.75rem;
}
.demo-btn strong { font-size: 0.85rem; }
.demo-btn svg { width: 20px; height: 20px; color: var(--primary); margin-bottom: 2px; }
.demo-btn:hover:not(:disabled) { border-color: var(--primary); background: var(--primary-soft); }

@media (max-width: 860px) {
  .auth-page { grid-template-columns: 1fr; }
  .hero { display: none; }
}
</style>
