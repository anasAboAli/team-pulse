<script setup>
import { Star } from 'lucide-vue-next';
import { RATING_LABELS } from '@/utils/constants';

const model = defineModel({ type: Number, default: 0 });
defineProps({ label: { type: String, default: '' } });
</script>

<template>
  <div class="rating" role="radiogroup" :aria-label="label">
    <button
      v-for="n in 5"
      :key="n"
      type="button"
      role="radio"
      class="star"
      :class="{ on: n <= model }"
      :aria-checked="n === model"
      :aria-label="`${n} — ${RATING_LABELS[n]}`"
      :title="RATING_LABELS[n]"
      @click="model = n"
    >
      <Star />
    </button>
    <span class="caption">{{ model ? `${model} — ${RATING_LABELS[model]}` : 'لم يُحدَّد' }}</span>
  </div>
</template>

<style scoped>
.rating { display: flex; align-items: center; gap: 2px; flex-wrap: wrap; }
.star { border: 0; background: none; padding: 4px; cursor: pointer; color: var(--border-strong); border-radius: 6px; }
.star svg { width: 26px; height: 26px; }
.star.on { color: #eda100; }
.star.on svg { fill: currentColor; }
.star:hover { background: var(--surface-3); }
.caption { margin-inline-start: 10px; font-size: 0.85rem; color: var(--text-2); font-weight: 600; }
</style>
