import { useNotesStore } from '~/stores/notes'
import { NOTES_STORAGE_KEY } from '~/utils/notesStorage'

export default defineNuxtPlugin(() => {
  const notesStore = useNotesStore()

  notesStore.loadNotes()

  function syncNotesBetweenTabs(event: StorageEvent): void {
    if (event.storageArea !== localStorage) {
      return
    }

    if (
      event.key !== NOTES_STORAGE_KEY
      && event.key !== null
    ) {
      return
    }

    notesStore.loadNotes()
  }

  window.addEventListener('storage', syncNotesBetweenTabs)

  import.meta.hot?.dispose(() => {
    window.removeEventListener(
      'storage',
      syncNotesBetweenTabs,
    )
  })
})
