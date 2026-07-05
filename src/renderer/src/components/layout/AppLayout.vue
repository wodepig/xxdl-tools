<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ipcClient } from '../../ipc/client'
import { useSettingsStore } from '../../stores/settingsStore'
import AppTopBar from './AppTopBar.vue'
import AppSidebar from './AppSidebar.vue'

const router = useRouter()
const settingsStore = useSettingsStore()
const sidebarCollapsed = ref(false)

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
})

function handleSelect(_category: string): void {
  // 暂不处理分类选择逻辑
}

function handleOpenSettings(): void {
  router.push('/settings')
}
</script>

<template>
  <div class="flex h-screen w-screen flex-col overflow-hidden">
    <AppTopBar
      @open-settings="handleOpenSettings"
      @minimize="ipcClient.minimize()"
      @maximize="ipcClient.maximize()"
      @close="ipcClient.close()"
    />
    <div class="flex flex-1 overflow-hidden">
      <AppSidebar
        :collapsed="sidebarCollapsed"
        @select="handleSelect"
      />
      <main class="flex-1 overflow-auto bg-[#0f172a]">
        <router-view />
      </main>
    </div>
  </div>
</template>
