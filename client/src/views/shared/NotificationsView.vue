<script setup>
import { useRouter } from 'vue-router';
import { AlertTriangle, BellOff, CheckCheck, Trash2 } from 'lucide-vue-next';
import { notificationsApi } from '@/api';
import PageHeader from '@/components/common/PageHeader.vue';
import LoadingState from '@/components/common/LoadingState.vue';
import EmptyState from '@/components/common/EmptyState.vue';
import PaginationBar from '@/components/common/PaginationBar.vue';
import { useListQuery } from '@/composables/useListQuery';
import { useNotificationsStore } from '@/stores/notifications';
import { formatDateTime, formatRelative } from '@/utils/format';

const router = useRouter();
const store = useNotificationsStore();
const { filters, rows, meta, loading, error, reload } = useListQuery(notificationsApi.list, { unread: '', per_page: 20 });

async function open(n) {
  await store.markRead(n);
  if (n.link) router.push(n.link);
}

async function markAll() {
  await store.markAllRead();
  reload();
}

async function remove(n) {
  await notificationsApi.remove(n.id);
  rows.value = rows.value.filter((x) => x.id !== n.id);
  if (!n.is_read) store.refreshCount();
}
</script>

<template>
  <div>
    <PageHeader title="الإشعارات" subtitle="المهام الجديدة، التسليمات، الإرجاع، والتقييمات">
      <button class="btn" :disabled="!store.unread" @click="markAll"><CheckCheck /> تعليم الكل كمقروء</button>
    </PageHeader>

    <div class="tabs" style="margin-bottom: 16px">
      <button class="tab" :class="{ active: !filters.unread }" @click="filters.unread = ''">الكل</button>
      <button class="tab" :class="{ active: filters.unread === 'true' }" @click="filters.unread = 'true'">غير المقروءة</button>
    </div>

    <section class="card card-flush" style="max-width: 860px">
      <LoadingState v-if="loading && !rows.length" />
      <EmptyState v-else-if="error" :icon="AlertTriangle" title="تعذّر التحميل" :message="error" />
      <EmptyState v-else-if="!rows.length" :icon="BellOff" title="لا توجد إشعارات" />
      <ul v-else class="items">
        <li v-for="n in rows" :key="n.id" :class="{ unread: !n.is_read }">
          <button class="main" @click="open(n)">
            <span class="dot" aria-hidden="true" />
            <span class="text">
              <strong>{{ n.title }}</strong>
              <span v-if="n.body" class="small text-2">{{ n.body }}</span>
              <span class="muted small" :title="formatDateTime(n.created_at)">{{ formatRelative(n.created_at) }}{{ n.is_read ? '' : ' · غير مقروء' }}</span>
            </span>
          </button>
          <button class="btn btn-ghost btn-icon btn-sm" aria-label="حذف" @click="remove(n)"><Trash2 /></button>
        </li>
      </ul>
      <PaginationBar :meta="meta" @change="filters.page = $event" />
    </section>
  </div>
</template>

<style scoped>
.items { list-style: none; margin: 0; padding: 0; }
.items li { display: flex; align-items: center; gap: 8px; padding-inline-end: 12px; border-block-end: 1px solid var(--border); }
.items li.unread { background: var(--primary-soft); }
.main { flex: 1; display: flex; gap: 12px; text-align: start; padding: 14px 20px; border: 0; background: none; cursor: pointer; min-width: 0; }
.dot { width: 8px; height: 8px; border-radius: 50%; margin-top: 8px; flex-shrink: 0; }
.unread .dot { background: var(--primary); }
.text { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
</style>
