<script setup lang="ts">
import { onMounted } from 'vue'
import { useSettingsStore } from '../stores/settingsStore'
import { useToolsStore } from '../stores/toolsStore'
import { ipcClient } from '../ipc/client'

const settingsStore = useSettingsStore()
const { tools } = useToolsStore()

const themeItems = [
  { label: '暗色', value: 'dark' },
  { label: '亮色', value: 'light' },
  { label: '跟随系统', value: 'system' }
]

// 从主进程加载配置
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

function saveTheme(theme: 'dark' | 'light' | 'system'): void {
  settingsStore.theme.value = theme
  ipcClient.setSettings({ theme })
}

function togglePin(toolId: string): void {
  settingsStore.togglePin(toolId)
  ipcClient.setSettings({ pinnedTools: [...settingsStore.pinnedTools.value] })
}

function resetSettings(): void {
  settingsStore.reset()
  // 解构以避免 ref 写入问题，将 AppSettings 中的各个字段传入
  ipcClient.setSettings({
    theme: 'dark',
    pinnedTools: [],
    recentTools: [],
    sidebarCollapsed: false
  })
}
</script>

<template>
  <div class="p-7 overflow-y-auto h-full max-w-3xl">
    <h1 class="text-2xl font-bold mb-8 bg-gradient-to-r from-[#f1f5f9] to-[#94a3b8] bg-clip-text text-transparent">设置</h1>

    <!-- 外观设置 -->
    <section class="mb-8">
      <h2 class="text-base font-semibold text-[#f1f5f9] mb-4 flex items-center gap-2">
        <UIcon name="i-heroicons-sun" class="w-5 h-5" />
        外观设置
      </h2>
      <div class="bg-[#1e293b] border border-[#334155] rounded-xl p-5">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-[#f1f5f9]">主题</p>
            <p class="text-xs text-[#94a3b8] mt-1">选择应用的显示主题</p>
          </div>
          <USelectMenu
            :model-value="settingsStore.theme.value"
            :items="themeItems"
            value-key="value"
            class="w-36"
            @update:model-value="saveTheme"
          />
        </div>
      </div>
    </section>

    <!-- 工具管理 -->
    <section class="mb-8">
      <h2 class="text-base font-semibold text-[#f1f5f9] mb-4 flex items-center gap-2">
        <UIcon name="i-heroicons-cube" class="w-5 h-5" />
        快捷入口管理
      </h2>
      <div class="bg-[#1e293b] border border-[#334155] rounded-xl p-5">
        <p class="text-xs text-[#94a3b8] mb-4">选择要在快捷入口显示的工具</p>
        <div class="flex flex-wrap gap-2">
          <UBadge
            v-for="tool in tools"
            :key="tool.id"
            :variant="settingsStore.isPinned(tool.id) ? 'solid' : 'outline'"
            class="cursor-pointer select-none"
            :style="{
              backgroundColor: settingsStore.isPinned(tool.id) ? tool.accentColor : 'transparent',
              borderColor: tool.accentColor,
              color: settingsStore.isPinned(tool.id) ? '#fff' : tool.accentColor
            }"
            @click="togglePin(tool.id)"
          >
            {{ tool.name }}
          </UBadge>
        </div>
      </div>
    </section>

    <!-- 关于 -->
    <section class="mb-8">
      <h2 class="text-base font-semibold text-[#f1f5f9] mb-4 flex items-center gap-2">
        <UIcon name="i-heroicons-information-circle" class="w-5 h-5" />
        关于
      </h2>
      <div class="bg-[#1e293b] border border-[#334155] rounded-xl p-5 text-sm text-[#94a3b8]">
        <p>DevToolbox v1.0.0</p>
        <p class="mt-2">一个全能的开发者工具箱</p>
      </div>
    </section>

    <!-- 重置 -->
    <UButton color="error" variant="outline" @click="resetSettings">
      重置所有设置
    </UButton>
  </div>
</template>
