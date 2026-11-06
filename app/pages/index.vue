<script setup lang="ts">
useHead({
  title: 'Заметки',
})
</script>

<template>
  <main>
    <h1>Мои заметки</h1>

    <NuxtLink to="/notes/new">
      Создать заметку
    </NuxtLink>
  </main>
</template>