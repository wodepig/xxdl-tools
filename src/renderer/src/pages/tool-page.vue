<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { tools } from '../data/tools'

const route = useRoute()
const router = useRouter()

const tool = computed(() => tools.find(t => t.id === route.params.id))
const component = ref()

watch(
  () => route.params.id,
  async (id) => {
    if (!id) return
    if (!tools.find(t => t.id === id)) {
      router.push('/')
      return
    }
    try {
      const mod = await import(`./tools/${id}.vue`)
      component.value = mod.default
    } catch {
      router.push('/')
    }
  },
  { immediate: true }
)
</script>

<template>
  <div v-if="tool" class="flex h-full flex-col overflow-hidden" :style="{ backgroundColor: 'var(--bg-base)' }">
    <!-- 工具头部 -->
    <div class="flex shrink-0 items-center gap-3 border-b px-7 py-4" :style="{ borderColor: 'var(--border)' }">
      <button
        class="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg transition-colors hover:bg-[var(--border)]"
        :style="{ color: 'var(--text-secondary)' }"
        title="返回"
        @click="router.push('/')"
      >
        <UIcon name="i-heroicons-arrow-left" size="18" />
      </button>
      <div
        class="flex h-9 w-9 items-center justify-center rounded-xl shrink-0"
        :style="{ backgroundColor: `${tool.accentColor}26`, color: tool.accentColor }"
      >
        <UIcon :name="tool.icon" size="18" />
      </div>
      <div>
        <h1 class="text-base font-semibold" :style="{ color: 'var(--text-primary)' }">{{ tool.name }}</h1>
        <p class="text-xs" :style="{ color: 'var(--text-secondary)' }">{{ tool.description }}</p>
      </div>
    </div>
    <!-- 工具内容区域：滚动 -->
    <div class="flex-1 overflow-y-auto px-7 py-6">
      <component :is="component" />
    </div>
  </div>
</template>
