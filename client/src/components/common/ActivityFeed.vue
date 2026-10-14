<script setup>
import UserAvatar from './UserAvatar.vue';
import EmptyState from './EmptyState.vue';
import { activityLink, describeActivity } from '@/utils/activity';
import { formatRelative, formatDateTime } from '@/utils/format';

defineProps({
  items: { type: Array, default: () => [] },
  showDepartment: { type: Boolean, default: false },
});
</script>

<template>
  <ul v-if="items.length" class="list feed">
    <li v-for="a in items" :key="a.id">
      <UserAvatar :name="a.actor?.full_name || 'النظام'" :size="32" />
      <div class="body">
        <p>
          <strong>{{ a.actor?.full_name || 'النظام' }}</strong>
          {{ ' ' }}
          <RouterLink v-if="activityLink(a)" :to="activityLink(a)">{{ describeActivity(a) }}</RouterLink>
          <span v-else>{{ describeActivity(a) }}</span>
        </p>
        <span class="muted small" :title="formatDateTime(a.created_at)">
          {{ formatRelative(a.created_at) }}<template v-if="showDepartment && a.department_name"> · {{ a.department_name }}</template>
        </span>
      </div>
    </li>
  </ul>
  <EmptyState v-else title="لا يوجد نشاط بعد" />
</template>

<style scoped>
.feed > li { display: flex; gap: 12px; align-items: flex-start; }
.body { min-width: 0; display: flex; flex-direction: column; gap: 2px; font-size: 0.9rem; }
.body a { color: var(--text-2); }
.body a:hover { color: var(--primary-text); }
</style>
