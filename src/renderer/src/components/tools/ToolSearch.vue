<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useToolsStore } from '../../stores/toolsStore'

const store = useToolsStore()
const { searchQuery, setSearch } = store
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
    <UIcon
      name="i-heroicons-magnifying-glass-20-solid"
      size="20"
      class="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none"
      :style="{ color: 'var(--text-muted)' }"
    />
    <input
      ref="inputRef"
      :value="searchQuery"
      placeholder="搜索工具... (Ctrl+K)"
      class="w-full rounded-xl border pl-11 pr-4 py-2.5 text-sm outline-none transition-colors placeholder:opacity-60"
      :style="{
        backgroundColor: 'var(--bg-card)',
        borderColor: 'var(--border)',
        color: 'var(--text-primary)'
      }"
      @input="
        setSearch(($event.target as HTMLInputElement).value);
        ($event.target as HTMLInputElement).style.borderColor = '#6366f1';
      "
      @blur="($event.target as HTMLInputElement).style.borderColor = 'var(--border)'"
    />
  </div>
</template>
