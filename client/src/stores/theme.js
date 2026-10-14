import { defineStore } from 'pinia';

const KEY = 'tp-theme';
const media = typeof window !== 'undefined' ? window.matchMedia('(prefers-color-scheme: dark)') : null;

function readMode() {
  try {
    return localStorage.getItem(KEY) || 'system';
  } catch {
    return 'system';
  }
}

export const useThemeStore = defineStore('theme', {
  state: () => ({
    mode: readMode(), // light | dark | system
    resolved: 'light', // الثيم المطبّق فعلياً
  }),

  getters: {
    isDark: (s) => s.resolved === 'dark',
  },

  actions: {
    init() {
      this.apply();
      media?.addEventListener('change', () => this.mode === 'system' && this.apply());
    },

    setMode(mode) {
      this.mode = mode;
      try {
        localStorage.setItem(KEY, mode);
      } catch {
        /* التخزين غير متاح */
      }
      this.apply();
    },

    toggle() {
      this.setMode(this.resolved === 'dark' ? 'light' : 'dark');
    },

    apply() {
      this.resolved = this.mode === 'system' ? (media?.matches ? 'dark' : 'light') : this.mode;
      document.documentElement.dataset.theme = this.resolved;
    },
  },
});
