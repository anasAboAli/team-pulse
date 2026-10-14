<script setup>
import { ref } from 'vue';
import { Copy, KeyRound } from 'lucide-vue-next';
import BaseModal from '@/components/common/BaseModal.vue';

const props = defineProps({
  password: { type: String, required: true },
  name: { type: String, default: '' },
});
const emit = defineEmits(['close']);
const copied = ref(false);

async function copy() {
  try {
    await navigator.clipboard.writeText(props.password);
    copied.value = true;
  } catch {
    copied.value = false;
  }
}
</script>

<template>
  <BaseModal title="كلمة المرور المؤقتة" size="sm" persistent @close="emit('close')">
    <div class="stack" style="align-items: center; text-align: center">
      <span class="icon"><KeyRound /></span>
      <p class="text-2">
        سلّم هذه الكلمة {{ name ? `لـ ${name}` : 'للمستخدم' }} بطريقة آمنة. لن تظهر مرة أخرى، وسيُطلب منه تغييرها عند أول دخول.
      </p>
      <code class="pw num">{{ password }}</code>
      <button class="btn btn-soft" @click="copy"><Copy /> {{ copied ? 'تم النسخ' : 'نسخ' }}</button>
    </div>
    <template #footer>
      <button class="btn btn-primary" @click="emit('close')">تم</button>
    </template>
  </BaseModal>
</template>

<style scoped>
.icon { width: 48px; height: 48px; border-radius: 50%; background: var(--warning-soft); color: var(--warning); display: grid; place-items: center; }
.pw { font-size: 1.4rem; font-weight: 700; padding: 10px 20px; background: var(--surface-3); border-radius: var(--radius); letter-spacing: 1px; user-select: all; }
</style>
