<script setup>
import { onBeforeUnmount, onMounted } from 'vue';
import { X } from 'lucide-vue-next';

const props = defineProps({
  title: { type: String, required: true },
  size: { type: String, default: 'md' }, // sm | md | lg
  persistent: { type: Boolean, default: false },
});
const emit = defineEmits(['close']);

const onKey = (e) => e.key === 'Escape' && !props.persistent && emit('close');
onMounted(() => {
  document.addEventListener('keydown', onKey);
  document.body.style.overflow = 'hidden';
});
onBeforeUnmount(() => {
  document.removeEventListener('keydown', onKey);
  document.body.style.overflow = '';
});
</script>

<template>
  <Teleport to="body">
    <div class="backdrop" @mousedown.self="!persistent && emit('close')">
      <div class="modal" :class="size" role="dialog" aria-modal="true" :aria-label="title">
        <header>
          <h2>{{ title }}</h2>
          <button class="btn btn-ghost btn-icon btn-sm" aria-label="إغلاق" @click="emit('close')"><X /></button>
        </header>
        <div class="body"><slot /></div>
        <footer v-if="$slots.footer"><slot name="footer" /></footer>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.backdrop {
  position: fixed;
  inset: 0;
  z-index: 900;
  background: var(--overlay);
  display: grid;
  place-items: center;
  padding: 16px;
  animation: fade 0.15s ease;
}
.modal {
  width: 100%;
  max-height: calc(100vh - 32px);
  display: flex;
  flex-direction: column;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  animation: pop 0.18s ease;
}
.sm { max-width: 420px; }
.md { max-width: 560px; }
.lg { max-width: 760px; }
header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-block-end: 1px solid var(--border);
}
.body { padding: 20px; overflow-y: auto; }
footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 14px 20px;
  border-block-start: 1px solid var(--border);
  background: var(--surface-2);
  border-radius: 0 0 var(--radius-lg) var(--radius-lg);
}
@keyframes fade { from { opacity: 0; } }
@keyframes pop { from { opacity: 0; transform: scale(0.97); } }
</style>
