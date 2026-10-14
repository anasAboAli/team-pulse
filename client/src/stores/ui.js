import { defineStore } from 'pinia';

let toastId = 0;

/** التنبيهات المؤقتة + نافذة التأكيد العامة */
export const useUiStore = defineStore('ui', {
  state: () => ({
    toasts: [],
    confirmState: null,
    sidebarOpen: false,
  }),

  actions: {
    toast(message, type = 'success', timeout = 4000) {
      const id = ++toastId;
      this.toasts.push({ id, message, type });
      if (timeout) setTimeout(() => this.dismiss(id), timeout);
    },
    success(message) {
      this.toast(message, 'success');
    },
    error(message) {
      this.toast(message, 'error', 6000);
    },
    dismiss(id) {
      this.toasts = this.toasts.filter((t) => t.id !== id);
    },

    /**
     * يعرض نافذة تأكيد ويعيد Promise<boolean>
     * options: { title, message, confirmText, danger, input: { label, required, placeholder } }
     * إذا وُجد input يعيد النص المدخل أو false
     */
    confirm(options) {
      return new Promise((resolve) => {
        this.confirmState = { confirmText: 'تأكيد', cancelText: 'إلغاء', ...options, resolve };
      });
    },
    resolveConfirm(value) {
      this.confirmState?.resolve(value);
      this.confirmState = null;
    },
  },
});
