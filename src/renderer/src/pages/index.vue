<script setup lang="ts">
import { computed } from 'vue'
import { useToolsStore } from '../stores/toolsStore'
import { useSettingsStore } from '../stores/settingsStore'
import ToolSearch from '../components/tools/ToolSearch.vue'
import QuickAccessBar from '../components/tools/QuickAccessBar.vue'
import ToolCategorySection from '../components/tools/ToolCategorySection.vue'
import RecentList from '../components/tools/RecentList.vue'

const { filteredTools, categories, activeCategory } = useToolsStore()
const { recentTools } = useSettingsStore()

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
  // TODO: 导航到工具详情页
  console.log('Tool clicked:', toolId)
}

const pageTitle = computed(() => {
  if (activeCategory.value === 'all') return '欢迎使用工具箱'
  return categories.find(c => c.id === activeCategory.value)?.title || '工具箱'
})
</script>

<template>
  <div class="p-7 overflow-y-auto h-full">
    <!-- Header -->
    <div class="mb-7">
      <h1 class="text-2xl font-bold mb-2 bg-gradient-to-r from-[#f1f5f9] to-[#94a3b8] bg-clip-text text-transparent">
        {{ pageTitle }}
      </h1>
      <p class="text-sm text-[#94a3b8]">选择一个工具开始工作，或使用搜索快速定位</p>
    </div>

    <!-- Search -->
    <ToolSearch />

    <!-- Quick Access -->
    <QuickAccessBar @tool-click="handleToolClick" />

    <!-- Two Column Layout -->
    <div class="grid grid-cols-[2fr_1fr] gap-6 max-lg:grid-cols-1">
      <div>
        <ToolCategorySection
          v-for="section in filteredSections"
          :key="section.id"
          :section="section"
          @tool-click="handleToolClick"
        />
      </div>
      <div>
        <div class="flex items-center gap-2 mb-4">
          <UIcon name="i-heroicons-clock" class="w-5 h-5 text-[#6366f1]" />
          <h2 class="text-base font-semibold text-[#f1f5f9]">最近使用</h2>
        </div>
        <RecentList :items="recentTools" @item-click="handleToolClick" />
      </div>
    </div>
  </div>
</template>
