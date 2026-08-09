<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { ipcClient } from '../../ipc/client'
import type {
  JsonSession,
  JsonFormatterData,
  JsonTreeNode
} from '../../../../shared/types/json-formatter'
import JsonTreeNodeComp from '../../components/tools/json-tree-node.vue'

// ——— 会话状态 ———
const sessions = ref<JsonSession[]>([])
const activeId = ref('')
const indent = ref<number | string>(4)

// ——— 编辑器状态 ———
const input = ref('')
const rootNode = ref<JsonTreeNode | null>(null)
const outputText = ref('')
const status = ref<'none' | 'valid' | 'invalid'>('none')
const errorMessage = ref('')

// ——— UI 状态 ———
const renamingId = ref<string | null>(null)
const renameValue = ref('')
const copied = ref(false)
const toast = ref<{ message: string; type: 'success' | 'error' } | null>(null)

let fmtTimer: ReturnType<typeof setTimeout> | null = null
let toastTimer: ReturnType<typeof setTimeout> | null = null
let copiedTimer: ReturnType<typeof setTimeout> | null = null

const indentKey = computed(() => (indent.value === '\t' ? 'tab' : String(indent.value)))

const demoData = `{
  "name": "DevToolbox",
  "version": "1.0.0",
  "description": "开发者工具箱",
  "tools": [
    { "id": "json-formatter", "name": "JSON 格式化", "category": "development" },
    { "id": "timestamp-converter", "name": "时间戳转换", "category": "development" }
  ],
  "author": { "name": "Developer", "email": "dev@example.com" },
  "license": "MIT",
  "isOpenSource": true,
  "stars": null
}`

// ——— 持久化 ———
function persist(): void {
  try {
    ipcClient.setToolData<JsonFormatterData>('json-formatter', {
      sessions: sessions.value.map((s) => ({ ...s })),
      activeId: activeId.value,
      indent: indent.value
    })
  } catch (e) {
    // 持久化失败不应中断调用方（如切换会话）的执行链
    console.error('[json-formatter] persist failed:', e)
  }
}

async function load(): Promise<void> {
  const data = await ipcClient.getToolData<JsonFormatterData | null>('json-formatter')
  if (data && Array.isArray(data.sessions) && data.sessions.length > 0) {
    sessions.value = data.sessions
    activeId.value = data.sessions.some((s) => s.id === data.activeId)
      ? data.activeId
      : data.sessions[0].id
    indent.value = data.indent ?? 4
  } else {
    const def: JsonSession = {
      id: generateId(),
      name: '示例数据',
      content: demoData,
      createdAt: Date.now(),
      updatedAt: Date.now()
    }
    sessions.value = [def]
    activeId.value = def.id
    persist()
  }
  loadSession(activeId.value)
}

function generateId(): string {
  return `json_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`
}

// ——— 会话操作 ———
function saveCurrent(): void {
  const s = sessions.value.find((x) => x.id === activeId.value)
  if (s) {
    s.content = input.value
    s.updatedAt = Date.now()
  }
}

function createNewSession(): void {
  saveCurrent()
  const s: JsonSession = {
    id: generateId(),
    name: `未命名 ${sessions.value.length + 1}`,
    content: '',
    createdAt: Date.now(),
    updatedAt: Date.now()
  }
  sessions.value.push(s)
  activeId.value = s.id
  // 取消防抖格式化并直接清空输入与输出，确保新会话从空内容开始
  if (fmtTimer) {
    clearTimeout(fmtTimer)
    fmtTimer = null
  }
  input.value = ''
  clearOutput()
  persist()
  showToast('已创建新会话')
}

function switchSession(id: string): void {
  if (activeId.value === id) return
  saveCurrent()
  activeId.value = id
  persist()
  loadSession(id)
}

function deleteSession(id: string): void {
  if (sessions.value.length <= 1) {
    showToast('至少保留一个会话', 'error')
    return
  }
  saveCurrent()
  sessions.value = sessions.value.filter((s) => s.id !== id)
  if (activeId.value === id) {
    activeId.value = sessions.value[0].id
    loadSession(activeId.value)
  }
  persist()
  showToast('会话已删除')
}

