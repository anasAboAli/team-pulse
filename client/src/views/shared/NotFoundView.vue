<script setup>
import { SearchX } from 'lucide-vue-next';
import EmptyState from '@/components/common/EmptyState.vue';
import { useAuthStore } from '@/stores/auth';

const auth = useAuthStore();
</script>

<template>
  <div class="card">
    <EmptyState :icon="SearchX" title="الصفحة غير موجودة" message="ربما تم نقل الصفحة أو أن الرابط غير صحيح.">
      <RouterLink :to="auth.homeRoute" class="btn btn-primary">العودة للرئيسية</RouterLink>
    </EmptyState>
  </div>
</template>
