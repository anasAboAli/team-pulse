import { defineStore } from 'pinia';
import { notificationsApi } from '@/api';

const POLL_MS = 60_000;

export const useNotificationsStore = defineStore('notifications', {
  state: () => ({
    unread: 0,
    recent: [],
    loading: false,
    timer: null,
  }),

  actions: {
    async fetchRecent() {
      this.loading = true;
      try {
        const res = await notificationsApi.list({ per_page: 8 });
        this.recent = res.data;
        this.unread = res.meta.unread;
      } finally {
        this.loading = false;
      }
    },

    async refreshCount() {
      try {
        const { data } = await notificationsApi.unreadCount();
        this.unread = data.unread;
      } catch {
        /* تجاهل أخطاء الاستطلاع */
      }
    },

    startPolling() {
      this.stopPolling();
      this.refreshCount();
      this.timer = setInterval(() => document.visibilityState === 'visible' && this.refreshCount(), POLL_MS);
    },

    stopPolling() {
      clearInterval(this.timer);
      this.timer = null;
    },

    async markRead(n) {
      if (n.is_read) return;
      await notificationsApi.markRead(n.id);
      n.is_read = true;
      this.unread = Math.max(0, this.unread - 1);
    },

    async markAllRead() {
      await notificationsApi.markAllRead();
      this.recent.forEach((n) => (n.is_read = true));
      this.unread = 0;
    },
  },
});
