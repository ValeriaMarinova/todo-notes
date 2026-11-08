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
import type { StoredDraft } from '~/utils/draftStorage'
import {
  loadDraftFromStorage,
  removeDraftFromStorage,
  saveDraftToStorage,
} from '~/utils/draftStorage'

const DRAFT_SAVE_DELAY = 700

const route = useRoute()
const notesStore = useNotesStore()
const history = reactive(createNoteHistory())

const canUndo = computed(() => history.past.length > 0)
const canRedo = computed(() => history.future.length > 0)
const titleBeforeEdit = ref<string | null>(null)
const todoTextBeforeEdit = new Map<string, string>()

const draft = ref<Note | null>(null)
const isNotFound = ref(false)
const isDeletedExternally = ref(false)
const validationError = ref('')
const isDraftTrackingEnabled = ref(false)
const pendingStoredDraft = ref<StoredDraft | null>(null)
let draftBaseline: Note | null = null
let draftSaveTimer: ReturnType<typeof setTimeout> | null = null
type EditorAction = 'cancel' | 'delete' | 'restore' | null

const pendingAction = ref<EditorAction>(null)
const actionError = ref('')

const noteId = computed(() => String(route.params.id ?? ''))
const isNewNote = computed(() => noteId.value === 'new')
const dialogTitle = computed(() => {
  if (pendingAction.value === 'restore') {
    return 'Восстановить черновик?'
  }

  return pendingAction.value === 'delete'
    ? 'Удалить заметку?'
    : 'Отменить редактирование?'
})

const dialogMessage = computed(() => {
  if (pendingAction.value === 'restore') {
    return 'Найдены несохранённые изменения. Если не восстановить их, черновик будет удалён.'
  }

  return pendingAction.value === 'delete'
    ? 'Заметка будет удалена безвозвратно.'
    : 'Все несохранённые изменения будут потеряны.'
})

const dialogConfirmLabel = computed(() => {
  if (pendingAction.value === 'restore') {
    return 'Восстановить'
  }

  return pendingAction.value === 'delete'
    ? 'Удалить'
    : 'Отменить редактирование'
})

const dialogCancelLabel = computed(() => (
  pendingAction.value === 'restore'
    ? 'Не восстанавливать'
    : 'Отмена'
))

const isDialogDangerous = computed(
  () => pendingAction.value !== 'restore',
)

function initializeDraft(): void {
  stopDraftSaveTimer()
  isDraftTrackingEnabled.value = false
  pendingStoredDraft.value = null
  pendingAction.value = null
  draftBaseline = null
  clearNoteHistory(history)
  titleBeforeEdit.value = null
  todoTextBeforeEdit.clear()
  isNotFound.value = false
  isDeletedExternally.value = false
  validationError.value = ''

  if (isNewNote.value) {
    const newNote = createNote()

    draft.value = newNote
    draftBaseline = cloneNote(newNote)
    offerDraftRecovery()
    return
  }

  const savedNote = notesStore.getNoteById(noteId.value)

  if (savedNote === undefined) {
    draft.value = null
    isNotFound.value = true
    return
  }

  const savedNoteCopy = cloneNote(savedNote)

  draft.value = savedNoteCopy
  draftBaseline = cloneNote(savedNoteCopy)
  offerDraftRecovery()
}

function notesAreEqual(first: Note, second: Note): boolean {
  return JSON.stringify(first) === JSON.stringify(second)
}

function stopDraftSaveTimer(): void {
  if (draftSaveTimer === null) {
    return
  }

  clearTimeout(draftSaveTimer)
  draftSaveTimer = null
}

function clearStoredDraft(): void {
  stopDraftSaveTimer()

  if (import.meta.client) {
    removeDraftFromStorage(noteId.value)
  }
}

function persistDraftNow(): void {
  stopDraftSaveTimer()

  if (
    !import.meta.client
    || !isDraftTrackingEnabled.value
    || draft.value === null
    || draftBaseline === null
  ) {
    return
  }

  if (notesAreEqual(draft.value, draftBaseline)) {
    removeDraftFromStorage(noteId.value)
    return
  }

  const isSaved = saveDraftToStorage(
    noteId.value,
    draft.value,
  )

  if (!isSaved) {
    actionError.value = 'Не удалось сохранить черновик.'
  }
}

function scheduleDraftSave(): void {
  if (!isDraftTrackingEnabled.value) {
    return
  }

  stopDraftSaveTimer()
  draftSaveTimer = setTimeout(
    persistDraftNow,
    DRAFT_SAVE_DELAY,
  )
}

