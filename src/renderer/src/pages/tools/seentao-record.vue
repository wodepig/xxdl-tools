<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { ipcClient } from '../../ipc/client'
import type { SeentaoRecord } from '../../../../shared/types/seentao-record'

// ============ 狀態 ============
const initialized = ref(false)
const storagePath = ref('')
const yearMonth = ref('')
const records = ref<SeentaoRecord[]>([])
const groupedDays = ref<{ dateKey: string; records: SeentaoRecord[] }[]>([])
const searchQuery = ref('')
const loading = ref(false)
const notification = ref('')
let notiTimer: ReturnType<typeof setTimeout> | null = null

// 模态框
const showAddModal = ref(false)
const showDetailModal = ref(false)
const selectedRecord = ref<SeentaoRecord | null>(null)
const detailYearMonth = ref('')
const detailDateKey = ref('')

// 新增表单
const formStudentName = ref('')
const formCourseName = ref('')
const formNote = ref('')
const formImages = ref<string[]>([]) // base64
const formImageNames = ref<string[]>([]) // 文件名（用于显示）

// 大图预览
const showImageViewer = ref(false)
const viewingImage = ref('')

// ============ 通知 ============
function notify(msg: string): void {
  notification.value = msg
  if (notiTimer) clearTimeout(notiTimer)
  notiTimer = setTimeout(() => { notification.value = '' }, 2000)
}

// ============ 初始化 ============
async function selectDirectory(): Promise<void> {
  try {
    const dir = await ipcClient.seentaoRecord.selectDirectory()
    if (dir) storagePath.value = dir
  } catch { /* ignore */ }
}

async function initStorage(): Promise<void> {
  if (!storagePath.value.trim()) {
    notify('请输入存储路径')
    return
  }
  try {
    await ipcClient.seentaoRecord.init(storagePath.value.trim())
    // 持久化配置到 {userData}/data/seentao-record.json
    await ipcClient.setToolData('seentao-record', { storagePath: storagePath.value.trim() })
    initialized.value = true
    notify('初始化成功')
    loadRecords()
  } catch (e) {
    notify('初始化失败: ' + String(e))
  }
}

// ============ 年月 ============
const now = new Date()
const currentYearMonth = computed(() => {
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  return `${y}${m}`
})

const months: string[] = []
for (let i = 0; i < 12; i++) {
  const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  months.push(`${y}${m}`)
}

// ============ 加载 ============
const filteredRecords = computed(() => {
  if (!searchQuery.value.trim()) return groupedDays.value
  const q = searchQuery.value.trim().toLowerCase()
  return groupedDays.value
    .map(g => ({
      dateKey: g.dateKey,
      records: g.records.filter(r =>
        r.note.toLowerCase().includes(q) ||
        r.studentName.toLowerCase().includes(q) ||
        r.courseName.toLowerCase().includes(q)
      )
    }))
    .filter(g => g.records.length > 0)
})

async function loadRecords(): Promise<void> {
  if (!initialized.value) return
  loading.value = true
  try {
    const ym = yearMonth.value || currentYearMonth.value
    if (!yearMonth.value) yearMonth.value = ym
    const days = await ipcClient.seentaoRecord.list(ym)
    const all: SeentaoRecord[] = []
    const grouped: { dateKey: string; records: SeentaoRecord[] }[] = []
    for (const day of days) {
      const sorted = (day.records || []).sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
      all.push(...sorted)
      grouped.push({ dateKey: day.date, records: sorted })
    }
    records.value = all
    groupedDays.value = grouped
  } catch (e) {
    notify('加载失败: ' + String(e))
  } finally {
    loading.value = false
  }
}

watch(yearMonth, () => loadRecords())

// ============ 新增记录 ============
function openAddModal(): void {
  formStudentName.value = ''
  formCourseName.value = ''
  formNote.value = ''
  formImages.value = []
  formImageNames.value = []
  showAddModal.value = true
}

function handlePaste(event: ClipboardEvent): void {
  const items = event.clipboardData?.items
  if (!items) return
  for (let i = 0; i < items.length; i++) {
    const item = items[i]
    if (item.type.startsWith('image/')) {
      const file = item.getAsFile()
      if (!file) continue
      const reader = new FileReader()
      reader.onload = () => {
        const base64 = reader.result as string
        formImages.value.push(base64)
        formImageNames.value.push(`截图 ${formImageNames.value.length + 1}`)
      }
      reader.readAsDataURL(file)
    }
  }
}

