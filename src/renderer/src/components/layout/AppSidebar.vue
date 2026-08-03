<script setup lang="ts">
interface Props {
  activeCategory?: string
  collapsed?: boolean
  pinned?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  activeCategory: 'all',
  collapsed: false,
  pinned: false
})

const emit = defineEmits<{
  select: [category: string]
  toggleCollapse: []
  togglePin: []
}>()

const categories = [
  { id: 'all', label: '全部工具', icon: 'i-heroicons-squares-2x2' },
  { id: 'development', label: '开发工具', icon: 'i-heroicons-code-bracket' },
  { id: 'security', label: '安全加密', icon: 'i-heroicons-shield-check' },
  { id: 'data', label: '数据转换', icon: 'i-heroicons-arrow-path' },
  { id: 'image', label: '图片处理', icon: 'i-heroicons-photo' }
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

    <!-- 底部：收起/展开 + 固定按钮 -->
    <div class="mt-auto border-t px-3 py-3" :style="{ borderColor: 'var(--border)' }">
      <div class="flex items-center gap-1">
        <!-- 固定/取消固定按钮（仅收起时显示） -->
        <button
          v-if="collapsed"
          class="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg transition-colors"
          :class="pinned ? 'bg-[rgba(99,102,241,0.15)] text-[#6366f1]' : 'hover:bg-[var(--border)]'"
          :style="{ color: pinned ? '#6366f1' : 'var(--text-muted)' }"
          :title="pinned ? '已固定，点击工具不自动收起' : '未固定，点击工具自动收起'"
          @click="emit('togglePin')"
        >
          <UIcon :name="pinned ? 'i-heroicons-lock-closed' : 'i-heroicons-lock-open'" size="16" />
        </button>
        <!-- 收起/展开按钮 -->
        <button
          class="flex h-9 cursor-pointer items-center justify-center rounded-lg transition-colors hover:bg-[var(--border)]"
          :class="collapsed ? 'w-9' : 'w-full'"
          :style="{ color: 'var(--text-muted)' }"
          :title="collapsed ? '展开侧边栏' : '收起侧边栏'"
          @click="emit('toggleCollapse')"
        >
          <UIcon
            :name="collapsed ? 'i-heroicons-chevron-double-right' : 'i-heroicons-chevron-double-left'"
            size="16"
          />
          <span v-if="!collapsed" class="ml-2 text-xs">收起侧边栏</span>
        </button>
      </div>
    </div>
  </aside>
</template>
