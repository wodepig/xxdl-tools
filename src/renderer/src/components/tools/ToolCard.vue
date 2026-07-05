<script setup lang="ts">
import type { ToolDefinition } from '../../../../shared/types/tool'

const props = defineProps<{ tool: ToolDefinition }>()
const emit = defineEmits<{ click: [toolId: string] }>()
</script>

<template>
  <div
    class="border rounded-xl p-5 cursor-pointer transition-all duration-250 hover:-translate-y-1 hover:shadow-lg hover:border-[var(--card-accent)] relative overflow-hidden group"
    :style="{
      backgroundColor: 'var(--bg-card)',
      borderColor: 'var(--border)',
      '--card-accent': tool.accentColor,
      '--card-bg': `${tool.accentColor}26`
    }"
    @click="emit('click', tool.id)"
  >
    <!-- 顶部色条 -->
    <div
      class="absolute top-0 left-0 right-0 h-[3px] opacity-0 group-hover:opacity-100 transition-opacity duration-250"
      :style="{ background: tool.accentColor }"
    />
    <!-- 图标 -->
    <div
      class="w-11 h-11 rounded-xl flex items-center justify-center text-[22px] mb-3.5"
      :style="{ background: `var(--card-bg)`, color: tool.accentColor }"
    >
      <UIcon :name="tool.icon" class="w-5 h-5" />
    </div>
    <!-- 名称 -->
    <h3 class="text-[15px] font-semibold mb-1.5" :style="{ color: 'var(--text-primary)' }">{{ tool.name }}</h3>
    <!-- 描述 -->
    <p class="text-xs leading-relaxed mb-3" :style="{ color: 'var(--text-secondary)' }">{{ tool.description }}</p>
    <!-- Meta -->
    <div class="flex items-center justify-between text-[11px]" :style="{ color: 'var(--text-secondary)' }">
      <span class="px-2 py-0.5 rounded text-[11px]" :style="{ backgroundColor: 'var(--bg-base)' }">{{ tool.tags?.[0] || '通用' }}</span>
      <span v-if="tool.rating" class="flex items-center gap-1">
        <UIcon name="i-heroicons-star-solid" class="w-3 h-3 text-[#f59e0b]" />
        {{ tool.rating }}
      </span>
    </div>
  </div>
</template>
