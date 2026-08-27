<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useSettingsStore } from '../stores/settingsStore'
import { useToolsStore } from '../stores/toolsStore'
import { ipcClient } from '../ipc/client'

const settingsStore = useSettingsStore()
const { tools } = useToolsStore()
const clearingData = ref(false)
const clearDone = ref(false)
const dataDir = ref('')
const changingDataDir = ref(false)

const ipc = window.electron.ipcRenderer
const checkingUpdate = ref(false)
const updateMessage = ref('')
const toast = ref<{ message: string; type: 'success' | 'error' } | null>(null)
let toastTimer: ReturnType<typeof setTimeout> | null = null

function showToast(message: string, type: 'success' | 'error' = 'success'): void {
  toast.value = { message, type }
  if (toastTimer) clearTimeout(toastTimer)
  toastTimer = setTimeout(() => (toast.value = null), 2500)
}

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

async function handleCheckUpdate(): Promise<void> {
  if (checkingUpdate.value) return
  checkingUpdate.value = true
  updateMessage.value = ''
  await ipcClient.checkForUpdates()
}

async function loadDataDir(): Promise<void> {
  try {
    dataDir.value = await ipcClient.getDataDir()
  } catch (e) {
    console.error('Failed to load data dir:', e)
  }
}

async function handleChangeDataDir(): Promise<void> {
  if (changingDataDir.value) return
  changingDataDir.value = true
  try {
    const next = await ipcClient.chooseDataDir()
    if (next) {
      dataDir.value = next
      showToast(`数据目录已切换为：${next}`, 'success')
    }
  } catch (e) {
    console.error('Failed to choose data dir:', e)
    showToast('切换数据目录失败', 'error')
  } finally {
    changingDataDir.value = false
  }
}

// 只有手动点击检查更新时，才展示结果提示
function applyUpdateResult(
  status: 'latest' | 'available' | 'error',
  version = ''
): void {
  if (!checkingUpdate.value) return
  checkingUpdate.value = false
  if (status === 'latest') {
    updateMessage.value = '当前已是最新版本'
  } else if (status === 'available') {
    updateMessage.value = `发现新版本 v${version}，请按右下角提示下载安装`
  } else {
    updateMessage.value = '检查更新失败，请稍后重试'
  }
}

onMounted(() => {
  loadDataDir()
  ipcClient.onUpdateNotAvailable(() => applyUpdateResult('latest'))
  ipcClient.onUpdateAvailable((info) => applyUpdateResult('available', info.version))
  ipcClient.onUpdateError(() => applyUpdateResult('error'))
})

onUnmounted(() => {
  if (toastTimer) clearTimeout(toastTimer)
  ipc.removeAllListeners('update:not-available')
  ipc.removeAllListeners('update:available')
  ipc.removeAllListeners('update:error')
})
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

    <!-- 数据存储目录 -->
    <section class="mb-8">
      <h2 class="text-base font-semibold mb-4 flex items-center gap-2" :style="{ color: 'var(--text-primary)' }">
        <UIcon name="i-heroicons-folder" class="w-5 h-5" />
        数据存储目录
      </h2>
      <div class="rounded-xl p-5 border" :style="{
        backgroundColor: 'var(--bg-card)',
        borderColor: 'var(--border)'
      }">
        <p class="text-sm font-medium mb-1" :style="{ color: 'var(--text-primary)' }">当前数据目录</p>
        <p class="text-xs mb-1" :style="{ color: 'var(--text-secondary)' }">
          应用所有数据（工具记录、设置等）保存在该目录下，升级或重装不会丢失
        </p>
        <div
          class="flex items-center gap-2 mt-2 mb-4 rounded-lg border px-3 py-2 font-mono text-[13px] break-all"
          :style="{
            borderColor: 'var(--border)',
            backgroundColor: 'var(--bg-base)',
            color: 'var(--text-primary)'
          }"
        >
          <UIcon name="i-heroicons-folder-open" class="w-4 h-4 shrink-0" style="color: var(--text-muted)" />
          {{ dataDir || '…' }}
        </div>
        <UButton
          icon="i-heroicons-arrow-path"
          color="primary"
          variant="outline"
          :loading="changingDataDir"
          :disabled="changingDataDir"
          @click="handleChangeDataDir"
        >
          重新选择数据目录
        </UButton>
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
        <p>筱筱的工具箱 v1.0.4</p>
        <p class="mt-2">一个全能的开发者工具箱</p>

        <!-- 检查更新 -->
        <div class="flex items-center justify-between mt-4 pt-4 border-t" :style="{ borderColor: 'var(--border)' }">
          <div>
            <p class="text-sm font-medium" :style="{ color: 'var(--text-primary)' }">检查更新</p>
            <p class="text-xs mt-1" :style="{ color: updateMessage.includes('失败') ? '#ef4444' : 'var(--text-muted)' }">
              {{ updateMessage || '手动检查是否有新版本' }}
            </p>
          </div>
          <UButton
            :loading="checkingUpdate"
            :disabled="checkingUpdate"
            @click="handleCheckUpdate"
          >
            检查更新
          </UButton>
        </div>
      </div>
    </section>

    <!-- 重置 -->
    <UButton color="error" variant="outline" @click="resetSettings">
      重置所有设置
    </UButton>

    <!-- Toast -->
    <div
      v-if="toast"
      class="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-lg border px-4 py-2.5 text-[13px] shadow-xl"
      :style="{
        borderColor: toast.type === 'error' ? '#ef4444' : '#10b981',
        backgroundColor: 'var(--bg-card)',
        color: toast.type === 'error' ? '#ef4444' : '#10b981'
      }"
    >
      <UIcon :name="toast.type === 'error' ? 'i-heroicons-x-circle' : 'i-heroicons-check-circle'" size="16" />
      {{ toast.message }}
    </div>
  </div>
</template>
