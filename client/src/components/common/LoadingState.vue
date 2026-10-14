<script setup>
defineProps({
  rows: { type: Number, default: 4 },
  variant: { type: String, default: 'list' }, // list | dashboard
});
</script>

<template>
  <div v-if="variant === 'dashboard'" class="stack" aria-busy="true" aria-label="جارٍ التحميل">
    <div class="grid-kpi">
      <div v-for="i in 4" :key="i" class="skeleton" style="height: 112px" />
    </div>
    <div class="grid-2">
      <div class="skeleton" style="height: 320px" />
      <div class="skeleton" style="height: 320px" />
    </div>
  </div>
  <div v-else class="stack-sm" aria-busy="true" aria-label="جارٍ التحميل" style="padding: 16px 20px">
    <div v-for="i in rows" :key="i" class="skeleton" style="height: 44px" />
  </div>
</template>
