<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { ipcClient } from '../../ipc/client'
import type {
  HarFile,
  HarEntry,
  HarViewerData,
  HarNameValue
} from '../../../../shared/types/har-viewer'
import type { JsonTreeNode } from '../../../../shared/types/json-formatter'
import JsonTreeNodeComp from '../../components/tools/json-tree-node.vue'

// ——— 状态 ———
const files = ref<HarFile[]>([])
const activeId = ref('')
const search = ref('')
const statusFilter = ref('all')
const deepSearch = ref(false)
const currentTab = ref<'overview' | 'request' | 'response' | 'requestbody' | 'responsebody' | 'timing'>('overview')
const selectedEntryId = ref<string | null>(null)
const copied = ref(false)
const toast = ref<{ message: string; type: 'success' | 'error' } | null>(null)

let toastTimer: ReturnType<typeof setTimeout> | null = null
let copiedTimer: ReturnType<typeof setTimeout> | null = null

const activeFile = computed(() => files.value.find((f) => f.id === activeId.value))
const selectedEntry = computed(() => {
  const f = activeFile.value
  if (!f || !selectedEntryId.value) return null
  return f.entries.find((e) => e._id === selectedEntryId.value) || null
})

// ——— 持久化 ———
function persist(): void {
  try {
    const data: HarViewerData = {
      sessions: files.value.map((f) => ({
        id: f.id,
        name: f.name,
        path: f.path,
        entryCount: f.entries.length,
        createdAt: f.openedAt,
        updatedAt: f.openedAt
      })),
      activeId: activeId.value
    }
    ipcClient.setToolData<HarViewerData>('har-viewer', data)
  } catch (e) {
    console.error('[har-viewer] persist failed:', e)
  }
}

