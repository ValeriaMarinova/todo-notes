<script setup lang="ts">
import type { Note } from '~/types/note'

const props = defineProps<{
  note: Note
}>()

const emit = defineEmits<{
  delete: [note: Note]
}>()

const visibleTodos = computed(() => props.note.todos.slice(0, 3))

const hiddenTodosCount = computed(() => (
  Math.max(props.note.todos.length - visibleTodos.value.length, 0)
))
</script>

<template>
  <article class="note-card">
    <h2 class="note-title">
      {{ note.title }}
    </h2>

    <p
      v-if="note.todos.length === 0"
      class="empty-todos"
    >
      В заметке нет задач.
    </p>

    <ul
      v-else
      class="todo-preview"
    >
      <li
        v-for="todo in visibleTodos"
        :key="todo.id"
        class="preview-item"
      >
        <input
          class="preview-checkbox"
          type="checkbox"
          :checked="todo.completed"
          disabled
          :aria-label="todo.text"
        >

        <span :class="{ 'completed-text': todo.completed }">
          {{ todo.text }}
        </span>
      </li>
    </ul>

    <p
      v-if="hiddenTodosCount > 0"
      class="remaining-count"
    >
      Ещё задач: {{ hiddenTodosCount }}
    </p>

    <div class="card-actions">
      <NuxtLink
        class="edit-link"
        :to="`/notes/${note.id}`"
      >
        Изменить
      </NuxtLink>

      <button
        type="button"
        class="remove-button"
        @click="emit('delete', note)"
      >
        Удалить
      </button>
    </div>
  </article>
</template>

<style scoped lang="scss">
.note-card {
  display: flex;
  min-width: 0;
  min-height: 18rem;
  padding: 1.4rem;
  flex-direction: column;
  background: rgb(255 255 255 / 92%);
  border: 1px solid var(--border);
  border-radius: 1rem;
  box-shadow: 0 0.35rem 1.2rem rgb(37 54 88 / 5%);
  transition:
    border-color 160ms ease,
    box-shadow 160ms ease,
    transform 160ms ease;
}

.note-card:hover {
  border-color: #bdc9dd;
  box-shadow: var(--shadow);
  transform: translateY(-2px);
}

.note-title {
  margin: 0 0 1.25rem;
  overflow-wrap: anywhere;
  font-size: 1.35rem;
  line-height: 1.25;
  letter-spacing: -0.025em;
}

.todo-preview {
  display: grid;
  padding: 0;
  margin: 0;
  gap: 0.75rem;
  list-style: none;
}

.preview-item {
  display: grid;
  min-width: 0;
  align-items: start;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 0.65rem;
  color: #334155;
  line-height: 1.4;
}

.preview-item span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.preview-checkbox {
  width: 1.05rem;
  height: 1.05rem;
  margin: 0.15rem 0 0;
  accent-color: var(--primary);
  opacity: 1;
}

.completed-text {
  color: #94a3b8;
  text-decoration: line-through;
}

.empty-todos {
  margin: 0;
  color: var(--muted);
  line-height: 1.55;
}

.remaining-count {
  margin: 1rem 0 0;
  color: var(--muted);
  font-size: 0.875rem;
  font-weight: 650;
}

.card-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding-top: 1.25rem;
  margin-top: auto;
  border-top: 1px solid #edf0f5;
}

.edit-link,
.remove-button {
  display: inline-flex;
  min-height: 2.65rem;
  align-items: center;
  justify-content: center;
  padding: 0.55rem 0.9rem;
  font: inherit;
  font-weight: 650;
  line-height: 1;
  text-decoration: none;
  cursor: pointer;
  border-radius: 0.65rem;
  transition:
    color 150ms ease,
    background-color 150ms ease,
    border-color 150ms ease;
}

.edit-link {
  color: var(--primary);
  background: #edf2ff;
}

.edit-link:hover {
  color: #ffffff;
  background: var(--primary);
}

.remove-button {
  color: var(--danger);
  background: transparent;
  border: 1px solid #f2b8b5;
}

.remove-button:hover {
  color: #ffffff;
  background: var(--danger);
  border-color: var(--danger);
}

@media (max-width: 25rem) {
  .card-actions {
    align-items: stretch;
    flex-direction: column;
  }

  .edit-link,
  .remove-button {
    width: 100%;
  }
}
</style>
