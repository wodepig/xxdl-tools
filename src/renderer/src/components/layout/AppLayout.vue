<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ipcClient } from '../../ipc/client'
import { useSettingsStore } from '../../stores/settingsStore'
import { useToolsStore } from '../../stores/toolsStore'
import AppTopBar from './AppTopBar.vue'
import AppSidebar from './AppSidebar.vue'

console.log('[AppLayout.vue] Script setup executing')

const router = useRouter()
const settingsStore = useSettingsStore()
const toolsStore = useToolsStore()
const { activeCategory, setCategory } = toolsStore

console.log('[AppLayout.vue] Stores initialized')

// 从 settingsStore 同步到本地 ref
const sidebarCollapsed = ref(settingsStore.sidebarCollapsed.value)
const sidebarPinned = ref(settingsStore.sidebarPinned.value)

// 同步到 settingsStore & 持久化
watch(sidebarCollapsed, (val) => {
  settingsStore.sidebarCollapsed.value = val
  ipcClient.setSettings({ sidebarCollapsed: val })
})

watch(sidebarPinned, (val) => {
  settingsStore.sidebarPinned.value = val
  ipcClient.setSettings({ sidebarPinned: val })
})

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
  console.log('[AppLayout.vue] onMounted - loading settings')
  try {
    const settings = await ipcClient.getSettings()
    console.log('[AppLayout.vue] Settings loaded:', settings)
    settingsStore.theme.value = settings.theme
    settingsStore.sidebarCollapsed.value = settings.sidebarCollapsed
    settingsStore.sidebarPinned.value = settings.sidebarPinned
    sidebarCollapsed.value = settings.sidebarCollapsed
    sidebarPinned.value = settings.sidebarPinned
  } catch (e) {
    console.error('[AppLayout.vue] Failed to load settings:', e)
  }
  applyTheme(settingsStore.theme.value)
  console.log('[AppLayout.vue] onMounted completed, theme applied:', settingsStore.theme.value)
})

// 监听主题变化
watch(() => settingsStore.theme.value, (newTheme) => {
  applyTheme(newTheme)
})

// 响应式：窗口变窄时自动折叠侧边栏
function checkWidth(): void {
  if (window.innerWidth < 1100) {
    sidebarCollapsed.value = true
  }
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

function toggleCollapse(): void {
  sidebarCollapsed.value = !sidebarCollapsed.value
  // 展开时自动取消固定
  if (!sidebarCollapsed.value) {
    sidebarPinned.value = false
  }
}

function togglePin(): void {
  sidebarPinned.value = !sidebarPinned.value
}

// 路由变化：进入工具页面时自动收起侧边栏（除非固定）
router.afterEach((to) => {
  if (to.name === 'tool' && !sidebarPinned.value) {
    sidebarCollapsed.value = true
  }
})
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
        :pinned="sidebarPinned"
        :active-category="activeCategory"
        @select="handleSelect"
        @toggle-collapse="toggleCollapse"
        @toggle-pin="togglePin"
      />
      <main class="flex-1 overflow-auto" :style="{ backgroundColor: 'var(--bg-base)' }">
        <router-view />
      </main>
    </div>
  </div>
</template>