function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`
}

function load(): void {
  ipcClient.getToolData<HarViewerData | null>('har-viewer').then(async (data) => {
    const sessions = data && Array.isArray(data.sessions) ? data.sessions : []
    // 按持久化的 path 重新读取文件内容，启动时恢复会话
    const restored: HarFile[] = []
    for (const s of sessions) {
      if (s.path) {
        const f = await readByPath(s.path)
        if (f) restored.push(f)
      }
    }
    if (restored.length === 0) {
      // 首次使用：内置一个示例 HAR
      const demo = buildDemoFile()
      restored.push(demo)
    }
    files.value = restored
    activeId.value = restored.some((f) => f.id === data?.activeId) ? data!.activeId : restored[0].id
    persist()
  })
}

async function readByPath(filePath: string): Promise<HarFile | null> {
  try {
    const content = await ipcClient.harViewer.readFile(filePath)
    if (content == null) return null
    return parseHar(content, filePath)
  } catch {
    return null
  }
}

// ——— HAR 解析 ———
function parseHar(content: string, filePath: string, name?: string): HarFile {
  const data: unknown = JSON.parse(content)
  const log = (data as { log?: { entries?: unknown[] } }).log
  const raw = Array.isArray(log?.entries) ? log.entries : []
  const entries: HarEntry[] = raw.map((it) => normalizeEntry(it))
  return {
    id: generateId('har'),
    name: name || filePath.split(/[\\/]/).pop() || 'HAR',
    path: filePath,
    entries,
    openedAt: Date.now()
  }
}

function normalizeEntry(raw: unknown): HarEntry {
  const it = raw as Record<string, unknown>
  const request = (it.request || {}) as Record<string, unknown>
  const response = (it.response || {}) as Record<string, unknown>
  const content = (response.content || {}) as Record<string, unknown>
  const timings = (it.timings || {}) as Record<string, unknown>
  return {
    _id: generateId('e'),
    startedDateTime: typeof it.startedDateTime === 'string' ? it.startedDateTime : undefined,
    time: typeof it.time === 'number' ? it.time : undefined,
    request: {
      method: String(request.method || 'GET'),
      url: String(request.url || ''),
      httpVersion: typeof request.httpVersion === 'string' ? request.httpVersion : undefined,
      headers: toNameValues(request.headers),
      queryString: toNameValues(request.queryString),
      cookies: toNameValues(request.cookies),
      headersSize: toNumber(request.headersSize),
      bodySize: toNumber(request.bodySize),
      postData: toPostData(request.postData)
    },
    response: {
      status: toNumber(response.status) ?? 0,
      statusText: typeof response.statusText === 'string' ? response.statusText : undefined,
      httpVersion: typeof response.httpVersion === 'string' ? response.httpVersion : undefined,
      headers: toNameValues(response.headers),
      cookies: toNameValues(response.cookies),
      redirectURL: typeof response.redirectURL === 'string' ? response.redirectURL : undefined,
      headersSize: toNumber(response.headersSize),
      bodySize: toNumber(response.bodySize),
      content: {
        size: toNumber(content.size),
        mimeType: typeof content.mimeType === 'string' ? content.mimeType : undefined,
        text: typeof content.text === 'string' ? content.text : undefined,
        encoding: typeof content.encoding === 'string' ? content.encoding : undefined
      }
    },
    timings: {
      blocked: toNumber(timings.blocked),
      dns: toNumber(timings.dns),
      connect: toNumber(timings.connect),
      send: toNumber(timings.send),
      wait: toNumber(timings.wait),
      receive: toNumber(timings.receive),
      ssl: toNumber(timings.ssl)
    }
  }
}

function toNumber(v: unknown): number | undefined {
  return typeof v === 'number' && isFinite(v) ? v : undefined
}

function toNameValues(v: unknown): HarNameValue[] | undefined {
  if (!Array.isArray(v)) return undefined
  return v
    .filter((x) => x && typeof x === 'object')
    .map((x) => {
      const o = x as Record<string, unknown>
      return { name: String(o.name ?? ''), value: String(o.value ?? '') }
    })
    .filter((x) => x.name !== '')
}

function toPostData(v: unknown): HarRequest_postData | undefined {
  if (!v || typeof v !== 'object') return undefined
  const o = v as Record<string, unknown>
  return {
    mimeType: typeof o.mimeType === 'string' ? o.mimeType : undefined,
    text: typeof o.text === 'string' ? o.text : undefined
  }
}

// ——— 打开文件 ———
async function openFiles(): Promise<void> {
  const res = await ipcClient.harViewer.openFiles()
  if (res.canceled || !res.files || res.files.length === 0) return
  let added = 0
  for (const file of res.files) {
    // 已存在相同路径则跳过
    if (files.value.some((f) => f.path === file.path)) continue
    try {
      const f = parseHar(file.content, file.path, file.name)
      files.value.push(f)
      activeId.value = f.id
      added++
    } catch {
      showToast(`解析失败: ${file.name}`, 'error')
    }
  }
  if (added > 0) {
    selectedEntryId.value = null
    currentTab.value = 'overview'
    persist()
    showToast(`已打开 ${added} 个文件`)
  }
}

function removeFile(id: string): void {
  if (files.value.length <= 1) {
    showToast('至少保留一个文件', 'error')
    return
  }
  files.value = files.value.filter((f) => f.id !== id)
  if (activeId.value === id) {
    activeId.value = files.value[0].id
    selectedEntryId.value = null
  }
  persist()
  showToast('文件已移除')
}

function switchFile(id: string): void {
  if (activeId.value === id) return
  activeId.value = id
  selectedEntryId.value = null
  currentTab.value = 'overview'
  persist()
}

// ——— 表格计算 ———
const filteredEntries = computed<HarEntry[]>(() => {
  const f = activeFile.value
  if (!f) return []
  const kw = search.value.trim().toLowerCase()
  const st = statusFilter.value
  return f.entries.filter((e) => {
    if (st !== 'all') {
      const first = String(e.response.status).charAt(0)
      if (st !== first || !first) return false
    }
    if (!kw) return true
    return entrySearchText(e).includes(kw)
  })
})

function entrySearchText(e: HarEntry): string {
  const parts: string[] = [
    e.request.method,
    String(e.response.status),
    (e.request.url || '').toLowerCase()
  ]
  if (deepSearch.value) {
    if (e.request.headers) {
      for (const h of e.request.headers) parts.push(`${h.name}:${h.value}`.toLowerCase())
    }
    if (e.request.queryString) {
      for (const q of e.request.queryString) parts.push(`${q.name}:${q.value}`.toLowerCase())
    }
    if (e.request.postData?.text) parts.push(e.request.postData.text.toLowerCase())
    if (e.response.headers) {
      for (const h of e.response.headers) parts.push(`${h.name}:${h.value}`.toLowerCase())
    }
    if (e.response.content?.text) parts.push(e.response.content.text.toLowerCase())
  }
  return parts.join('\n')
}

const maxTime = computed(() => {
  const arr = filteredEntries.value
  if (arr.length === 0) return 0
  return Math.max(...arr.map((e) => (typeof e.time === 'number' ? e.time : 0) || 0))
})

const summary = computed(() => {
  const f = activeFile.value
  if (!f) return { total: 0, c2: 0, c3: 0, c4: 0, c5: 0, avg: 0, size: 0 }
  let c2 = 0, c3 = 0, c4 = 0, c5 = 0, totalTime = 0, timeCount = 0, size = 0
  for (const e of f.entries) {
    const s = String(e.response.status)
    if (s.startsWith('2')) c2++
    else if (s.startsWith('3')) c3++
    else if (s.startsWith('4')) c4++
    else if (s.startsWith('5')) c5++
    if (typeof e.time === 'number') {
      totalTime += e.time
      timeCount++
    }
    size += (e.response.bodySize || 0) + (e.response.headersSize || 0)
  }
  return { total: f.entries.length, c2, c3, c4, c5, avg: timeCount ? totalTime / timeCount : 0, size }
})

function timePct(time: number): number {
  const m = maxTime.value
  if (!m) return 4
  return Math.max(4, Math.round((time || 0) / m * 100))
}

// ——— 选中 ———
function selectEntry(id: string): void {
  selectedEntryId.value = id
  currentTab.value = 'overview'
}

function switchTab(tab: typeof currentTab.value): void {
  currentTab.value = tab
}

// ——— 详情辅助 ———
function splitUrl(url: string): { domain: string; path: string } {
  try {
    const u = new URL(url)
    return { domain: u.host, path: u.pathname + u.search }
  } catch {
    return { domain: '', path: url || '' }
  }
}

function statusClass(status: number): string {
  const s = String(status)
  if (s.startsWith('2')) return 'success'
  if (s.startsWith('3')) return 'info'
  if (s.startsWith('4')) return 'warn'
  if (s.startsWith('5')) return 'error'
  return 'muted'
}

function methodClass(method: string): string {
  const m = method.toUpperCase()
  if (m === 'GET') return 'get'
  if (m === 'POST') return 'post'
  if (m === 'PUT') return 'put'
  if (m === 'PATCH') return 'patch'
  if (m === 'DELETE') return 'delete'
  if (m === 'OPTIONS') return 'options'
  return 'other'
}

function extFromMime(mime?: string): string {
  if (!mime) return ''
  if (mime.includes('json')) return 'JSON'
  if (mime.includes('html')) return 'HTML'
  if (mime.includes('javascript') || mime.includes('ecmascript')) return 'JS'
  if (mime.includes('css')) return 'CSS'
  if (mime.includes('image/')) return 'IMG'
  const p = mime.split('/')[1]
  return p ? p.toUpperCase() : ''
}

function fmtBytes(n: number): string {
  if (!n || n < 0) return '0 B'
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / 1024 / 1024).toFixed(2)} MB`
}

