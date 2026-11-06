<script setup lang="ts">
import { useNotesStore } from '~/stores/notes'
import type { Note } from '~/types/note'

const notesStore = useNotesStore()

const sortedNotes = computed(() => (
  [...notesStore.notes].sort(
    (first, second) => second.updatedAt.localeCompare(first.updatedAt),
  )
))

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
      />
    </section>
  </main>
</template>