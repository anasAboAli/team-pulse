import { onMounted, reactive, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { errorMessage } from '@/api/http';

const clean = (obj) => Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== '' && v != null && v !== false));
const serialize = (obj) => JSON.stringify(Object.entries(clean(obj)).map(([k, v]) => [k, String(v)]).sort());

/**
 * قائمة مع ترقيم وفلاتر متزامنة مع رابط الصفحة (?status=...&page=2)
 * fetcher(params) يجب أن يعيد { data, meta }
 */
export function useListQuery(fetcher, defaults = {}) {
  const route = useRoute();
  const router = useRouter();

  const fromQuery = () => ({ ...defaults, ...route.query, page: Number(route.query.page) || 1 });
  const filters = reactive(fromQuery());
  const rows = ref([]);
  const meta = ref(null);
  const loading = ref(true);
  const error = ref('');

  let timer = null;
  let requestId = 0;

  async function load() {
    const id = ++requestId;
    loading.value = true;
    error.value = '';
    try {
      const res = await fetcher(clean({ ...filters }));
      if (id !== requestId) return;
      rows.value = res.data;
      meta.value = res.meta;
    } catch (e) {
      if (id === requestId) error.value = errorMessage(e);
    } finally {
      if (id === requestId) loading.value = false;
    }
  }

  function schedule(delay = 250) {
    clearTimeout(timer);
    timer = setTimeout(() => {
      const query = clean({ ...filters, page: filters.page > 1 ? filters.page : null });
      if (serialize(query) !== serialize(route.query)) router.replace({ query });
      load();
    }, delay);
  }

  // تغيير أي فلتر يعيد للصفحة الأولى
  watch(
    () => serialize({ ...filters, page: null }),
    () => {
      filters.page = 1;
      schedule();
    },
  );
  watch(() => filters.page, () => schedule(0));

  // تنقّل خارجي لنفس الصفحة بفلاتر مختلفة (مثل روابط القائمة الجانبية)
  watch(
    () => route.query,
    (q) => {
      if (serialize({ ...q }) === serialize({ ...filters, page: filters.page > 1 ? filters.page : null })) return;
      for (const key of Object.keys(filters)) delete filters[key];
      Object.assign(filters, fromQuery());
    },
  );

  onMounted(load);

  return { filters, rows, meta, loading, error, reload: load };
}
