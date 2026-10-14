import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import router from './router';
import { configureHttp } from './api/http';
import { useAuthStore } from './stores/auth';
import { useThemeStore } from './stores/theme';
import { useUiStore } from './stores/ui';
import './assets/styles/tokens.css';
import './assets/styles/base.css';

const app = createApp(App);
const pinia = createPinia();
app.use(pinia);

useThemeStore().init();

configureHttp({
  onSessionExpired: () => {
    const auth = useAuthStore();
    if (!auth.isAuthenticated) return;
    auth.clear();
    useUiStore().error('انتهت الجلسة، يرجى تسجيل الدخول مجدداً');
    router.push({ name: 'login', query: { redirect: router.currentRoute.value.fullPath } });
  },
  onPasswordChangeRequired: () => router.push({ name: 'change-password' }),
});

app.use(router);
app.mount('#app');