// ——— 耗时瀑布 ———
const TIMING_DEFS: { key: 'blocked' | 'dns' | 'connect' | 'ssl' | 'send' | 'wait' | 'receive'; label: string; color: string }[] = [
  { key: 'send', label: '发送', color: '#10b981' },
  { key: 'wait', label: '等待', color: '#8b5cf6' },
  { key: 'receive', label: '接收', color: '#06b6d4' },
  { key: 'ssl', label: 'SSL', color: '#f59e0b' },
  { key: 'connect', label: '连接', color: '#ec4899' },
  { key: 'dns', label: 'DNS', color: '#6366f1' },
  { key: 'blocked', label: '阻塞', color: '#94a3b8' }
]

const timingModel = computed(() => {
  const e = selectedEntry.value
  if (!e) return null
  const t = e.timings || {}
  const rows = TIMING_DEFS.map((d) => ({ ...d, ms: typeof t[d.key] === 'number' ? t[d.key]! : 0 }))
  const total = rows.reduce((s, r) => s + r.ms, 0) || e.time || 0
  return { total, rows }
})

// ——— 请求/响应体（纯文本展示，可选中复制） ———
function reqBodyText(e: HarEntry): string {
  const text = e.request.postData?.text
  if (!text) return ''
  try {
    const obj: unknown = JSON.parse(text)
    return JSON.stringify(obj, null, 2)
  } catch {
    return text
  }
}

function respBodyText(e: HarEntry): string {
  const c = e.response.content
  const mime = c?.mimeType || ''
  let text = c?.text || ''
  if (c?.encoding === 'base64') {
    try {
      text = atob(text)
    } catch {
      text = '(无法解码 base64 内容)'
    }
  }
  if (!text) return ''
  const m = mime.toLowerCase()
  if (m.includes('json') || m.includes('javascript') || text.trim().startsWith('{') || text.trim().startsWith('[')) {
    try {
      const obj: unknown = JSON.parse(text)
      return JSON.stringify(obj, null, 2)
    } catch {
      return text
    }
  }
  return text
}

const requestBody = computed(() => (selectedEntry.value ? reqBodyText(selectedEntry.value) : ''))
const responseBody = computed(() => {
  const e = selectedEntry.value
  if (!e) return { text: '', mime: '' }
  return { text: respBodyText(e), mime: e.response.content?.mimeType || '纯文本' }
})

// 判断展示的文本是否为 JSON
const requestBodyIsJson = computed(() => {
  const t = requestBody.value
  if (!t) return false
  try {
    JSON.parse(t)
    return true
  } catch {
    return false
  }
})
const responseBodyIsJson = computed(() => {
  try {
    JSON.parse(responseBody.value.text)
    return true
  } catch {
    return false
  }
})

// 构建可折叠的 JSON 树（套用 json-formatter 的树组件）
function buildTree(value: unknown, key: string | null): JsonTreeNode {
  if (value === null) {
    return { key, type: 'null', text: 'null', expanded: false }
  }
  if (Array.isArray(value)) {
    return {
      key,
      type: 'array',
      text: '',
      expanded: true,
      children: value.map((v, i) => buildTree(v, String(i)))
    }
  }
  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>
    return {
      key,
      type: 'object',
      text: '',
      expanded: true,
      children: Object.keys(obj).map((k) => buildTree(obj[k], k))
    }
  }
  const text = typeof value === 'string' ? JSON.stringify(value) : String(value)
  return {
    key,
    type: typeof value as 'string' | 'number' | 'boolean',
    text,
    expanded: false
  }
}

const requestBodyRoot = computed<JsonTreeNode | null>(() =>
  requestBodyIsJson.value ? buildTree(JSON.parse(requestBody.value as string), null) : null
)
const responseBodyRoot = computed<JsonTreeNode | null>(() =>
  responseBodyIsJson.value ? buildTree(JSON.parse(responseBody.value.text), null) : null
)

// ——— 复制 ———
async function copyText(text: string): Promise<void> {
  if (!text) {
    showToast('没有可复制的内容', 'error')
    return
  }
  try {
    await navigator.clipboard.writeText(text)
    copied.value = true
    if (copiedTimer) clearTimeout(copiedTimer)
    copiedTimer = setTimeout(() => (copied.value = false), 1500)
    showToast('已复制到剪贴板')
  } catch {
    showToast('复制失败', 'error')
  }
}

