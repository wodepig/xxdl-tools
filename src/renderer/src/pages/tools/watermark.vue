<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import type { WatermarkPreset, FileInfo, ImageInfo, PreviewFileParams } from '../../../../shared/types/watermark'
import { ipcClient } from '../../ipc/client'

// ——— 通知 ———
const notification = ref('')
const notiType = ref<'success' | 'error' | 'info'>('success')
let notiTimer: ReturnType<typeof setTimeout> | null = null
function notify(msg: string, type: 'success' | 'error' | 'info' = 'success'): void {
  notification.value = msg
  notiType.value = type
  if (notiTimer) clearTimeout(notiTimer)
  notiTimer = setTimeout(() => { notification.value = '' }, 3000)
}

// ——— 文件选择 ———
const fileInfo = ref<FileInfo | null>(null)
const selectingFile = ref(false)

async function selectFile(): Promise<void> {
  selectingFile.value = true
  try {
    const result = await ipcClient.watermark.openFile()
    if (result) {
      fileInfo.value = result
      await extractImages(result.path, result.type)
    }
  } catch (err) {
    notify(`文件选择失败: ${err}`, 'error')
  } finally {
    selectingFile.value = false
  }
}

// ——— 图片提取 ———
const images = ref<ImageInfo[]>([])
const selectedFilenames = ref<Set<string>>(new Set())
const extracting = ref(false)
const tempDir = ref('')

async function extractImages(filePath: string, fileType: 'docx' | 'pptx'): Promise<void> {
  extracting.value = true
  try {
    const result = await ipcClient.watermark.extract(filePath, fileType)
    if (result) {
      images.value = result.images
      tempDir.value = result.tempDir
      // 默认全选
      selectedFilenames.value = new Set(result.images.map(i => i.filename))
    } else {
      images.value = []
      selectedFilenames.value = new Set()
    }
  } catch (err) {
    notify(`图片提取失败: ${err}`, 'error')
  } finally {
    extracting.value = false
  }
}

const allSelected = computed(() => {
  return images.value.length > 0 && selectedFilenames.value.size === images.value.length
})

function toggleAll(): void {
  if (allSelected.value) {
    selectedFilenames.value = new Set()
  } else {
    selectedFilenames.value = new Set(images.value.map(i => i.filename))
  }
}

function toggleImage(filename: string): void {
  const s = new Set(selectedFilenames.value)
  if (s.has(filename)) {
    s.delete(filename)
  } else {
    s.add(filename)
  }
  selectedFilenames.value = s
}

const selectedCount = computed(() => selectedFilenames.value.size)

// ——— 水印预设 ———
const presets = ref<WatermarkPreset[]>([])
const selectedPresetId = ref<string>('')
const loadingPresets = ref(false)

const selectedPreset = computed(() => {
  return presets.value.find(p => p.id === selectedPresetId.value) || null
})

async function loadPresets(): Promise<void> {
  loadingPresets.value = true
  try {
    presets.value = await ipcClient.watermark.getPresets()
    if (presets.value.length > 0 && !selectedPresetId.value) {
      selectedPresetId.value = presets.value[0].id
    }
  } catch (err) {
    notify(`加载预设失败: ${err}`, 'error')
  } finally {
    loadingPresets.value = false
  }
}

onMounted(loadPresets)

// ——— 管理预设模态 ———
const showPresetModal = ref(false)

const newPresetName = ref('')
const newPresetType = ref<'text' | 'image'>('text')
const newPresetContent = ref('')
const newPresetOpacity = ref(80)
const newPresetPosition = ref<'center' | 'tile' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'>('center')
const newPresetRotation = ref(0)
const newPresetFontSize = ref(36)
const newPresetColor = ref('#000000')
const newPresetScale = ref(100)
const newPresetTileGapX = ref(0)
const newPresetTileGapY = ref(0)
const savingPreset = ref(false)
const presetImageBase64 = ref('')
const presetImageInputRef = ref<HTMLInputElement | null>(null)
const editingPresetId = ref<string | null>(null)
const isEditing = computed(() => editingPresetId.value !== null)

// ——— 模态内水印预览 ———
const previewOriginal = ref('')
const previewResult = ref('')
const previewing = ref(false)
let previewTimer: ReturnType<typeof setTimeout> | null = null
const sampleImagePath = ref('')
const showImagePreview = ref('')
const showImagePreviewAlt = ref('')
const previewZoom = ref(1)

function handlePreviewZoom(e: WheelEvent): void {
  const delta = e.deltaY > 0 ? -0.1 : 0.1
  previewZoom.value = Math.max(0.2, Math.min(5, previewZoom.value + delta))
}

// 关闭大图预览时重置缩放
watch(showImagePreview, (val) => {
  if (!val) previewZoom.value = 1
})

// 生成内置样本图片（不依赖外部文件）
async function createSampleImage(): Promise<string> {
  if (sampleImagePath.value) return sampleImagePath.value

  try {
    // 用 canvas 生成一张 400x300 的白色底测试图片
    const canvas = document.createElement('canvas')
    canvas.width = 400
    canvas.height = 300
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, 400, 300)
    ctx.strokeStyle = '#e5e7eb'
    ctx.lineWidth = 1
    ctx.strokeRect(0.5, 0.5, 399, 299)
    ctx.strokeStyle = '#f3f4f6'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(0, 0); ctx.lineTo(400, 300)
    ctx.moveTo(400, 0); ctx.lineTo(0, 300)
    ctx.stroke()
    ctx.fillStyle = '#d1d5db'
    ctx.font = '20px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('预览区域', 200, 155)

    // 用 toDataURL 直接获取 base64
    const dataUrl = canvas.toDataURL('image/png')
    const base64 = dataUrl.split(',')[1]
    const path = await ipcClient.watermark.saveTempImage(base64)
    sampleImagePath.value = path
    return path
  } catch {
    return ''
  }
}

