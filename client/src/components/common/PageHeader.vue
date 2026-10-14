<script setup>
import { ArrowRight } from 'lucide-vue-next';

defineProps({
  title: { type: String, required: true },
  subtitle: { type: String, default: '' },
  back: { type: [String, Object], default: null },
});
</script>

<template>
  <div class="page-header">
    <div class="titles">
      <RouterLink v-if="back" :to="back" class="btn btn-ghost btn-icon btn-sm back" aria-label="رجوع"><ArrowRight /></RouterLink>
      <div>
        <h1>{{ title }}</h1>
        <p v-if="subtitle" class="muted">{{ subtitle }}</p>
      </div>
    </div>
    <div v-if="$slots.default" class="actions"><slot /></div>
  </div>
</template>

<style scoped>
.page-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
  margin-block-end: 24px;
}
.titles { display: flex; align-items: flex-start; gap: 8px; min-width: 0; }
.back { margin-block-start: 2px; }
.actions { display: flex; gap: 8px; flex-wrap: wrap; }
</style>