// ——— 导出 ———
async function exportHar(): Promise<void> {
  const f = activeFile.value
  if (!f) return
  const log: Record<string, unknown> = {}
  const stripped = f.entries.map((e) => {
    const copy: Record<string, unknown> = { ...e } as unknown as Record<string, unknown>
    delete copy._id
    return copy
  })
  log.log = { version: '1.2', creator: { name: 'DevToolbox HAR Viewer', version: '1.0' }, entries: stripped }
  try {
    const res = await ipcClient.jsonFormatter.saveFile({
      defaultName: f.name.replace(/\.(har|json)$/i, '') + '.har',
      content: JSON.stringify(log, null, 2)
    })
    if (res.ok) showToast('导出成功')
    else if (!res.canceled) showToast('导出失败', 'error')
  } catch {
    showToast('导出失败', 'error')
  }
}

// ——— 示例数据 ———
function buildDemoFile(): HarFile {
  const raw = [
    {
      startedDateTime: '2026-08-27T03:00:00+08:00',
      time: 236,
      request: {
        method: 'GET',
        url: 'https://api.example.com/v1/users?page=1',
        httpVersion: 'HTTP/1.1',
        headers: [{ name: 'Accept', value: 'application/json' }],
        queryString: [{ name: 'page', value: '1' }]
      },
      response: {
        status: 200,
        statusText: 'OK',
        httpVersion: 'HTTP/1.1',
        headers: [{ name: 'Content-Type', value: 'application/json; charset=utf-8' }],
        content: { mimeType: 'application/json', text: JSON.stringify({ code: 0, data: [{ id: 1, name: 'HAR 查看' }], success: true }) }
      },
      timings: { blocked: 10, dns: 22, connect: 48, ssl: 20, send: 6, wait: 132, receive: 18 }
    },
    {
      startedDateTime: '2026-08-27T03:00:01+08:00',
      time: 512,
      request: {
        method: 'POST',
        url: 'https://api.example.com/v1/query',
        httpVersion: 'HTTP/1.1',
        headers: [{ name: 'Content-Type', value: 'application/json' }],
        postData: { mimeType: 'application/json', text: JSON.stringify({ keyword: 'success' }) }
      },
      response: {
        status: 200,
        statusText: 'OK',
        httpVersion: 'HTTP/1.1',
        headers: [{ name: 'Content-Type', value: 'application/json; charset=utf-8' }],
        content: { mimeType: 'application/json', text: JSON.stringify({ success: true, total: 42 }) }
      },
      timings: { blocked: 5, dns: 30, connect: 90, ssl: 30, send: 20, wait: 300, receive: 67 }
    },
    {
      startedDateTime: '2026-08-27T03:00:02+08:00',
      time: 98,
      request: {
        method: 'GET',
        url: 'https://api.example.com/v1/ping',
        httpVersion: 'HTTP/1.1'
      },
      response: {
        status: 204,
        statusText: 'No Content',
        httpVersion: 'HTTP/1.1'
      },
      timings: { dns: 4, connect: 12, ssl: 6, send: 2, wait: 60, receive: 14 }
    }
  ]
  return parseHar(JSON.stringify({ log: { entries: raw } }), 'demo.har', '示例 HAR')
}

// ——— 通用 ———
// 详情面板高度（可拖动调整）
const detailHeight = ref(320)
let draggingResize = false
let resizeStartY = 0
let resizeStartH = 0

function startResize(e: MouseEvent): void {
  draggingResize = true
  resizeStartY = e.clientY
  resizeStartH = detailHeight.value
  document.body.style.userSelect = 'none'
  document.body.style.cursor = 'ns-resize'
  window.addEventListener('mousemove', onResize)
  window.addEventListener('mouseup', endResize)
}

function onResize(e: MouseEvent): void {
  if (!draggingResize) return
  const nh = resizeStartH + (resizeStartY - e.clientY)
  detailHeight.value = Math.min(Math.max(nh, 180), 720)
}

function endResize(): void {
  if (!draggingResize) return
  draggingResize = false
  document.body.style.userSelect = ''
  document.body.style.cursor = ''
  window.removeEventListener('mousemove', onResize)
  window.removeEventListener('mouseup', endResize)
}

function showToast(message: string, type: 'success' | 'error' = 'success'): void {
  toast.value = { message, type }
  if (toastTimer) clearTimeout(toastTimer)
  toastTimer = setTimeout(() => (toast.value = null), 2500)
}

onMounted(load)

onBeforeUnmount(() => {
  if (toastTimer) clearTimeout(toastTimer)
  if (copiedTimer) clearTimeout(copiedTimer)
  if (draggingResize) endResize()
})

// 局部类型（供 template 内使用）
type HarRequest_postData = { mimeType?: string; text?: string }
</script>

