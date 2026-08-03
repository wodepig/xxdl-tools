<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { ipcClient } from '../../../ipc/client'
import type { UploadResult, CopyFormat } from '../../../../../shared/types/image-hosting'
import { formatCopyText } from '../../../../../shared/types/image-hosting'

const props = defineProps<{
  enabled: boolean
  autoCopyEnabled: boolean
  copyFormat: CopyFormat
}>()

const emit = defineEmits<{
  (e: 'uploaded', result: UploadResult): void
  (e: 'notify', msg: string, type: 'success' | 'error' | 'info'): void
}>()

const dragging = ref(false)
const uploading = ref(false)
const progress = ref<{ name: string; percent: number } | null>(null)
const previewUrl = ref('')        // 粘贴/选择后的本地预览图（data URL）
const previewName = ref('')

function notify(msg: string, type: 'success' | 'error' | 'info' = 'success'): void {
  emit('notify', msg, type)
}

const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/svg+xml']
const MAX_SIZE = 10 * 1024 * 1024 // 10MB

function validateFile(file: File): string | null {
  if (!ACCEPTED_TYPES.includes(file.type)) {
    return '仅支持 PNG/JPG/GIF/WebP/SVG'
  }
  if (file.size > MAX_SIZE) {
    return '文件大小超过 10MB'
  }
  return null
}

// 剪贴板粘贴的图片在 Windows 下默认名为 "image.png"（或 "image"），会导致文件名带无意义的 image 前缀。
// 识别并替换为 paste_<时间戳> 命名。
function normalizeFileName(file: File): string {
  if (/^image(\.\w+)?$/i.test(file.name)) {
    const extMap: Record<string, string> = {
      'image/jpeg': '.jpg',
      'image/gif': '.gif',
      'image/webp': '.webp',
      'image/svg+xml': '.svg'
    }
    return `${Date.now()}${extMap[file.type] || '.png'}`
  }
  return file.name
}