// 获取模态内预览用的样本图片路径
function getSampleImagePath(): string | null {
  // 优先用已选中的外部图片
  const firstSelected = images.value.find(i => selectedFilenames.value.has(i.filename))
  if (firstSelected?.path) return firstSelected.path
  if (images.value.length > 0 && images.value[0]?.path) return images.value[0].path
  // 兜底：用内置样本图片
  if (sampleImagePath.value) return sampleImagePath.value
  return null
}

function canPreview(): boolean {
  if (newPresetType.value === 'text' && !newPresetContent.value.trim()) return false
  if (newPresetType.value === 'image' && !presetImageBase64.value) return false
  return true
}

// 表单字段变化时自动预览（防抖 300ms）
watch(
  [newPresetType, newPresetContent, newPresetOpacity, newPresetPosition, newPresetRotation, newPresetFontSize, newPresetColor, newPresetScale, newPresetTileGapX, newPresetTileGapY, presetImageBase64],
  () => {
    if (previewTimer) clearTimeout(previewTimer)
    previewTimer = setTimeout(() => { requestModalPreview() }, 300)
  }
)

const positionOptions = [
  { label: '居中', value: 'center' as const },
  { label: '平铺', value: 'tile' as const },
  { label: '左上', value: 'top-left' as const },
  { label: '右上', value: 'top-right' as const },
  { label: '左下', value: 'bottom-left' as const },
  { label: '右下', value: 'bottom-right' as const }
]

function requestModalPreview(): void {
  // 如果预览计时器还在，取消它（避免和 watch 冲突）
  if (previewTimer) { clearTimeout(previewTimer); previewTimer = null }
  // 异步执行预览
  doPreview()
}

async function doPreview(): Promise<void> {
  previewResult.value = ''

  // 确保有样本图片
  let samplePath = getSampleImagePath()
  if (!samplePath) {
    samplePath = await createSampleImage()
  }
  if (!samplePath) {
    console.log('[preview] no sample path available')
    return
  }
  if (!canPreview()) {
    console.log('[preview] canPreview returned false')
    return
  }

  let watermarkImagePath: string | undefined
  const previewType = newPresetType.value

  if (previewType === 'image' && presetImageBase64.value) {
    watermarkImagePath = await ipcClient.watermark.saveTempImage(presetImageBase64.value)
    console.log('[preview] saved image watermark to', watermarkImagePath)
  } else if (previewType === 'text' && newPresetContent.value.trim()) {
    const dataUrl = renderTextAsImage(
      newPresetContent.value.trim(),
      newPresetFontSize.value,
      newPresetColor.value,
      newPresetScale.value
    )
    const base64 = dataUrl.split(',')[1]
    console.log('[preview] rendered text to canvas, base64 length:', base64.length)
    watermarkImagePath = await ipcClient.watermark.saveTempImage(base64)
    console.log('[preview] saved text watermark to', watermarkImagePath)
  }

  const preset: PreviewFileParams['preset'] = {
    name: newPresetName.value || '预览',
    type: 'image',
    content: '',
    opacity: newPresetOpacity.value,
    position: newPresetPosition.value,
    rotation: newPresetRotation.value,
    fontSize: newPresetType.value === 'text' ? newPresetFontSize.value : undefined,
    color: newPresetType.value === 'text' ? newPresetColor.value : undefined,
    scale: newPresetScale.value,
    tileGapX: newPresetTileGapX.value,
    tileGapY: newPresetTileGapY.value,
    watermarkImagePath
  }

  previewing.value = true
  try {
    console.log('[preview] calling previewFile with', samplePath, watermarkImagePath)
    const result = await ipcClient.watermark.previewFile({ imagePath: samplePath, preset })
    if (result) {
      console.log('[preview] got result, watermarked length:', result.watermarked.length)
      previewOriginal.value = result.original
      previewResult.value = result.watermarked
    } else {
      console.log('[preview] result is null')
    }
  } catch (err) {
    console.error('[watermark] preview error:', err)
  } finally {
    previewing.value = false
  }
}

function openPresetModal(): void {
  showPresetModal.value = true
  resetPresetForm()
  editingPresetId.value = null
  previewOriginal.value = ''
  previewResult.value = ''
  // 预生成样本图片，预览由 watch 在用户输入后自动触发
  createSampleImage()
}

function startEditPreset(preset: WatermarkPreset): void {
  showPresetModal.value = true
  editingPresetId.value = preset.id
  newPresetName.value = preset.name
  newPresetType.value = preset.type
  newPresetContent.value = preset.type === 'text' ? preset.content : ''
  presetImageBase64.value = preset.type === 'image' ? preset.content : ''
  newPresetOpacity.value = preset.opacity
  newPresetPosition.value = preset.position
  newPresetRotation.value = preset.rotation
  newPresetFontSize.value = preset.fontSize || 36
  newPresetColor.value = preset.color || '#000000'
  newPresetScale.value = preset.scale || 100
  newPresetTileGapX.value = preset.tileGapX || 0
  newPresetTileGapY.value = preset.tileGapY || 0
  previewOriginal.value = ''
  previewResult.value = ''
  // 等上一帧 reactive 刷新后，再触发预览
  createSampleImage().then(() => {
    requestModalPreview()
  })
}

