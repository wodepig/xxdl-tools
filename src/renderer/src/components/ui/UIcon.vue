<script setup lang="ts">
import { computed } from 'vue'

// 直接从 @iconify-json/heroicons 读取 SVG 数据，渲染内联 SVG
import heroiconsData from '@iconify-json/heroicons/icons.json'

const props = withDefaults(defineProps<{
  name: string
  size?: string | number
}>(), {
  size: 20
})

/** 从 i-heroicons-xxx 提取 icon key */
const iconKey = computed(() => {
  const n = props.name
  if (!n || typeof n !== 'string') return ''
  return n.startsWith('i-heroicons-') ? n.slice(12) : ''
})

/** 从 JSON 中查找图标 body */
const svgBody = computed(() => {
  const key = iconKey.value
  if (!key) return ''
  // heroiconsData.icons 的 key 就是图标名
  return (heroiconsData as Record<string, any>)?.icons?.[key]?.body ?? ''
})

const pixelSize = computed(() => {
  const s = props.size
  if (!s) return 20
  return Number.isNaN(+s) ? 20 : +s
})
</script>

<template>
  <svg
    v-if="svgBody"
    v-html="svgBody"
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    stroke-width="1.5"
    stroke="currentColor"
    :width="pixelSize"
    :height="pixelSize"
    class="shrink-0 align-middle"
  />
  <!-- fallback: 图标不存在时显示占位 -->
  <span
    v-else
    class="inline-flex items-center justify-center rounded"
    :style="{ width: pixelSize + 'px', height: pixelSize + 'px', fontSize: (pixelSize * 0.6) + 'px' }"
  >?</span>
</template>
