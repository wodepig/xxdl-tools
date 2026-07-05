<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { ipcClient } from '../ipc/client'

const props = defineProps<{
  ym: string
  filename: string
}>()

const src = ref('')
const loaded = ref(false)
const failed = ref(false)

async function load(): Promise<void> {
  if (!props.ym || !props.filename) return
  loaded.value = false
  failed.value = false
  try {
    const result = await ipcClient.seentaoRecord.getImage(props.ym, props.filename)
    if (result) {
      src.value = result
      loaded.value = true
    } else {
      failed.value = true
    }
  } catch {
    failed.value = true
  }
}

onMounted(load)
watch(() => props.filename, load)
</script>

<template>
  <div class="flex h-full w-full items-center justify-center">
    <img
      v-if="src"
      :src="src"
      class="h-full w-full object-cover"
      alt="截图"
    />
    <UIcon
      v-else-if="failed"
      name="i-heroicons-photo"
      size="16"
      :style="{ color: 'var(--text-muted)' }"
    />
    <UIcon
      v-else
      name="i-heroicons-arrow-path"
      size="14"
      :style="{ color: 'var(--text-muted)' }"
      class="animate-spin"
    />
  </div>
</template>

<style scoped>
.animate-spin {
  animation: spin 1s linear infinite;
}
@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