function cancelEdit(): void {
  editingPresetId.value = null
  resetPresetForm()
  previewOriginal.value = ''
  previewResult.value = ''
}

function closePresetModal(): void {
  showPresetModal.value = false
  previewOriginal.value = ''
  previewResult.value = ''
}

function resetPresetForm(): void {
  newPresetName.value = ''
  newPresetType.value = 'text'
  newPresetContent.value = ''
  newPresetOpacity.value = 80
  newPresetPosition.value = 'center'
  newPresetRotation.value = 0
  newPresetFontSize.value = 36
  newPresetColor.value = '#000000'
  newPresetScale.value = 100
  newPresetTileGapX.value = 0
  newPresetTileGapY.value = 0
  presetImageBase64.value = ''
}

function handlePresetImageUpload(event: Event): void {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = () => {
    const result = reader.result as string
    const commaIdx = result.indexOf(',')
    presetImageBase64.value = commaIdx >= 0 ? result.substring(commaIdx + 1) : result
  }
  reader.readAsDataURL(file)
  input.value = ''
}

async function savePreset(): Promise<void> {
  if (!newPresetName.value.trim()) {
    notify('请输入预设名称', 'error')
    return
  }
  if (!newPresetContent.value.trim() && newPresetType.value === 'text') {
    notify('请输入水印文字内容', 'error')
    return
  }
  if (!presetImageBase64.value && newPresetType.value === 'image') {
    notify('请上传水印图片', 'error')
    return
  }

  savingPreset.value = true
  try {
    const presetId = editingPresetId.value || `preset_${Date.now()}`
    const preset: WatermarkPreset = {
      id: presetId,
      name: newPresetName.value.trim(),
      type: newPresetType.value,
      content: newPresetType.value === 'text' ? newPresetContent.value.trim() : presetImageBase64.value,
      opacity: newPresetOpacity.value,
      position: newPresetPosition.value,
      rotation: newPresetRotation.value,
      fontSize: newPresetType.value === 'text' ? newPresetFontSize.value : undefined,
      color: newPresetType.value === 'text' ? newPresetColor.value : undefined,
      scale: newPresetScale.value,
      tileGapX: newPresetTileGapX.value,
      tileGapY: newPresetTileGapY.value
    }
    await ipcClient.watermark.savePreset(preset)
    notify(isEditing.value ? '预设已更新' : '预设保存成功', 'success')
    await loadPresets()
    selectedPresetId.value = preset.id
    closePresetModal()
  } catch (err) {
    notify(`保存失败: ${err}`, 'error')
  } finally {
    savingPreset.value = false
  }
}

async function deletePreset(id: string): Promise<void> {
  try {
    await ipcClient.watermark.deletePreset(id)
    notify('预设已删除', 'info')
    await loadPresets()
  } catch (err) {
    notify(`删除失败: ${err}`, 'error')
  }
}

// ——— 应用水印 ———
const applying = ref(false)
const resultPath = ref('')

