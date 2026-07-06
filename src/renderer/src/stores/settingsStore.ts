import { ref } from 'vue'
import type { RecentItem } from '../../../shared/types/tool'

function useSettingsStoreInternal() {
  const theme = ref<'dark' | 'light' | 'system'>('dark')
  const pinnedTools = ref<string[]>([])
  const recentTools = ref<RecentItem[]>([])
  const sidebarCollapsed = ref(false)
  const sidebarPinned = ref(false)

  function toggleTheme() {
    const next: Record<string, 'dark' | 'light' | 'system'> = {
      dark: 'light',
      light: 'system',
      system: 'dark'
    }
    theme.value = next[theme.value]
  }

  function togglePin(toolId: string) {
    const index = pinnedTools.value.indexOf(toolId)
    if (index >= 0) {
      pinnedTools.value.splice(index, 1)
    } else {
      pinnedTools.value.push(toolId)
    }
  }

  function addRecent(item: RecentItem) {
    // 去重：如果已存在相同 toolId，先移除
    const existingIndex = recentTools.value.findIndex(r => r.toolId === item.toolId)
    if (existingIndex >= 0) {
      recentTools.value.splice(existingIndex, 1)
    }
    // 插入到开头
    recentTools.value.unshift(item)
    // 最多保留 20 条
    if (recentTools.value.length > 20) {
      recentTools.value = recentTools.value.slice(0, 20)
    }
  }

  function toggleSidebar() {
    sidebarCollapsed.value = !sidebarCollapsed.value
  }

  function toggleSidebarPin() {
    sidebarPinned.value = !sidebarPinned.value
  }

  function isPinned(toolId: string): boolean {
    return pinnedTools.value.includes(toolId)
  }

  function clearRecent() {
    recentTools.value = []
  }

  function removeRecent(toolId: string) {
    const index = recentTools.value.findIndex(r => r.toolId === toolId)
    if (index >= 0) {
      recentTools.value.splice(index, 1)
    }
  }

  function reset() {
    theme.value = 'dark'
    pinnedTools.value = []
    recentTools.value = []
    sidebarCollapsed.value = false
  }

  return {
    theme,
    pinnedTools,
    recentTools,
    sidebarCollapsed,
    sidebarPinned,
    toggleTheme,
    togglePin,
    addRecent,
    toggleSidebar,
    toggleSidebarPin,
    isPinned,
    clearRecent,
    removeRecent,
    reset
  }
}

// 单例模式导出
let instance: ReturnType<typeof useSettingsStoreInternal> | null = null
export function useSettingsStore(): ReturnType<typeof useSettingsStoreInternal> {
  if (!instance) {
    instance = useSettingsStoreInternal()
  }
  return instance
}
