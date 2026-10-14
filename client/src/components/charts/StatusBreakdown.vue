<script setup>
import { computed } from 'vue';
import { StatusBadge } from '@/components/common/Badges';
import { TASK_STATUSES } from '@/utils/constants';

/** توزيع المهام حسب الحالة كأشرطة أفقية بأسماء وأرقام ظاهرة (لا اعتماد على اللون وحده) */
const props = defineProps({
  distribution: { type: Object, default: () => ({}) },
  linkBase: { type: String, default: '/tasks' },
});

const total = computed(() => Object.values(props.distribution).reduce((a, b) => a + b, 0));
const rows = computed(() =>
  Object.keys(TASK_STATUSES).map((status) => {
    const count = props.distribution[status] ?? 0;
    return { status, count, pct: total.value ? Math.round((count / total.value) * 100) : 0 };
  }),
);
</script>

<template>
  <ul class="list breakdown">
    <li v-for="r in rows" :key="r.status">
      <RouterLink :to="{ path: linkBase, query: { status: r.status } }" class="row-link">
        <div class="row-between">
          <StatusBadge :status="r.status" />
          <span class="small"><strong class="num">{{ r.count }}</strong> <span class="muted num">({{ r.pct }}%)</span></span>
        </div>
        <div class="progress"><span :style="{ width: `${r.pct}%` }" /></div>
      </RouterLink>
    </li>
  </ul>
</template>

<style scoped>
.breakdown > li { padding: 8px 0; border: 0; }
.row-link { display: flex; flex-direction: column; gap: 6px; color: inherit; text-decoration: none !important; border-radius: 8px; }
.row-link:hover .progress > span { background: var(--primary-hover); }
.progress { height: 6px; }
</style>
