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
  width: min(30rem, calc(100% - 2rem));
  max-height: calc(100vh - 2rem);
  padding: clamp(1.25rem, 5vw, 2rem);
  overflow: auto;
  color: var(--text);
  background: #ffffff;
  border: 1px solid rgb(255 255 255 / 45%);
  border-radius: 1.1rem;
  box-shadow: 0 1.5rem 4rem rgb(15 23 42 / 28%);
}

.modal-window::backdrop {
  background: rgb(15 23 42 / 60%);
  backdrop-filter: blur(3px);
}

.modal-title {
  margin: 0;
  font-size: clamp(1.4rem, 5vw, 1.75rem);
  line-height: 1.2;
  letter-spacing: -0.025em;
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
  min-height: 3rem;
  padding: 0.7rem 1.1rem;
  font: inherit;
  font-weight: 680;
  cursor: pointer;
  border-radius: 0.7rem;
  transition:
    background-color 150ms ease,
    border-color 150ms ease;
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
  background: var(--danger);
  border: 1px solid var(--danger);
}

.danger-button:hover {
  background: var(--danger-hover);
  border-color: var(--danger-hover);
}

.primary-button {
  color: #ffffff;
  background: var(--primary);
  border: 1px solid var(--primary);
}

.primary-button:hover {
  background: var(--primary-hover);
  border-color: var(--primary-hover);
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
