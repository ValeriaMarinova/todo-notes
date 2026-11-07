import type { Note, TodoItem } from '~/types/note'
import { cloneNote } from './noteFactory'

export const DRAFT_SCHEMA_VERSION = 1 as const
export const DRAFT_STORAGE_PREFIX = 'todo-notes:draft:'

export interface StoredDraft {
  schemaVersion: typeof DRAFT_SCHEMA_VERSION
  routeId: string
  note: Note
  savedAt: string
}

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

function isStoredDraft(
  value: unknown,
  routeId: string,
): value is StoredDraft {
  return (
    isObject(value)
    && value.schemaVersion === DRAFT_SCHEMA_VERSION
    && value.routeId === routeId
    && isNote(value.note)
    && typeof value.savedAt === 'string'
  )
}

export function getDraftStorageKey(routeId: string): string {
  return `${DRAFT_STORAGE_PREFIX}${encodeURIComponent(routeId)}`
}

export function loadDraftFromStorage(
  routeId: string,
  storage: Storage = localStorage,
): StoredDraft | null {
  try {
    const rawData = storage.getItem(getDraftStorageKey(routeId))

    if (rawData === null) {
      return null
    }

    const parsedData: unknown = JSON.parse(rawData)

    if (!isStoredDraft(parsedData, routeId)) {
      return null
    }

    return {
      ...parsedData,
      note: cloneNote(parsedData.note),
    }
  }
  catch {
    return null
  }
}

export function saveDraftToStorage(
  routeId: string,
  note: Note,
  storage: Storage = localStorage,
): boolean {
  try {
    const storedDraft: StoredDraft = {
      schemaVersion: DRAFT_SCHEMA_VERSION,
      routeId,
      note: cloneNote(note),
      savedAt: new Date().toISOString(),
    }

    storage.setItem(
      getDraftStorageKey(routeId),
      JSON.stringify(storedDraft),
    )

    return true
  }
  catch {
    return false
  }
}

export function removeDraftFromStorage(
  routeId: string,
  storage: Storage = localStorage,
): boolean {
  try {
    storage.removeItem(getDraftStorageKey(routeId))
    return true
  }
  catch {
    return false
  }
}
