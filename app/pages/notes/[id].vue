<script setup lang="ts">

const route = useRoute()
const isNewNote = computed(() => route.params.id === 'new')

useHead({
  title: () => isNewNote.value ? 'Новая заметка' : 'Редактирование заметки'})
</script>

<template>
  <main>
    <NuxtLink to="/">
      Назад к заметкам
    </NuxtLink>

    <h1>
      {{ isNewNote ? 'Новая заметка' : 'Редактирование заметки' }}
    </h1>
  </main>
</template> 