<script setup>
import { onMounted, ref } from 'vue';
import { Activity, AlertTriangle } from 'lucide-vue-next';
import { activityApi, departmentsApi } from '@/api';
import PageHeader from '@/components/common/PageHeader.vue';
import LoadingState from '@/components/common/LoadingState.vue';
import EmptyState from '@/components/common/EmptyState.vue';
import PaginationBar from '@/components/common/PaginationBar.vue';
import ActivityFeed from '@/components/common/ActivityFeed.vue';
import { useListQuery } from '@/composables/useListQuery';
import { useAuthStore } from '@/stores/auth';

const auth = useAuthStore();
const departments = ref([]);
const { filters, rows, meta, loading, error } = useListQuery(activityApi.list, { department_id: '', entity_type: '', per_page: 25 });

const TYPES = { task: 'المهام', evaluation: 'التقييمات', user: 'المستخدمون', department: 'الأقسام', company: 'الشركة' };

onMounted(async () => {
  if (auth.isAdmin) departments.value = (await departmentsApi.list()).data;
});
</script>

<template>
  <div>
    <PageHeader :title="auth.isManager ? 'نشاط القسم' : 'سجل النشاط'" subtitle="كل عمليات الإضافة والتعديل والحذف مسجّلة هنا" />

    <section class="card card-flush" style="max-width: 900px">
      <div class="toolbar">
        <select v-model="filters.entity_type" class="select" aria-label="النوع">
          <option value="">كل العمليات</option>
          <option v-for="(label, key) in TYPES" :key="key" :value="key">{{ label }}</option>
        </select>
        <select v-if="auth.isAdmin" v-model="filters.department_id" class="select" aria-label="القسم">
          <option value="">كل الأقسام</option>
          <option v-for="d in departments" :key="d.id" :value="String(d.id)">{{ d.name }}</option>
        </select>
      </div>
      <LoadingState v-if="loading && !rows.length" :rows="8" />
      <EmptyState v-else-if="error" :icon="AlertTriangle" title="تعذّر التحميل" :message="error" />
      <EmptyState v-else-if="!rows.length" :icon="Activity" title="لا يوجد نشاط" />
      <div v-else style="padding: 4px 20px" :style="{ opacity: loading ? 0.6 : 1 }">
        <ActivityFeed :items="rows" :show-department="auth.isAdmin" />
      </div>
      <PaginationBar :meta="meta" @change="filters.page = $event" />
    </section>
  </div>
</template>
