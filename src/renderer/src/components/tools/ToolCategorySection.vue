<script setup lang="ts">
import type { CategorySection } from '../../../../shared/types/tool'
import ToolCard from './ToolCard.vue'

defineProps<{ section: CategorySection }>()
const emit = defineEmits<{ toolClick: [toolId: string] }>()
</script>

<template>
  <div class="mb-8">
    <div class="flex items-center gap-2 mb-4">
      <UIcon :name="section.icon" class="w-5 h-5" :style="{ color: section.color }" />
      <h2 class="text-base font-semibold text-[#f1f5f9]">{{ section.title }}</h2>
      <span class="text-[11px] px-2 py-0.5 rounded-full bg-[#1e293b] text-[#94a3b8] font-normal">{{ section.tools.length }}</span>
    </div>
    <div class="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-4">
      <ToolCard
        v-for="tool in section.tools"
        :key="tool.id"
        :tool="tool"
        @click="emit('toolClick', $event)"
      />
    </div>
  </div>
</template>
