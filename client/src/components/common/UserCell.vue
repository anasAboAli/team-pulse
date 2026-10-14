<script setup>
import UserAvatar from './UserAvatar.vue';

defineProps({
  name: { type: String, required: true },
  sub: { type: String, default: '' },
  avatar: { type: String, default: null },
  to: { type: [String, Object], default: null },
  size: { type: Number, default: 34 },
});
</script>

<template>
  <div class="user-cell">
    <UserAvatar :name="name" :src="avatar" :size="size" />
    <div class="meta">
      <RouterLink v-if="to" :to="to" class="name" @click.stop>{{ name }}</RouterLink>
      <span v-else class="name">{{ name }}</span>
      <span v-if="sub" class="sub truncate">{{ sub }}</span>
    </div>
  </div>
</template>

<style scoped>
.user-cell { display: flex; align-items: center; gap: 10px; min-width: 0; }
.meta { display: flex; flex-direction: column; min-width: 0; line-height: 1.35; }
.name { font-weight: 600; color: var(--text); }
.sub { font-size: 0.8rem; color: var(--text-muted); }
</style>
