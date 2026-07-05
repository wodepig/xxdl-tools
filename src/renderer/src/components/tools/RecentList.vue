<script setup lang="ts">
import type { RecentItem } from '../../../../shared/types/tool'

defineProps<{ items: RecentItem[] }>()
const emit = defineEmits<{ itemClick: [toolId: string] }>()

function formatTime(ts: number): string {
  const diff = Date.now() - ts
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes}分钟前`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}小时前`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}天前`
  return new Date(ts).toLocaleDateString()
}
</script>

<template>
  <div v-if="items.length > 0" class="bg-[#1e293b] border border-[#334155] rounded-xl p-4">
    <div
      v-for="item in items"
      :key="item.toolId + item.timestamp"
      class="flex items-center gap-3 py-2.5 border-b border-[#334155] last:border-b-0 cursor-pointer transition-colors hover:text-[#6366f1]"
      @click="emit('itemClick', item.toolId)"
    >
      <div class="w-9 h-9 rounded-lg flex items-center justify-center text-lg bg-[rgba(99,102,241,0.1)] text-[#6366f1] shrink-0">
        <UIcon :name="item.icon || 'i-heroicons-cube'" class="w-5 h-5" />
      </div>
      <div class="flex-1 min-w-0">
        <h4 class="text-sm font-medium truncate">{{ item.toolName }}</h4>
        <span class="text-xs text-[#94a3b8] truncate block">{{ item.description }}</span>
      </div>
      <span class="text-xs text-[#94a3b8] shrink-0">{{ formatTime(item.timestamp) }}</span>
    </div>
  </div>
  <div v-else class="bg-[#1e293b] border border-[#334155] rounded-xl p-8 text-center text-sm text-[#94a3b8]">
    暂无使用记录
  </div>
</template>
