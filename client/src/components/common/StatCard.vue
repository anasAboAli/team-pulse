<script setup>
defineProps({
  label: { type: String, required: true },
  value: { type: [String, Number], default: '—' },
  hint: { type: String, default: '' },
  icon: { type: [Object, Function], default: null },
  tone: { type: String, default: 'primary' }, // primary | success | warning | danger | violet
  to: { type: [String, Object], default: null },
});
</script>

<template>
  <component :is="to ? 'RouterLink' : 'div'" :to="to" class="stat card" :class="{ link: to }">
    <div class="top">
      <span class="label">{{ label }}</span>
      <span v-if="icon" class="icon" :class="tone"><component :is="icon" /></span>
    </div>
    <div class="value">{{ value }}</div>
    <div v-if="hint || $slots.default" class="hint"><slot>{{ hint }}</slot></div>
  </component>
</template>

<style scoped>
.stat { display: flex; flex-direction: column; gap: 6px; padding: 18px; color: inherit; text-decoration: none !important; }
.stat.link { transition: border-color 0.15s, transform 0.15s; }
.stat.link:hover { border-color: var(--primary); }
.top { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.label { font-size: 0.875rem; color: var(--text-2); font-weight: 500; }
.value { font-size: 1.75rem; font-weight: 700; line-height: 1.2; }
.hint { font-size: 0.8rem; color: var(--text-muted); }
.icon { width: 36px; height: 36px; border-radius: 10px; display: grid; place-items: center; }
.icon svg { width: 19px; height: 19px; }
.primary { background: var(--primary-soft); color: var(--primary-text); }
.success { background: var(--success-soft); color: var(--success); }
.warning { background: var(--warning-soft); color: var(--warning); }
.danger { background: var(--danger-soft); color: var(--danger); }
.violet { background: var(--violet-soft); color: var(--violet); }
</style>
