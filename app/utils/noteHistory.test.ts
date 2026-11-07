import { describe, expect, it } from 'vitest'
import type { Note } from '~/types/note'
import {
  HISTORY_LIMIT,
  addHistoryOperation,
  applyHistoryOperation,
  clearNoteHistory,
  createNoteHistory,
  takeRedoOperation,
  takeUndoOperation,
} from './noteHistory'
import type { HistoryOperation } from './noteHistory'

function createTestNote(): Note {
  return {
    id: 'note-1',
    title: 'Старая заметка',
    todos: [
      {
        id: 'todo-1',
        text: 'Старая задача',
        completed: false,
      },
    ],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  }
}

function createTitleOperation(index: number): HistoryOperation {
  return {
    type: 'title-change',
    before: `Название ${index}`,
    after: `Название ${index + 1}`,
  }
}

describe('история изменений заметки', () => {
  it('добавляет операцию в историю', () => {
    const history = createNoteHistory()
    const operation = createTitleOperation(0)

    addHistoryOperation(history, operation)

    expect(history.past).toEqual([operation])
    expect(history.future).toEqual([])
  })

  it('перемещает операции при undo и redo', () => {
    const history = createNoteHistory()
    const operation = createTitleOperation(0)

    addHistoryOperation(history, operation)

    expect(takeUndoOperation(history)).toEqual(operation)
    expect(history.past).toHaveLength(0)
    expect(history.future).toEqual([operation])

    expect(takeRedoOperation(history)).toEqual(operation)
    expect(history.past).toEqual([operation])
    expect(history.future).toHaveLength(0)
  })

  it('очищает redo после нового изменения', () => {
    const history = createNoteHistory()

    addHistoryOperation(history, createTitleOperation(0))
    takeUndoOperation(history)

    expect(history.future).toHaveLength(1)

    addHistoryOperation(history, createTitleOperation(1))

    expect(history.future).toHaveLength(0)
  })

  it('хранит не более 50 операций', () => {
    const history = createNoteHistory()

    for (let index = 0; index <= HISTORY_LIMIT; index += 1) {
      addHistoryOperation(history, createTitleOperation(index))
    }

    expect(history.past).toHaveLength(HISTORY_LIMIT)
    expect(history.past[0]).toEqual(createTitleOperation(1))
  })

  it('очищает историю', () => {
    const history = createNoteHistory()

    addHistoryOperation(history, createTitleOperation(0))
    takeUndoOperation(history)
    clearNoteHistory(history)

    expect(history.past).toHaveLength(0)
    expect(history.future).toHaveLength(0)
  })

  it('отменяет и повторяет изменение названия', () => {
    const note = createTestNote()
    const operation: HistoryOperation = {
      type: 'title-change',
      before: 'Старая заметка',
      after: 'Новая заметка',
    }

    applyHistoryOperation(note, operation, 'redo')
    expect(note.title).toBe('Новая заметка')

    applyHistoryOperation(note, operation, 'undo')
    expect(note.title).toBe('Старая заметка')
  })

  it('отменяет и повторяет изменение задачи', () => {
    const note = createTestNote()

    const textOperation: HistoryOperation = {
      type: 'todo-text-change',
      todoId: 'todo-1',
      before: 'Старая задача',
      after: 'Новая задача',
    }

    const completedOperation: HistoryOperation = {
      type: 'todo-completed-change',
      todoId: 'todo-1',
      before: false,
      after: true,
    }

    applyHistoryOperation(note, textOperation, 'redo')
    applyHistoryOperation(note, completedOperation, 'redo')

    expect(note.todos[0]?.text).toBe('Новая задача')
    expect(note.todos[0]?.completed).toBe(true)

    applyHistoryOperation(note, completedOperation, 'undo')
    applyHistoryOperation(note, textOperation, 'undo')

    expect(note.todos[0]?.text).toBe('Старая задача')
    expect(note.todos[0]?.completed).toBe(false)
  })

  it('отменяет и повторяет добавление задачи', () => {
    const note = createTestNote()
    const operation: HistoryOperation = {
      type: 'todo-add',
      todo: {
        id: 'todo-2',
        text: 'Добавленная задача',
        completed: false,
      },
      index: 1,
    }

    applyHistoryOperation(note, operation, 'redo')
    expect(note.todos).toHaveLength(2)

    applyHistoryOperation(note, operation, 'undo')
    expect(note.todos).toHaveLength(1)

    applyHistoryOperation(note, operation, 'redo')
    expect(note.todos[1]?.id).toBe('todo-2')
  })

  it('отменяет и повторяет удаление задачи', () => {
    const note = createTestNote()
    const operation: HistoryOperation = {
      type: 'todo-remove',
      todo: { ...note.todos[0]! },
      index: 0,
    }

    applyHistoryOperation(note, operation, 'redo')
    expect(note.todos).toHaveLength(0)

    applyHistoryOperation(note, operation, 'undo')
    expect(note.todos[0]?.id).toBe('todo-1')
  })
})