function startRename(id: string): void {
  renamingId.value = id
  renameValue.value = sessions.value.find((s) => s.id === id)?.name || ''
}

function finishRename(): void {
  const id = renamingId.value
  renamingId.value = null
  if (!id) return
  const s = sessions.value.find((x) => x.id === id)
  if (s && renameValue.value.trim()) {
    s.name = renameValue.value.trim()
    s.updatedAt = Date.now()
    persist()
  }
}

function loadSession(id: string): void {
  const s = sessions.value.find((x) => x.id === id)
  if (!s) return
  // 取消待执行的防抖格式化，避免旧会话的定时任务干扰新会话
  if (fmtTimer) {
    clearTimeout(fmtTimer)
    fmtTimer = null
  }
  input.value = s.content
  if (s.content.trim()) {
    formatJSON()
  } else {
    clearOutput()
  }
}

// ——— JSON 处理 ———
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

function renderOutput(text: string): void {
  outputText.value = text
  status.value = 'valid'
  errorMessage.value = ''
  try {
    rootNode.value = buildTree(JSON.parse(text), null)
  } catch {
    rootNode.value = null
  }
}

function renderError(msg: string): void {
  status.value = 'invalid'
  errorMessage.value = msg
  outputText.value = ''
  rootNode.value = null
}

function clearOutput(): void {
  status.value = 'none'
  errorMessage.value = ''
  outputText.value = ''
  rootNode.value = null
}

function formatJSON(): void {
  const text = input.value.trim()
  if (!text) {
    clearOutput()
    return
  }
  try {
    const obj = JSON.parse(text)
    renderOutput(JSON.stringify(obj, null, indent.value))
    saveCurrent()
  } catch (e) {
    renderError(e instanceof Error ? e.message : String(e))
  }
}

function compressJSON(): void {
  const text = input.value.trim()
  if (!text) {
    showToast('请输入 JSON 数据', 'error')
    return
  }
  try {
    const obj = JSON.parse(text)
    renderOutput(JSON.stringify(obj))
    showToast('已压缩')
  } catch (e) {
    renderError(e instanceof Error ? e.message : String(e))
    showToast(e instanceof Error ? e.message : 'JSON 无效', 'error')
  }
}

function validateJSON(): void {
  const text = input.value.trim()
  if (!text) {
    showToast('请输入 JSON 数据', 'error')
    return
  }
  try {
    JSON.parse(text)
    status.value = 'valid'
    errorMessage.value = ''
    showToast('JSON 格式有效')
  } catch (e) {
    status.value = 'invalid'
    errorMessage.value = e instanceof Error ? e.message : String(e)
    showToast(e instanceof Error ? e.message : 'JSON 无效', 'error')
  }
}

function escapeJSON(): void {
  const text = input.value
  if (!text) {
    showToast('请输入内容', 'error')
    return
  }
  renderOutput(JSON.stringify(text))
  showToast('已转义为 JSON 字符串')
}

function unescapeJSON(): void {
  const text = input.value.trim()
  if (!text) {
    showToast('请输入内容', 'error')
    return
  }
  try {
    const parsed: unknown = JSON.parse(text)
    if (typeof parsed === 'string') {
      renderOutput(JSON.stringify(parsed))
      showToast('已去除转义')
    } else {
      renderOutput(JSON.stringify(parsed, null, indent.value))
      showToast('解析成功')
    }
  } catch (e) {
    showToast(e instanceof Error ? e.message : '解析失败', 'error')
  }
}

function clearInput(): void {
  input.value = ''
  clearOutput()
  saveCurrent()
  persist()
}

// 输入防抖实时格式化
watch(input, () => {
  if (fmtTimer) clearTimeout(fmtTimer)
  fmtTimer = setTimeout(() => {
    if (input.value.trim()) formatJSON()
    else clearOutput()
  }, 500)
})

