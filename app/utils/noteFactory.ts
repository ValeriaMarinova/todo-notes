import type { Note, TodoItem } from '~/types/note'

export function createTodoItem(): TodoItem {
  return {
    id: crypto.randomUUID(),
    text: '',
    completed: false,
  }
}

export function createNote(): Note {
  const now = new Date().toISOString()

  return {
    id: crypto.randomUUID(),
    title: '',
    todos: [],
    createdAt: now,
    updatedAt: now,
  }
}