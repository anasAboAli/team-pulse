<script setup>
import { Inbox } from 'lucide-vue-next';

defineProps({
  title: { type: String, default: 'لا توجد بيانات' },
  message: { type: String, default: '' },
  icon: { type: [Object, Function], default: () => Inbox },
});
</script>

<template>
  <div class="empty">
    <span class="icon"><component :is="icon" /></span>
    <h3>{{ title }}</h3>
    <p v-if="message" class="muted small">{{ message }}</p>
    <div v-if="$slots.default" class="actions"><slot /></div>
  </div>
</template>

<style scoped>
.empty { display: flex; flex-direction: column; align-items: center; text-align: center; gap: 8px; padding: 40px 16px; }
.icon { width: 52px; height: 52px; display: grid; place-items: center; border-radius: 50%; background: var(--surface-3); color: var(--text-muted); margin-block-end: 4px; }
.icon svg { width: 24px; height: 24px; }
.actions { margin-block-start: 8px; }
</style>
