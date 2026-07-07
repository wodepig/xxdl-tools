<script setup lang="ts">
import { ref, computed, watch } from 'vue'

type Provider = 'baidu' | 'quark'

interface MockFileItem {
  id: string
  name: string
  isFolder: boolean
  size?: number
  modifiedAt?: string
  children?: MockFileItem[]
}

interface DisplayItem {
  item: MockFileItem
  level: number
}

const props = withDefaults(defineProps<{
  provider?: Provider
}>(), {
  provider: 'baidu'
})

const emit = defineEmits<{
  'update:selected': [fileIds: string[]]
}>()

const providerName: Record<Provider, string> = {
  baidu: '百度网盘',
  quark: '夸克网盘'
}

let idCounter = 0
function genId(prefix: string): string {
  return `${prefix}-${++idCounter}`
}

const baiduFiles: MockFileItem[] = [
  {
    id: genId('folder'),
    name: '项目文档',
    isFolder: true,
    modifiedAt: '2026-06-15 14:30',
    children: [
      {
        id: genId('file'),
        name: '需求说明.docx',
        isFolder: false,
        size: 256 * 1024,
        modifiedAt: '2026-06-14 10:00'
      },
      {
        id: genId('file'),
        name: '架构设计.pdf',
        isFolder: false,
        size: 1.2 * 1024 * 1024,
        modifiedAt: '2026-06-13 16:20'
      }
    ]
  },
  {
    id: genId('folder'),
    name: '图片素材',
    isFolder: true,
    modifiedAt: '2026-06-12 09:15',
    children: [
      {
        id: genId('file'),
        name: 'banner.png',
        isFolder: false,
        size: 512 * 1024,
        modifiedAt: '2026-06-11 11:00'
      },
      {
        id: genId('file'),
        name: 'logo.png',
        isFolder: false,
        size: 128 * 1024,
        modifiedAt: '2026-06-10 08:30'
      },
      {
        id: genId('file'),
        name: '背景图.jpg',
        isFolder: false,
        size: 2.5 * 1024 * 1024,
        modifiedAt: '2026-06-09 17:45'
      }
    ]
  },
  {
    id: genId('file'),
    name: 'README.txt',
    isFolder: false,
    size: 5 * 1024,
    modifiedAt: '2026-06-08 13:00'
  },
  {
    id: genId('file'),
    name: '数据汇总.xlsx',
    isFolder: false,
    size: 890 * 1024,
    modifiedAt: '2026-06-07 10:30'
  }
]

const quarkFiles: MockFileItem[] = [
  {
    id: genId('folder'),
    name: '学习资料',
    isFolder: true,
    modifiedAt: '2026-07-01 08:00',
    children: [
      {
        id: genId('file'),
        name: 'Python教程.pdf',
        isFolder: false,
        size: 3.5 * 1024 * 1024,
        modifiedAt: '2026-06-30 14:00'
      },
      {
        id: genId('file'),
        name: '机器学习笔记.md',
        isFolder: false,
        size: 45 * 1024,
        modifiedAt: '2026-06-29 09:30'
      }
    ]
  },
  {
    id: genId('folder'),
    name: '视频',
    isFolder: true,
    modifiedAt: '2026-06-28 11:20',
    children: [
      {
        id: genId('file'),
        name: '教学视频1.mp4',
        isFolder: false,
        size: 156 * 1024 * 1024,
        modifiedAt: '2026-06-27 10:00'
      },
      {
        id: genId('file'),
        name: '教学视频2.mp4',
        isFolder: false,
        size: 203 * 1024 * 1024,
        modifiedAt: '2026-06-26 15:30'
      }
    ]
  },
  {
    id: genId('file'),
    name: '笔记.txt',
    isFolder: false,
    size: 12 * 1024,
    modifiedAt: '2026-06-25 20:00'
  },
  {
    id: genId('file'),
    name: '日程安排.ics',
    isFolder: false,
    size: 8 * 1024,
    modifiedAt: '2026-06-24 07:45'
  }
]

const fileList = computed<MockFileItem[]>(() => {
  idCounter = 0
  return props.provider === 'baidu' ? baiduFiles : quarkFiles
})

const expandedFolders = ref<Set<string>>(new Set())
const selectedIds = ref<Set<string>>(new Set())

const displayList = computed<DisplayItem[]>(() => {
  const result: DisplayItem[] = []
  function traverse(items: MockFileItem[], level: number) {
    for (const item of items) {
      result.push({ item, level })
      if (item.isFolder && expandedFolders.value.has(item.id)) {
        if (item.children) {
          traverse(item.children, level + 1)
        }
      }
    }
  }
  traverse(fileList.value, 0)
  return result
})

const selectedCount = computed(() => selectedIds.value.size)

function toggleFolder(id: string) {
  const next = new Set(expandedFolders.value)
  if (next.has(id)) {
    next.delete(id)
  } else {
    next.add(id)
  }
  expandedFolders.value = next
}