// 将文字渲染为图片 base64（自动裁剪到文字包围盒，支持中文和颜色）
function renderTextAsImage(text: string, fontSize: number, color: string, scale: number): string {
  const pxSize = Math.round(fontSize * (scale / 100))
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')!

  // 先测量文字尺寸
  ctx.font = `bold ${pxSize}px "Microsoft YaHei", "PingFang SC", "Noto Sans SC", sans-serif`
  const m = ctx.measureText(text)
  const textWidth = m.width
  const textHeight = pxSize * 1.4  // 行高估算
  const pad = Math.round(pxSize * 0.4) // 留一些padding

  canvas.width = Math.ceil(textWidth) + pad * 2
  canvas.height = Math.ceil(textHeight) + pad * 2

  // 重新设置裁剪后的上下文
  ctx.font = `bold ${pxSize}px "Microsoft YaHei", "PingFang SC", "Noto Sans SC", sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = color
  ctx.fillText(text, canvas.width / 2, canvas.height / 2)

  return canvas.toDataURL('image/png')
}

async function applyWatermark(): Promise<void> {
  if (!fileInfo.value) {
    notify('请先选择文件', 'error')
    return
  }
  if (selectedFilenames.value.size === 0) {
    notify('请至少选择一张图片', 'error')
    return
  }
  if (!selectedPreset.value) {
    notify('请选择水印预设', 'error')
    return
  }

  applying.value = true
  resultPath.value = ''
  try {
    let textAsImagePath: string | undefined

    // 如果是文字水印，先渲染为图片
    if (selectedPreset.value.type === 'text' && selectedPreset.value.content) {
      const fontSize = selectedPreset.value.fontSize || 36
      const color = selectedPreset.value.color || '#000000'
      const scale = selectedPreset.value.scale || 100
      const dataUrl = renderTextAsImage(selectedPreset.value.content, fontSize, color, scale)
      const base64 = dataUrl.split(',')[1]
      textAsImagePath = await ipcClient.watermark.saveTempImage(base64)
    }

    const path = await ipcClient.watermark.apply({
      filePath: fileInfo.value.path,
      fileType: fileInfo.value.type,
      imageFilenames: Array.from(selectedFilenames.value),
      presetId: selectedPreset.value.id,
      textAsImagePath
    })
    if (path) {
      resultPath.value = path
      notify('水印添加完成！', 'success')
    } else {
      notify('水印添加失败，请重试', 'error')
    }
  } catch (err) {
    notify(`水印添加失败: ${err}`, 'error')
  } finally {
    applying.value = false
  }
}

async function openOutputFolder(): Promise<void> {
  if (!resultPath.value) return
  try {
    await ipcClient.watermark.openFolder(resultPath.value)
  } catch (err) {
    notify(`打开文件夹失败: ${err}`, 'error')
  }
}
</script>

<template>
  <div class="flex h-full flex-col overflow-hidden">
    <div class="flex-1 overflow-y-auto p-6">
      <div class="mx-auto max-w-5xl space-y-6">

        <!-- ===== 通知 ===== -->
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

        <!-- ===== 1. 文件选择 ===== -->
        <div
          class="rounded-xl border"
          :style="{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }"
        >
          <div
            class="flex items-center justify-between border-b px-5 py-3.5"
            :style="{ borderColor: 'var(--border)' }"
          >
            <div class="flex items-center gap-2.5">
              <div class="h-2.5 w-2.5 rounded-full" style="background-color: #6366f1"></div>
              <span class="text-sm font-semibold" :style="{ color: 'var(--text-primary)' }">选择文件</span>
            </div>
          </div>
          <div class="p-5">
            <div v-if="!fileInfo" class="flex items-center gap-3">
              <UButton
                variant="solid"
                color="primary"
                size="md"
                icon="i-heroicons-document-plus"
                :loading="selectingFile"
                @click="selectFile"
              >
                选择文件
              </UButton>
              <span class="text-xs" :style="{ color: 'var(--text-muted)' }">支持 DOCX / PPTX 格式</span>
            </div>
            <div v-else class="flex items-center justify-between">
              <div class="flex items-center gap-3">
                <div
                  class="flex h-10 w-10 items-center justify-center rounded-lg"
                  :style="{
                    backgroundColor: fileInfo.type === 'docx' ? '#6366f118' : '#f59e0b18',
                    color: fileInfo.type === 'docx' ? '#6366f1' : '#f59e0b'
                  }"
                >
                  <UIcon
                    :name="fileInfo.type === 'docx' ? 'i-heroicons-document-text' : 'i-heroicons-presentation-chart-bar'"
                    size="20"
                  />
                </div>
                <div>
                  <div class="text-sm font-medium" :style="{ color: 'var(--text-primary)' }">{{ fileInfo.name }}</div>
                  <div class="text-xs" :style="{ color: 'var(--text-muted)' }">
                    类型：{{ fileInfo.type === 'docx' ? 'Word 文档' : 'PowerPoint 演示文稿' }}
                  </div>
                </div>
              </div>
              <UButton variant="ghost" color="neutral" size="sm" icon="i-heroicons-arrow-path" @click="selectFile">
                重新选择
              </UButton>
            </div>
          </div>
        </div>

        <!-- ===== 2. 图片列表 ===== -->
        <div
          v-if="images.length > 0"
          class="rounded-xl border"
          :style="{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }"
        >
          <div
            class="flex items-center justify-between border-b px-5 py-3.5"
            :style="{ borderColor: 'var(--border)' }"
          >
            <div class="flex items-center gap-2.5">
              <div class="h-2.5 w-2.5 rounded-full" style="background-color: #10b981"></div>
              <span class="text-sm font-semibold" :style="{ color: 'var(--text-primary)' }">
                图片列表
              </span>
              <span class="text-xs" :style="{ color: 'var(--text-muted)' }">
                (已选 {{ selectedCount }}/{{ images.length }} 张)
              </span>
            </div>
            <UButton variant="ghost" color="neutral" size="xs" @click="toggleAll">
              <template v-if="extracting">
                <UIcon name="i-heroicons-arrow-path" size="12" class="animate-spin" />
              </template>
              {{ allSelected ? '取消全选' : '全选' }}
            </UButton>
          </div>
          <div class="p-5">
            <div v-if="extracting" class="flex items-center justify-center py-8">
              <UIcon name="i-heroicons-arrow-path" size="24" class="animate-spin" :style="{ color: 'var(--primary)' }" />
              <span class="ml-2 text-sm" :style="{ color: 'var(--text-muted)' }">正在提取图片…</span>
            </div>
            <div
              v-else
              class="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6"
            >
              <div
                v-for="img in images"
                :key="img.filename"
                class="group relative cursor-pointer rounded-lg border p-2 transition-all"
                :class="{ 'ring-2': selectedFilenames.has(img.filename) }"
                :style="{
                  borderColor: selectedFilenames.has(img.filename) ? 'var(--primary)' : 'var(--border)',
                  backgroundColor: 'var(--bg-elevated)',
                  '--tw-ring-color': 'var(--primary)'
                }"
                @click="toggleImage(img.filename)"
              >
                <!-- 勾选框 -->
                <div
                  class="absolute right-2 top-2 z-10 flex h-5 w-5 items-center justify-center rounded border-2 text-white transition-all"
                  :style="{
                    borderColor: selectedFilenames.has(img.filename) ? 'var(--primary)' : 'var(--border)',
                    backgroundColor: selectedFilenames.has(img.filename) ? 'var(--primary)' : 'transparent'
                  }"
                >
                  <UIcon v-if="selectedFilenames.has(img.filename)" name="i-heroicons-check" size="10" />
                </div>
                <!-- 缩略图 -->
                <div class="mb-1.5 flex aspect-[4/3] items-center justify-center overflow-hidden rounded-md">
                  <img
                    :src="img.preview"
                    :alt="img.filename"
                    class="max-h-full max-w-full object-contain"
                  />
                </div>
                <!-- 文件名 -->
                <div
                  class="truncate text-center text-[10px]"
                  :style="{ color: 'var(--text-muted)' }"
                  :title="img.filename"
                >
                  {{ img.filename }}
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- ===== 3. 水印预设 ===== -->
        <div
          class="rounded-xl border"
          :style="{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }"
        >
          <div
            class="flex items-center justify-between border-b px-5 py-3.5"
            :style="{ borderColor: 'var(--border)' }"
          >
            <div class="flex items-center gap-2.5">
              <div class="h-2.5 w-2.5 rounded-full" style="background-color: #f59e0b"></div>
              <span class="text-sm font-semibold" :style="{ color: 'var(--text-primary)' }">水印预设</span>
            </div>
          </div>
          <div class="space-y-4 p-5">
            <!-- 预设选择 + 操作 -->
            <div class="flex items-center gap-3">
              <div class="relative flex-1">
                <select
                  v-if="presets.length > 0"
                  v-model="selectedPresetId"
                  class="w-full cursor-pointer rounded-lg border px-4 py-2.5 pr-10 text-sm outline-none transition-all"
                  :style="{ backgroundColor: 'var(--bg-base)', borderColor: 'var(--border)', color: 'var(--text-primary)' }"
                >
                  <option v-for="p in presets" :key="p.id" :value="p.id" class="text-sm">{{ p.name }}</option>
                </select>
                <div
                  v-else
                  class="rounded-lg border px-4 py-2.5 text-sm"
                  :style="{ backgroundColor: 'var(--bg-base)', borderColor: 'var(--border)', color: 'var(--text-muted)' }"
                >
                  {{ loadingPresets ? '加载中…' : '暂无预设，请先创建' }}
                </div>
              </div>
              <UButton
                 v-if="selectedPreset"
                 variant="ghost"
                 color="neutral"
                 size="sm"
                 square
                 icon="i-heroicons-pencil-square"
                 title="编辑预设"
                 @click="startEditPreset(selectedPreset)"
               />
               <UButton
                 v-if="selectedPreset"
                 variant="ghost"
                 color="error"
                 size="sm"
                 square
                 icon="i-heroicons-trash"
                 title="删除预设"
                 @click="deletePreset(selectedPreset.id)"
               />
              <UButton variant="soft" color="warning" icon="i-heroicons-plus" @click="openPresetModal">
                新建预设
              </UButton>
            </div>

            <!-- 当前预设信息 -->
            <div
              v-if="selectedPreset"
              class="rounded-lg px-4 py-3 text-xs space-y-1"
              :style="{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-muted)' }"
            >
              <div class="flex items-center gap-4">
                <span>
                  类型：
                  <span class="font-medium" :style="{ color: 'var(--text-primary)' }">
                    {{ selectedPreset.type === 'text' ? '文字水印' : '图片水印' }}
                  </span>
                </span>
                <span>
                  透明度：
                  <span class="font-medium" :style="{ color: 'var(--text-primary)' }">{{ selectedPreset.opacity }}%</span>
                </span>
                <span>
                  位置：
                  <span class="font-medium" :style="{ color: 'var(--text-primary)' }">
                    {{ positionOptions.find(p => p.value === selectedPreset!.position)?.label }}
                  </span>
                </span>
                <span>
                  旋转：
                  <span class="font-medium" :style="{ color: 'var(--text-primary)' }">{{ selectedPreset.rotation }}°</span>
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- ===== 4. 应用水印 ===== -->
        <div
          class="rounded-xl border"
          :style="{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }"
        >
          <div
            class="flex items-center justify-between border-b px-5 py-3.5"
            :style="{ borderColor: 'var(--border)' }"
          >
            <div class="flex items-center gap-2.5">
              <div class="h-2.5 w-2.5 rounded-full" style="background-color: #06b6d4"></div>
              <span class="text-sm font-semibold" :style="{ color: 'var(--text-primary)' }">执行操作</span>
            </div>
          </div>
          <div class="space-y-4 p-5">
            <UButton
              variant="solid"
              color="primary"
              size="lg"
              icon="i-heroicons-sparkles"
              :loading="applying"
              :disabled="!fileInfo || selectedFilenames.size === 0 || !selectedPreset"
              class="w-full sm:w-auto"
              @click="applyWatermark"
            >
              开始添加水印
            </UButton>

            <!-- 结果 -->
            <div
              v-if="resultPath"
              class="rounded-lg border px-4 py-3"
              :style="{ borderColor: 'rgba(16,185,129,0.3)', backgroundColor: 'rgba(16,185,129,0.05)' }"
            >
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <UIcon name="i-heroicons-check-circle" size="16" style="color: #10b981" />
                  <span class="text-sm" :style="{ color: 'var(--text-primary)' }">
                    已保存到：
                  </span>
                  <span
                    class="max-w-[300px] truncate text-sm font-mono"
                    :style="{ color: '#10b981' }"
                    :title="resultPath"
                  >
                    {{ resultPath }}
                  </span>
                </div>
                <UButton variant="soft" color="neutral" size="sm" icon="i-heroicons-folder-open" @click="openOutputFolder">
                  打开文件夹
                </UButton>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>

    <!-- ===== 管理预设模态 ===== -->
    <Teleport to="body">
      <Transition name="modal">
        <div
          v-if="showPresetModal"
          class="fixed inset-0 z-40 flex items-center justify-center"
          style="background-color: rgba(0, 0, 0, 0.5)"
          @click.self="closePresetModal"
        >
          <div
            class="mx-4 w-full max-w-lg max-h-[80vh] overflow-y-auto rounded-xl border shadow-2xl"
            :style="{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }"
          >
            <!-- 模态头部 -->
            <div
              class="flex items-center justify-between border-b px-5 py-4"
              :style="{ borderColor: 'var(--border)' }"
            >
              <span class="text-sm font-semibold" :style="{ color: 'var(--text-primary)' }">
                {{ isEditing ? '编辑预设' : '管理预设' }}
              </span>
              <button
                class="flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg transition-colors hover:bg-[var(--bg-hover)]"
                :style="{ color: 'var(--text-muted)' }"
                @click="closePresetModal"
              >
                <UIcon name="i-heroicons-x-mark" size="16" />
              </button>
            </div>

            <div class="space-y-6 p-5">
              <!-- 已有预设列表 -->
              <div v-if="presets.length > 0">
                <div class="mb-2 text-xs font-medium" :style="{ color: 'var(--text-muted)' }">已有预设</div>
                <div class="space-y-2">
                  <div
                      v-for="p in presets"
                      :key="p.id"
                      class="flex items-center justify-between rounded-lg border px-3.5 py-2.5"
                      :style="{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-elevated)' }"
                    >
                      <div class="flex items-center gap-2.5">
                        <UIcon
                          :name="p.type === 'text' ? 'i-heroicons-font-case' : 'i-heroicons-photo'"
                          size="14"
                          :style="{ color: p.type === 'text' ? '#6366f1' : '#10b981' }"
                        />
                        <span class="text-sm" :style="{ color: 'var(--text-primary)' }">{{ p.name }}</span>
                        <span class="text-[10px]" :style="{ color: 'var(--text-muted)' }">
                          {{ p.type === 'text' ? '文字' : '图片' }}
                        </span>
                      </div>
                      <div class="flex items-center gap-1.5">
                        <UButton
                          variant="ghost"
                          color="neutral"
                          size="xs"
                          square
                          title="编辑预设"
                          @click="startEditPreset(p)"
                        >
                          <UIcon name="i-heroicons-pencil-square" size="14" />
                        </UButton>
                        <UButton
                          variant="ghost"
                          color="error"
                          size="xs"
                          square
                          title="删除预设"
                          @click="deletePreset(p.id)"
                        >
                          <UIcon name="i-heroicons-trash" size="14" />
                        </UButton>
                      </div>
                    </div>
                </div>
              </div>

              <!-- 新建预设 -->
              <div>
                <div class="mb-3 text-xs font-medium" :style="{ color: 'var(--text-muted)' }">
                {{ isEditing ? '编辑预设' : '新建预设' }}
              </div>
                <div class="space-y-4">
                  <!-- 名称 -->
                  <div>
                    <label class="mb-1 block text-xs" :style="{ color: 'var(--text-muted)' }">名称</label>
                    <input
                      v-model="newPresetName"
                      type="text"
                      placeholder="预设名称…"
                      class="w-full rounded-lg border px-3.5 py-2.5 text-sm outline-none transition-all"
                      :style="{ backgroundColor: 'var(--bg-base)', borderColor: 'var(--border)', color: 'var(--text-primary)' }"
                    />
                  </div>

                  <!-- 类型 -->
                  <div>
                    <label class="mb-1 block text-xs" :style="{ color: 'var(--text-muted)' }">类型</label>
                    <div class="flex gap-2">
                      <button
                        class="flex-1 cursor-pointer rounded-lg border px-3 py-2 text-sm font-medium transition-all"
                        :style="{
                          borderColor: newPresetType === 'text' ? '#6366f1' : 'var(--border)',
                          backgroundColor: newPresetType === 'text' ? '#6366f118' : 'var(--bg-base)',
                          color: newPresetType === 'text' ? '#6366f1' : 'var(--text-primary)'
                        }"
                        @click="newPresetType = 'text'"
                      >
                        文字水印
                      </button>
                      <button
                        class="flex-1 cursor-pointer rounded-lg border px-3 py-2 text-sm font-medium transition-all"
                        :style="{
                          borderColor: newPresetType === 'image' ? '#10b981' : 'var(--border)',
                          backgroundColor: newPresetType === 'image' ? '#10b98118' : 'var(--bg-base)',
                          color: newPresetType === 'image' ? '#10b981' : 'var(--text-primary)'
                        }"
                        @click="newPresetType = 'image'"
                      >
                        图片水印
                      </button>
                    </div>
                  </div>

                  <!-- 内容 -->
                  <div>
                    <label class="mb-1 block text-xs" :style="{ color: 'var(--text-muted)' }">内容</label>
                    <template v-if="newPresetType === 'text'">
                      <textarea
                        v-model="newPresetContent"
                        placeholder="输入水印文字…"
                        rows="2"
                        class="w-full resize-none rounded-lg border px-3.5 py-2.5 text-sm outline-none transition-all"
                        :style="{ backgroundColor: 'var(--bg-base)', borderColor: 'var(--border)', color: 'var(--text-primary)' }"
                      ></textarea>
                    </template>
                    <template v-else>
                      <div
                        class="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed py-6 transition-all"
                        :style="{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-elevated)' }"
                        @click="presetImageInputRef?.click()"
                      >
                        <input
                          ref="presetImageInputRef"
                          type="file"
                          accept="image/*"
                          class="hidden"
                          @change="handlePresetImageUpload"
                        />
                        <div
                          v-if="!presetImageBase64"
                          class="flex flex-col items-center gap-2"
                        >
                          <UIcon name="i-heroicons-cloud-arrow-up" size="24" :style="{ color: 'var(--text-muted)' }" />
                          <span class="text-xs" :style="{ color: 'var(--text-muted)' }">点击上传水印图片</span>
                        </div>
                        <img
                          v-else
                          :src="`data:image/png;base64,${presetImageBase64}`"
                          class="max-h-24 max-w-full rounded object-contain"
                          alt="水印图片预览"
                        />
                      </div>
                    </template>
                  </div>

                  <!-- 透明度 -->
                  <div>
                    <label class="mb-1 flex items-center justify-between text-xs" :style="{ color: 'var(--text-muted)' }">
                      <span>透明度</span>
                      <span class="font-medium" :style="{ color: 'var(--text-primary)' }">{{ newPresetOpacity }}%</span>
                    </label>
                    <input
                      v-model.number="newPresetOpacity"
                      type="range"
                      min="0"
                      max="100"
                      class="w-full cursor-pointer accent-[#6366f1]"
                    />
                  </div>

                  <!-- 位置 -->
                  <div>
                    <label class="mb-1 block text-xs" :style="{ color: 'var(--text-muted)' }">位置</label>
                    <select
                      v-model="newPresetPosition"
                      class="w-full cursor-pointer rounded-lg border px-3.5 py-2.5 text-sm outline-none transition-all"
                      :style="{ backgroundColor: 'var(--bg-base)', borderColor: 'var(--border)', color: 'var(--text-primary)' }"
                    >
                      <option v-for="opt in positionOptions" :key="opt.value" :value="opt.value">
                        {{ opt.label }}
                      </option>
                    </select>
                  </div>

                  <!-- 平铺间距 (仅平铺模式) -->
                  <div v-if="newPresetPosition === 'tile'" class="grid grid-cols-2 gap-3">
                    <div>
                      <label class="mb-1 block text-xs" :style="{ color: 'var(--text-muted)' }">水平间距(px)</label>
                      <input
                        v-model.number="newPresetTileGapX"
                        type="number"
                        min="0"
                        max="500"
                        class="w-full rounded-lg border px-3.5 py-2.5 text-sm outline-none transition-all"
                        :style="{ backgroundColor: 'var(--bg-base)', borderColor: 'var(--border)', color: 'var(--text-primary)' }"
                      />
                    </div>
                    <div>
                      <label class="mb-1 block text-xs" :style="{ color: 'var(--text-muted)' }">垂直间距(px)</label>
                      <input
                        v-model.number="newPresetTileGapY"
                        type="number"
                        min="0"
                        max="500"
                        class="w-full rounded-lg border px-3.5 py-2.5 text-sm outline-none transition-all"
                        :style="{ backgroundColor: 'var(--bg-base)', borderColor: 'var(--border)', color: 'var(--text-primary)' }"
                      />
                    </div>
                  </div>

                  <!-- 旋转角度 -->
                  <div>
                    <label class="mb-1 flex items-center justify-between text-xs" :style="{ color: 'var(--text-muted)' }">
                      <span>旋转角度</span>
                      <span class="font-medium" :style="{ color: 'var(--text-primary)' }">{{ newPresetRotation }}°</span>
                    </label>
                    <input
                      v-model.number="newPresetRotation"
                      type="range"
                      min="-90"
                      max="90"
                      class="w-full cursor-pointer accent-[#6366f1]"
                    />
                  </div>

                  <!-- 字号 (文字水印) -->
                  <div v-if="newPresetType === 'text'">
                    <label class="mb-1 flex items-center justify-between text-xs" :style="{ color: 'var(--text-muted)' }">
                      <span>字号</span>
                      <span class="font-medium" :style="{ color: 'var(--text-primary)' }">{{ newPresetFontSize }}px</span>
                    </label>
                    <input
                      v-model.number="newPresetFontSize"
                      type="range"
                      min="8"
                      max="200"
                      class="w-full cursor-pointer accent-[#6366f1]"
                    />
                  </div>

                  <!-- 颜色 (文字水印) -->
                  <div v-if="newPresetType === 'text'">
                    <label class="mb-1 block text-xs" :style="{ color: 'var(--text-muted)' }">颜色</label>
                    <div class="flex items-center gap-3">
                      <input
                        v-model="newPresetColor"
                        type="color"
                        class="h-9 w-12 cursor-pointer rounded border"
                        :style="{ borderColor: 'var(--border)' }"
                      />
                      <span class="text-xs font-mono" :style="{ color: 'var(--text-muted)' }">{{ newPresetColor }}</span>
                    </div>
                  </div>

                  <!-- 缩放比例 (图片水印) -->
                  <div v-if="newPresetType === 'image'">
                    <label class="mb-1 flex items-center justify-between text-xs" :style="{ color: 'var(--text-muted)' }">
                      <span>缩放比例</span>
                      <span class="font-medium" :style="{ color: 'var(--text-primary)' }">{{ newPresetScale }}%</span>
                    </label>
                    <input
                      v-model.number="newPresetScale"
                      type="range"
                      min="10"
                      max="200"
                      class="w-full cursor-pointer accent-[#6366f1]"
                    />
                  </div>

                  <!-- 模态内水印预览 -->
                  <div
                    class="rounded-lg border p-3"
                    :style="{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-elevated)' }"
                  >
                    <div class="mb-2 flex items-center justify-between text-[10px] font-medium" :style="{ color: 'var(--text-muted)' }">
                      <span>
                        水印效果预览
                        <span v-if="!canPreview()" class="ml-2" :style="{ color: '#f59e0b' }">
                          （填写水印内容后自动预览）
                        </span>
                        <span v-if="getSampleImagePath() && !getSampleImagePath()?.includes('watermark-temp') && images.length > 0" class="ml-2" :style="{ color: '#10b981' }">
                          （使用文档内图片演示）
                        </span>
                        <span v-else-if="sampleImagePath" class="ml-2" :style="{ color: 'var(--text-muted)' }">
                          （使用内置样本图片演示）
                        </span>
                      </span>
                      <UButton
                        variant="ghost"
                        color="neutral"
                        size="xs"
                        :loading="previewing"
                        @click="requestModalPreview()"
                      >
                        <template #icon>
                          <UIcon name="i-heroicons-arrow-path" size="12" />
                        </template>
                        刷新预览
                      </UButton>
                    </div>
                    <div class="flex flex-col items-center gap-3">
                      <!-- 水印效果图（点击放大） -->
                      <div
                        class="mx-auto flex cursor-pointer items-center justify-center overflow-hidden rounded border transition-opacity hover:opacity-90"
                        :style="{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-base)', width: '320px', height: '240px' }"
                        @click="showImagePreview = previewResult; showImagePreviewAlt = '水印效果'"
                      >
                        <img
                          v-if="previewResult"
                          :src="previewResult"
                          class="max-h-full max-w-full object-contain"
                          alt="水印效果"
                        />
                        <div
                          v-else-if="previewing"
                          class="flex h-full w-full items-center justify-center"
                        >
                          <UIcon name="i-heroicons-arrow-path" size="24" class="animate-spin" :style="{ color: 'var(--primary)' }" />
                        </div>
                        <div v-else class="flex h-full w-full flex-col items-center justify-center gap-1.5">
                          <UIcon name="i-heroicons-photo" size="24" :style="{ color: 'var(--text-muted)' }" />
                          <span class="text-[10px]" :style="{ color: 'var(--text-muted)' }">调整参数后自动预览</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <!-- 点击放大遮罩 -->
                  <Teleport to="body">
                    <div
                      v-if="showImagePreview"
                      class="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80"
                      @click="showImagePreview = ''"
                      @wheel.prevent="handlePreviewZoom"
                      @keydown.escape="showImagePreview = ''"
                    >
                      <div
                        class="relative flex items-center justify-center transition-transform duration-200 ease-out"
                        :style="{ transform: `scale(${previewZoom})` }"
                        @click.stop
                      >
                        <img
                          :src="showImagePreview"
                          :alt="showImagePreviewAlt"
                          class="max-h-screen max-w-screen object-contain"
                        />
                        <UButton
                          variant="solid"
                          color="neutral"
                          size="sm"
                          square
                          class="absolute -right-3 -top-3 z-10"
                          @click.stop="showImagePreview = ''"
                        >
                          <UIcon name="i-heroicons-x-mark" size="20" />
                        </UButton>
                      </div>
                      <!-- 底部提示 -->
                      <div
                        class="absolute bottom-6 left-1/2 -translate-x-1/2 rounded-full bg-black/50 px-4 py-1.5 text-[11px] text-white/80"
                      >
                        滚轮缩放 · 点击空白关闭
                      </div>
                    </div>
                  </Teleport>

                  <!-- 按钮组 -->
                  <div class="flex gap-2">
                    <UButton
                      v-if="isEditing"
                      variant="ghost"
                      color="neutral"
                      size="md"
                      class="flex-1"
                      @click="cancelEdit"
                    >
                      取消
                    </UButton>
                    <UButton
                      variant="solid"
                      color="primary"
                      size="md"
                      :icon="isEditing ? 'i-heroicons-pencil-square' : 'i-heroicons-check'"
                      :loading="savingPreset"
                      class="flex-1"
                      @click="savePreset"
                    >
                      {{ isEditing ? '更新预设' : '保存预设' }}
                    </UButton>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.2s ease;
}
.modal-enter-active > div,
.modal-leave-active > div {
  transition: transform 0.2s ease, opacity 0.2s ease;
}
.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}
.modal-enter-from > div,
.modal-leave-to > div {
  transform: scale(0.95);
  opacity: 0;
}

select {
  appearance: auto;
  -webkit-appearance: auto;
}

input[type='range'] {
  height: 6px;
  border-radius: 3px;
  outline: none;
}

input[type='color'] {
  padding: 2px;
}
</style>
