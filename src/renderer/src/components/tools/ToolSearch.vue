<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useToolsStore } from '../../stores/toolsStore'

const { searchQuery } = useToolsStore()
const inputRef = ref<HTMLInputElement>()

function handleKeydown(e: KeyboardEvent): void {
  if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
    e.preventDefault()
    inputRef.value?.focus()
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
})
</script>

<template>
  <div class="relative max-w-[480px] mb-7">
    <UIcon name="i-heroicons-magnifying-glass-20-solid" class="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#94a3b8]" />
    <UInput
      ref="inputRef"
      v-model="searchQuery"
      placeholder="搜索工具... (Ctrl + K)"
      :ui="{ base: 'w-full pl-11 pr-4 py-2.5 rounded-xl bg-[#1e293b] border border-[#334155] text-[#f1f5f9] placeholder-[#94a3b8] focus:border-[#6366f1] focus:ring-2 focus:ring-[rgba(99,102,241,0.15)]' }"
      size="lg"
    />
  </div>
</template>
