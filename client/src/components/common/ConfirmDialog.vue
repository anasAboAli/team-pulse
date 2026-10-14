<script setup>
import { ref, watch } from 'vue';
import BaseModal from './BaseModal.vue';
import { useUiStore } from '@/stores/ui';

const ui = useUiStore();
const text = ref('');
const error = ref('');

watch(
  () => ui.confirmState,
  () => {
    text.value = '';
    error.value = '';
  },
);

function confirm() {
  const s = ui.confirmState;
  if (s.input) {
    if (s.input.required && !text.value.trim()) {
      error.value = 'هذا الحقل مطلوب';
      return;
    }
    ui.resolveConfirm(text.value.trim() || '');
  } else {
    ui.resolveConfirm(true);
  }
}
</script>

<template>
  <BaseModal v-if="ui.confirmState" :title="ui.confirmState.title" size="sm" @close="ui.resolveConfirm(false)">
    <div class="stack">
      <p v-if="ui.confirmState.message" class="text-2">{{ ui.confirmState.message }}</p>
      <div v-if="ui.confirmState.input" class="field">
        <label>{{ ui.confirmState.input.label }}</label>
        <textarea
          v-model="text"
          class="textarea"
          :class="{ invalid: error }"
          :placeholder="ui.confirmState.input.placeholder"
          rows="3"
          autofocus
        />
        <span v-if="error" class="error">{{ error }}</span>
      </div>
    </div>
    <template #footer>
      <button class="btn" @click="ui.resolveConfirm(false)">{{ ui.confirmState.cancelText }}</button>
      <button class="btn" :class="ui.confirmState.danger ? 'btn-danger' : 'btn-primary'" @click="confirm">
        {{ ui.confirmState.confirmText }}
      </button>
    </template>
  </BaseModal>
</template>
