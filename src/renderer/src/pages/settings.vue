<script setup lang="ts">
import { ref } from 'vue'
import { useSettingsStore } from '../stores/settingsStore'
import { useToolsStore } from '../stores/toolsStore'
import { ipcClient } from '../ipc/client'

const settingsStore = useSettingsStore()
const { tools } = useToolsStore()
const clearingData = ref(false)
const clearDone = ref(false)

const themeItems = [
  { label: '暗色', value: 'dark' },
  { label: '亮色', value: 'light' },
  { label: '跟随系统', value: 'system' }
]

function saveTheme(theme: 'dark' | 'light' | 'system'): void {
  settingsStore.theme.value = theme
  ipcClient.setSettings({ theme })
}

function resetSettings(): void {
  settingsStore.reset()
  ipcClient.setSettings({
    theme: 'dark',
    sidebarCollapsed: false
  })
}

async function handleClearAllToolData(): Promise<void> {
  clearingData.value = true
  clearDone.value = false
  try {
    const toolIds = tools.map(t => t.id)
    await ipcClient.clearAllToolData(toolIds)
    clearDone.value = true
    setTimeout(() => { clearDone.value = false }, 3000)
  } catch (e) {
    console.error('Failed to clear tool data:', e)
  } finally {
    clearingData.value = false
  }
}
</script>

<template>
  <div class="p-7 overflow-y-auto h-full max-w-3xl" :style="{ color: 'var(--text-primary)' }">
    <h1 class="text-2xl font-bold mb-8" :style="{ color: 'var(--text-primary)' }">设置</h1>

    <!-- 外观设置 -->
    <section class="mb-8">
      <h2 class="text-base font-semibold mb-4 flex items-center gap-2" :style="{ color: 'var(--text-primary)' }">
        <UIcon name="i-heroicons-sun" class="w-5 h-5" />
        外观设置
      </h2>
      <div class="rounded-xl p-5 border" :style="{
        backgroundColor: 'var(--bg-card)',
        borderColor: 'var(--border)'
      }">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium" :style="{ color: 'var(--text-primary)' }">主题</p>
            <p class="text-xs mt-1" :style="{ color: 'var(--text-secondary)' }">选择应用的显示主题</p>
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

    <!-- 数据管理 -->
    <section class="mb-8">
      <h2 class="text-base font-semibold mb-4 flex items-center gap-2" :style="{ color: 'var(--text-primary)' }">
        <UIcon name="i-heroicons-trash" class="w-5 h-5" />
        数据管理
      </h2>
      <div class="rounded-xl p-5 border" :style="{
        backgroundColor: 'var(--bg-card)',
        borderColor: 'var(--border)'
      }">
        <p class="text-sm font-medium mb-1" :style="{ color: 'var(--text-primary)' }">清空工具数据</p>
        <p class="text-xs mb-4" :style="{ color: 'var(--text-secondary)' }">
          删除所有工具存储的历史记录和缓存数据（不包括设置）
        </p>
        <div class="flex items-center gap-3">
          <UButton
            color="error"
            variant="outline"
            :loading="clearingData"
            :disabled="clearingData"
            @click="handleClearAllToolData"
          >
            清空所有工具数据
          </UButton>
          <span
            v-if="clearDone"
            class="text-sm text-green-500"
          >✓ 已清空</span>
        </div>
      </div>
    </section>

    <!-- 关于 -->
    <section class="mb-8">
      <h2 class="text-base font-semibold mb-4 flex items-center gap-2" :style="{ color: 'var(--text-primary)' }">
        <UIcon name="i-heroicons-information-circle" class="w-5 h-5" />
        关于
      </h2>
      <div class="rounded-xl p-5 border text-sm" :style="{
        backgroundColor: 'var(--bg-card)',
        borderColor: 'var(--border)',
        color: 'var(--text-secondary)'
      }">
        <p>筱筱的工具箱 v1.0.0</p>
        <p class="mt-2">一个全能的开发者工具箱</p>
      </div>
    </section>

    <!-- 重置 -->
    <UButton color="error" variant="outline" @click="resetSettings">
      重置所有设置
    </UButton>
  </div>
</template>
