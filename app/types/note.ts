export interface TodoItem {
  id: string
  text: string
  completed: boolean
}

export interface Note {
  id: string
  title: string
  todos: TodoItem[]
  createdAt: string
  updatedAt: string
}

export const STORAGE_SCHEMA_VERSION = 1 as const

export interface StoredNotes {
  schemaVersion: typeof STORAGE_SCHEMA_VERSION
  notes: Note[]
}