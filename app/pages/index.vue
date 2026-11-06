<script setup lang="ts">
import type { Note } from '~/types/note'
import { useNotesStore } from '~/stores/notes'

const notesStore = useNotesStore()

const noteToDelete = ref<Note | null>(null)
const deleteError = ref('')

const sortedNotes = computed(() => (
  [...notesStore.notes].sort(
    (first, second) => second.updatedAt.localeCompare(first.updatedAt),
  )
))

function requestDelete(note: Note): void {
  noteToDelete.value = note
  deleteError.value = ''
}

function cancelDelete(): void {
  noteToDelete.value = null
}

function confirmDelete(): void {
  if (noteToDelete.value === null) {
    return
  }

  const isDeleted = notesStore.deleteNote(noteToDelete.value.id)

  if (!isDeleted) {
    deleteError.value = 'Не удалось удалить заметку.'
    return
  }

  noteToDelete.value = null
}

useHead({
  title: 'Заметки',
})
</script>

<template>
  <main>
    <header>
      <h1>Мои заметки</h1>

      <NuxtLink to="/notes/new">
        Создать заметку
      </NuxtLink>
    </header>

    <p v-if="sortedNotes.length === 0">
      Заметок пока нет. Создайте первую заметку.
    </p>

    <section
      v-else
      aria-label="Список заметок"
    >
      <NoteCard
        v-for="note in sortedNotes"
        :key="note.id"
        :note="note"
        @delete="requestDelete"
      />
    </section>

    <p
      v-if="deleteError"
      role="alert"
    >
      {{ deleteError }}
    </p>

    <ConfirmDialog
      :open="noteToDelete !== null"
      title="Удалить заметку?"
      :message="noteToDelete
        ? `Заметка «${noteToDelete.title}» будет удалена безвозвратно.`
        : ''"
      confirm-label="Удалить"
      @confirm="confirmDelete"
      @cancel="cancelDelete"
    />
  </main>
</template>