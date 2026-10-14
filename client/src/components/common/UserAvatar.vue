<script setup>
import { computed } from 'vue';
import { initials } from '@/utils/format';

const props = defineProps({
  name: { type: String, default: '' },
  src: { type: String, default: null },
  size: { type: Number, default: 36 },
});

// لون ثابت لكل اسم من مجموعة محدودة
const TONES = ['#2a78d6', '#1baf7a', '#eb6834', '#4a3aa7', '#d55181', '#008300'];
const tone = computed(() => {
  let h = 0;
  for (const ch of props.name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return TONES[h % TONES.length];
});
</script>

<template>
  <span class="avatar" :style="{ width: `${size}px`, height: `${size}px`, fontSize: `${size * 0.36}px`, background: src ? 'transparent' : tone }">
    <img v-if="src" :src="src" :alt="name" />
    <span v-else aria-hidden="true">{{ initials(name) }}</span>
  </span>
</template>

<style scoped>
.avatar {
  display: inline-grid;
  place-items: center;
  border-radius: 50%;
  color: #fff;
  font-weight: 700;
  flex-shrink: 0;
  overflow: hidden;
  letter-spacing: -1px;
}
.avatar img { width: 100%; height: 100%; object-fit: cover; }
</style>
