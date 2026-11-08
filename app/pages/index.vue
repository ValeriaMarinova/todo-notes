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
  <main class="home-page">
    <header class="home-header">
      <div>
        <p class="eyebrow">
          Пространство для планов
        </p>

        <h1>Мои заметки</h1>
      </div>

      <NuxtLink
        class="create-link"
        to="/notes/new"
      >
        <span aria-hidden="true">＋</span>
        Создать заметку
      </NuxtLink>
    </header>

    <section
      v-if="sortedNotes.length === 0"
      class="empty-state"
    >
      <span aria-hidden="true">✦</span>
      <h2>Заметок пока нет</h2>
      <p>Создайте первую заметку и добавьте в неё список задач.</p>
    </section>

    <section
      v-else
      class="notes-grid"
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
      class="error-message"
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

<style scoped lang="scss">
.home-page {
  width: min(100% - 2rem, var(--page-width));
  margin: 0 auto;
  padding: 4rem 0 5rem;
}

.home-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 2rem;
  margin-bottom: 2.5rem;
}

.home-header h1 {
  margin: 0;
  font-size: clamp(2.25rem, 6vw, 4rem);
  line-height: 1;
  letter-spacing: -0.055em;
}

.eyebrow {
  margin: 0 0 0.75rem;
  color: var(--primary);
  font-size: 0.8rem;
  font-weight: 750;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.create-link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 3rem;
  padding: 0.75rem 1.125rem;
  color: #ffffff;
  font-weight: 700;
  text-decoration: none;
  white-space: nowrap;
  background: var(--primary);
  border-radius: 0.75rem;
  box-shadow: 0 0.6rem 1.25rem rgb(49 87 213 / 18%);
  transition:
    background-color 160ms ease,
    transform 160ms ease,
    box-shadow 160ms ease;
}

.create-link span {
  margin-right: 0.35rem;
  font-size: 1.25rem;
  line-height: 1;
}

.create-link:hover {
  color: #ffffff;
  background: var(--primary-hover);
  box-shadow: 0 0.75rem 1.5rem rgb(49 87 213 / 24%);
  transform: translateY(-1px);
}

.notes-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 19rem), 1fr));
  gap: 1.25rem;
}

.empty-state {
  display: grid;
  justify-items: center;
  max-width: 38rem;
  padding: 4.5rem 2rem;
  margin: 5rem auto 0;
  text-align: center;
  background: rgb(255 255 255 / 82%);
  border: 1px dashed #c7d2e3;
  border-radius: 1.25rem;
}

.empty-state > span {
  display: grid;
  width: 3.5rem;
  height: 3.5rem;
  margin-bottom: 1.25rem;
  color: var(--primary);
  font-size: 1.5rem;
  place-items: center;
  background: #edf2ff;
  border-radius: 1rem;
}

.empty-state h2 {
  margin: 0;
  font-size: 1.5rem;
}

.empty-state p {
  max-width: 28rem;
  margin: 0.75rem 0 0;
  color: var(--muted);
  line-height: 1.6;
}

.error-message {
  padding: 0.875rem 1rem;
  margin: 1.5rem 0 0;
  color: #912018;
  background: #fff1f0;
  border: 1px solid #fecdca;
  border-radius: 0.75rem;
}

@media (max-width: 40rem) {
  .home-page {
    width: min(100% - 1.25rem, var(--page-width));
    padding: 2rem 0 3rem;
  }

  .home-header {
    align-items: stretch;
    flex-direction: column;
    gap: 1.5rem;
  }

  .create-link {
    width: 100%;
  }

  .empty-state {
    padding: 3.5rem 1.25rem;
    margin-top: 2.5rem;
  }
}
</style>
