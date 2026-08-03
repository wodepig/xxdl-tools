<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { ipcClient } from '../../ipc/client'

const ipc = window.electron.ipcRenderer

interface UpdateInfo {
  version: string
  releaseDate?: string
}

const showDialog = ref(false)
const updateInfo = ref<UpdateInfo | null>(null)
const downloadProgress = ref(0)
const downloadStarted = ref(false)
const downloadDone = ref(false)
const checking = ref(false)
const downloadError = ref('')

onMounted(() => {
  ipc.on('update:checking', () => {
    checking.value = true
  })

  ipc.on('update:available', (_event, info) => {
    checking.value = false
    downloadStarted.value = false
    downloadDone.value = false
    downloadProgress.value = 0
    updateInfo.value = info
    showDialog.value = true
  })

  ipc.on('update:not-available', () => {
    checking.value = false
  })

  ipc.on('update:error', () => {
    checking.value = false
  })

  ipc.on('update:download-progress', (_event, progress) => {
    downloadStarted.value = true
    downloadProgress.value = Math.round(progress.percent)
  })

  ipc.on('update:downloaded', (_event, info) => {
    downloadDone.value = true
    downloadStarted.value = false
    downloadProgress.value = 100
    updateInfo.value = info
  })
})

onUnmounted(() => {
  ipc.removeAllListeners('update:checking')
  ipc.removeAllListeners('update:available')
  ipc.removeAllListeners('update:not-available')
  ipc.removeAllListeners('update:error')
  ipc.removeAllListeners('update:download-progress')
  ipc.removeAllListeners('update:downloaded')
})

function handleDownload(): void {
  downloadError.value = ''
  ipcClient
    .downloadUpdate()
    .then((result) => {
      if (result && !result.ok) {
        downloadError.value = result.message || '下载失败'
      }
    })
    .catch(() => {
      downloadError.value = '下载失败'
    })
}

function handleInstall(): void {
  ipcClient.quitAndInstall()
}

function handleDismiss(): void {
  showDialog.value = false
}
</script>

<template>
  <div
    v-if="showDialog"
    class="fixed bottom-6 right-6 z-50 w-80 rounded-xl border p-5 shadow-xl"
    :style="{
      backgroundColor: 'var(--bg-card)',
      borderColor: 'var(--border)',
      color: 'var(--text-primary)'
    }"
  >
    <div class="flex items-start gap-3">
      <div
        class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[rgba(99,102,241,0.1)] text-[#6366f1]"
      >
        <UIcon
          :name="downloadDone ? 'i-heroicons-check-circle' : 'i-heroicons-arrow-up-circle'"
          class="w-5 h-5"
        />
      </div>
      <div class="flex-1 min-w-0">
        <h4 class="text-sm font-semibold mb-1">
          {{ downloadDone ? '更新已就绪' : downloadStarted ? '正在下载更新...' : '发现新版本' }}
        </h4>
        <p v-if="updateInfo" class="text-xs mb-1" :style="{ color: 'var(--text-secondary)' }">
          版本 {{ updateInfo.version }}
        </p>

        <!-- 下载进度条 -->
        <div v-if="downloadStarted" class="mt-2">
          <div class="h-1.5 rounded-full overflow-hidden" :style="{ backgroundColor: 'var(--border)' }">
            <div
              class="h-full rounded-full transition-all duration-300"
              :style="{ width: `${downloadProgress}%`, backgroundColor: '#6366f1' }"
            />
          </div>
          <p class="text-xs mt-1" :style="{ color: 'var(--text-muted)' }">{{ downloadProgress }}%</p>
        </div>

        <!-- 下载失败提示（如开发环境不能下载） -->
        <p v-if="downloadError" class="text-xs mt-2" style="color: #ef4444">
          {{ downloadError }}
        </p>

        <!-- 操作按钮 -->
        <div class="mt-3 flex items-center gap-2">
          <button
            v-if="downloadDone"
            class="rounded-lg px-3 py-1.5 text-xs font-medium cursor-pointer border-none text-white"
            style="background-color: #6366f1"
            @click="handleInstall"
          >
            立即重启安装
          </button>
          <button
            v-else-if="!downloadStarted"
            class="rounded-lg px-3 py-1.5 text-xs font-medium cursor-pointer border-none text-white"
            style="background-color: #6366f1"
            @click="handleDownload"
          >
            下载更新
          </button>
          <button
            class="rounded-lg px-3 py-1.5 text-xs font-medium cursor-pointer border-none"
            :style="{ backgroundColor: 'var(--border)', color: 'var(--text-secondary)' }"
            @click="handleDismiss"
          >
            {{ downloadDone ? '稍后安装' : '稍后提醒' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
