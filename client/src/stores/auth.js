import { defineStore } from 'pinia';
import { authApi } from '@/api';
import { refreshSession, setAccessToken } from '@/api/http';

const HOME_BY_ROLE = {
  admin: '/admin/dashboard',
  manager: '/manager/dashboard',
  employee: '/my/dashboard',
};

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null,
    ready: false,
  }),

  getters: {
    isAuthenticated: (s) => !!s.user,
    role: (s) => s.user?.role ?? null,
    isAdmin: (s) => s.user?.role === 'admin',
    isManager: (s) => s.user?.role === 'manager',
    isEmployee: (s) => s.user?.role === 'employee',
    /** المشرف أو المدير: من يملك صلاحيات الإدارة */
    canManage: (s) => ['admin', 'manager'].includes(s.user?.role),
    mustChangePassword: (s) => !!s.user?.must_change_password,
    homeRoute: (s) => HOME_BY_ROLE[s.user?.role] ?? '/login',
  },

  actions: {
    /** استعادة الجلسة من كوكي الـ refresh عند فتح التطبيق */
    async init() {
      if (this.ready) return;
      try {
        const { user } = await refreshSession();
        this.user = user;
      } catch {
        this.user = null;
      } finally {
        this.ready = true;
      }
    },

    async login(email, password) {
      const { accessToken, user } = await authApi.login({ email, password });
      setAccessToken(accessToken);
      this.user = user;
      return user;
    },

    async refreshUser() {
      const { data } = await authApi.me();
      this.user = data;
    },

    setUser(user) {
      this.user = user;
    },

    async logout() {
      try {
        await authApi.logout();
      } catch {
        /* الجلسة منتهية أصلاً */
      }
      this.clear();
    },

    clear() {
      setAccessToken(null);
      this.user = null;
    },
  },
});
