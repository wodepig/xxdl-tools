<script setup lang="ts">
import { ref, watch } from 'vue'
import { ipcClient } from '../../../ipc/client'
import type { UploadedImage, CopyFormat, ImageHostingPrefs } from '../../../../../shared/types/image-hosting'
import { formatCopyText } from '../../../../../shared/types/image-hosting'

const props = defineProps<{
  enabled: boolean
  prefs: ImageHostingPrefs
  refreshKey: number
}>()

const emit = defineEmits<{
  (e: 'update:prefs', prefs: ImageHostingPrefs): void
  (e: 'notify', msg: string, type: 'success' | 'error' | 'info'): void
}>()

const images = ref<UploadedImage[]>([])
const loading = ref(false)
const errorMsg = ref('')

function notify(msg: string, type: 'success' | 'error' | 'info' = 'success'): void {
  emit('notify', msg, type)
}

async function loadList(): Promise<void> {
  if (!props.enabled) {
    images.value = []
    return
  }
  loading.value = true
  errorMsg.value = ''
  try {
    images.value = await ipcClient.imageHosting.list()
  } catch (e) {
    errorMsg.value = String(e)
    images.value = []
  } finally {
    loading.value = false
  }
}

watch(() => props.refreshKey, () => { loadList() }, { immediate: true })

// ——— 偏好变更 ———
function onCopyFormatChange(e: Event): void {
  const format = (e.target as HTMLSelectElement).value as CopyFormat
  emit('update:prefs', { ...props.prefs, copyFormat: format })
}
function toggleAutoCopy(): void {
  emit('update:prefs', { ...props.prefs, autoCopyEnabled: !props.prefs.autoCopyEnabled })
}
function onListCountChange(e: Event): void {
  const count = Number((e.target as HTMLSelectElement).value) as ImageHostingPrefs['listCount']
  emit('update:prefs', { ...props.prefs, listCount: count })
  // 数量变化后立即重新拉取列表
  loadList()
}

// ——— 卡片操作 ———
async function copyLink(img: UploadedImage): Promise<void> {
  const text = formatCopyText(img.url, img.name, props.prefs.copyFormat)
  try {
    await navigator.clipboard.writeText(text)
    notify(`已复制 ${props.prefs.copyFormat.toUpperCase()} 链接`)
  } catch {
    notify('复制失败', 'error')
  }
}

async function openInBrowser(img: UploadedImage): Promise<void> {
  await ipcClient.imageHosting.openUrl(img.url)
}

async function download(img: UploadedImage): Promise<void> {
  try {
    await ipcClient.imageHosting.download(img.key)
    notify('已下载')
  } catch (e) {
    notify(`下载失败: ${e}`, 'error')
  }
}

async function remove(img: UploadedImage, e: Event): Promise<void> {
  e.stopPropagation()
  if (!confirm(`确认删除 ${img.name}？`)) return
  try {
    await ipcClient.imageHosting.delete(img.key)
    images.value = images.value.filter((i) => i.key !== img.key)
    notify('已删除')
  } catch (err) {
    notify(`删除失败: ${err}`, 'error')
  }
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / 1024 / 1024).toFixed(1) + ' MB'
}

function formatTime(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  const min = 60 * 1000
  const hour = 60 * min
  const day = 24 * hour
  if (diff < min) return '刚刚'
  if (diff < hour) return Math.floor(diff / min) + ' 分钟前'
  if (diff < day) return Math.floor(diff / hour) + ' 小时前'
  if (diff < 7 * day) return Math.floor(diff / day) + ' 天前'
  return d.toLocaleDateString('zh-CN')
}
</script>

