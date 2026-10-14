<script setup>
import { ShieldAlert } from 'lucide-vue-next';
import EmptyState from '@/components/common/EmptyState.vue';
import { useAuthStore } from '@/stores/auth';

const auth = useAuthStore();
</script>

<template>
  <div class="card">
    <EmptyState :icon="ShieldAlert" title="ليس لديك صلاحية" message="هذه الصفحة غير متاحة لدورك في النظام.">
      <RouterLink :to="auth.homeRoute" class="btn btn-primary">العودة للرئيسية</RouterLink>
    </EmptyState>
  </div>
</template>
