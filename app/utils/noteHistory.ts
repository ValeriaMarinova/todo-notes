import type { Note, TodoItem } from '~/types/note'

export const HISTORY_LIMIT = 50

export type HistoryOperation =
  | {
      type: 'title-change'
      before: string
      after: string
    }
  | {
      type: 'todo-text-change'
      todoId: string
      before: string
      after: string
    }
  | {
      type: 'todo-completed-change'
      todoId: string
      before: boolean
      after: boolean
    }
  | {
      type: 'todo-add'
      todo: TodoItem
      index: number
    }
  | {
      type: 'todo-remove'
      todo: TodoItem
      index: number
    }

export interface NoteHistory {
  past: HistoryOperation[]
  future: HistoryOperation[]
}

export function createNoteHistory(): NoteHistory {
  return {
    past: [],
    future: [],
  }
}

export function addHistoryOperation(
  history: NoteHistory,
  operation: HistoryOperation,
): void {
  history.past.push(operation)

  if (history.past.length > HISTORY_LIMIT) {
    history.past.shift()
  }

  history.future = []
}

export function takeUndoOperation(
  history: NoteHistory,
): HistoryOperation | undefined {
  const operation = history.past.pop()

  if (operation) {
    history.future.push(operation)
  }

  return operation
}

export function takeRedoOperation(
  history: NoteHistory,
): HistoryOperation | undefined {
  const operation = history.future.pop()

  if (operation) {
    history.past.push(operation)
  }

  return operation
}

export function clearNoteHistory(history: NoteHistory): void {
  history.past = []
  history.future = []
}

export type HistoryDirection = 'undo' | 'redo'

function removeTodo(note: Note, todoId: string): void {
  const index = note.todos.findIndex(todo => todo.id === todoId)

  if (index !== -1) {
    note.todos.splice(index, 1)
  }
}

function insertTodo(note: Note, todo: TodoItem, index: number): void {
  note.todos.splice(index, 0, { ...todo })
}

export function applyHistoryOperation(
  note: Note,
  operation: HistoryOperation,
  direction: HistoryDirection,
): void {
  const usePreviousValue = direction === 'undo'

  switch (operation.type) {
    case 'title-change':
      note.title = usePreviousValue
        ? operation.before
        : operation.after
      break

    case 'todo-text-change': {
      const todo = note.todos.find(item => item.id === operation.todoId)

      if (todo) {
        todo.text = usePreviousValue
          ? operation.before
          : operation.after
      }

      break
    }

    case 'todo-completed-change': {
      const todo = note.todos.find(item => item.id === operation.todoId)

      if (todo) {
        todo.completed = usePreviousValue
          ? operation.before
          : operation.after
      }

      break
    }

    case 'todo-add':
      if (direction === 'undo') {
        removeTodo(note, operation.todo.id)
      } else {
        insertTodo(note, operation.todo, operation.index)
      }
      break

    case 'todo-remove':
      if (direction === 'undo') {
        insertTodo(note, operation.todo, operation.index)
      } else {
        removeTodo(note, operation.todo.id)
      }
      break
  }
}