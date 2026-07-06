<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useToolsStore } from '../stores/toolsStore'
import ToolSearch from '../components/tools/ToolSearch.vue'
import ToolCategorySection from '../components/tools/ToolCategorySection.vue'

console.log('[index.vue] Script setup executing')

const { filteredTools, categories, activeCategory } = useToolsStore()
const router = useRouter()

onMounted(() => {
  console.log('[index.vue] Component mounted, activeCategory:', activeCategory.value, 'tools count:', filteredTools.value.length)
})

// 将 filteredTools(ToolDefinition[]) 按分类分组为 CategorySection[]
const filteredSections = computed(() => {
  return categories
    .filter(c => c.id !== 'all' && (activeCategory.value === 'all' || c.id === activeCategory.value))
    .map(c => ({
      ...c,
      tools: c.tools.filter(t => filteredTools.value.some(ft => ft.id === t.id))
    }))
    .filter(c => c.tools.length > 0)
})

function handleToolClick(toolId: string) {
  router.push(`/tools/${toolId}`)
}
</script>

<template>
  <div class="p-7 overflow-y-auto h-full">
    <!-- Search -->
    <ToolSearch />

    <!-- 工具分类 -->
    <ToolCategorySection
      v-for="section in filteredSections"
      :key="section.id"
      :section="section"
      @tool-click="handleToolClick"
    />
  </div>
</template>
