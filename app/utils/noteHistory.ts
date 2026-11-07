import type { TodoItem } from '~/types/note'

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