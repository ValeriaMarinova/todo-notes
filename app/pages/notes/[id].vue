<script setup lang="ts">
import type { Note } from '~/types/note'
import { createNote, cloneNote, createTodoItem } from '~/utils/noteFactory'
import { useNotesStore } from '~/stores/notes'
import {
  addHistoryOperation,
  applyHistoryOperation,
  clearNoteHistory,
  createNoteHistory,
  takeRedoOperation,
  takeUndoOperation,
} from '~/utils/noteHistory'

const route = useRoute()
const notesStore = useNotesStore()
const history = reactive(createNoteHistory())

const canUndo = computed(() => history.past.length > 0)
const canRedo = computed(() => history.future.length > 0)
const titleBeforeEdit = ref<string | null>(null)
const todoTextBeforeEdit = new Map<string, string>()

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
  clearNoteHistory(history)
  titleBeforeEdit.value = null
  todoTextBeforeEdit.clear()
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

  const todo = createTodoItem()
  const index = draft.value.todos.length

  draft.value.todos.push(todo)

  addHistoryOperation(history, {
    type: 'todo-add',
    todo: { ...todo },
    index,
  })

  validationError.value = ''
}

function removeTodo(todoId: string): void {
  if (draft.value === null) {
    return
  }

  const index = draft.value.todos.findIndex(
    todo => todo.id === todoId,
  )

  if (index === -1) {
    return
  }

  const removedTodo = draft.value.todos.splice(index, 1)[0]

  if (removedTodo === undefined) {
    return
  }

  addHistoryOperation(history, {
    type: 'todo-remove',
    todo: { ...removedTodo },
    index,
  })
}

function toggleTodo(todoId: string): void {
  if (draft.value === null) {
    return
  }

  const todo = draft.value.todos.find(
    item => item.id === todoId,
  )

  if (todo === undefined) {
    return
  }

  const before = todo.completed
  const after = !before

  todo.completed = after

  addHistoryOperation(history, {
    type: 'todo-completed-change',
    todoId,
    before,
    after,
  })
}

function startTitleEdit(): void {
  if (draft.value === null) {
    return
  }

  titleBeforeEdit.value = draft.value.title
}

function finishTitleEdit(): void {
  if (
    draft.value === null
    || titleBeforeEdit.value === null
  ) {
    return
  }

  const before = titleBeforeEdit.value
  const after = draft.value.title

  titleBeforeEdit.value = null

  if (before === after) {
    return
  }

  addHistoryOperation(history, {
    type: 'title-change',
    before,
    after,
  })
}

function startTodoTextEdit(todoId: string): void {
  const todo = draft.value?.todos.find(
    item => item.id === todoId,
  )

  if (todo === undefined) {
    return
  }

  todoTextBeforeEdit.set(todoId, todo.text)
}

function finishTodoTextEdit(todoId: string): void {
  const todo = draft.value?.todos.find(
    item => item.id === todoId,
  )
  const before = todoTextBeforeEdit.get(todoId)

  todoTextBeforeEdit.delete(todoId)

  if (
    todo === undefined
    || before === undefined
    || before === todo.text
  ) {
    return
  }

  addHistoryOperation(history, {
    type: 'todo-text-change',
    todoId,
    before,
    after: todo.text,
  })
}

function undoChange(): void {
  if (draft.value === null) {
    return
  }

  const operation = takeUndoOperation(history)

  if (operation === undefined) {
    return
  }

  applyHistoryOperation(draft.value, operation, 'undo')
  validationError.value = ''
}

function redoChange(): void {
  if (draft.value === null) {
    return
  }

  const operation = takeRedoOperation(history)

  if (operation === undefined) {
    return
  }

  applyHistoryOperation(draft.value, operation, 'redo')
  validationError.value = ''
}

function isTextEditingTarget(target: EventTarget | null): boolean {
  if (
    target instanceof HTMLTextAreaElement
    || (target instanceof HTMLElement && target.isContentEditable)
  ) {
    return true
  }

  if (!(target instanceof HTMLInputElement)) {
    return false
  }

  return [
    'text',
    'search',
    'email',
    'url',
    'tel',
    'password',
    'number',
  ].includes(target.type)
}

function handleHistoryShortcut(event: KeyboardEvent): void {
  const isUndoShortcut = (
    event.ctrlKey
    || event.metaKey
  ) && event.key.toLowerCase() === 'z'

  if (
    !isUndoShortcut
    || event.altKey
    || event.defaultPrevented
    || pendingAction.value !== null
    || isTextEditingTarget(event.target)
  ) {
    return
  }

  event.preventDefault()

  if (event.shiftKey) {
    redoChange()
    return
  }

  undoChange()
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

  clearNoteHistory(history)
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
    clearNoteHistory(history)
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

    clearNoteHistory(history)
    await navigateTo('/')
  }
}

watch(noteId, initializeDraft, {
  immediate: true,
})

onMounted(() => {
  window.addEventListener('keydown', handleHistoryShortcut)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleHistoryShortcut)
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

      <div>
        <button
          type="button"
          :disabled="!canUndo"
          @click="undoChange"
        >
          Отменить изменение
        </button>

        <button
          type="button"
          :disabled="!canRedo"
          @click="redoChange"
        >
          Повторить изменение
        </button>
      </div>

      <form @submit.prevent="saveDraft">
        <div>
          <label for="note-title">Название заметки</label>

          <input
            id="note-title"
            v-model="draft.title"
            type="text"
            autocomplete="off"
            @focus="startTitleEdit"
            @blur="finishTitleEdit"
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
              :checked="todo.completed"
              type="checkbox"
              @change="toggleTodo(todo.id)"
            >

            <label :for="`todo-text-${todo.id}`">
              Текст задачи
            </label>

            <input
              :id="`todo-text-${todo.id}`"
              v-model="todo.text"
              type="text"
              autocomplete="off"
              @focus="startTodoTextEdit(todo.id)"
              @blur="finishTodoTextEdit(todo.id)"
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
