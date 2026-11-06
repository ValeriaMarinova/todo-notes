import { useNotesStore } from '~/stores/notes'

export default defineNuxtPlugin(() => {
  const notesStore = useNotesStore()

  notesStore.loadNotes()
})