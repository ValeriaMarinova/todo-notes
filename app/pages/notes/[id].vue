<script setup lang="ts">
import type { Note } from '~/types/note'
import { createNote, cloneNote, createTodoItem } from '~/utils/noteFactory'
import { useNotesStore } from '~/stores/notes'

const route = useRoute()
const notesStore = useNotesStore()

const draft = ref<Note | null>(null)
const isNotFound = ref(false)
const validationError = ref('')
type EditorAction = 'cancel' | 'delete' | null

const pendingAction = ref<EditorAction>(null)
const actionError = ref('')

const noteId = computed(() => String(route.params.id ?? ''))
const isNewNote = computed(() => noteId.value === 'new')
const dialogTitle = computed(() => (
  pendingAction.value === 'delete'
    ? 'Удалить заметку?'
    : 'Отменить редактирование?'
))

const dialogMessage = computed(() => (
  pendingAction.value === 'delete'
    ? 'Заметка будет удалена безвозвратно.'
    : 'Все несохранённые изменения будут потеряны.'
))

const dialogConfirmLabel = computed(() => (
  pendingAction.value === 'delete'
    ? 'Удалить'
    : 'Отменить редактирование'
))

function initializeDraft(): void {
  isNotFound.value = false
  validationError.value = ''

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

  draft.value = cloneNote(savedNote)
}

function addTodo(): void {
  if (draft.value === null) {
    return
  }

  draft.value.todos.push(createTodoItem())
  validationError.value = ''
}

function removeTodo(todoId: string): void {
  if (draft.value === null) {
    return
  }

  draft.value.todos = draft.value.todos.filter(
    todo => todo.id !== todoId,
  )
}

async function saveDraft(): Promise<void> {
  if (draft.value === null) {
    return
  }

  const title = draft.value.title.trim()
  const hasEmptyTodo = draft.value.todos.some(
    todo => todo.text.trim() === '',
  )

  if (title === '') {
    validationError.value = 'Введите название заметки.'
    return
  }

  if (hasEmptyTodo) {
    validationError.value = 'Заполните текст каждого пункта.'
    return
  }

  draft.value.title = title
  draft.value.todos = draft.value.todos.map(todo => ({
    ...todo,
    text: todo.text.trim(),
  }))
  draft.value.updatedAt = new Date().toISOString()

  const isSaved = notesStore.saveNote(draft.value)

  if (!isSaved) {
    validationError.value = 'Не удалось сохранить заметку.'
    return
  }

  await navigateTo('/')
}

function requestCancel(): void {
  actionError.value = ''
  pendingAction.value = 'cancel'
}

function requestDelete(): void {
  if (isNewNote.value) {
    return
  }

  actionError.value = ''
  pendingAction.value = 'delete'
}

function closeActionDialog(): void {
  pendingAction.value = null
}

async function confirmEditorAction(): Promise<void> {
  if (pendingAction.value === 'cancel') {
    pendingAction.value = null
    await navigateTo('/')
    return
  }

  if (
    pendingAction.value === 'delete'
    && draft.value !== null
  ) {
    const isDeleted = notesStore.deleteNote(draft.value.id)

    pendingAction.value = null

    if (!isDeleted) {
      actionError.value = 'Не удалось удалить заметку.'
      return
    }

    await navigateTo('/')
  }
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
    <NuxtLink
      v-if="isNotFound"
      to="/"
    >
      Назад к заметкам
    </NuxtLink>

    <button
      v-else
      type="button"
      @click="requestCancel"
    >
      Назад к заметкам
    </button>

    <section v-if="isNotFound">
      <h1>Заметка не найдена</h1>
      <p>Возможно, она была удалена или адрес указан неверно.</p>
    </section>

    <section v-else-if="draft">
      <h1>
        {{ isNewNote ? 'Новая заметка' : 'Редактирование заметки' }}
      </h1>

      <form @submit.prevent="saveDraft">
        <div>
          <label for="note-title">Название заметки</label>

          <input
            id="note-title"
            v-model="draft.title"
            type="text"
            autocomplete="off"
          >
        </div>

        <h2>Задачи</h2>

        <p v-if="draft.todos.length === 0">
          В заметке пока нет задач.
        </p>

        <ul v-else>
          <li
            v-for="todo in draft.todos"
            :key="todo.id"
          >
            <input
              :id="`todo-completed-${todo.id}`"
              v-model="todo.completed"
              type="checkbox"
            >

            <label :for="`todo-text-${todo.id}`">
              Текст задачи
            </label>

            <input
              :id="`todo-text-${todo.id}`"
              v-model="todo.text"
              type="text"
              autocomplete="off"
            >

            <button
              type="button"
              @click="removeTodo(todo.id)"
            >
              Удалить
            </button>
          </li>
        </ul>

        <button
          type="button"
          @click="addTodo"
        >
          Добавить задачу
        </button>

        <p
          v-if="validationError"
          role="alert"
        >
          {{ validationError }}
        </p>

        <button type="submit">
          Сохранить
        </button>

        <button
          type="button"
          @click="requestCancel"
        >
          Отменить редактирование
        </button>

        <button
          v-if="!isNewNote"
          type="button"
          @click="requestDelete"
        >
          Удалить заметку
        </button>
      </form>
    </section>

      <p
        v-if="actionError"
        role="alert"
      >
        {{ actionError }}
      </p>

      <ConfirmDialog
        :open="pendingAction !== null"
        :title="dialogTitle"
        :message="dialogMessage"
        :confirm-label="dialogConfirmLabel"
        @confirm="confirmEditorAction"
        @cancel="closeActionDialog"
      />
    </main>
</template>