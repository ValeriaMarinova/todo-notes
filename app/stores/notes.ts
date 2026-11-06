import { defineStore } from 'pinia'
import { ref } from 'vue'
import { cloneNote } from '~/utils/noteFactory'
import type { Note } from '~/types/note'
import {
  loadNotesFromStorage,
  saveNotesToStorage,
} from '~/utils/notesStorage'

export const useNotesStore = defineStore('notes', () => {
  const notes = ref<Note[]>([])
  const hasStorageError = ref(false)

  function loadNotes(storage: Storage = localStorage): void {
    notes.value = loadNotesFromStorage(storage)
    hasStorageError.value = false
  }

  function getNoteById(id: string): Note | undefined {
    return notes.value.find(note => note.id === id)
  }

  function persistNotes(storage: Storage = localStorage): boolean {
    const isSaved = saveNotesToStorage(notes.value, storage)

    hasStorageError.value = !isSaved

    return isSaved
  }

  function saveNote(
    note: Note,
    storage: Storage = localStorage,
  ): boolean {
    const noteCopy = cloneNote(note)
    const index = notes.value.findIndex(item => item.id === note.id)

    if (index === -1) {
      notes.value.push(noteCopy)
    }
    else {
      notes.value[index] = noteCopy
    }

    return persistNotes(storage)
  }

  function deleteNote(
    id: string,
    storage: Storage = localStorage,
  ): boolean {
    const index = notes.value.findIndex(note => note.id === id)

    if (index === -1) {
      return false
    }

    notes.value.splice(index, 1)

    return persistNotes(storage)
  }

  return {
    notes,
    hasStorageError,
    loadNotes,
    getNoteById,
    saveNote,
    deleteNote,
  }
})