function offerDraftRecovery(): void {
  if (!import.meta.client || draft.value === null) {
    isDraftTrackingEnabled.value = true
    return
  }

  const storedDraft = loadDraftFromStorage(noteId.value)

  if (storedDraft === null) {
    isDraftTrackingEnabled.value = true
    return
  }

  const isCompatible = isNewNote.value
    || (
      storedDraft.note.id === draft.value.id
      && storedDraft.note.updatedAt === draft.value.updatedAt
    )

  if (
    !isCompatible
    || notesAreEqual(storedDraft.note, draft.value)
  ) {
    removeDraftFromStorage(noteId.value)
    isDraftTrackingEnabled.value = true
    return
  }

  pendingStoredDraft.value = storedDraft
  pendingAction.value = 'restore'
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

  isDraftTrackingEnabled.value = false
  clearStoredDraft()
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
  if (pendingAction.value === 'restore') {
    isDraftTrackingEnabled.value = false
    clearStoredDraft()
    pendingStoredDraft.value = null
    pendingAction.value = null
    isDraftTrackingEnabled.value = true
    return
  }

  pendingAction.value = null
}

async function confirmEditorAction(): Promise<void> {
  if (pendingAction.value === 'restore') {
    const storedDraft = pendingStoredDraft.value

    pendingStoredDraft.value = null
    pendingAction.value = null

    if (storedDraft !== null) {
      draft.value = cloneNote(storedDraft.note)
      clearNoteHistory(history)
      titleBeforeEdit.value = null
      todoTextBeforeEdit.clear()
      validationError.value = ''
      actionError.value = ''
    }

    isDraftTrackingEnabled.value = true
    return
  }

  if (pendingAction.value === 'cancel') {
    pendingAction.value = null
    isDraftTrackingEnabled.value = false
    clearStoredDraft()
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

    isDraftTrackingEnabled.value = false
    clearStoredDraft()
    clearNoteHistory(history)
    await navigateTo('/')
  }
}

watch(noteId, initializeDraft, {
  immediate: true,
})

watch(
  draft,
  scheduleDraftSave,
  { deep: true },
)

watch(
  () => notesStore.getNoteById(noteId.value) !== undefined,
  (noteExists, noteExistedBefore) => {
    if (isNewNote.value || isNotFound.value) {
      return
    }

    if (noteExistedBefore && !noteExists) {
      isDeletedExternally.value = true
      return
    }

    if (noteExists) {
      isDeletedExternally.value = false
    }
  },
)

onMounted(() => {
  window.addEventListener('keydown', handleHistoryShortcut)
  window.addEventListener('pagehide', persistDraftNow)
})

