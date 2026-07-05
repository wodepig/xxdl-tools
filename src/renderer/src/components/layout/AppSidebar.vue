<script setup lang="ts">
interface Props {
  activeCategory?: string
  collapsed?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  activeCategory: 'all',
  collapsed: false
})

const emit = defineEmits<{
  select: [category: string]
}>()

const categories = [
  { id: 'all', label: '全部工具', icon: 'i-heroicons-squares-2x2' },
  { id: 'development', label: '开发工具', icon: 'i-heroicons-code-bracket' },
  { id: 'image', label: '图片处理', icon: 'i-heroicons-photo' },
  { id: 'text', label: '文本工具', icon: 'i-heroicons-document-text' },
  { id: 'security', label: '安全加密', icon: 'i-heroicons-lock-closed' },
  { id: 'data', label: '数据转换', icon: 'i-heroicons-arrow-path' }
]

const favorites = [
  { id: 'favorites', label: '我的收藏', icon: 'i-heroicons-star' },
  { id: 'recent', label: '使用记录', icon: 'i-heroicons-clock' }
]

function handleSelect(category: string): void {
  emit('select', category)
}
</script>

<template>
  <aside
    class="flex shrink-0 flex-col border-r transition-all duration-200"
    :class="collapsed ? 'w-16' : 'w-55'"
    :style="{
      borderColor: 'var(--border)',
      backgroundColor: 'var(--bg-sidebar)'
    }"
  >
    <!-- 分类区域 -->
    <div class="flex flex-col gap-1 px-3 pt-4">
      <span
        v-if="!collapsed"
        class="mb-1 px-2 text-xs font-medium uppercase tracking-wider"
        :style="{ color: 'var(--text-muted)' }"
      >
        分类
      </span>
      <button
        v-for="item in categories"
        :key="item.id"
        class="flex h-10 cursor-pointer items-center gap-3 rounded-lg px-2 text-sm transition-colors duration-150"
        :class="
          activeCategory === item.id
            ? 'bg-[rgba(99,102,241,0.15)] text-[#6366f1]'
            : 'hover:bg-[var(--border)]'
        "
        :style="activeCategory !== item.id ? { color: 'var(--text-secondary)' } : {}"
        :title="collapsed ? item.label : undefined"
        @click="handleSelect(item.id)"
      >
        <UIcon :name="item.icon" class="shrink-0" size="18" />
        <span
          v-if="!collapsed"
          class="truncate whitespace-nowrap"
        >
          {{ item.label }}
        </span>
      </button>
    </div>

    <!-- 分割线 -->
    <div v-if="!collapsed" class="mx-3 my-3 border-t" :style="{ borderColor: 'var(--border)' }" />

    <!-- 收藏区域 -->
    <div class="flex flex-col gap-1 px-3">
      <span
        v-if="!collapsed"
        class="mb-1 px-2 text-xs font-medium uppercase tracking-wider"
        :style="{ color: 'var(--text-muted)' }"
      >
        收藏
      </span>
      <button
        v-for="item in favorites"
        :key="item.id"
        class="flex h-10 cursor-pointer items-center gap-3 rounded-lg px-2 text-sm transition-colors duration-150"
        :class="
          activeCategory === item.id
            ? 'bg-[rgba(99,102,241,0.15)] text-[#6366f1]'
            : 'hover:bg-[var(--border)]'
        "
        :style="activeCategory !== item.id ? { color: 'var(--text-secondary)' } : {}"
        :title="collapsed ? item.label : undefined"
        @click="handleSelect(item.id)"
      >
        <UIcon :name="item.icon" class="shrink-0" size="18" />
        <span
          v-if="!collapsed"
          class="truncate whitespace-nowrap"
        >
          {{ item.label }}
        </span>
      </button>
    </div>
  </aside>
</template>
