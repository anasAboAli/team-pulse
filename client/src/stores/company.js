import { defineStore } from 'pinia';
import { companyApi } from '@/api';

export const useCompanyStore = defineStore('company', {
  state: () => ({ name: 'TeamPulse', logo_url: null, loaded: false }),
  actions: {
    async load() {
      if (this.loaded) return;
      try {
        const { data } = await companyApi.public();
        Object.assign(this, data, { loaded: true });
      } catch {
        /* الاسم الافتراضي */
      }
    },
    set(company) {
      this.name = company.name;
      this.logo_url = company.logo_url;
    },
  },
});