function removePastedImage(index: number): void {
  formImages.value.splice(index, 1)
  formImageNames.value.splice(index, 1)
}

async function saveRecord(): Promise<void> {
  if (!formNote.value.trim() && formImages.value.length === 0) {
    notify('请填写备注或粘贴截图')
    return
  }
  try {
    const ym = yearMonth.value || currentYearMonth.value

    // 逐张保存图片（单独 IPC 避免结构化克隆大体积数据失败）
    const savedImageFilenames: string[] = []
    for (const base64Data of formImages.value) {
      const filename = await ipcClient.seentaoRecord.saveImage(ym, base64Data)
      savedImageFilenames.push(filename)
    }

    const record = {
      studentName: formStudentName.value.trim(),
      courseName: formCourseName.value.trim(),
      note: formNote.value.trim(),
      images: savedImageFilenames,
      tags: undefined as string[] | undefined
    }
    await ipcClient.seentaoRecord.create(ym, record)
    showAddModal.value = false
    notify('记录已保存')
    loadRecords()
  } catch (e) {
    notify('保存失败: ' + String(e))
  }
}

// ============ 详情 ============
async function openDetail(rec: SeentaoRecord, ym: string, dk: string): Promise<void> {
  // 加载完整记录
  try {
    const full = await ipcClient.seentaoRecord.get(ym, dk, rec.id)
    if (full) {
      selectedRecord.value = full
    } else {
      selectedRecord.value = rec
    }
  } catch {
    selectedRecord.value = rec
  }
  detailYearMonth.value = ym
  detailDateKey.value = dk
  showDetailModal.value = true
}

async function deleteRecord(rec: SeentaoRecord): Promise<void> {
  if (!confirm('确定删除此记录？')) return
  try {
    await ipcClient.seentaoRecord.delete(
      detailYearMonth.value,
      detailDateKey.value,
      rec.id,
      rec.images
    )
    showDetailModal.value = false
    notify('已删除')
    loadRecords()
  } catch (e) {
    notify('删除失败: ' + String(e))
  }
}

async function loadImageBase64(ym: string, filename: string): Promise<string> {
  try {
    const result = await ipcClient.seentaoRecord.getImage(ym, filename)
    return result || ''
  } catch {
    return ''
  }
}

function viewImage(src: string): void {
  viewingImage.value = src
  showImageViewer.value = true
}

// ============ 复制图片 ============
function base64ToBlob(base64Src: string): Blob {
  const [header, base64] = base64Src.split(',')
  const mimeMatch = header.match(/data:(image\/\w+);base64/)
  const mime = mimeMatch ? mimeMatch[1] : 'image/png'
  const binaryStr = atob(base64)
  const bytes = new Uint8Array(binaryStr.length)
  for (let i = 0; i < binaryStr.length; i++) {
    bytes[i] = binaryStr.charCodeAt(i)
  }
  return new Blob([bytes], { type: mime })
}

async function copyImageToClipboard(base64Src: string): Promise<void> {
  try {
    const blob = base64ToBlob(base64Src)
    await navigator.clipboard.write([
      new ClipboardItem({ [blob.type]: blob })
    ])
    notify('图片已复制')
  } catch {
    notify('复制失败')
  }
}

// 初始化
onMounted(async () => {
  yearMonth.value = currentYearMonth.value
  // 尝试从持久化配置中恢复
  try {
    const savedConfig = await ipcClient.getToolData<{ storagePath?: string }>('seentao-record')
    if (savedConfig?.storagePath) {
      storagePath.value = savedConfig.storagePath
      await ipcClient.seentaoRecord.init(savedConfig.storagePath)
      initialized.value = true
      loadRecords()
    }
  } catch {
    // 无持久化配置，显示初始化引导
  }
})
</script>

