<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { ipcClient } from '../../ipc/client'
import type {
  ImageHostingConfig,
  OssConfig,
  ImageHostingPrefs,
  ConnectionStatus,
  UploadResult
} from '../../../../shared/types/image-hosting'
import { DEFAULT_PREFS } from '../../../../shared/types/image-hosting'
import OssConfigDialog from '../../components/tools/image-hosting/OssConfigDialog.vue'
import PasteUploadArea from '../../components/tools/image-hosting/PasteUploadArea.vue'
import RecentImageList from '../../components/tools/image-hosting/RecentImageList.vue'

const config = ref<ImageHostingConfig | null>(null)
const dialogVisible = ref(false)
const connectionStatus = ref<ConnectionStatus>('unconfigured')
const refreshKey = ref(0)

// 全局通知（参考 watermark.vue 的模式）
const notification = ref('')
const notiType = ref<'success' | 'error' | 'info'>('success')
let notiTimer: ReturnType<typeof setTimeout> | null = null
function notify(msg: string, type: 'success' | 'error' | 'info' = 'success'): void {
  notification.value = msg
  notiType.value = type
  if (notiTimer) clearTimeout(notiTimer)
  notiTimer = setTimeout(() => { notification.value = '' }, 3000)
}

const prefs = computed<ImageHostingPrefs>(() => config.value?.prefs || { ...DEFAULT_PREFS })
const ossConfig = computed<OssConfig | null>(() => config.value?.oss || null)
const isEnabled = computed(() => connectionStatus.value === 'connected')

// ——— 加载配置 + 探测连接 ———
async function loadConfigAndProbe(): Promise<void> {
  const cfg = await ipcClient.imageHosting.getConfig()
  config.value = cfg
  if (!cfg) {
    connectionStatus.value = 'unconfigured'
    return
  }
  // 探测连接
  try {
    const result = await ipcClient.imageHosting.testConnection(cfg.oss)
    connectionStatus.value = result.ok ? 'connected' : 'disconnected'
  } catch {
    connectionStatus.value = 'disconnected'
  }
}

function openConfigDialog(): void {
  dialogVisible.value = true
}

async function onConfigSaved(oss: OssConfig): Promise<void> {
  // 保存已由 OssConfigDialog 直接调用 IPC 完成，这里只需更新内存状态
  const newConfig: ImageHostingConfig = {
    provider: 'oss',
    oss,
    prefs: config.value?.prefs || { ...DEFAULT_PREFS }
  }
  config.value = newConfig
  // 重新探测
  try {
    const result = await ipcClient.imageHosting.testConnection(oss)
    connectionStatus.value = result.ok ? 'connected' : 'disconnected'
  } catch {
    connectionStatus.value = 'disconnected'
  }
  // 刷新列表
  refreshKey.value++
}

function refreshList(): void {
  refreshKey.value++
}

function onUploaded(_result: UploadResult): void {
  refreshKey.value++
}

async function onPrefsChange(newPrefs: ImageHostingPrefs): Promise<void> {
  if (!config.value) return
  // 更新内存状态
  config.value = { ...config.value, prefs: newPrefs }
  // 深拷贝后再传给 IPC，避免 reactive proxy 导致 "An object could not be cloned" 错误
  const toSave: ImageHostingConfig = JSON.parse(JSON.stringify(config.value))
  await ipcClient.imageHosting.saveConfig(toSave)
}

onMounted(() => {
  loadConfigAndProbe()
})
</script>

<template>
  <div class="mx-auto max-w-5xl space-y-5">
    <!-- 全局通知（参考 watermark.vue 模式） -->
    <Teleport to="body">
      <Transition name="fade">
        <div
          v-if="notification"
          class="fixed right-6 top-20 z-50 rounded-lg px-4 py-2.5 text-sm font-medium shadow-lg"
          :style="{
            backgroundColor: notiType === 'success' ? '#10b981' : notiType === 'error' ? '#ef4444' : '#6366f1',
            color: '#fff'
          }"
        >
          {{ notification }}
        </div>
      </Transition>
    </Teleport>

    <!-- 操作行（含 OSS 配置按钮状态点） -->
    <div class="flex items-center justify-end gap-2">
      <button
        class="flex items-center gap-1.5 rounded-lg border px-4 py-2 text-[13px]"
        :style="{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)', color: 'var(--text-secondary)' }"
        @click="refreshList"
      >
        <UIcon name="i-heroicons-arrow-path" size="14" /> 刷新列表
      </button>
      <button
        class="relative flex items-center gap-1.5 rounded-lg px-4 py-2 text-[13px] text-white"
        :style="{ backgroundColor: '#06b6d4' }"
        @click="openConfigDialog"
      >
        <UIcon name="i-heroicons-cog-6-solid" size="14" /> OSS 配置
        <span
          class="absolute h-2 w-2 rounded-full"
          :style="{
            top: '5px',
            right: '6px',
            background: connectionStatus === 'connected' ? '#10b981' : '#ef4444',
            boxShadow: '0 0 0 2px #06b6d4'
          }"
          :title="connectionStatus === 'connected' ? '已连接' : (connectionStatus === 'disconnected' ? '连接失败' : '未配置')"
        ></span>
      </button>
    </div>

    <!-- 上传区 -->
    <PasteUploadArea
      :enabled="isEnabled"
      :auto-copy-enabled="prefs.autoCopyEnabled"
      :copy-format="prefs.copyFormat"
      @uploaded="onUploaded"
      @notify="notify"
    />

    <!-- 最近上传列表 -->
    <RecentImageList
      :enabled="isEnabled"
      :prefs="prefs"
      :refresh-key="refreshKey"
      @update:prefs="onPrefsChange"
      @notify="notify"
    />

    <!-- 配置弹层 -->
    <OssConfigDialog
      v-model:visible="dialogVisible"
      :config="ossConfig"
      :current-config="config"
      @saved="onConfigSaved"
      @notify="notify"
    />
  </div>
</template>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 0.2s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
