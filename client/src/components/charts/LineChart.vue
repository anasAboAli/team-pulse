<script setup>
import { computed } from 'vue';
import { Line } from 'vue-chartjs';
import { baseOptions, useChartTheme } from './useChartTheme';

/**
 * series: [{ label, data: number[] }] — الألوان تُسند بالترتيب الثابت للوحة (لا تُدوَّر)
 */
const props = defineProps({
  labels: { type: Array, required: true },
  series: { type: Array, required: true },
  height: { type: Number, default: 280 },
  suffix: { type: String, default: '' },
  max: { type: Number, default: undefined },
  stepSize: { type: Number, default: undefined },
  ariaLabel: { type: String, default: '' },
});

const theme = useChartTheme();

const data = computed(() => ({
  labels: props.labels,
  datasets: props.series.map((s, i) => {
    const color = theme.value.series[i];
    return {
      label: s.label,
      data: s.data,
      borderColor: color,
      backgroundColor: color,
      borderWidth: 2,
      tension: 0.3,
      spanGaps: true,
      pointRadius: 0,
      pointHoverRadius: 5,
      pointHitRadius: 14,
      pointHoverBorderWidth: 2,
      pointHoverBorderColor: theme.value.surface,
    };
  }),
}));

const options = computed(() => {
  const o = baseOptions(theme.value, { suffix: props.suffix, max: props.max, stepSize: props.stepSize });
  // سلسلة واحدة: العنوان يعرّفها ولا حاجة لمفتاح
  o.plugins.legend.display = props.series.length > 1;
  return o;
});
</script>

<template>
  <div :style="{ height: `${height}px` }" role="img" :aria-label="ariaLabel">
    <Line :key="theme.key" :data="data" :options="options" />
  </div>
</template>
