<script setup>
import { ChevronLeft, ChevronRight } from 'lucide-vue-next';

const props = defineProps({
  meta: { type: Object, default: null },
});
const emit = defineEmits(['change']);

const go = (page) => page >= 1 && page <= props.meta.last_page && emit('change', page);
</script>

<template>
  <div v-if="meta && meta.total > 0" class="pager">
    <span class="muted small">
      عرض <span class="num">{{ (meta.page - 1) * meta.per_page + 1 }}–{{ Math.min(meta.page * meta.per_page, meta.total) }}</span>
      من <span class="num">{{ meta.total }}</span>
    </span>
    <div v-if="meta.last_page > 1" class="row" style="gap: 6px">
      <button class="btn btn-sm btn-icon" :disabled="meta.page <= 1" aria-label="السابق" @click="go(meta.page - 1)"><ChevronRight /></button>
      <span class="small num">{{ meta.page }} / {{ meta.last_page }}</span>
      <button class="btn btn-sm btn-icon" :disabled="meta.page >= meta.last_page" aria-label="التالي" @click="go(meta.page + 1)"><ChevronLeft /></button>
    </div>
  </div>
</template>

<style scoped>
.pager {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  padding: 12px 20px;
  border-block-start: 1px solid var(--border);
}
</style>
