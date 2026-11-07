import { describe, expect, it } from 'vitest'
import type { Note } from '~/types/note'
import {
  DRAFT_SCHEMA_VERSION,
  getDraftStorageKey,
  loadDraftFromStorage,
  removeDraftFromStorage,
  saveDraftToStorage,
} from './draftStorage'

class MemoryStorage implements Storage {
  private readonly data = new Map<string, string>()

  get length(): number {
    return this.data.size
  }

  clear(): void {
    this.data.clear()
  }

  getItem(key: string): string | null {
    return this.data.get(key) ?? null
  }

  key(index: number): string | null {
    return Array.from(this.data.keys())[index] ?? null
  }

  removeItem(key: string): void {
    this.data.delete(key)
  }

  setItem(key: string, value: string): void {
    this.data.set(key, value)
  }
}

function createTestNote(): Note {
  return {
    id: 'note-1',
    title: 'Черновик',
    todos: [
      {
        id: 'todo-1',
        text: 'Задача',
        completed: false,
      },
    ],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  }
}

describe('хранилище черновиков', () => {
  it('сохраняет и загружает черновик', () => {
    const storage = new MemoryStorage()
    const note = createTestNote()

    expect(saveDraftToStorage('note-1', note, storage)).toBe(true)

    const storedDraft = loadDraftFromStorage('note-1', storage)

    expect(storedDraft?.schemaVersion).toBe(DRAFT_SCHEMA_VERSION)
    expect(storedDraft?.routeId).toBe('note-1')
    expect(storedDraft?.note).toEqual(note)
  })

  it('возвращает независимую копию заметки', () => {
    const storage = new MemoryStorage()
    const note = createTestNote()

    saveDraftToStorage('note-1', note, storage)

    const storedDraft = loadDraftFromStorage('note-1', storage)

    if (storedDraft === null) {
      throw new Error('Черновик не найден')
    }

    storedDraft.note.title = 'Изменённая копия'

    expect(loadDraftFromStorage('note-1', storage)?.note.title)
      .toBe('Черновик')
  })

  it('игнорирует данные с неподдерживаемой версией', () => {
    const storage = new MemoryStorage()

    storage.setItem(
      getDraftStorageKey('note-1'),
      JSON.stringify({
        schemaVersion: 999,
        routeId: 'note-1',
        note: createTestNote(),
        savedAt: '2026-01-01T00:00:00.000Z',
      }),
    )

    expect(loadDraftFromStorage('note-1', storage)).toBeNull()
  })

  it('удаляет черновик', () => {
    const storage = new MemoryStorage()

    saveDraftToStorage('note-1', createTestNote(), storage)

    expect(removeDraftFromStorage('note-1', storage)).toBe(true)
    expect(loadDraftFromStorage('note-1', storage)).toBeNull()
  })
})
