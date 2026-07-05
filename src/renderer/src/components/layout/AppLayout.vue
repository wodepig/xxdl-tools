<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ipcClient } from '../../ipc/client'
import { useSettingsStore } from '../../stores/settingsStore'
import { useToolsStore } from '../../stores/toolsStore'
import AppTopBar from './AppTopBar.vue'
import AppSidebar from './AppSidebar.vue'

const router = useRouter()
const settingsStore = useSettingsStore()
const toolsStore = useToolsStore()
const { activeCategory, setCategory } = toolsStore
const sidebarCollapsed = ref(false)

// 应用主题到 html 元素
function applyTheme(theme: string): void {
  if (theme === 'system') {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light')
  } else {
    document.documentElement.setAttribute('data-theme', theme)
  }
}

// 启动时从主进程加载配置
onMounted(async () => {
  try {
    const settings = await ipcClient.getSettings()
    settingsStore.theme.value = settings.theme
    settingsStore.pinnedTools.value = settings.pinnedTools
    settingsStore.recentTools.value = settings.recentTools
    settingsStore.sidebarCollapsed.value = settings.sidebarCollapsed
  } catch (e) {
    console.error('Failed to load settings:', e)
  }
  applyTheme(settingsStore.theme.value)
})

// 监听主题变化
watch(() => settingsStore.theme.value, (newTheme) => {
  applyTheme(newTheme)
})

// 最近使用记录变化时持久化到 settings
watch(() => settingsStore.recentTools.value, (recent) => {
  ipcClient.setSettings({ recentTools: recent })
}, { deep: true })

// 置顶工具变化时持久化
watch(() => settingsStore.pinnedTools.value, (pinned) => {
  ipcClient.setSettings({ pinnedTools: pinned })
}, { deep: true })

// 响应式：窗口变窄时自动折叠侧边栏
function checkWidth(): void {
  sidebarCollapsed.value = window.innerWidth < 1100
}

onMounted(() => {
  checkWidth()
  window.addEventListener('resize', checkWidth)
})

onUnmounted(() => {
  window.removeEventListener('resize', checkWidth)
})

function handleSelect(category: string): void {
  setCategory(category)
  // 如果当前在设置页，自动跳转回首页
  if (router.currentRoute.value.path !== '/') {
    router.push('/')
  }
}

function handleOpenSettings(): void {
  router.push('/settings')
}

function handleToggleTheme(): void {
  settingsStore.toggleTheme()
  ipcClient.setSettings({ theme: settingsStore.theme.value })
  applyTheme(settingsStore.theme.value)
}
</script>

<template>
  <div class="flex h-screen w-screen flex-col overflow-hidden" :style="{ backgroundColor: 'var(--bg-base)' }">
    <AppTopBar
      @open-settings="handleOpenSettings"
      @toggle-theme="handleToggleTheme"
      @minimize="ipcClient.minimize()"
      @maximize="ipcClient.maximize()"
      @close="ipcClient.close()"
    />
    <div class="flex flex-1 overflow-hidden">
      <AppSidebar
        :collapsed="sidebarCollapsed"
        :active-category="activeCategory"
        @select="handleSelect"
      />
      <main class="flex-1 overflow-auto" :style="{ backgroundColor: 'var(--bg-base)' }">
        <router-view />
      </main>
    </div>
  </div>
</template>
