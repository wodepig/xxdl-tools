import { ref } from 'vue'
import { ipcClient } from '../ipc/client'

function useSettingsStoreInternal() {
  const theme = ref<'dark' | 'light' | 'system'>('dark')
  const sidebarCollapsed = ref(false)
  const sidebarPinned = ref(false)
  const loaded = ref(false)

  let loadPromise: Promise<void> | null = null

  async function loadSettings(): Promise<void> {
    console.log('[settingsStore] loadSettings start, loaded:', loaded.value)
    if (loaded.value) return
    if (loadPromise) return loadPromise
    loadPromise = (async () => {
      try {
        const settings = await ipcClient.getSettings()
        console.log('[settingsStore] Settings loaded from IPC:', settings)
        theme.value = settings.theme
        sidebarCollapsed.value = settings.sidebarCollapsed
        sidebarPinned.value = settings.sidebarPinned ?? false
        loaded.value = true
        console.log('[settingsStore] Settings applied, theme:', theme.value)
      } catch (err) {
        console.error('[settingsStore] Failed to load settings:', err)
      }
    })()
    return loadPromise
  }

  async function saveSettings(): Promise<void> {
    if (!loaded.value) {
      await loadSettings()
    }
    try {
      await ipcClient.setSettings({
        theme: theme.value,
        sidebarCollapsed: sidebarCollapsed.value,
        sidebarPinned: sidebarPinned.value
      })
    } catch (err) {
      console.error('[settingsStore] Failed to save settings:', err)
    }
  }

  async function toggleTheme() {
    const next: Record<string, 'dark' | 'light' | 'system'> = {
      dark: 'light',
      light: 'system',
      system: 'dark'
    }
    theme.value = next[theme.value]
    await saveSettings()
  }

  function toggleSidebar() {
    sidebarCollapsed.value = !sidebarCollapsed.value
  }

  function toggleSidebarPin() {
    sidebarPinned.value = !sidebarPinned.value
  }

  async function reset() {
    theme.value = 'dark'
    sidebarCollapsed.value = false
    sidebarPinned.value = false
    await saveSettings()
  }

  return {
    theme,
    sidebarCollapsed,
    sidebarPinned,
    loaded,
    loadSettings,
    toggleTheme,
    toggleSidebar,
    toggleSidebarPin,
    reset
  }
}

// 单例模式导出
let instance: ReturnType<typeof useSettingsStoreInternal> | null = null
export function useSettingsStore(): ReturnType<typeof useSettingsStoreInternal> {
  if (!instance) {
    console.log('[settingsStore] Creating singleton instance')
    instance = useSettingsStoreInternal()
    // 首次创建时自动从磁盘加载设置
    instance.loadSettings()
  }
  return instance
}