function toggleSelect(id: string) {
  const next = new Set(selectedIds.value)
  if (next.has(id)) {
    next.delete(id)
  } else {
    next.add(id)
  }
  selectedIds.value = next
  emit('update:selected', Array.from(next))
}

function formatSize(bytes?: number): string {
  if (bytes === undefined) return '-'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`
}

// Reset selection when provider changes
watch(() => props.provider, () => {
  expandedFolders.value = new Set()
  selectedIds.value = new Set()
  emit('update:selected', [])
})
</script>

<template>
  <div
    class="rounded-xl flex flex-col overflow-hidden"
    :style="{
      backgroundColor: 'var(--bg-card)',
      border: '1px solid var(--border)'
    }"
  >
    <!-- Header -->
    <div
      class="px-4 py-3 text-sm font-semibold border-b select-none"
      :style="{
        color: 'var(--text-primary)',
        borderColor: 'var(--border)'
      }"
    >
      {{ providerName[provider] }} - 文件列表
    </div>

    <!-- List -->
    <div class="flex-1 overflow-y-auto">
      <!-- Column headers -->
      <div
        class="flex items-center gap-2 px-4 py-2 text-xs font-medium select-none"
        :style="{ color: 'var(--text-secondary)', borderBottom: '1px solid var(--border)' }"
      >
        <div class="w-5 shrink-0" />
        <div class="flex-1 min-w-0">文件名</div>
        <div class="w-24 shrink-0 text-right">大小</div>
        <div class="w-36 shrink-0 text-right">修改日期</div>
      </div>

      <!-- Rows -->
      <div v-if="displayList.length === 0" class="flex items-center justify-center py-12">
        <span class="text-sm" :style="{ color: 'var(--text-secondary)' }">暂无文件</span>
      </div>

      <div
        v-for="(entry, index) in displayList"
        :key="entry.item.id"
        class="flex items-center gap-2 px-4 py-2.5 transition-colors duration-100 cursor-pointer select-none"
        :class="{
          'border-t': index > 0
        }"
        :style="{
          color: 'var(--text-primary)',
          borderColor: 'var(--border)',
          paddingLeft: `${16 + entry.level * 24}px`
        }"
        @mouseenter="($event.currentTarget as HTMLElement).style.backgroundColor = 'var(--bg-hover)'"
        @mouseleave="($event.currentTarget as HTMLElement).style.backgroundColor = 'transparent'"
        @click="entry.item.isFolder ? toggleFolder(entry.item.id) : undefined"
      >
        <!-- Checkbox -->
        <div class="w-5 shrink-0 flex items-center" @click.stop>
          <input
            type="checkbox"
            :checked="selectedIds.has(entry.item.id)"
            class="w-4 h-4 rounded cursor-pointer accent-[var(--accent,#3b82f6)]"
            @change="toggleSelect(entry.item.id)"
          />
        </div>

        <!-- Icon -->
        <div class="w-5 h-5 shrink-0 flex items-center justify-center">
          <UIcon
            v-if="entry.item.isFolder"
            :name="expandedFolders.has(entry.item.id) ? 'i-heroicons-folder-open' : 'i-heroicons-folder'"
            :size="18"
            :style="{ color: 'var(--accent, #3b82f6)' }"
          />
          <UIcon
            v-else
            name="i-heroicons-document"
            :size="18"
            :style="{ color: 'var(--text-secondary)' }"
          />
        </div>

        <!-- Name -->
        <div class="flex-1 min-w-0 truncate text-sm" :style="{ color: 'var(--text-primary)' }">
          <span v-if="entry.item.isFolder" class="font-medium">{{ entry.item.name }}</span>
          <span v-else>{{ entry.item.name }}</span>
        </div>

        <!-- Size -->
        <div class="w-24 shrink-0 text-right text-xs tabular-nums" :style="{ color: 'var(--text-secondary)' }">
          {{ entry.item.isFolder ? '-' : formatSize(entry.item.size) }}
        </div>

        <!-- Modified date -->
        <div class="w-36 shrink-0 text-right text-xs" :style="{ color: 'var(--text-secondary)' }">
          {{ entry.item.modifiedAt ?? '-' }}
        </div>
      </div>
    </div>

    <!-- Bottom bar -->
    <div
      class="px-4 py-2.5 text-xs border-t flex items-center"
      :style="{
        color: 'var(--text-secondary)',
        borderColor: 'var(--border)',
        backgroundColor: 'var(--bg-elevated, var(--bg-card))'
      }"
    >
      <span v-if="selectedCount > 0" :style="{ color: 'var(--text-primary)' }">
        已选 <strong class="font-semibold" :style="{ color: 'var(--accent, #3b82f6)' }">{{ selectedCount }}</strong> 个文件
      </span>
      <span v-else>未选择文件</span>
    </div>
  </div>
</template>