onBeforeUnmount(() => {
  persistDraftNow()
  window.removeEventListener('keydown', handleHistoryShortcut)
  window.removeEventListener('pagehide', persistDraftNow)
  stopDraftSaveTimer()
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
  <main class="editor-page">
    <NuxtLink
      v-if="isNotFound"
      class="back-control"
      to="/"
    >
      Назад к заметкам
    </NuxtLink>

    <button
      v-else
      class="back-control"
      type="button"
      @click="requestCancel"
    >
      Назад к заметкам
    </button>

    <section
      v-if="isNotFound"
      class="not-found-panel"
    >
      <h1 class="page-title">
        Заметка не найдена
      </h1>
      <p>Возможно, она была удалена или адрес указан неверно.</p>
    </section>

    <section
      v-else-if="draft"
      class="editor-panel"
    >
      <h1 class="page-title">
        {{ isNewNote ? 'Новая заметка' : 'Редактирование заметки' }}
      </h1>

      <p
        v-if="isDeletedExternally"
        class="info-message"
        role="status"
      >
        Эта заметка была удалена в другой вкладке.
        Вы можете продолжить редактирование и сохранить её заново.
      </p>

      <div class="history-controls">
        <button
          class="history-button"
          type="button"
          :disabled="!canUndo"
          @click="undoChange"
        >
          Отменить изменение
        </button>

        <button
          class="history-button"
          type="button"
          :disabled="!canRedo"
          @click="redoChange"
        >
          Повторить изменение
        </button>
      </div>

      <form
        class="editor-form"
        @submit.prevent="saveDraft"
      >
        <div class="field-group">
          <label
            class="field-label"
            for="note-title"
          >
            Название заметки
          </label>

          <input
            id="note-title"
            v-model="draft.title"
            class="text-input"
            type="text"
            autocomplete="off"
            @focus="startTitleEdit"
            @blur="finishTitleEdit"
          >
        </div>

        <h2 class="tasks-title">
          Задачи
        </h2>

        <p
          v-if="draft.todos.length === 0"
          class="tasks-empty"
        >
          В заметке пока нет задач.
        </p>

        <ul
          v-else
          class="todo-list"
        >
          <li
            v-for="todo in draft.todos"
            :key="todo.id"
            class="todo-row"
          >
            <input
              :id="`todo-completed-${todo.id}`"
              :checked="todo.completed"
              class="todo-checkbox"
              type="checkbox"
              @change="toggleTodo(todo.id)"
            >

            <label
              class="visually-hidden"
              :for="`todo-text-${todo.id}`"
            >
              Текст задачи
            </label>

            <input
              :id="`todo-text-${todo.id}`"
              v-model="todo.text"
              class="todo-input"
              type="text"
              autocomplete="off"
              @focus="startTodoTextEdit(todo.id)"
              @blur="finishTodoTextEdit(todo.id)"
            >

            <button
              class="remove-todo"
              type="button"
              @click="removeTodo(todo.id)"
            >
              Удалить
            </button>
          </li>
        </ul>

        <button
          class="add-button"
          type="button"
          @click="addTodo"
        >
          Добавить задачу
        </button>

        <p
          v-if="validationError"
          class="error-message"
          role="alert"
        >
          {{ validationError }}
        </p>

        <div class="form-actions">
          <button
            class="primary-button"
            type="submit"
          >
            Сохранить
          </button>

          <button
            class="secondary-button"
            type="button"
            @click="requestCancel"
          >
            Отменить редактирование
          </button>

          <button
            v-if="!isNewNote && !isDeletedExternally"
            class="danger-button"
            type="button"
            @click="requestDelete"
          >
            Удалить заметку
          </button>
        </div>
      </form>
    </section>

    <p
      v-if="actionError"
      class="error-message page-error"
      role="alert"
    >
      {{ actionError }}
    </p>

    <ConfirmDialog
      :open="pendingAction !== null"
      :title="dialogTitle"
      :message="dialogMessage"
      :confirm-label="dialogConfirmLabel"
      :cancel-label="dialogCancelLabel"
      :danger="isDialogDangerous"
      @confirm="confirmEditorAction"
      @cancel="closeActionDialog"
    />
  </main>
</template>

<style scoped lang="scss">
.editor-page {
  width: min(100% - 2rem, 56rem);
  margin: 0 auto;
  padding: 2.5rem 0 5rem;
}

.back-control {
  display: inline-flex;
  min-height: 2.75rem;
  align-items: center;
  padding: 0.5rem 0;
  margin-bottom: 1.25rem;
  color: #52627a;
  font-weight: 650;
  text-decoration: none;
  cursor: pointer;
  background: transparent;
  border: 0;
  transition: color 150ms ease;
}

.back-control::before {
  margin-right: 0.45rem;
  content: "←";
}

.back-control:hover {
  color: var(--primary);
}

.editor-panel,
.not-found-panel {
  padding: clamp(1.25rem, 4vw, 2.5rem);
  background: rgb(255 255 255 / 94%);
  border: 1px solid var(--border);
  border-radius: 1.25rem;
  box-shadow: var(--shadow);
}

.page-title {
  margin: 0;
  overflow-wrap: anywhere;
  font-size: clamp(2rem, 6vw, 3.15rem);
  line-height: 1.08;
  letter-spacing: -0.045em;
}

.info-message,
.error-message {
  padding: 0.9rem 1rem;
  border-radius: 0.75rem;
  line-height: 1.5;
}

.info-message {
  margin: 1.5rem 0 0;
  color: #1849a9;
  background: #eff4ff;
  border: 1px solid #b2ccff;
}

.error-message {
  margin: 1.25rem 0 0;
  color: #912018;
  background: #fff1f0;
  border: 1px solid #fecdca;
}

.page-error {
  max-width: 56rem;
  margin-inline: auto;
}

.history-controls {
  display: flex;
  flex-wrap: wrap;
  gap: 0.65rem;
  padding-bottom: 1.5rem;
  margin-top: 1.75rem;
  border-bottom: 1px solid #e8edf4;
}

.history-button,
.add-button,
.remove-todo,
.primary-button,
.secondary-button,
.danger-button {
  display: inline-flex;
  min-height: 2.75rem;
  align-items: center;
  justify-content: center;
  padding: 0.65rem 1rem;
  font-weight: 680;
  line-height: 1.1;
  cursor: pointer;
  border-radius: 0.7rem;
  transition:
    color 150ms ease,
    background-color 150ms ease,
    border-color 150ms ease,
    box-shadow 150ms ease;
}

.history-button,
.secondary-button {
  color: #3e4c63;
  background: #ffffff;
  border: 1px solid #cfd8e6;
}

.history-button:hover:not(:disabled),
.secondary-button:hover {
  color: var(--primary);
  background: #f6f8ff;
  border-color: #9eb2ef;
}

.history-button:disabled {
  color: #9aa6b7;
  cursor: not-allowed;
  background: #f5f7fa;
  border-color: #e1e6ee;
}

.editor-form {
  margin-top: 1.75rem;
}

.field-group {
  display: grid;
  gap: 0.55rem;
}

.field-label {
  color: #344054;
  font-size: 0.92rem;
  font-weight: 720;
}

.text-input,
.todo-input {
  width: 100%;
  min-width: 0;
  color: var(--text);
  background: #ffffff;
  border: 1px solid #cbd5e1;
  border-radius: 0.75rem;
  box-shadow: 0 1px 2px rgb(16 24 40 / 4%);
  transition:
    border-color 150ms ease,
    box-shadow 150ms ease;
}

.text-input {
  min-height: 3.25rem;
  padding: 0.75rem 0.9rem;
  font-size: 1.05rem;
}

.todo-input {
  min-height: 2.75rem;
  padding: 0.6rem 0.8rem;
}

.text-input:hover,
.todo-input:hover {
  border-color: #a8b5c8;
}

.text-input:focus,
.todo-input:focus {
  border-color: var(--primary);
  outline: none;
  box-shadow: 0 0 0 4px rgb(49 87 213 / 12%);
}

.tasks-title {
  padding-top: 1.75rem;
  margin: 2rem 0 1rem;
  font-size: 1.35rem;
  letter-spacing: -0.025em;
  border-top: 1px solid #e8edf4;
}

.tasks-empty {
  padding: 1.25rem;
  margin: 0 0 1rem;
  color: var(--muted);
  text-align: center;
  background: #f8fafc;
  border: 1px dashed #cbd5e1;
  border-radius: 0.8rem;
}

.todo-list {
  display: grid;
  padding: 0;
  margin: 0 0 1rem;
  gap: 0.75rem;
  list-style: none;
}

.todo-row {
  display: grid;
  min-width: 0;
  align-items: center;
  padding: 0.7rem;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: 0.75rem;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 0.85rem;
}

.todo-row:focus-within {
  background: #ffffff;
  border-color: #b7c6f6;
}

.todo-checkbox {
  width: 1.25rem;
  height: 1.25rem;
  margin: 0;
  cursor: pointer;
  accent-color: var(--primary);
}

.remove-todo {
  min-height: 2.5rem;
  padding-inline: 0.8rem;
  color: var(--danger);
  background: transparent;
  border: 1px solid transparent;
}

.remove-todo:hover {
  color: #ffffff;
  background: var(--danger);
}

.add-button {
  color: var(--primary);
  background: #edf2ff;
  border: 1px solid #c7d4ff;
}

.add-button::before {
  margin-right: 0.35rem;
  font-size: 1.15rem;
  content: "+";
}

.add-button:hover {
  color: #ffffff;
  background: var(--primary);
  border-color: var(--primary);
}

.form-actions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.75rem;
  padding-top: 1.5rem;
  margin-top: 1.75rem;
  border-top: 1px solid #e8edf4;
}

.primary-button {
  color: #ffffff;
  background: var(--primary);
  border: 1px solid var(--primary);
  box-shadow: 0 0.5rem 1rem rgb(49 87 213 / 16%);
}

.primary-button:hover {
  background: var(--primary-hover);
  border-color: var(--primary-hover);
}

.danger-button {
  margin-left: auto;
  color: var(--danger);
  background: #ffffff;
  border: 1px solid #efb5b1;
}

.danger-button:hover {
  color: #ffffff;
  background: var(--danger);
  border-color: var(--danger);
}

.not-found-panel {
  padding-block: 4rem;
  text-align: center;
}

.not-found-panel p {
  max-width: 34rem;
  margin: 1rem auto 0;
  color: var(--muted);
  line-height: 1.6;
}

@media (max-width: 42rem) {
  .editor-page {
    width: min(100% - 1.25rem, 56rem);
    padding: 1.25rem 0 3rem;
  }

  .editor-panel,
  .not-found-panel {
    border-radius: 1rem;
  }

  .todo-row {
    align-items: center;
    grid-template-columns: auto minmax(0, 1fr);
  }

  .remove-todo {
    grid-column: 2;
    justify-self: start;
  }

  .form-actions {
    align-items: stretch;
    flex-direction: column;
  }

  .primary-button,
  .secondary-button,
  .danger-button {
    width: 100%;
    margin-left: 0;
  }
}

@media (max-width: 28rem) {
  .history-controls {
    align-items: stretch;
    flex-direction: column;
  }

  .history-button,
  .add-button {
    width: 100%;
  }
}
</style>
