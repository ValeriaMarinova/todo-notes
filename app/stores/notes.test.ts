import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import type { Note } from '~/types/note'
import {
  loadNotesFromStorage,
  saveNotesToStorage,
} from '~/utils/notesStorage'
import { useNotesStore } from './notes'

class MemoryStorage implements Storage {
  protected readonly data = new Map<string, string>()

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

class FailingStorage extends MemoryStorage {
  override setItem(): void {
    throw new Error('Хранилище недоступно')
  }
}

function createTestNote(
  id = 'note-1',
  title = 'Тестовая заметка',
): Note {
  return {
    id,
    title,
    todos: [
      {
        id: `todo-${id}`,
        text: 'Тестовая задача',
        completed: false,
      },
    ],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  }
}

describe('стор заметок', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('загружает заметки из хранилища', () => {
    const storage = new MemoryStorage()
    const note = createTestNote()

    saveNotesToStorage([note], storage)

    const store = useNotesStore()
    store.loadNotes(storage)

    expect(store.notes).toEqual([note])
    expect(store.hasStorageError).toBe(false)
  })

  it('создаёт и сохраняет новую заметку', () => {
    const storage = new MemoryStorage()
    const store = useNotesStore()
    const note = createTestNote()

    expect(store.saveNote(note, storage)).toBe(true)
    expect(store.notes).toHaveLength(1)
    expect(store.getNoteById(note.id)).toEqual(note)
    expect(loadNotesFromStorage(storage)).toEqual([note])
  })

  it('обновляет существующую заметку без дубликата', () => {
    const storage = new MemoryStorage()
    const store = useNotesStore()
    const note = createTestNote()

    store.saveNote(note, storage)

    const updatedNote: Note = {
      ...note,
      title: 'Обновлённая заметка',
      updatedAt: '2026-01-02T00:00:00.000Z',
    }

    expect(store.saveNote(updatedNote, storage)).toBe(true)
    expect(store.notes).toHaveLength(1)
    expect(store.getNoteById(note.id)?.title)
      .toBe('Обновлённая заметка')
    expect(loadNotesFromStorage(storage)).toEqual([updatedNote])
  })

  it('удаляет заметку из стора и хранилища', () => {
    const storage = new MemoryStorage()
    const store = useNotesStore()
    const firstNote = createTestNote('note-1', 'Первая')
    const secondNote = createTestNote('note-2', 'Вторая')

    store.saveNote(firstNote, storage)
    store.saveNote(secondNote, storage)

    expect(store.deleteNote(firstNote.id, storage)).toBe(true)
    expect(store.notes).toEqual([secondNote])
    expect(loadNotesFromStorage(storage)).toEqual([secondNote])
  })

  it('не удаляет несуществующую заметку', () => {
    const storage = new MemoryStorage()
    const store = useNotesStore()
    const note = createTestNote()

    store.saveNote(note, storage)

    expect(store.deleteNote('missing-note', storage)).toBe(false)
    expect(store.notes).toEqual([note])
    expect(loadNotesFromStorage(storage)).toEqual([note])
  })

  it('сообщает об ошибке записи в хранилище', () => {
    const store = useNotesStore()
    const failingStorage = new FailingStorage()

    expect(store.saveNote(createTestNote(), failingStorage)).toBe(false)
    expect(store.hasStorageError).toBe(true)
  })

  it('сбрасывает ошибку после успешной записи', () => {
    const store = useNotesStore()

    store.saveNote(createTestNote(), new FailingStorage())

    expect(store.saveNote(createTestNote(), new MemoryStorage()))
      .toBe(true)
    expect(store.hasStorageError).toBe(false)
  })

  it('не хранит ссылку на переданную заметку', () => {
    const storage = new MemoryStorage()
    const store = useNotesStore()
    const note = createTestNote()

    store.saveNote(note, storage)

    note.title = 'Изменено снаружи'
    note.todos[0]!.text = 'Изменено снаружи'

    expect(store.getNoteById(note.id)?.title).toBe('Тестовая заметка')
    expect(store.getNoteById(note.id)?.todos[0]?.text)
      .toBe('Тестовая задача')
  })
})