async function uploadFile(file: File): Promise<void> {
  if (!props.enabled) {
    notify('请先配置 OSS', 'error')
    return
  }
  const err = validateFile(file)
  if (err) {
    notify(err, 'error')
    return
  }

  // 规范化文件名（去掉剪贴板默认的 image 前缀）
  const finalName = normalizeFileName(file)
  previewName.value = finalName
  uploading.value = true
  progress.value = { name: finalName, percent: 10 }
  try {
    // 读取为完整 data URL（如 data:image/png;base64,xxx，同时用于预览和上传）
    const dataUrl = await readAsDataUrl(file)
    // 生成本地预览（直接使用完整 data URL，避免重复拼接前缀）
    previewUrl.value = dataUrl
    progress.value = { name: finalName, percent: 50 }

    const result = await ipcClient.imageHosting.upload({
      fileName: finalName,
      fileBase64: dataUrl,
      mimeType: file.type
    })

    // 自动复制
    if (props.autoCopyEnabled) {
      const text = formatCopyText(result.url, result.name, props.copyFormat)
      try {
        await navigator.clipboard.writeText(text)
        notify('上传成功，链接已自动复制')
      } catch {
        notify('上传成功（复制失败，请手动复制）', 'info')
      }
    } else {
      notify('上传成功')
    }
    emit('uploaded', result)
  } catch (e) {
    notify(`上传失败: ${e}`, 'error')
  } finally {
    progress.value = null
    uploading.value = false
    // 延迟清除预览
    setTimeout(() => {
      previewUrl.value = ''
      previewName.value = ''
    }, 2000)
  }
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

// ——— 全局粘贴监听 ———
function onPaste(e: ClipboardEvent): void {
  const items = e.clipboardData?.items
  if (!items) return
  for (const item of items) {
    if (item.type.startsWith('image/')) {
      const file = item.getAsFile()
      if (file) {
        e.preventDefault()
        uploadFile(file)
        return
      }
    }
  }
}

// ——— 拖拽 ———
function onDragOver(e: DragEvent): void {
  e.preventDefault()
  dragging.value = true
}
function onDragLeave(): void {
  dragging.value = false
}
function onDrop(e: DragEvent): void {
  e.preventDefault()
  dragging.value = false
  const files = e.dataTransfer?.files
  if (files && files.length > 0) {
    uploadFile(files[0])
  }
}

// ——— 点击选择 ———
function onClick(): void {
  if (!props.enabled || uploading.value) return
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = 'image/png,image/jpeg,image/gif,image/webp,image/svg+xml'
  input.onchange = () => {
    const file = input.files?.[0]
    if (file) uploadFile(file)
  }
  input.click()
}

onMounted(() => {
  window.addEventListener('paste', onPaste)
})
onUnmounted(() => {
  window.removeEventListener('paste', onPaste)
})
</script>

<template>
  <div
    class="relative cursor-pointer rounded-[14px] border-2 border-dashed p-5 text-center transition-all"
    :class="dragging ? 'border-[#06b6d4]' : ''"
    :style="{
      backgroundColor: dragging ? 'rgba(6,182,212,0.08)' : 'var(--bg-card)',
      borderColor: dragging ? '#06b6d4' : 'var(--border)',
      opacity: enabled ? 1 : 0.6
    }"
    @dragover="onDragOver"
    @dragleave="onDragLeave"
    @drop="onDrop"
    @click="onClick"
  >
    <div class="mx-auto mb-2 flex h-11 w-11 items-center justify-center rounded-xl" style="background: rgba(6,182,212,0.12); color: #06b6d4;">
      <UIcon name="i-heroicons-clipboard" size="22" />
    </div>
    <h2 class="mb-1 text-sm font-semibold" :style="{ color: 'var(--text-primary)' }">
      {{ enabled ? '粘贴 / 拖拽图片到此处上传' : '请先配置 OSS' }}
    </h2>
    <p class="mb-2.5 text-xs" :style="{ color: 'var(--text-secondary)' }">支持 PNG / JPG / GIF / WebP / SVG，单文件最大 10MB</p>

    <!-- 本地预览 -->
    <div v-if="previewUrl" class="mx-auto mb-2.5 max-w-[200px]">
      <div class="overflow-hidden rounded-lg border" style="border-color: var(--border); background: var(--bg-base);">
        <img :src="previewUrl" :alt="previewName" class="mx-auto max-h-[120px] w-auto object-contain">
      </div>
      <div class="mt-1 truncate text-[11px]" :style="{ color: 'var(--text-muted)' }">{{ previewName }}</div>
    </div>

    <div v-if="!previewUrl" class="inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-[11px]" :style="{ backgroundColor: 'var(--bg-card-hover)', borderColor: 'var(--border)', color: 'var(--text-muted)' }">
      <UIcon name="i-heroicons-keyboard" size="12" />
      <span>快捷键：</span>
      <kbd class="rounded border px-1 py-0.5 text-[10px]" style="background: var(--bg-base); border-color: var(--border); color: var(--text-secondary);">Ctrl</kbd> + <kbd class="rounded border px-1 py-0.5 text-[10px]" style="background: var(--bg-base); border-color: var(--border); color: var(--text-secondary);">V</kbd> 粘贴 · 拖拽到此 · 点击选择
    </div>

    <!-- 上传进度浮层 -->
    <div v-if="progress" class="absolute inset-x-4 bottom-4 flex items-center gap-3 rounded-[10px] border px-3.5 py-2.5 text-left" style="background: var(--bg-card-hover); border-color: #06b6d4;">
      <div class="spinner h-5 w-5 shrink-0 rounded-full border-2" style="border-color: var(--border); border-top-color: #06b6d4;"></div>
      <div class="min-w-0 flex-1">
        <div class="mb-1 truncate text-xs font-medium" :style="{ color: 'var(--text-primary)' }">{{ progress.name }} · {{ progress.percent }}%</div>
        <div class="h-1 overflow-hidden rounded" style="background: var(--border);">
          <div class="h-full rounded transition-all" :style="{ width: progress.percent + '%', background: 'linear-gradient(90deg, #06b6d4, #6366f1)' }"></div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.spinner { animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
</style>
