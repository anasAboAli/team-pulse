<script setup>
import { ref } from 'vue';
import { UploadCloud } from 'lucide-vue-next';

const props = defineProps({
  accept: { type: String, default: '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.png,.jpg,.jpeg,.webp,.zip,.rar' },
  maxFiles: { type: Number, default: 5 },
  maxMb: { type: Number, default: 10 },
  disabled: { type: Boolean, default: false },
  progress: { type: Number, default: null },
});
const emit = defineEmits(['select', 'error']);

const input = ref(null);
const dragging = ref(false);

function handle(fileList) {
  const files = [...fileList];
  if (!files.length) return;
  if (files.length > props.maxFiles) return emit('error', `الحد الأقصى ${props.maxFiles} ملفات في المرة الواحدة`);
  const tooBig = files.find((f) => f.size > props.maxMb * 1024 * 1024);
  if (tooBig) return emit('error', `الملف "${tooBig.name}" أكبر من ${props.maxMb} ميغابايت`);
  emit('select', files);
}

function onDrop(e) {
  dragging.value = false;
  if (!props.disabled) handle(e.dataTransfer.files);
}
function onChange(e) {
  handle(e.target.files);
  e.target.value = '';
}
</script>

<template>
  <div
    class="drop"
    :class="{ dragging, disabled }"
    role="button"
    tabindex="0"
    @click="!disabled && input.click()"
    @keydown.enter.prevent="!disabled && input.click()"
    @dragover.prevent="dragging = true"
    @dragleave="dragging = false"
    @drop.prevent="onDrop"
  >
    <UploadCloud class="icon" />
    <template v-if="progress != null">
      <strong>جارٍ الرفع… <span class="num">{{ progress }}%</span></strong>
      <div class="progress" style="width: 200px"><span :style="{ width: `${progress}%` }" /></div>
    </template>
    <template v-else>
      <strong>اسحب الملفات هنا أو انقر للاختيار</strong>
      <span class="muted small">PDF، Word، Excel، صور، ZIP — حتى {{ maxMb }} ميغابايت للملف، و{{ maxFiles }} ملفات كحد أقصى</span>
    </template>
    <input ref="input" type="file" multiple :accept="accept" hidden @change="onChange" />
  </div>
</template>

<style scoped>
.drop {
  display: flex; flex-direction: column; align-items: center; gap: 6px; text-align: center;
  padding: 24px 16px; border: 2px dashed var(--border-strong); border-radius: var(--radius-lg);
  background: var(--surface-2); cursor: pointer; transition: border-color 0.15s, background 0.15s;
}
.drop:hover, .drop.dragging { border-color: var(--primary); background: var(--primary-soft); }
.drop.disabled { opacity: 0.6; cursor: not-allowed; }
.icon { width: 30px; height: 30px; color: var(--primary); }
</style>
