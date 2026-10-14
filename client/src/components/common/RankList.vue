<script setup>
import UserCell from './UserCell.vue';
import EmptyState from './EmptyState.vue';
import { ScoreBadge } from './Badges';

defineProps({
  items: { type: Array, default: () => [] },
  linkUsers: { type: Boolean, default: true },
});
</script>

<template>
  <ol v-if="items.length" class="list rank">
    <li v-for="(u, i) in items" :key="u.id">
      <span class="pos num">{{ i + 1 }}</span>
      <UserCell
        :name="u.full_name"
        :sub="[u.job_title, u.department_name].filter(Boolean).join(' · ')"
        :avatar="u.avatar_url"
        :to="linkUsers ? `/users/${u.id}` : null"
        class="grow"
      />
      <ScoreBadge :score="u.average_score" />
    </li>
  </ol>
  <EmptyState v-else title="لا توجد تقييمات بعد" />
</template>

<style scoped>
.rank > li { display: flex; align-items: center; gap: 12px; }
.pos { width: 24px; height: 24px; border-radius: 50%; background: var(--surface-3); display: grid; place-items: center; font-size: 0.78rem; font-weight: 700; color: var(--text-2); flex-shrink: 0; }
.grow { flex: 1; }
</style>