<template>
  <div class="space-y-5">

    <!-- 通知 -->
    <Teleport to="body">
      <Transition name="fade">
        <div
          v-if="notification"
          class="fixed right-6 top-20 z-50 rounded-lg px-4 py-2.5 text-sm font-medium shadow-lg"
          :style="{ backgroundColor: '#10b981', color: '#fff' }"
        >
          {{ notification }}
        </div>
      </Transition>
    </Teleport>

    <!-- ===== 初始化引导 ===== -->
    <div v-if="!initialized" class="flex flex-col items-center justify-center py-16">
      <div
        class="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl"
        :style="{ backgroundColor: 'rgba(249,115,22,0.15)', color: '#f97316' }"
      >
        <UIcon name="i-heroicons-academic-cap" size="40" />
      </div>
      <h2 class="mb-2 text-xl font-bold" :style="{ color: 'var(--text-primary)' }">新道云刷课记录</h2>
      <p class="mb-8 text-sm" :style="{ color: 'var(--text-secondary)' }">Seentao Record — 首次使用需要设置数据存储路径</p>
      <div class="w-full max-w-md space-y-4">
        <div>
          <label class="mb-1.5 block text-xs font-medium" :style="{ color: 'var(--text-muted)' }">数据存储目录</label>
          <div class="flex gap-2">
            <input
              v-model="storagePath"
              readonly
              placeholder="点击「选择目录」按钮..."
              class="flex-1 cursor-pointer rounded-lg border px-4 py-2.5 text-sm font-mono outline-none"
              :style="{ backgroundColor: 'var(--bg-base)', borderColor: 'var(--border)', color: 'var(--text-primary)' }"
              @click="selectDirectory"
            />
            <button
              class="flex shrink-0 cursor-pointer items-center gap-1.5 rounded-lg px-4 py-2.5 text-sm font-medium transition-all hover:opacity-90"
              :style="{ backgroundColor: '#f97316', color: '#fff' }"
              @click="selectDirectory"
            >
              <UIcon name="i-heroicons-folder" size="16" />
              选择目录
            </button>
          </div>
          <p class="mt-1.5 text-xs" :style="{ color: 'var(--text-muted)' }">请选择一个空目录或已有数据目录</p>
        </div>
        <button
          class="w-full cursor-pointer rounded-lg px-4 py-2.5 text-sm font-medium transition-all hover:opacity-90"
          :style="{ backgroundColor: '#f97316', color: '#fff' }"
          @click="initStorage"
        >确认并初始化</button>
      </div>
    </div>

    <!-- ===== 主界面 ===== -->
    <div v-else>
      <!-- 工具栏 -->
      <div class="flex items-center justify-between gap-4">
        <div class="flex items-center gap-3">
          <button
            class="flex cursor-pointer items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-all hover:opacity-90"
            :style="{ backgroundColor: '#f97316', color: '#fff' }"
            @click="openAddModal"
          >
            <UIcon name="i-heroicons-plus" size="16" />
            新增记录
          </button>
          <div class="relative">
            <UIcon
              name="i-heroicons-magnifying-glass"
              size="14"
              class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2"
              :style="{ color: 'var(--text-muted)' }"
            />
            <input
              v-model="searchQuery"
              placeholder="搜索备注/学员/课程..."
              class="w-56 rounded-lg border py-2 pl-9 pr-3 text-xs outline-none transition-all"
              :style="{ backgroundColor: 'var(--bg-base)', borderColor: 'var(--border)', color: 'var(--text-primary)' }"
            />
          </div>
        </div>
        <div class="flex items-center gap-2">
          <label class="text-xs" :style="{ color: 'var(--text-muted)' }">月份：</label>
          <select
            v-model="yearMonth"
            class="cursor-pointer rounded-lg border px-3 py-2 text-xs outline-none"
            :style="{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)', color: 'var(--text-primary)' }"
          >
            <option v-for="m in months" :key="m" :value="m">
              {{ m.slice(0, 4) }} 年 {{ m.slice(4, 6) }} 月
            </option>
          </select>
        </div>
      </div>

      <!-- 加载状态 -->
      <div v-if="loading" class="flex items-center justify-center py-12">
        <div class="flex items-center gap-2 text-sm" :style="{ color: 'var(--text-secondary)' }">
          <UIcon name="i-heroicons-arrow-path" size="16" class="animate-spin" />
          加载中...
        </div>
      </div>

      <!-- 空状态 -->
      <div v-else-if="filteredRecords.length === 0" class="flex flex-col items-center justify-center py-16">
        <UIcon name="i-heroicons-document-text" size="40" :style="{ color: 'var(--text-muted)' }" />
        <p class="mt-3 text-sm" :style="{ color: 'var(--text-muted)' }">
          {{ searchQuery ? '未找到匹配的记录' : '暂无记录，点击「新增记录」开始' }}
        </p>
      </div>

      <!-- 记录列表 -->
      <div v-else class="space-y-4">
        <div v-for="group in filteredRecords" :key="group.dateKey">
          <div class="mb-2 flex items-center gap-2">
            <div class="h-1 flex-1 rounded" :style="{ backgroundColor: 'var(--border)' }" />
            <span class="shrink-0 text-xs font-medium" :style="{ color: 'var(--text-secondary)' }">
              {{ yearMonth.slice(4, 6) }} 月 {{ group.dateKey }} 日
            </span>
            <div class="h-1 flex-1 rounded" :style="{ backgroundColor: 'var(--border)' }" />
          </div>

          <div class="grid gap-3">
            <div
              v-for="rec in group.records"
              :key="rec.id"
              class="group cursor-pointer rounded-xl border p-4 transition-all hover:border-[#f97316]"
              :style="{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }"
              @click="openDetail(rec, yearMonth, group.dateKey)"
            >
              <div class="flex items-start justify-between gap-4">
                <div class="min-w-0 flex-1">
                  <div class="mb-1 flex items-center gap-2">
                    <span class="text-xs font-mono" :style="{ color: 'var(--text-muted)' }">
                      {{ new Date(rec.createdAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }) }}
                    </span>
                    <span
                      v-if="rec.studentName"
                      class="rounded-full px-2 py-0.5 text-[11px] font-medium"
                      :style="{ backgroundColor: 'rgba(249,115,22,0.1)', color: '#f97316' }"
                    >{{ rec.studentName }}</span>
                    <span
                      v-if="rec.courseName"
                      class="rounded-full px-2 py-0.5 text-[11px] font-medium"
                      :style="{ backgroundColor: 'rgba(99,102,241,0.1)', color: '#6366f1' }"
                    >{{ rec.courseName }}</span>
                  </div>
                  <p class="text-sm leading-relaxed line-clamp-2" :style="{ color: 'var(--text-primary)' }">
                    {{ rec.note || '(无备注)' }}
                  </p>
                </div>

                <!-- 缩略图 & 操作 -->
                <div class="flex shrink-0 items-start gap-2">
                  <div v-if="rec.images.length > 0" class="flex gap-1">
                    <div
                      v-for="img in rec.images.slice(0, 3)"
                      :key="img"
                      class="h-12 w-12 overflow-hidden rounded-lg border"
                      :style="{ borderColor: 'var(--border)' }"
                    >
                      <AsyncImageLoader
                        :ym="yearMonth"
                        :filename="img"
                        class="h-full w-full object-cover"
                      />
                    </div>
                    <span
                      v-if="rec.images.length > 3"
                      class="flex h-12 w-12 items-center justify-center rounded-lg border text-xs font-medium"
                      :style="{ borderColor: 'var(--border)', color: 'var(--text-muted)' }"
                    >+{{ rec.images.length - 3 }}</span>
                  </div>

                  <!-- 单图快速复制 -->
                  <button
                    v-if="rec.images.length === 1"
                    class="flex h-7 w-7 cursor-pointer items-center justify-center rounded text-sm opacity-0 transition-all group-hover:opacity-100"
                    :style="{ color: 'var(--text-muted)' }"
                    title="复制图片"
                    @click.stop="(async () => {
                      const src = await loadImageBase64(yearMonth, rec.images[0])
                      if (src) await copyImageToClipboard(src)
                    })()"
                  >
                    <UIcon name="i-heroicons-document-duplicate" size="14" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ===== 新增记录弹窗 ===== -->
    <Teleport to="body">
      <Transition name="modal">
        <div
          v-if="showAddModal"
          class="fixed inset-0 z-40 flex items-center justify-center"
          :style="{ backgroundColor: 'rgba(0,0,0,0.5)' }"
          @click.self="showAddModal = false"
        >
          <div
            class="mx-4 w-full max-w-lg rounded-xl border shadow-2xl"
            :style="{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }"
          >
            <div
              class="flex items-center justify-between border-b px-5 py-4"
              :style="{ borderColor: 'var(--border)' }"
            >
              <h3 class="text-sm font-semibold" :style="{ color: 'var(--text-primary)' }">新增刷课记录</h3>
              <button
                class="flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg text-sm transition-colors"
                :style="{ color: 'var(--text-muted)' }"
                @click="showAddModal = false"
              >✕</button>
            </div>
            <div class="space-y-4 p-5">
              <div class="flex gap-3">
                <div class="flex-1">
                  <label class="mb-1 block text-xs" :style="{ color: 'var(--text-muted)' }">学员名</label>
                  <input
                    v-model="formStudentName"
                    placeholder="可选"
                    class="w-full rounded-lg border px-3 py-2 text-sm outline-none"
                    :style="{ backgroundColor: 'var(--bg-base)', borderColor: 'var(--border)', color: 'var(--text-primary)' }"
                  />
                </div>
                <div class="flex-1">
                  <label class="mb-1 block text-xs" :style="{ color: 'var(--text-muted)' }">课程名称</label>
                  <input
                    v-model="formCourseName"
                    placeholder="可选"
                    class="w-full rounded-lg border px-3 py-2 text-sm outline-none"
                    :style="{ backgroundColor: 'var(--bg-base)', borderColor: 'var(--border)', color: 'var(--text-primary)' }"
                  />
                </div>
              </div>
              <div>
                <label class="mb-1 block text-xs" :style="{ color: 'var(--text-muted)' }">备注</label>
                <textarea
                  v-model="formNote"
                  rows="4"
                  placeholder="输入刷课备注..."
                  class="w-full resize-none rounded-lg border px-3 py-2 text-sm outline-none"
                  :style="{ backgroundColor: 'var(--bg-base)', borderColor: 'var(--border)', color: 'var(--text-primary)' }"
                  @paste="handlePaste"
                ></textarea>
                <p class="mt-1 text-xs" :style="{ color: 'var(--text-muted)' }">在备注框中 Ctrl+V 粘贴截图</p>
              </div>

              <!-- 粘贴的图片预览 -->
              <div v-if="formImages.length > 0" class="space-y-2">
                <label class="text-xs font-medium" :style="{ color: 'var(--text-secondary)' }">
                  截图（{{ formImages.length }} 张）
                </label>
                <div class="flex flex-wrap gap-2">
                  <div
                    v-for="(img, idx) in formImages"
                    :key="idx"
                    class="group relative h-20 w-20 overflow-hidden rounded-lg border"
                    :style="{ borderColor: 'var(--border)' }"
                  >
                    <img :src="img" class="h-full w-full object-cover" alt="截图预览" />
                    <button
                      class="absolute right-1 top-1 flex h-5 w-5 cursor-pointer items-center justify-center rounded-full text-xs opacity-0 transition-all group-hover:opacity-100"
                      :style="{ backgroundColor: 'rgba(239,68,68,0.9)', color: '#fff' }"
                      @click="removePastedImage(idx)"
                    >✕</button>
                  </div>
                </div>
              </div>
            </div>
            <div
              class="flex justify-end gap-2 border-t px-5 py-3"
              :style="{ borderColor: 'var(--border)' }"
            >
              <button
                class="cursor-pointer rounded-lg px-4 py-2 text-xs font-medium transition-all"
                :style="{ color: 'var(--text-secondary)' }"
                @click="showAddModal = false"
              >取消</button>
              <button
                class="cursor-pointer rounded-lg px-4 py-2 text-xs font-medium transition-all hover:opacity-90"
                :style="{ backgroundColor: '#f97316', color: '#fff' }"
                @click="saveRecord"
              >保存记录</button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- ===== 记录详情弹窗 ===== -->
    <Teleport to="body">
      <Transition name="modal">
        <div
          v-if="showDetailModal && selectedRecord"
          class="fixed inset-0 z-40 flex items-center justify-center"
          :style="{ backgroundColor: 'rgba(0,0,0,0.5)' }"
          @click.self="showDetailModal = false"
        >
          <div
            class="mx-4 flex max-h-[80vh] w-full max-w-xl flex-col rounded-xl border shadow-2xl"
            :style="{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }"
          >
            <div
              class="flex items-center justify-between border-b px-5 py-4 shrink-0"
              :style="{ borderColor: 'var(--border)' }"
            >
              <h3 class="text-sm font-semibold" :style="{ color: 'var(--text-primary)' }">记录详情</h3>
              <button
                class="flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg text-sm transition-colors"
                :style="{ color: 'var(--text-muted)' }"
                @click="showDetailModal = false"
              >✕</button>
            </div>
            <div class="flex-1 overflow-y-auto p-5 space-y-4">
              <!-- 元信息 -->
              <div class="flex flex-wrap items-center gap-2">
                <span class="text-xs font-mono" :style="{ color: 'var(--text-muted)' }">
                  {{ new Date(selectedRecord.createdAt).toLocaleString('zh-CN') }}
                </span>
                <span
                  v-if="selectedRecord.studentName"
                  class="rounded-full px-2.5 py-0.5 text-[11px] font-medium"
                  :style="{ backgroundColor: 'rgba(249,115,22,0.1)', color: '#f97316' }"
                >{{ selectedRecord.studentName }}</span>
                <span
                  v-if="selectedRecord.courseName"
                  class="rounded-full px-2.5 py-0.5 text-[11px] font-medium"
                  :style="{ backgroundColor: 'rgba(99,102,241,0.1)', color: '#6366f1' }"
                >{{ selectedRecord.courseName }}</span>
              </div>

              <!-- 备注 -->
              <div>
                <label class="mb-1.5 block text-xs font-medium" :style="{ color: 'var(--text-muted)' }">备注内容</label>
                <p class="rounded-lg border p-3 text-sm leading-relaxed whitespace-pre-wrap"
                  :style="{ backgroundColor: 'var(--bg-base)', borderColor: 'var(--border)', color: 'var(--text-primary)' }"
                >{{ selectedRecord.note || '(无备注)' }}</p>
              </div>

              <!-- 图片网格 -->
              <div v-if="selectedRecord.images.length > 0">
                <label class="mb-2 block text-xs font-medium" :style="{ color: 'var(--text-muted)' }">
                  截图（{{ selectedRecord.images.length }} 张）
                </label>
                <div class="grid grid-cols-3 gap-3">
                  <div
                    v-for="imgFile in selectedRecord.images"
                    :key="imgFile"
                    class="group relative overflow-hidden rounded-lg border cursor-pointer"
                    :style="{ borderColor: 'var(--border)' }"
                  >
                    <AsyncImageLoader
                      :ym="detailYearMonth"
                      :filename="imgFile"
                      class="h-24 w-full object-cover transition-transform group-hover:scale-105"
                      @click="(async () => {
                        const src = await loadImageBase64(detailYearMonth, imgFile)
                        if (src) viewImage(src)
                      })()"
                    />
                    <button
                      class="absolute right-1.5 top-1.5 flex h-6 w-6 cursor-pointer items-center justify-center rounded text-xs opacity-0 transition-all group-hover:opacity-100"
                      :style="{ backgroundColor: 'rgba(0,0,0,0.6)', color: '#fff' }"
                      title="复制图片"
                      @click.stop="(async () => {
                        const src = await loadImageBase64(detailYearMonth, imgFile)
                        if (src) await copyImageToClipboard(src)
                      })()"
                    >
                      <UIcon name="i-heroicons-document-duplicate" size="12" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
            <div
              class="flex justify-between border-t px-5 py-3 shrink-0"
              :style="{ borderColor: 'var(--border)' }"
            >
              <button
                class="cursor-pointer rounded-lg px-4 py-2 text-xs font-medium transition-all"
                :style="{ color: '#ef4444' }"
                @click="deleteRecord(selectedRecord)"
              >删除记录</button>
              <button
                class="cursor-pointer rounded-lg px-4 py-2 text-xs font-medium transition-all"
                :style="{ color: 'var(--text-secondary)' }"
                @click="showDetailModal = false"
              >关闭</button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- ===== 大图查看 ===== -->
    <Teleport to="body">
      <Transition name="modal">
        <div
          v-if="showImageViewer"
          class="fixed inset-0 z-50 flex items-center justify-center"
          :style="{ backgroundColor: 'rgba(0,0,0,0.85)' }"
          @click.self="showImageViewer = false"
        >
          <div class="relative max-h-[90vh] max-w-[90vw]">
            <img
              :src="viewingImage"
              class="max-h-[85vh] max-w-[85vw] rounded-lg object-contain"
              alt="大图预览"
            />
            <div class="absolute -top-10 right-0 flex gap-2">
              <button
                class="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-sm transition-colors"
                :style="{ backgroundColor: 'rgba(255,255,255,0.15)', color: '#fff' }"
                title="复制图片"
                @click="copyImageToClipboard(viewingImage)"
              >
                <UIcon name="i-heroicons-document-duplicate" size="14" />
              </button>
              <button
                class="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-sm"
                :style="{ backgroundColor: 'rgba(255,255,255,0.15)', color: '#fff' }"
                @click="showImageViewer = false"
              >✕</button>
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
.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-active > div,
.modal-leave-active > div {
  transition: transform 0.2s ease;
}
.modal-enter-from > div,
.modal-leave-to > div {
  transform: scale(0.95);
}

.animate-spin {
  animation: spin 1s linear infinite;
}
@keyframes spin {
  to { transform: rotate(360deg); }
}

select {
  appearance: auto;
  -webkit-appearance: auto;
}
</style>
