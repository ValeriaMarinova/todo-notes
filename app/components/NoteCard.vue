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
  <article>
    <h2>{{ note.title }}</h2>

    <p v-if="note.todos.length === 0">
      В заметке нет задач.
    </p>

    <ul v-else>
      <li
        v-for="todo in visibleTodos"
        :key="todo.id"
      >
        <input
          type="checkbox"
          :checked="todo.completed"
          disabled
          :aria-label="todo.text"
        >

        <span>{{ todo.text }}</span>
      </li>
    </ul>

    <p v-if="hiddenTodosCount > 0">
      Ещё задач: {{ hiddenTodosCount }}
    </p>

    <NuxtLink :to="`/notes/${note.id}`">
      Изменить
    </NuxtLink>

    <button
        type="button"
        @click="emit('delete', note)"
        >
        Удалить
    </button>
  </article>
</template>