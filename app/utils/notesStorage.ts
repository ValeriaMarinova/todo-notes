import {
  STORAGE_SCHEMA_VERSION,
  type Note,
  type StoredNotes,
  type TodoItem,
} from '~/types/note'

export const NOTES_STORAGE_KEY = 'todo-notes:data'

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isTodoItem(value: unknown): value is TodoItem {
  return (
    isObject(value)
    && typeof value.id === 'string'
    && typeof value.text === 'string'
    && typeof value.completed === 'boolean'
  )
}

function isNote(value: unknown): value is Note {
  return (
    isObject(value)
    && typeof value.id === 'string'
    && typeof value.title === 'string'
    && typeof value.createdAt === 'string'
    && typeof value.updatedAt === 'string'
    && Array.isArray(value.todos)
    && value.todos.every(isTodoItem)
  )
}

function isStoredNotes(value: unknown): value is StoredNotes {
  return (
    isObject(value)
    && value.schemaVersion === STORAGE_SCHEMA_VERSION
    && Array.isArray(value.notes)
    && value.notes.every(isNote)
  )
}

export function loadNotesFromStorage(
  storage: Storage = localStorage,
): Note[] {
  try {
    const rawData = storage.getItem(NOTES_STORAGE_KEY)

    if (rawData === null) {
      return []
    }

    const parsedData: unknown = JSON.parse(rawData)

    if (!isStoredNotes(parsedData)) {
      return []
    }

    return structuredClone(parsedData.notes)
  }
  catch {
    return []
  }
}

export function saveNotesToStorage(
  notes: Note[],
  storage: Storage = localStorage,
): boolean {
  try {
    const data: StoredNotes = {
      schemaVersion: STORAGE_SCHEMA_VERSION,
      notes,
    }

    storage.setItem(NOTES_STORAGE_KEY, JSON.stringify(data))
    return true
  }
  catch {
    return false
  }
}