<template>
  <div class="rounded-[14px] border p-5" :style="{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }">
    <!-- 列表头 -->
    <div class="mb-4 flex items-center justify-between">
      <div class="flex items-center gap-2 text-sm font-semibold" :style="{ color: 'var(--text-primary)' }">
        <UIcon name="i-heroicons-clock" size="16" style="color: #06b6d4;" />
        最近上传
        <select
          :value="prefs.listCount"
          class="cursor-pointer rounded-md border px-1.5 py-0.5 text-[11px] font-normal outline-none"
          :style="{ backgroundColor: 'var(--bg-card-hover)', borderColor: 'var(--border)', color: 'var(--text-secondary)' }"
          title="每次读取的图片数量"
          @change="onListCountChange"
        >
          <option :value="5">5 条</option>
          <option :value="10">10 条</option>
          <option :value="20">20 条</option>
          <option :value="50">50 条</option>
        </select>
      </div>
      <div class="flex items-center gap-2">
        <select
          :value="prefs.copyFormat"
          class="cursor-pointer rounded-lg border px-2.5 py-1.5 text-xs outline-none"
          :style="{ backgroundColor: 'var(--bg-card-hover)', borderColor: 'var(--border)', color: 'var(--text-secondary)' }"
          title="复制链接格式"
          @change="onCopyFormatChange"
        >
          <option value="url">URL</option>
          <option value="md">MD</option>
          <option value="html">HTML</option>
        </select>
        <div
          class="flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-1.5 text-xs"
          :style="{
            backgroundColor: 'var(--bg-card-hover)',
            borderColor: prefs.autoCopyEnabled ? '#06b6d4' : 'var(--border)',
            color: prefs.autoCopyEnabled ? '#06b6d4' : 'var(--text-secondary)'
          }"
          title="上传成功后自动复制链接"
          @click="toggleAutoCopy"
        >
          <span>自动复制</span>
          <span class="relative inline-block h-5 w-9 rounded-full transition-colors" :style="{ background: prefs.autoCopyEnabled ? '#06b6d4' : 'var(--bg-card-hover)' }">
            <span class="absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all" :style="{ left: prefs.autoCopyEnabled ? '18px' : '2px' }"></span>
          </span>
        </div>
        <span class="mx-1 h-4 w-px" style="background: var(--border);"></span>
        <button class="flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs" :style="{ backgroundColor: 'var(--bg-card-hover)', borderColor: 'var(--border)', color: 'var(--text-secondary)' }">
          <UIcon name="i-heroicons-funnel" size="12" /> 全部格式
        </button>
        <button class="flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs" :style="{ backgroundColor: 'var(--bg-card-hover)', borderColor: 'var(--border)', color: 'var(--text-secondary)' }">
          <UIcon name="i-heroicons-bars-3-bottom-right" size="12" /> 最新优先
        </button>
      </div>
    </div>

    <!-- loading -->
    <div v-if="loading" class="flex items-center justify-center gap-2 py-10 text-sm" style="color: var(--text-muted);">
      <UIcon name="i-heroicons-arrow-path" size="16" class="animate-spin" /> 加载中...
    </div>

    <!-- error -->
    <div v-else-if="errorMsg" class="flex items-center justify-center gap-2 py-10 text-sm" style="color: #ef4444;">
      <UIcon name="i-heroicons-exclamation-triangle" size="16" /> {{ errorMsg }}
    </div>

    <!-- empty -->
    <div v-else-if="images.length === 0" class="py-10 text-center" style="color: var(--text-muted);">
      <UIcon name="i-heroicons-photo" size="40" class="opacity-50" />
      <p class="mt-3 text-[13px]">暂无上传记录</p>
    </div>

    <!-- 图片网格 -->
    <div v-else class="grid gap-3.5" style="grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));">
      <div
        v-for="img in images"
        :key="img.key"
        class="group relative cursor-pointer overflow-hidden rounded-xl border transition-all hover:-translate-y-[3px]"
        :style="{ backgroundColor: 'var(--bg-card-hover)', borderColor: 'var(--border)' }"
      >
        <!-- 缩略图 -->
        <div class="relative aspect-square overflow-hidden" style="background: var(--bg);">
          <span class="absolute left-1.5 top-1.5 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase" style="background: rgba(15,23,42,0.7); color: #fff;">{{ img.format }}</span>
          <img v-if="['png','jpg','jpeg','gif','webp'].includes(img.format)" :src="img.url" :alt="img.name" class="h-full w-full object-cover" loading="lazy">
          <div v-else class="flex h-full w-full items-center justify-center" style="color: var(--text-muted);">
            <UIcon name="i-heroicons-photo" size="32" />
          </div>
          <!-- hover 操作 -->
          <div class="absolute inset-0 flex items-center justify-center gap-2 opacity-0 transition-opacity group-hover:opacity-100" style="background: rgba(15,23,42,0.7);">
            <button class="flex h-9 w-9 items-center justify-center rounded-lg text-white transition-colors hover:bg-[#06b6d4]" title="复制链接" @click.stop="copyLink(img)">
              <UIcon name="i-heroicons-link" size="16" />
            </button>
            <button class="flex h-9 w-9 items-center justify-center rounded-lg text-white transition-colors hover:bg-[#06b6d4]" title="在新窗口打开" @click.stop="openInBrowser(img)">
              <UIcon name="i-heroicons-arrow-top-right-on-square" size="16" />
            </button>
            <button class="flex h-9 w-9 items-center justify-center rounded-lg text-white transition-colors hover:bg-[#06b6d4]" title="下载" @click.stop="download(img)">
              <UIcon name="i-heroicons-arrow-down-tray" size="16" />
            </button>
            <button class="flex h-9 w-9 items-center justify-center rounded-lg text-white transition-colors hover:bg-[#ef4444]" title="删除" @click="remove(img, $event)">
              <UIcon name="i-heroicons-trash" size="16" />
            </button>
          </div>
        </div>
        <!-- 信息 -->
        <div class="px-3 py-2.5">
          <div class="mb-1 truncate text-xs font-medium" :style="{ color: 'var(--text-primary)' }">{{ img.name }}</div>
          <div class="flex items-center justify-between text-[11px]" :style="{ color: 'var(--text-muted)' }">
            <span style="font-family: 'SF Mono', Monaco, monospace;">{{ formatSize(img.size) }}</span>
            <span>{{ formatTime(img.lastModified) }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
