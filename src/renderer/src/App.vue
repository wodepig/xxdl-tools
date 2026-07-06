<script setup lang="ts">
import { onMounted } from 'vue'

console.log('[App.vue] Script setup executing')

onMounted(() => {
  console.log('[App.vue] Component mounted')
})
</script>

<template>
  <UApp>
    <router-view />
  </UApp>
</template>
