<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'

interface Props {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  danger?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  confirmLabel: 'Подтвердить',
  cancelLabel: 'Отмена',
  danger: true,
})

const emit = defineEmits<{
  confirm: []
  cancel: []
}>()

const dialog = ref<HTMLDialogElement | null>(null)
const cancelButton = ref<HTMLButtonElement | null>(null)

watch(
  () => props.open,
  async (isOpen) => {
    await nextTick()

    if (isOpen && dialog.value?.open === false) {
      dialog.value.showModal()
      cancelButton.value?.focus()
      return
    }

    if (!isOpen && dialog.value?.open === true) {
      dialog.value.close()
    }
  },
  { immediate: true },
)

function cancel(): void {
  emit('cancel')
}

function handleEscape(event: Event): void {
  event.preventDefault()
  cancel()
}
</script>

<template>
  <dialog
    ref="dialog"
    class="modal-window"
    aria-labelledby="dialog-title"
    aria-describedby="dialog-message"
    @cancel="handleEscape"
  >
    <h2
      id="dialog-title"
      class="modal-title"
    >
      {{ title }}
    </h2>

    <p
      id="dialog-message"
      class="modal-message"
    >
      {{ message }}
    </p>

    <div class="modal-controls">
      <button
        ref="cancelButton"
        type="button"
        class="cancel-button"
        @click="cancel"
      >
        {{ cancelLabel }}
      </button>

      <button
        type="button"
        class="confirm-button"
        :class="danger ? 'danger-button' : 'primary-button'"
        @click="emit('confirm')"
      >
        {{ confirmLabel }}
      </button>
    </div>
  </dialog>
</template>

<style scoped lang="scss">
.modal-window {
  width: min(28rem, calc(100% - 2rem));
  padding: 1.5rem;
  color: #1d2939;
  background: #ffffff;
  border: 0;
  border-radius: 0.75rem;
  box-shadow: 0 1.25rem 3rem rgb(0 0 0 / 20%);
}

.modal-window::backdrop {
  background: rgb(15 23 42 / 60%);
}

.modal-title {
  margin: 0;
  font-size: 1.5rem;
  line-height: 1.3;
}

.modal-message {
  margin: 1rem 0 0;
  color: #475467;
  line-height: 1.5;
}

.modal-controls {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  margin-top: 1.5rem;
}

.cancel-button,
.confirm-button {
  min-height: 2.75rem;
  padding: 0.625rem 1rem;
  font: inherit;
  cursor: pointer;
  border-radius: 0.5rem;
}

.cancel-button {
  color: #344054;
  background: #ffffff;
  border: 1px solid #d0d5dd;
}

.cancel-button:hover {
  background: #f9fafb;
}

.danger-button {
  color: #ffffff;
  background: #b42318;
  border: 1px solid #b42318;
}

.danger-button:hover {
  background: #912018;
}

.primary-button {
  color: #ffffff;
  background: #175cd3;
  border: 1px solid #175cd3;
}

.primary-button:hover {
  background: #1849a9;
}

.cancel-button:focus-visible,
.confirm-button:focus-visible {
  outline: 3px solid #84adff;
  outline-offset: 2px;
}

@media (max-width: 30rem) {
  .modal-controls {
    flex-direction: column-reverse;
  }

  .cancel-button,
  .confirm-button {
    width: 100%;
  }
}
</style>
