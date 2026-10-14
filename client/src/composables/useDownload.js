import { ref } from 'vue';
import { reportsApi, saveBlob } from '@/api';
import { useUiStore } from '@/stores/ui';

/** تنزيل تقارير CSV مع حالة تحميل */
export function useReportDownload() {
  const ui = useUiStore();
  const busy = ref(null);

  async function download(name) {
    busy.value = name;
    try {
      saveBlob(await reportsApi.download(name), `${name}.csv`);
    } catch {
      ui.error('تعذّر تنزيل التقرير');
    } finally {
      busy.value = null;
    }
  }

  return { busy, download };
}
