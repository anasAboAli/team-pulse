import { computed } from 'vue';
import {
  BarElement,
  CategoryScale,
  Chart,
  Filler,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
} from 'chart.js';
import { useThemeStore } from '@/stores/theme';

Chart.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, Tooltip, Legend, Filler);
Chart.defaults.font.family = "'IBM Plex Sans Arabic', system-ui, sans-serif";
Chart.defaults.font.size = 12;

const css = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

/** ألوان الرسوم من رموز الثيم الحالي (تُعاد قراءتها عند تبديل الثيم) */
export function useChartTheme() {
  const theme = useThemeStore();
  return computed(() => {
    // الاعتماد على resolved يجعل القيم تُحسب من جديد عند التبديل
    void theme.resolved;
    return {
      key: theme.resolved,
      surface: css('--chart-surface'),
      ink: css('--chart-ink'),
      ink2: css('--chart-ink-2'),
      muted: css('--chart-muted'),
      grid: css('--chart-grid'),
      axis: css('--chart-axis'),
      series: [css('--series-1'), css('--series-2'), css('--series-3')],
    };
  });
}

/** الإعدادات المشتركة: RTL، شبكة خفيفة، تلميح عند المرور */
export function baseOptions(t, { suffix = '', max, min = 0, stepSize, horizontal = false } = {}) {
  const valueAxis = {
    beginAtZero: true,
    reverse: horizontal, // الأشرطة الأفقية تنمو من اليمين بجوار أسمائها
    min,
    max,
    position: horizontal ? 'bottom' : 'right',
    grid: { color: t.grid, drawTicks: false },
    border: { display: false },
    ticks: { color: t.muted, padding: 8, stepSize, callback: (v) => `${v}${suffix}` },
  };
  const categoryAxis = {
    reverse: !horizontal, // الزمن يتدفق من اليمين لليسار
    position: horizontal ? 'right' : 'bottom',
    grid: { display: false },
    border: { color: t.axis },
    ticks: { color: t.ink2, padding: 6, autoSkipPadding: 12 },
  };
  return {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: horizontal ? 'y' : 'x',
    interaction: { mode: 'index', intersect: false },
    animation: { duration: 400 },
    layout: { padding: { top: 4 } },
    plugins: {
      legend: {
        rtl: true,
        align: 'start',
        labels: { color: t.ink2, usePointStyle: true, pointStyle: 'rectRounded', boxWidth: 10, boxHeight: 10, padding: 16 },
      },
      tooltip: {
        rtl: true,
        textDirection: 'rtl',
        backgroundColor: t.surface,
        titleColor: t.ink,
        bodyColor: t.ink2,
        borderColor: t.grid,
        borderWidth: 1,
        padding: 10,
        cornerRadius: 8,
        boxPadding: 4,
        usePointStyle: true,
        callbacks: {
          label: (ctx) => ` ${ctx.dataset.label}: ${ctx.formattedValue ?? '—'}${suffix}`,
        },
      },
    },
    scales: horizontal ? { x: valueAxis, y: categoryAxis } : { x: categoryAxis, y: valueAxis },
  };
}
