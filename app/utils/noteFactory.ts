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

export function cloneNote(note: Note): Note {
  return {
    id: note.id,
    title: note.title,
    todos: note.todos.map(todo => ({
      id: todo.id,
      text: todo.text,
      completed: todo.completed,
    })),
    createdAt: note.createdAt,
    updatedAt: note.updatedAt,
  }
}  