<style scoped>
.method-tag { --tw-text-opacity: 1; padding: 1px 7px; border-radius: 5px; font-size: 11px; font-weight: 600; }
.method-tag.get { background-color: #10b9811a; color: #10b981; }
.method-tag.post { background-color: #06b6d41a; color: #06b6d4; }
.method-tag.put { background-color: #8b5cf61a; color: #8b5cf6; }
.method-tag.patch { background-color: #f59e0b1a; color: #f59e0b; }
.method-tag.delete { background-color: #ef44441a; color: #ef4444; }
.method-tag.options { background-color: #64748b1a; color: #64748b; }
.method-tag.other { background-color: #64748b1a; color: #64748b; }

.status-pill { padding: 1px 8px; border-radius: 6px; font-size: 11px; font-weight: 600; font-family: monospace; }
.status-pill.success { background-color: #10b9811a; color: #10b981; }
.status-pill.info { background-color: #06b6d41a; color: #06b6d4; }
.status-pill.warn { background-color: #f59e0b1a; color: #f59e0b; }
.status-pill.error { background-color: #ef44441a; color: #ef4444; }
.status-pill.muted { background-color: #64748b1a; color: #94a3b8; }

.time-track { height: 6px; border-radius: 3px; background-color: var(--border); overflow: hidden; }
.time-fill { height: 100%; border-radius: 3px; background: linear-gradient(90deg, #06b6d4, #22d3ee); transition: width 0.3s ease; }
.code-block { margin: 0; white-space: pre-wrap; word-break: break-all; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12px; line-height: 1.6; color: var(--text-primary); }
.detail-row { display: flex; gap: 10px; }
.detail-row .lbl { flex-shrink: 0; width: 46px; text-align: right; color: var(--text-secondary); }
.timing-bar { height: 18px; border-radius: 4px; overflow: hidden; display: flex; background-color: var(--border); }
.timing-seg { height: 100%; transition: width 0.3s ease; }
.segment-title:hover { opacity: 0.92; }
</style>

<template>
  <div class="flex h-full min-h-0 flex-col overflow-hidden">
    <div class="flex min-h-0 flex-1 gap-4">
      <!-- ===== 文件列表面板 ===== -->
      <aside
        class="flex w-64 shrink-0 flex-col overflow-hidden rounded-xl border"
        :style="{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-card)' }"
      >
        <div class="border-b p-4" :style="{ borderColor: 'var(--border)' }">
          <h2
            class="mb-3 text-[11px] font-semibold uppercase tracking-wider"
            :style="{ color: 'var(--text-secondary)' }"
          >
            HAR 文件
          </h2>
          <button
            class="flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-dashed py-2 text-[13px] transition-all hover:border-[#06b6d4] hover:bg-[#06b6d405] hover:text-[#06b6d4]"
            :style="{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }"
            @click="openFiles"
          >
            <UIcon name="i-heroicons-folder-open" size="14" />
            打开文件…
          </button>
        </div>

        <div class="min-h-0 flex-1 space-y-1 overflow-y-auto p-2">
          <div
            v-for="f in files"
            :key="f.id"
            class="group flex cursor-pointer items-center gap-2.5 rounded-lg border px-2.5 py-2 transition-all"
            :class="f.id === activeId ? 'border-[#06b6d44d] bg-[#06b6d412]' : 'border-transparent'"
            @click="switchFile(f.id)"
          >
            <div
              class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
              :class="f.id === activeId ? 'bg-[#06b6d4] text-white' : 'bg-[#06b6d415] text-[#06b6d4]'"
            >
              <UIcon name="i-heroicons-wifi" size="15" />
            </div>
            <div class="min-w-0 flex-1">
              <div class="truncate text-[13px] font-medium" :style="{ color: 'var(--text-primary)' }">
                {{ f.name }}
              </div>
              <div class="text-[11px] opacity-70">{{ f.entries.length }} 个请求</div>
            </div>
            <button
              class="flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded opacity-0 transition-opacity hover:bg-[#ef444433] hover:text-[#ef4444] group-hover:opacity-100"
              title="移除"
              @click.stop="removeFile(f.id)"
            >
              <UIcon name="i-heroicons-x-mark" size="13" />
            </button>
          </div>
        </div>
      </aside>

      <!-- ===== 右侧主区 ===== -->
      <div class="flex min-w-0 flex-1 flex-col gap-4">
        <!-- 工具栏 -->
        <div
          class="flex flex-wrap items-center gap-2 rounded-xl border p-3"
          :style="{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-card)' }"
        >
          <div
            class="flex min-w-[220px] flex-1 items-center gap-2 rounded-lg border px-2.5 py-1.5"
            :style="{
              borderColor: deepSearch ? '#06b6d4' : 'var(--border)',
              backgroundColor: 'var(--bg-base)'
            }"
          >
            <UIcon name="i-heroicons-magnifying-glass" size="14" style="color: var(--text-muted)" />
            <input
              v-model="search"
              class="w-full min-w-0 bg-transparent text-[13px] outline-none"
              :style="{ color: 'var(--text-primary)' }"
              placeholder="搜索 URL / 方法 / 状态…"
            />
            <button
              v-if="search"
              class="flex h-5 w-5 cursor-pointer items-center justify-center rounded hover:bg-[rgba(255,255,255,0.08)]"
              @click="search = ''"
            >
              <UIcon name="i-heroicons-x-mark" size="12" style="color: var(--text-muted)" />
            </button>
          </div>

          <select
            v-model="statusFilter"
            class="cursor-pointer rounded-lg border px-2 py-1.5 text-xs outline-none"
            :style="{
              borderColor: 'var(--border)',
              backgroundColor: 'var(--bg-base)',
              color: 'var(--text-primary)'
            }"
          >
            <option value="all">全部状态</option>
            <option value="2">2xx</option>
            <option value="3">3xx</option>
            <option value="4">4xx</option>
            <option value="5">5xx</option>
          </select>

          <label
            class="flex cursor-pointer select-none items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors"
            :style="{
              borderColor: deepSearch ? '#06b6d4' : 'var(--border)',
              color: deepSearch ? '#06b6d4' : 'var(--text-secondary)'
            }"
          >
            <input v-model="deepSearch" type="checkbox" class="h-3 w-3 cursor-pointer" />
            深度搜索
          </label>

          <span class="mx-1 h-5 w-px" :style="{ backgroundColor: 'var(--border)' }"></span>

          <UButton
            icon="i-heroicons-arrow-down-tray"
            color="neutral"
            variant="outline"
            size="sm"
            :disabled="!activeFile"
            @click="exportHar"
            >导出</UButton
          >
        </div>

        <!-- 汇总概览 -->
        <div v-if="activeFile" class="grid grid-cols-6 gap-3">
          <div class="rounded-xl border p-3" :style="{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-card)' }">
            <div class="text-[11px] opacity-70">总请求</div>
            <div class="mt-1 text-lg font-bold" :style="{ color: 'var(--text-primary)' }">{{ summary.total }}</div>
          </div>
          <div class="rounded-xl border p-3" :style="{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-card)' }">
            <div class="flex items-center gap-1 text-[11px] opacity-70"><span class="h-2 w-2 rounded-full" style="background:#10b981"></span>2xx</div>
            <div class="mt-1 text-lg font-bold" style="color:#10b981">{{ summary.c2 }}</div>
          </div>
          <div class="rounded-xl border p-3" :style="{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-card)' }">
            <div class="flex items-center gap-1 text-[11px] opacity-70"><span class="h-2 w-2 rounded-full" style="background:#06b6d4"></span>3xx</div>
            <div class="mt-1 text-lg font-bold" style="color:#06b6d4">{{ summary.c3 }}</div>
          </div>
          <div class="rounded-xl border p-3" :style="{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-card)' }">
            <div class="flex items-center gap-1 text-[11px] opacity-70"><span class="h-2 w-2 rounded-full" style="background:#f59e0b"></span>4xx</div>
            <div class="mt-1 text-lg font-bold" style="color:#f59e0b">{{ summary.c4 }}</div>
          </div>
          <div class="rounded-xl border p-3" :style="{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-card)' }">
            <div class="flex items-center gap-1 text-[11px] opacity-70"><span class="h-2 w-2 rounded-full" style="background:#ef4444"></span>5xx</div>
            <div class="mt-1 text-lg font-bold" style="color:#ef4444">{{ summary.c5 }}</div>
          </div>
          <div class="rounded-xl border p-3" :style="{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-card)' }">
            <div class="text-[11px] opacity-70">平均耗时</div>
            <div class="mt-1 text-lg font-bold" style="color:#8b5cf6">{{ Math.round(summary.avg) }} ms</div>
          </div>
        </div>

        <!-- 请求表格 -->
        <div
          class="flex min-h-[260px] flex-1 flex-col overflow-hidden rounded-xl border"
          :style="{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-card)' }"
        >
          <div v-if="activeFile" class="flex min-h-0 flex-1 flex-col">
            <div class="max-h-full flex-1 overflow-auto">
              <table class="w-full border-collapse text-[13px]">
                <thead
                  class="sticky top-0 z-10 text-[11px] font-semibold uppercase tracking-wider"
                  :style="{ backgroundColor: 'var(--bg-card)', color: 'var(--text-secondary)' }"
                >
                  <tr :style="{ borderBottom: '1px solid var(--border)' }">
                    <th class="px-3 py-2 text-left" style="width:44px">#</th>
                    <th class="px-3 py-2 text-left" style="width:70px">状态</th>
                    <th class="px-3 py-2 text-left" style="width:80px">方法</th>
                    <th class="px-3 py-2 text-left" style="width:160px">域名</th>
                    <th class="px-3 py-2 text-left">URL</th>
                    <th class="px-3 py-2 text-left" style="width:70px">类型</th>
                    <th class="px-3 py-2 text-left" style="width:120px">耗时</th>
                    <th class="px-3 py-2 text-right" style="width:80px">大小</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="(e, i) in filteredEntries"
                    :key="e._id"
                    class="cursor-pointer transition-colors"
                    :style="{
                      backgroundColor: e._id === selectedEntryId ? '#06b6d412' : 'transparent',
                      borderTop: '1px solid var(--border)',
                      boxShadow: e._id === selectedEntryId ? 'inset 3px 0 0 #06b6d4' : 'none'
                    }"
                    @click="selectEntry(e._id)"
                  >
                    <td class="px-3 py-2 opacity-60">{{ i + 1 }}</td>
                    <td class="px-3 py-2"><span class="status-pill" :class="statusClass(e.response.status)">{{ e.response.status }}</span></td>
                    <td class="px-3 py-2"><span class="method-tag" :class="methodClass(e.request.method)">{{ e.request.method }}</span></td>
                    <td class="whitespace-nowrap px-3 py-2" :title="e.request.url" style="font-family:monospace; color:var(--text-secondary)">{{ splitUrl(e.request.url).domain || '-' }}</td>
                    <td class="max-w-[420px] truncate px-3 py-2" :title="e.request.url" style="font-family:monospace">{{ splitUrl(e.request.url).path }}</td>
                    <td class="px-3 py-2 opacity-80">{{ extFromMime(e.response.content?.mimeType) }}</td>
                    <td class="px-3 py-2">
                      <div v-if="typeof e.time === 'number'" class="flex items-center gap-2">
                        <div class="time-track w-16"><div class="time-fill" :style="{ width: timePct(e.time) + '%' }"></div></div>
                        <span class="text-[11px]" style="color:var(--text-secondary)">{{ Math.round(e.time) }} ms</span>
                      </div>
                      <span v-else class="opacity-50">-</span>
                    </td>
                    <td class="px-3 py-2 text-right opacity-70">{{ fmtBytes((e.response.bodySize || 0) + (e.response.headersSize || 0)) }}</td>
                  </tr>
                </tbody>
              </table>

              <div v-if="filteredEntries.length === 0" class="flex flex-col items-center justify-center gap-2 py-16" :style="{ color: 'var(--text-muted)' }">
                <UIcon name="i-heroicons-magnifying-glass" size="32" class="opacity-30" />
                <p class="text-sm">没有匹配的请求</p>
              </div>
            </div>
          </div>

          <div v-else class="flex flex-1 flex-col items-center justify-center gap-2.5 py-16" :style="{ color: 'var(--text-muted)' }">
            <UIcon name="i-heroicons-wifi" size="40" class="opacity-30" />
            <p class="text-sm">点击左侧「打开文件…」导入 HAR 文件</p>
          </div>
        </div>

        <!-- 详情面板 -->
        <div
          v-if="selectedEntry"
          class="flex shrink-0 flex-col overflow-hidden rounded-xl border"
          :style="{
            borderColor: 'var(--border)',
            backgroundColor: 'var(--bg-card)',
            height: detailHeight + 'px'
          }"
        >
          <div
            class="group/size relative z-10 flex h-2 shrink-0 cursor-ns-resize items-center justify-center hover:bg-[#06b6d412]"
            title="拖动调整高度"
            @mousedown.prevent="startResize"
          >
            <div class="h-0.5 w-10 rounded-full" style="background-color: var(--border)"></div>
          </div>
          <div class="flex shrink-0 items-center gap-1 border-b px-3 overflow-x-auto" :style="{ borderColor: 'var(--border)' }">
            <button
              v-for="tab in [['overview','概述'],['request','请求头'],['response','响应头'],['requestbody','请求体'],['responsebody','响应体'],['timing','耗时']] as const"
              :key="tab[0]"
              class="shrink-0 cursor-pointer border-b-2 px-3 py-2.5 text-[13px] font-medium transition-colors"
              :style="{
                borderBottomColor: currentTab === tab[0] ? '#06b6d4' : 'transparent',
                color: currentTab === tab[0] ? '#06b6d4' : 'var(--text-secondary)'
              }"
              @click="switchTab(tab[0])"
            >
              {{ tab[1] }}
            </button>
          </div>

          <div class="min-h-0 flex-1 overflow-auto p-4">
            <!-- 概述 -->
            <div v-if="currentTab === 'overview' && selectedEntry" class="space-y-2">
              <div class="detail-row"><span class="lbl">URL</span><span class="break-all" style="color:var(--text-primary)">{{ selectedEntry.request.url }}</span></div>
              <div class="detail-row"><span class="lbl">方法</span><span>{{ selectedEntry.request.method }} · {{ selectedEntry.request.httpVersion || '-' }}</span></div>
              <div class="detail-row"><span class="lbl">状态</span><span>{{ selectedEntry.response.status }} {{ selectedEntry.response.statusText || '' }}</span></div>
              <div class="detail-row"><span class="lbl">耗时</span><span>{{ typeof selectedEntry.time === 'number' ? Math.round(selectedEntry.time) + ' ms' : '-' }}</span></div>
              <div class="detail-row"><span class="lbl">MIME</span><span>{{ selectedEntry.response.content?.mimeType || '-' }}</span></div>
              <div class="detail-row"><span class="lbl">大小</span><span>{{ fmtBytes((selectedEntry.response.bodySize || 0) + (selectedEntry.response.headersSize || 0)) }}</span></div>
            </div>

            <!-- 请求头 -->
            <div v-else-if="currentTab === 'request'" class="space-y-4">
              <div>
                <div class="segment-title mb-1.5 text-[11px] font-semibold uppercase tracking-wider" :style="{ color: 'var(--text-secondary)' }">通用</div>
                <div class="detail-row"><span class="lbl">URL</span><span class="break-all">{{ selectedEntry!.request.url }}</span></div>
                <div class="detail-row"><span class="lbl">方法</span><span>{{ selectedEntry!.request.method }}</span></div>
              </div>
              <div v-if="selectedEntry!.request.queryString?.length">
                <div class="segment-title mb-1.5 text-[11px] font-semibold uppercase tracking-wider" :style="{ color: 'var(--text-secondary)' }">Query 参数</div>
                <table class="w-full border-collapse text-[13px]">
                  <tbody>
                    <tr v-for="q in selectedEntry!.request.queryString" :key="q.name" :style="{ borderTop: '1px solid var(--border)' }">
                      <td class="py-1 pr-2 font-mono" style="color:#06b6d4">{{ q.name }}</td>
                      <td class="py-1 font-mono break-all">{{ q.value }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div v-if="selectedEntry!.request.headers?.length">
                <div class="segment-title mb-1.5 text-[11px] font-semibold uppercase tracking-wider" :style="{ color: 'var(--text-secondary)' }">请求头</div>
                <table class="w-full border-collapse text-[13px]">
                  <tbody>
                    <tr v-for="h in selectedEntry!.request.headers" :key="h.name" :style="{ borderTop: '1px solid var(--border)' }">
                      <td class="py-1 pr-2 font-mono" style="color:#06b6d4">{{ h.name }}</td>
                      <td class="py-1 font-mono break-all">{{ h.value }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <!-- 响应头 -->
            <div v-else-if="currentTab === 'response'" class="space-y-4">
              <div>
                <div class="segment-title mb-1.5 text-[11px] font-semibold uppercase tracking-wider" :style="{ color: 'var(--text-secondary)' }">状态</div>
                <div class="detail-row"><span class="lbl">状态</span><span>{{ selectedEntry!.response.status }} {{ selectedEntry!.response.statusText || '' }}</span></div>
                <div class="detail-row"><span class="lbl">版本</span><span>{{ selectedEntry!.response.httpVersion || '-' }}</span></div>
                <div v-if="selectedEntry!.response.redirectURL" class="detail-row"><span class="lbl">重定向</span><span class="break-all">{{ selectedEntry!.response.redirectURL }}</span></div>
              </div>
              <div v-if="selectedEntry!.response.headers?.length">
                <div class="segment-title mb-1.5 text-[11px] font-semibold uppercase tracking-wider" :style="{ color: 'var(--text-secondary)' }">响应头</div>
                <table class="w-full border-collapse text-[13px]">
                  <tbody>
                    <tr v-for="h in selectedEntry!.response.headers" :key="h.name" :style="{ borderTop: '1px solid var(--border)' }">
                      <td class="py-1 pr-2 font-mono" style="color:#06b6d4">{{ h.name }}</td>
                      <td class="py-1 font-mono break-all">{{ h.value }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <!-- 请求体 -->
            <div v-else-if="currentTab === 'requestbody'" class="relative flex h-full min-h-0 flex-col">
              <div class="absolute right-0 top-0 z-10">
                <button
                  class="flex h-7 cursor-pointer items-center gap-1 rounded-md px-2 text-[12px]"
                  style="background-color: var(--border)"
                  @click="copyText(requestBody)"
                >
                  <UIcon v-if="copied" name="i-heroicons-check" size="13" style="color:#10b981" />
                  <UIcon v-else name="i-heroicons-clipboard-document" size="13" />
                  复制
                </button>
              </div>
              <div class="mb-1.5 shrink-0 text-[11px]" style="color:var(--text-secondary)">
                <span v-if="requestBodyIsJson">JSON · </span><span>{{ selectedEntry!.request.postData?.mimeType || '纯文本' }}</span>
              </div>
              <div v-if="requestBodyRoot" class="min-h-0 flex-1 overflow-auto rounded-lg p-2 select-text" :style="{ backgroundColor: 'var(--bg-input)' }">
                <JsonTreeNodeComp :node="requestBodyRoot" />
              </div>
              <div v-else-if="requestBody" class="min-h-0 flex-1 overflow-auto rounded-lg p-3 select-text" :style="{ backgroundColor: 'var(--bg-input)' }">
                <pre class="code-block">{{ requestBody }}</pre>
              </div>
              <div v-else class="flex min-h-0 flex-1 items-center justify-center opacity-50">无请求体</div>
            </div>

            <!-- 响应体 -->
            <div v-else-if="currentTab === 'responsebody'" class="relative flex h-full min-h-0 flex-col">
              <div class="absolute right-0 top-0 z-10">
                <button
                  class="flex h-7 cursor-pointer items-center gap-1 rounded-md px-2 text-[12px]"
                  style="background-color: var(--border)"
                  @click="copyText(responseBody.text)"
                >
                  <UIcon v-if="copied" name="i-heroicons-check" size="13" style="color:#10b981" />
                  <UIcon v-else name="i-heroicons-clipboard-document" size="13" />
                  复制
                </button>
              </div>
              <div class="mb-1.5 shrink-0 text-[11px]" style="color:var(--text-secondary)">
                {{ responseBody.mime }}<span v-if="responseBodyIsJson"> · JSON</span>
              </div>
              <div v-if="responseBodyRoot" class="min-h-0 flex-1 overflow-auto rounded-lg p-2 select-text" :style="{ backgroundColor: 'var(--bg-input)' }">
                <JsonTreeNodeComp :node="responseBodyRoot" />
              </div>
              <div v-else-if="responseBody.text" class="min-h-0 flex-1 overflow-auto rounded-lg p-3 select-text" :style="{ backgroundColor: 'var(--bg-input)' }">
                <pre class="code-block">{{ responseBody.text }}</pre>
              </div>
              <div v-else class="flex min-h-0 flex-1 items-center justify-center opacity-50">无响应体</div>
            </div>

            <!-- 耗时 -->
            <div v-else-if="currentTab === 'timing' && timingModel" class="space-y-4">
              <div>
                <div class="segment-title mb-2 text-[11px] font-semibold uppercase tracking-wider" :style="{ color: 'var(--text-secondary)' }">时间瀑布</div>
                <div class="timing-bar">
                  <div
                    v-for="seg in timingModel.rows"
                    :key="seg.key"
                    class="timing-seg segment-title"
                    :title="`${seg.label}: ${seg.ms} ms`"
                    :style="{ width: (timingModel.total ? (seg.ms / timingModel.total) * 100 : 0) + '%', backgroundColor: seg.color }"
                  ></div>
                </div>
                <div class="mt-2 flex flex-wrap gap-3">
                  <span v-for="seg in timingModel.rows" :key="seg.key" class="flex items-center gap-1 text-[11px]" style="color:var(--text-secondary)">
                    <span class="h-2 w-2 rounded-full" :style="{ backgroundColor: seg.color }"></span>
                    {{ seg.label }} {{ seg.ms }}ms
                  </span>
                </div>
                <div class="mt-2 text-[13px] font-medium" style="color:var(--text-primary)">总耗时：{{ Math.round(timingModel.total) }} ms</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

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