// ——— 粘贴 / 复制 / 导出 ———
async function pasteInput(): Promise<void> {
  try {
    const text = await navigator.clipboard.readText()
    if (!text) {
      showToast('剪贴板为空', 'error')
      return
    }
    input.value = text
    // 粘贴内容立即归属当前会话并持久化，切换会话后可随时恢复
    saveCurrent()
    persist()
    showToast('已粘贴')
  } catch {
    showToast('无法读取剪贴板', 'error')
  }
}

async function copyOutput(): Promise<void> {
  if (!outputText.value) {
    showToast('没有可复制的内容', 'error')
    return
  }
  try {
    await navigator.clipboard.writeText(outputText.value)
    copied.value = true
    if (copiedTimer) clearTimeout(copiedTimer)
    copiedTimer = setTimeout(() => {
      copied.value = false
    }, 1500)
    showToast('已复制到剪贴板')
  } catch {
    showToast('复制失败', 'error')
  }
}

async function exportJSON(): Promise<void> {
  const text = outputText.value || input.value.trim()
  if (!text) {
    showToast('没有可导出的内容', 'error')
    return
  }
  const name = sessions.value.find((s) => s.id === activeId.value)?.name || 'data'
  try {
    const res = await ipcClient.jsonFormatter.saveFile({ defaultName: name, content: text })
    if (res.ok) showToast('导出成功')
    else if (!res.canceled) showToast('导出失败', 'error')
  } catch {
    showToast('导出失败', 'error')
  }
}

function onIndentChange(e: Event): void {
  const val = (e.target as HTMLSelectElement).value
  indent.value = val === 'tab' ? '\t' : Number(val)
  formatJSON()
  persist()
}

