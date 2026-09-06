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
    <!-- 工具内容区域：滚动（描述栏已移除，返回按钮在左侧菜单） -->
    <div class="flex-1 overflow-y-auto px-7 py-6">
      <component :is="component" />
    </div>
  </div>
</template>
