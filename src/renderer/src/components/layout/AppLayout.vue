<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ipcClient } from '../../ipc/client'
import { useSettingsStore } from '../../stores/settingsStore'
import AppTopBar from './AppTopBar.vue'
import AppSidebar from './AppSidebar.vue'

const router = useRouter()
const settingsStore = useSettingsStore()
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

function handleSelect(_category: string): void {
  // 暂不处理分类选择逻辑
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
        @select="handleSelect"
      />
      <main class="flex-1 overflow-auto" :style="{ backgroundColor: 'var(--bg-base)' }">
        <router-view />
      </main>
    </div>
  </div>
</template>
