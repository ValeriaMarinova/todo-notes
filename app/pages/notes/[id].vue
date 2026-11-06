<script setup lang="ts">
import type { Note } from '~/types/note'
import { createNote } from '~/utils/noteFactory'
import { useNotesStore } from '~/stores/notes'

const route = useRoute()
const notesStore = useNotesStore()

const draft = ref<Note | null>(null)
const isNotFound = ref(false)

const noteId = computed(() => String(route.params.id ?? ''))
const isNewNote = computed(() => noteId.value === 'new')

function initializeDraft(): void {
  isNotFound.value = false

  if (isNewNote.value) {
    draft.value = createNote()
    return
  }

  const savedNote = notesStore.getNoteById(noteId.value)

  if (savedNote === undefined) {
    draft.value = null
    isNotFound.value = true
    return
  }

  draft.value = structuredClone(savedNote)
}

watch(noteId, initializeDraft, {
  immediate: true,
})

useHead({
  title: () => {
    if (isNotFound.value) {
      return 'Заметка не найдена'
    }

    return isNewNote.value
      ? 'Новая заметка'
      : 'Редактирование заметки'
  },
})
</script>

<template>
  <main>
    <NuxtLink to="/">
      Назад к заметкам
    </NuxtLink>

    <section v-if="isNotFound">
      <h1>Заметка не найдена</h1>
      <p>Возможно, она была удалена или адрес указан неверно.</p>
    </section>

    <section v-else-if="draft">
      <h1>
        {{ isNewNote ? 'Новая заметка' : 'Редактирование заметки' }}
      </h1>

      <p>Черновик заметки подготовлен.</p>
    </section>
  </main>
</template>