<script setup>
import { computed } from 'vue';
import { Bar } from 'vue-chartjs';
import { baseOptions, useChartTheme } from './useChartTheme';

const props = defineProps({
  labels: { type: Array, required: true },
  series: { type: Array, required: true }, // [{ label, data }]
  height: { type: Number, default: 280 },
  horizontal: { type: Boolean, default: false },
  suffix: { type: String, default: '' },
  max: { type: Number, default: undefined },
  stepSize: { type: Number, default: undefined },
  ariaLabel: { type: String, default: '' },
});

const theme = useChartTheme();

const data = computed(() => ({
  labels: props.labels,
  datasets: props.series.map((s, i) => ({
    label: s.label,
    data: s.data,
    backgroundColor: theme.value.series[i],
    hoverBackgroundColor: theme.value.series[i],
    borderRadius: 4,
    borderSkipped: 'start', // الطرف المستدير بعيداً عن خط الأساس
    borderColor: theme.value.surface,
    borderWidth: { top: 0, bottom: 0, left: 1, right: 1 },
    maxBarThickness: 22,
    categoryPercentage: 0.7,
    barPercentage: 0.85,
  })),
}));

const options = computed(() => {
  const o = baseOptions(theme.value, {
    suffix: props.suffix,
    max: props.max,
    stepSize: props.stepSize,
    horizontal: props.horizontal,
  });
  o.plugins.legend.display = props.series.length > 1;
  if (props.horizontal) o.interaction = { mode: 'nearest', axis: 'y', intersect: false };
  return o;
});
</script>

<template>
  <div :style="{ height: `${height}px` }" role="img" :aria-label="ariaLabel">
    <Bar :key="theme.key" :data="data" :options="options" />
  </div>
</template>
