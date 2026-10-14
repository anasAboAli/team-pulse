<script setup>
import { CheckCircle2, AlertCircle, X } from 'lucide-vue-next';
import { useUiStore } from '@/stores/ui';

const ui = useUiStore();
</script>

<template>
  <div class="toasts" role="status" aria-live="polite">
    <TransitionGroup name="toast">
      <div v-for="t in ui.toasts" :key="t.id" class="toast" :class="t.type">
        <component :is="t.type === 'error' ? AlertCircle : CheckCircle2" class="icon" />
        <span>{{ t.message }}</span>
        <button class="btn btn-ghost btn-icon btn-sm" aria-label="إغلاق" @click="ui.dismiss(t.id)"><X /></button>
      </div>
    </TransitionGroup>
  </div>
</template>

<style scoped>
.toasts {
  position: fixed;
  inset-block-end: 20px;
  inset-inline-start: 20px;
  z-index: 1000;
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-width: min(420px, calc(100vw - 32px));
}
.toast {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 10px 10px 14px;
  padding-inline-start: 14px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-inline-start: 4px solid var(--success);
  border-radius: var(--radius);
  box-shadow: var(--shadow-lg);
  font-weight: 500;
}
.toast.error { border-inline-start-color: var(--danger); }
.toast span { flex: 1; }
.icon { width: 20px; height: 20px; color: var(--success); flex-shrink: 0; }
.toast.error .icon { color: var(--danger); }
.toast-enter-active, .toast-leave-active { transition: all 0.2s ease; }
.toast-enter-from, .toast-leave-to { opacity: 0; transform: translateY(10px); }
</style>
