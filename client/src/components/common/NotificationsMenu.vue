<script setup>
import { useRouter } from 'vue-router';
import { BellOff, CheckCheck } from 'lucide-vue-next';
import { useNotificationsStore } from '@/stores/notifications';
import { formatRelative } from '@/utils/format';

const emit = defineEmits(['close']);
const store = useNotificationsStore();
const router = useRouter();

async function open(n) {
  await store.markRead(n);
  emit('close');
  if (n.link) router.push(n.link);
}
</script>

<template>
  <div class="panel" role="dialog" aria-label="الإشعارات">
    <div class="head">
      <strong>الإشعارات</strong>
      <button v-if="store.unread" class="btn btn-ghost btn-sm" @click="store.markAllRead()"><CheckCheck /> قراءة الكل</button>
    </div>
    <div class="items">
      <div v-if="store.loading && !store.recent.length" class="muted small pad">جارٍ التحميل…</div>
      <div v-else-if="!store.recent.length" class="empty pad">
        <BellOff />
        <span class="muted small">لا توجد إشعارات</span>
      </div>
      <button v-for="n in store.recent" :key="n.id" class="item" :class="{ unread: !n.is_read }" @click="open(n)">
        <span class="dot" aria-hidden="true" />
        <span class="text">
          <strong>{{ n.title }}</strong>
          <span v-if="n.body" class="small text-2 truncate">{{ n.body }}</span>
          <span class="muted small">{{ formatRelative(n.created_at) }}</span>
        </span>
        <span v-if="!n.is_read" class="sr-only">غير مقروء</span>
      </button>
    </div>
    <RouterLink to="/notifications" class="foot" @click="emit('close')">عرض كل الإشعارات</RouterLink>
  </div>
</template>

<style scoped>
.panel {
  position: absolute; top: calc(100% + 8px); inset-inline-end: -60px; z-index: 60;
  width: min(370px, calc(100vw - 24px));
  background: var(--surface); border: 1px solid var(--border);
  border-radius: var(--radius-lg); box-shadow: var(--shadow-lg); overflow: hidden;
}
.head { display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; border-block-end: 1px solid var(--border); }
.items { max-height: 380px; overflow-y: auto; }
.pad { padding: 24px 16px; }
.empty { display: flex; flex-direction: column; align-items: center; gap: 6px; color: var(--text-muted); }
.item {
  display: flex; gap: 10px; width: 100%; text-align: start;
  padding: 12px 16px; border: 0; border-block-end: 1px solid var(--border);
  background: none; cursor: pointer;
}
.item:hover { background: var(--surface-2); }
.item.unread { background: var(--primary-soft); }
.dot { width: 8px; height: 8px; border-radius: 50%; margin-block-start: 8px; flex-shrink: 0; background: transparent; }
.unread .dot { background: var(--primary); }
.text { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.text strong { font-size: 0.88rem; font-weight: 600; }
.foot { display: block; text-align: center; padding: 10px; font-weight: 600; font-size: 0.88rem; }
</style>
