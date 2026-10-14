<script setup>
import ToastContainer from '@/components/common/ToastContainer.vue';
import ConfirmDialog from '@/components/common/ConfirmDialog.vue';
</script>

<template>
  <RouterView />
  <ToastContainer />
  <ConfirmDialog />
</template>