// ——— 工具函数 ———
function formatTime(ts: number): string {
  const diff = Date.now() - ts
  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return `${Math.floor(diff / 60000)} 分钟前`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} 小时前`
  return `${Math.floor(diff / 86400000)} 天前`
}

function showToast(message: string, type: 'success' | 'error' = 'success'): void {
  toast.value = { message, type }
  if (toastTimer) clearTimeout(toastTimer)
  toastTimer = setTimeout(() => {
    toast.value = null
  }, 2500)
}

onMounted(load)

onBeforeUnmount(() => {
  if (fmtTimer) clearTimeout(fmtTimer)
  if (toastTimer) clearTimeout(toastTimer)
  if (copiedTimer) clearTimeout(copiedTimer)
  saveCurrent()
  persist()
})
</script>

<template>
  <div class="flex h-full flex-col overflow-hidden">
    <div class="flex min-h-0 flex-1 gap-4">
      <!-- ===== 会话列表面板 ===== -->
      <aside
        class="flex w-60 shrink-0 flex-col overflow-hidden rounded-xl border"
        :style="{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-card)' }"
      >
        <div class="border-b p-4" :style="{ borderColor: 'var(--border)' }">
          <h2
            class="mb-3 text-[11px] font-semibold uppercase tracking-wider"
            :style="{ color: 'var(--text-secondary)' }"
          >
            JSON 会话
          </h2>
          <button
            class="flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-dashed py-2 text-[13px] transition-all hover:border-[#6366f1] hover:bg-[#6366f105] hover:text-[#6366f1]"
            :style="{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }"
            @click="createNewSession"
          >
            <UIcon name="i-heroicons-plus" size="14" />
            新建会话
          </button>
        </div>

        <div class="flex-1 space-y-1 overflow-y-auto p-2">
          <div
            v-for="s in sessions"
            :key="s.id"
            class="group flex cursor-pointer items-center gap-2.5 rounded-lg border px-2.5 py-2 transition-all"
            :class="s.id === activeId ? 'border-[#6366f14d] bg-[#6366f112]' : 'border-transparent'"
            @click="switchSession(s.id)"
          >
            <div
              class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
              :class="
                s.id === activeId ? 'bg-[#6366f1] text-white' : 'bg-[#6366f115] text-[#6366f1]'
              "
            >
              <UIcon name="i-heroicons-braces" size="15" />
            </div>
            <div class="min-w-0 flex-1">
              <input
                v-if="renamingId === s.id"
                v-model="renameValue"
                class="w-full rounded border px-1.5 py-0.5 text-[13px] outline-none"
                :style="{
                  borderColor: '#6366f1',
                  backgroundColor: 'var(--bg-base)',
                  color: 'var(--text-primary)'
                }"
                @keydown.enter="finishRename"
                @blur="finishRename"
                @click.stop
              />
              <div
                v-else
                class="truncate text-[13px] font-medium"
                :style="{ color: 'var(--text-primary)' }"
              >
                {{ s.name }}
              </div>
              <div class="text-[11px] opacity-70">{{ formatTime(s.updatedAt) }}</div>
            </div>
            <div
              v-if="renamingId !== s.id"
              class="flex shrink-0 gap-0.5 opacity-0 transition-opacity group-hover:opacity-100"
            >
              <button
                class="flex h-6 w-6 cursor-pointer items-center justify-center rounded hover:bg-[rgba(255,255,255,0.08)]"
                title="重命名"
                @click.stop="startRename(s.id)"
              >
                <UIcon name="i-heroicons-pencil-square" size="13" />
              </button>
              <button
                class="flex h-6 w-6 cursor-pointer items-center justify-center rounded hover:bg-[#ef444433] hover:text-[#ef4444]"
                title="删除"
                @click.stop="deleteSession(s.id)"
              >
                <UIcon name="i-heroicons-trash" size="13" />
              </button>
            </div>
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
          <UButton icon="i-heroicons-braces" color="primary" size="sm" @click="formatJSON"
            >格式化</UButton
          >
          <UButton
            icon="i-heroicons-bars-arrow-down"
            color="neutral"
            variant="outline"
            size="sm"
            @click="compressJSON"
            >压缩</UButton
          >
          <UButton
            icon="i-heroicons-check-badge"
            color="neutral"
            variant="outline"
            size="sm"
            @click="validateJSON"
            >验证</UButton
          >
          <UButton
            icon="i-heroicons-code-bracket"
            color="neutral"
            variant="outline"
            size="sm"
            @click="escapeJSON"
            >转义</UButton
          >
          <UButton
            icon="i-heroicons-code-bracket-square"
            color="neutral"
            variant="outline"
            size="sm"
            @click="unescapeJSON"
            >去转义</UButton
          >
          <span class="mx-1 h-5 w-px" :style="{ backgroundColor: 'var(--border)' }"></span>
          <UButton
            icon="i-heroicons-trash"
            color="error"
            variant="outline"
            size="sm"
            @click="clearInput"
            >清空</UButton
          >

          <div class="ml-auto flex items-center gap-2">
            <span
              v-if="status === 'valid'"
              class="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium"
              style="background-color: #10b98126; color: #10b981"
            >
              <UIcon name="i-heroicons-check-circle" size="13" /> 有效 JSON
            </span>
            <span
              v-else-if="status === 'invalid'"
              class="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium"
              :title="errorMessage"
              style="background-color: #ef444426; color: #ef4444"
            >
              <UIcon name="i-heroicons-exclamation-triangle" size="13" /> 格式错误
            </span>
            <select
              class="cursor-pointer rounded-lg border px-2 py-1.5 text-xs outline-none"
              :style="{
                borderColor: 'var(--border)',
                backgroundColor: 'var(--bg-base)',
                color: 'var(--text-primary)'
              }"
              :value="indentKey"
              @change="onIndentChange"
            >
              <option value="2">2 空格</option>
              <option value="4">4 空格</option>
              <option value="tab">Tab</option>
            </select>
            <UButton
              icon="i-heroicons-clipboard-document"
              color="neutral"
              variant="outline"
              size="sm"
              @click="copyOutput"
              >复制</UButton
            >
            <UButton
              icon="i-heroicons-arrow-down-tray"
              color="neutral"
              variant="outline"
              size="sm"
              @click="exportJSON"
              >导出</UButton
            >
          </div>
        </div>

        <!-- 双栏编辑器 -->
        <div class="flex min-h-0 flex-1 gap-4">
          <!-- 输入面板 -->
          <div
            class="flex min-w-0 flex-1 flex-col overflow-hidden rounded-xl border"
            :style="{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-card)' }"
          >
            <div
              class="flex items-center justify-between border-b px-4 py-2.5"
              :style="{ borderColor: 'var(--border)' }"
            >
              <span
                class="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider"
                :style="{ color: 'var(--text-secondary)' }"
              >
                <UIcon name="i-heroicons-pencil-square" size="13" /> 输入
              </span>
              <div class="flex items-center gap-1">
                <button
                  class="flex h-6 w-6 cursor-pointer items-center justify-center rounded hover:bg-[rgba(255,255,255,0.08)]"
                  title="粘贴"
                  @click="pasteInput"
                >
                  <UIcon name="i-heroicons-clipboard" size="13" />
                </button>
                <button
                  class="flex h-6 w-6 cursor-pointer items-center justify-center rounded hover:bg-[rgba(255,255,255,0.08)]"
                  title="清空"
                  @click="clearInput"
                >
                  <UIcon name="i-heroicons-trash" size="13" />
                </button>
              </div>
            </div>
            <div class="relative flex-1">
              <textarea
                v-model="input"
                spellcheck="false"
                placeholder="在此粘贴 JSON 数据…"
                class="absolute inset-0 h-full w-full resize-none p-4 font-mono text-[13px] leading-relaxed outline-none"
                :style="{ backgroundColor: 'var(--bg-input)', color: 'var(--text-primary)' }"
              ></textarea>
            </div>
          </div>

          <!-- 输出面板 -->
          <div
            class="flex min-w-0 flex-1 flex-col overflow-hidden rounded-xl border"
            :style="{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-card)' }"
          >
            <div
              class="flex items-center justify-between border-b px-4 py-2.5"
              :style="{ borderColor: 'var(--border)' }"
            >
              <span
                class="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider"
                :style="{ color: 'var(--text-secondary)' }"
              >
                <UIcon name="i-heroicons-braces" size="13" /> 输出
              </span>
              <div class="flex items-center gap-1">
                <button
                  class="flex h-6 w-6 cursor-pointer items-center justify-center rounded hover:bg-[rgba(255,255,255,0.08)]"
                  title="复制"
                  @click="copyOutput"
                >
                  <UIcon v-if="copied" name="i-heroicons-check" size="13" style="color: #10b981" />
                  <UIcon v-else name="i-heroicons-clipboard-document" size="13" />
                </button>
                <button
                  class="flex h-6 w-6 cursor-pointer items-center justify-center rounded hover:bg-[rgba(255,255,255,0.08)]"
                  title="导出"
                  @click="exportJSON"
                >
                  <UIcon name="i-heroicons-arrow-down-tray" size="13" />
                </button>
              </div>
            </div>
            <div class="relative flex-1 overflow-auto">
              <div v-if="rootNode" class="p-2">
                <JsonTreeNodeComp :node="rootNode" />
              </div>
              <div
                v-else-if="status === 'invalid'"
                class="flex h-full flex-col items-center justify-center gap-2 p-4"
              >
                <UIcon
                  name="i-heroicons-exclamation-triangle"
                  size="32"
                  class="opacity-80"
                  style="color: #ef4444"
                />
                <p class="max-w-full break-all text-center text-[13px]" style="color: #ef4444">
                  错误: {{ errorMessage }}
                </p>
              </div>
              <div
                v-else
                class="flex h-full flex-col items-center justify-center gap-2.5"
                :style="{ color: 'var(--text-muted)' }"
              >
                <UIcon name="i-heroicons-braces" size="40" class="opacity-30" />
                <p class="text-sm">格式化后的 JSON 将显示在这里</p>
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
      <UIcon
        :name="toast.type === 'error' ? 'i-heroicons-x-circle' : 'i-heroicons-check-circle'"
        size="16"
      />
      {{ toast.message }}
    </div>
  </div>
</template>
