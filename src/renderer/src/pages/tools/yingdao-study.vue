<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { ipcClient } from '../../ipc/client'

// ——— 通知 ———
const notification = ref('')
let notiTimer: ReturnType<typeof setTimeout> | null = null
function notify(msg: string, isError = false): void {
  notification.value = msg
  if (notiTimer) clearTimeout(notiTimer)
  notiTimer = setTimeout(() => { notification.value = '' }, isError ? 3000 : 1500)
}

// ——— 当前时间 ———
const nowTime = ref('--')
let nowTimer: ReturnType<typeof setInterval> | null = null

function updateNow(): void {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  nowTime.value = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

onMounted(() => { updateNow(); nowTimer = setInterval(updateNow, 1000) })
onUnmounted(() => { if (nowTimer) clearInterval(nowTimer) })

// ——— 模板数据 ———
interface TemplateData {
  textLessonRecordUuid: string
  textBookRecordUuid: string
  classInfoUuid: string
  catalogUuid: string
}

const templates: Record<string, TemplateData> = {
  primary: {
    textLessonRecordUuid: '949937098688032768',
    textBookRecordUuid: '949937142829965312',
    classInfoUuid: '6e0d0d28-e74f-45a2-9ddf-88d907d9bda0',
    catalogUuid: '5f5ebb0e-84c4-4097-9e63-efc3038669a6'
  },
  intermediate: {
    textLessonRecordUuid: '903938006921019392',
    textBookRecordUuid: '948027003428429824',
    classInfoUuid: '6e0d0d28-e74f-45a2-9ddf-88d907d9bda0',
    catalogUuid: '5c5603c3-e11b-4914-8092-bb9baf98bc4b'
  },
  advanced: {
    textLessonRecordUuid: '937988ad-43c4-4e3a-adb1-05f2101f1e87',
    textBookRecordUuid: '936081757708402688',
    classInfoUuid: '6e0d0d28-e74f-45a2-9ddf-88d907d9bda0',
    catalogUuid: '0d98f86a-0750-482b-9c00-420f7cca872f'
  }
}

const API_URL = 'https://api.yingdao.com/api/college/v1/book/addPlayRecord'

// ——— 表单状态 ———
const level = ref<'primary' | 'intermediate' | 'advanced'>('primary')
const token = ref('')
const customClassId = ref('')
const days = ref(0)
const hours = ref(0)
const minutes = ref(0)
const seconds = ref(0)
const sending = ref(false)
const sendResult = ref<{ status: number; body: string } | null>(null)

const levelLabelMap: Record<string, string> = {
  primary: '初级',
  intermediate: '中级',
  advanced: '高级'
}

// ——— 计算 ———
const calculated = computed(() => {
  const now = new Date()
  const pastMs = (days.value * 86400 + hours.value * 3600 + minutes.value * 60 + seconds.value) * 1000
  const endMs = now.getTime()
  const startMs = endMs - pastMs
  const duration = Math.floor((endMs - startMs) / 1000)

  const startDate = new Date(startMs)
  const pad = (n: number) => String(n).padStart(2, '0')
  const startStr = `${startDate.getFullYear()}-${pad(startDate.getMonth() + 1)}-${pad(startDate.getDate())} ${pad(startDate.getHours())}:${pad(startDate.getMinutes())}:${pad(startDate.getSeconds())}`

  return { startMs, endMs, duration, startStr }
})

// ——— 生成请求体 ———
const requestBody = computed(() => {
  const tpl = templates[level.value]
  const data: Record<string, unknown> = { ...tpl }
  if (customClassId.value.trim()) {
    data.classInfoUuid = customClassId.value.trim()
  }
  data.startTime = calculated.value.startMs
  data.endTime = calculated.value.endMs
  data.duration = calculated.value.duration
  return data
})

const jsonStr = computed(() => JSON.stringify(requestBody.value, null, 2))

// ——— 生成 CURL ———
const curlStr = computed(() => {
  let curl = `curl --location '${API_URL}' \\\n`
  curl += `--request POST \\\n`
  if (token.value.trim()) {
    curl += `--header 'Authorization: Bearer ${token.value.trim()}' \\\n`
  }
  curl += `--header 'Content-Type: application/json' \\\n`
  curl += `--data '${jsonStr.value.replace(/'/g, "'\\''")}'`
  return curl
})

// ——— 复制 ———
function copyText(text: string, label: string): void {
  if (!text) return
  navigator.clipboard.writeText(text).then(() => notify(`${label} 已复制`))
}

// ——— 发送请求 ———
async function sendRequest(): Promise<void> {
  sending.value = true
  sendResult.value = null
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    }
    if (token.value.trim()) {
      headers['Authorization'] = `Bearer ${token.value.trim()}`
    }
    const result = await ipcClient.sendHttpRequest({
      url: API_URL,
      method: 'POST',
      headers,
      body: jsonStr.value
    })

    let prettyBody = result.body
    try { prettyBody = JSON.stringify(JSON.parse(result.body), null, 2) } catch { /* raw */ }

    sendResult.value = {
      status: result.statusCode,
      body: prettyBody
    }
    notify(`请求完成 (${result.statusCode})`)
  } catch (e) {
    notify('请求失败: ' + String(e), true)
    sendResult.value = { status: 0, body: String(e) }
  } finally {
    sending.value = false
  }
}
</script>

<template>
  <div class="flex h-full flex-col overflow-hidden">
    <div class="flex-1 overflow-y-auto p-6">
      <div class="mx-auto flex max-w-5xl flex-col gap-6">

        <!-- ===== 当前时间栏 ===== -->
        <div
          class="flex items-center justify-between rounded-xl border px-6 py-4"
          :style="{
            borderColor: 'var(--border)',
            backgroundColor: 'var(--bg-card)'
          }"
        >
          <div class="flex items-center gap-3">
            <div
              class="flex h-10 w-10 items-center justify-center rounded-lg"
              :style="{ backgroundColor: '#f59e0b18' }"
            >
              <UIcon name="i-heroicons-clock" size="20" style="color: #f59e0b" />
            </div>
            <div>
              <div class="text-xs" :style="{ color: 'var(--text-muted)' }">当前系统时间</div>
              <div class="text-xl font-bold font-mono tracking-wider" style="color: #f59e0b">{{ nowTime }}</div>
            </div>
          </div>
          <div class="text-xs" :style="{ color: 'var(--text-muted)' }">
            接口：<code class="rounded bg-[#f59e0b12] px-2 py-0.5 text-[11px] font-mono">{{ API_URL }}</code>
          </div>
        </div>

        <div class="flex flex-col gap-6 xl:flex-row">
          <!-- ===== 左侧：参数配置 ===== -->
          <div class="flex flex-1 flex-col gap-5">
            <!-- 级别选择 -->
            <div class="rounded-xl border" :style="{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-card)' }">
              <div class="border-b px-5 py-3.5" :style="{ borderColor: 'var(--border)' }">
                <div class="flex items-center gap-2.5 text-sm font-semibold" :style="{ color: 'var(--text-primary)' }">
                  <div class="h-2.5 w-2.5 rounded-full" style="background-color: #f59e0b"></div>
                  请求参数
                </div>
              </div>
              <div class="flex flex-col gap-5 p-5">
                <!-- 级别切换 -->
                <div>
                  <label class="mb-2 block text-xs font-medium" :style="{ color: 'var(--text-muted)' }">学习级别</label>
                  <div class="flex gap-2">
                    <button
                      v-for="(lbl, key) in levelLabelMap"
                      :key="key"
                      class="flex-1 cursor-pointer rounded-lg border px-3 py-2 text-center text-sm font-medium transition-all"
                      :style="{
                        borderColor: level === key ? '#f59e0b' : 'var(--border)',
                        backgroundColor: level === key ? '#f59e0b15' : 'var(--bg-elevated)',
                        color: level === key ? '#f59e0b' : 'var(--text-secondary)'
                      }"
                      @click="level = key as 'primary' | 'intermediate' | 'advanced'"
                    >{{ lbl }}</button>
                  </div>
                </div>

                <!-- Token -->
                <div>
                  <label class="mb-1.5 block text-xs font-medium" :style="{ color: 'var(--text-muted)' }">
                    Bearer Token
                    <span class="text-[10px] opacity-60">（可选）</span>
                  </label>
                  <input
                    v-model="token"
                    type="text"
                    placeholder="输入 Token，不需要 Bearer 前缀"
                    class="w-full rounded-lg border px-3.5 py-2.5 text-sm font-mono outline-none transition-all focus:border-[#f59e0b] focus:ring-1 focus:ring-[#f59e0b33]"
                    :style="{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-input)', color: 'var(--text-primary)' }"
                    spellcheck="false"
                  />
                </div>

                <!-- 自定义 classInfoUuid -->
                <div>
                  <label class="mb-1.5 block text-xs font-medium" :style="{ color: 'var(--text-muted)' }">
                    自定义 classInfoUuid
                    <span class="text-[10px] opacity-60">（可选，留空使用默认值）</span>
                  </label>
                  <input
                    v-model="customClassId"
                    type="text"
                    placeholder="留空则使用当前级别的默认值"
                    class="w-full rounded-lg border px-3.5 py-2.5 text-sm font-mono outline-none transition-all focus:border-[#f59e0b] focus:ring-1 focus:ring-[#f59e0b33]"
                    :style="{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-input)', color: 'var(--text-primary)' }"
                    spellcheck="false"
                  />
                </div>

                <!-- 时间回溯 -->
                <div>
                  <label class="mb-2 block text-xs font-medium" :style="{ color: 'var(--text-muted)' }">时间回溯</label>
                  <div class="grid grid-cols-4 gap-3">
                    <div v-for="item in [
                      { key: 'days', label: '天' },
                      { key: 'hours', label: '时' },
                      { key: 'minutes', label: '分' },
                      { key: 'seconds', label: '秒' }
                    ]" :key="item.key">
                      <label class="mb-1 block text-center text-[11px]" :style="{ color: 'var(--text-muted)' }">向前推 {{ item.label }}</label>
                      <input
                        :value="({ days, hours, minutes, seconds } as Record<string, number>)[item.key]"
                        type="number"
                        min="0"
                        class="w-full rounded-lg border px-3 py-2 text-center text-sm font-mono outline-none transition-all focus:border-[#f59e0b] focus:ring-1 focus:ring-[#f59e0b33]"
                        :style="{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-input)', color: 'var(--text-primary)' }"
                        @input="(e) => {
                          const v = parseInt((e.target as HTMLInputElement).value) || 0
                          if (item.key === 'days') days = v
                          else if (item.key === 'hours') hours = v
                          else if (item.key === 'minutes') minutes = v
                          else if (item.key === 'seconds') seconds = v
                        }"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- 结果展示 -->
            <div class="rounded-xl border" :style="{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-card)' }">
              <div class="border-b px-5 py-3.5" :style="{ borderColor: 'var(--border)' }">
                <div class="flex items-center gap-2.5 text-sm font-semibold" :style="{ color: 'var(--text-primary)' }">
                  <div class="h-2.5 w-2.5 rounded-full" style="background-color: '#10b981'"></div>
                  计算结果
                </div>
              </div>
              <div class="grid grid-cols-3 gap-4 p-5">
                <div class="rounded-lg border p-3.5 text-center" :style="{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-elevated)' }">
                  <div class="mb-1 text-xs" :style="{ color: 'var(--text-muted)' }">回溯后时间</div>
                  <div class="text-sm font-bold font-mono" style="color: #10b981">{{ calculated.startStr }}</div>
                </div>
                <div class="rounded-lg border p-3.5 text-center" :style="{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-elevated)' }">
                  <div class="mb-1 text-xs" :style="{ color: 'var(--text-muted)' }">毫秒时间戳</div>
                  <div class="text-sm font-bold font-mono break-all" style="color: #6366f1">{{ calculated.startMs }}</div>
                </div>
                <div class="rounded-lg border p-3.5 text-center" :style="{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-elevated)' }">
                  <div class="mb-1 text-xs" :style="{ color: 'var(--text-muted)' }">Duration（秒）</div>
                  <div class="text-sm font-bold font-mono" style="color: #f59e0b">{{ calculated.duration }}</div>
                </div>
              </div>
            </div>
          </div>

          <!-- ===== 右侧：JSON / CURL / 发送 ===== -->
          <div class="flex w-[550px] shrink-0 flex-col gap-5">
            <!-- JSON + CURL 一排 -->
            <div class="flex gap-5">
              <!-- JSON -->
              <div class="flex flex-1 flex-col rounded-xl border" :style="{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-card)' }">
                <div class="flex items-center justify-between border-b px-4 py-3" :style="{ borderColor: 'var(--border)' }">
                  <div class="flex items-center gap-2 text-xs font-semibold" :style="{ color: 'var(--text-primary)' }">
                    <UIcon name="i-heroicons-code-bracket" size="14" style="color: #f59e0b" />
                    请求体 JSON
                  </div>
                  <UButton
                    variant="ghost"
                    color="neutral"
                    size="xs"
                    square
                    @click="copyText(jsonStr, 'JSON')"
                  >
                    <UIcon name="i-heroicons-document-duplicate" size="14" />
                  </UButton>
                </div>
                <div class="p-3">
                  <textarea
                    :value="jsonStr"
                    readonly
                    rows="12"
                    class="w-full resize-none rounded-lg border px-3 py-2 text-[12px] font-mono leading-relaxed outline-none"
                    :style="{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-elevated)', color: 'var(--text-primary)' }"
                  ></textarea>
                </div>
              </div>

              <!-- CURL -->
              <div class="flex flex-1 flex-col rounded-xl border" :style="{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-card)' }">
                <div class="flex items-center justify-between border-b px-4 py-3" :style="{ borderColor: 'var(--border)' }">
                  <div class="flex items-center gap-2 text-xs font-semibold" :style="{ color: 'var(--text-primary)' }">
                    <UIcon name="i-heroicons-terminal" size="14" style="color: #06b6d4" />
                    CURL
                  </div>
                  <UButton
                    variant="ghost"
                    color="neutral"
                    size="xs"
                    square
                    @click="copyText(curlStr, 'CURL')"
                  >
                    <UIcon name="i-heroicons-document-duplicate" size="14" />
                  </UButton>
                </div>
                <div class="p-3">
                  <textarea
                    :value="curlStr"
                    readonly
                    rows="12"
                    class="w-full resize-none rounded-lg border px-3 py-2 text-[12px] font-mono leading-relaxed outline-none"
                    :style="{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-elevated)', color: 'var(--text-primary)' }"
                  ></textarea>
                </div>
              </div>
            </div>

            <!-- 发送按钮 -->
            <UButton
              variant="solid"
              color="warning"
              size="lg"
              :loading="sending"
              class="w-full justify-center"
              @click="sendRequest"
            >
              <UIcon name="i-heroicons-paper-airplane" size="16" />
              {{ sending ? '发送中…' : '发送请求' }}
            </UButton>

            <!-- 响应结果 -->
            <div
              v-if="sendResult"
              class="rounded-xl border"
              :style="{
                borderColor: sendResult.status >= 200 && sendResult.status < 300 ? '#10b98144' : '#ef444444',
                backgroundColor: 'var(--bg-card)'
              }"
            >
              <div class="flex items-center gap-2 border-b px-5 py-3.5" :style="{ borderColor: 'var(--border)' }">
                <div
                  class="flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-medium"
                  :style="{
                    backgroundColor: sendResult.status >= 200 && sendResult.status < 300 ? '#10b98118' : '#ef444418',
                    color: sendResult.status >= 200 && sendResult.status < 300 ? '#10b981' : '#ef4444'
                  }"
                >
                  {{ sendResult.status || '错误' }}
                </div>
                <span class="text-xs font-medium" :style="{ color: 'var(--text-primary)' }">响应</span>
                <UButton
                  variant="ghost"
                  color="neutral"
                  size="xs"
                  square
                  class="ml-auto"
                  @click="copyText(sendResult.body, '响应')"
                >
                  <UIcon name="i-heroicons-document-duplicate" size="14" />
                </UButton>
              </div>
              <div class="p-4">
                <pre
                  class="max-h-48 overflow-y-auto whitespace-pre-wrap rounded-lg border px-3.5 py-2.5 text-[12px] font-mono leading-relaxed"
                  :style="{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-elevated)', color: 'var(--text-primary)' }"
                >{{ sendResult.body }}</pre>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>

    <!-- 通知 -->
    <Teleport to="body">
      <Transition name="fade">
        <div
          v-if="notification"
          class="pointer-events-none fixed bottom-6 left-1/2 z-50 -translate-x-1/2"
        >
          <div
            class="flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium shadow-lg"
            :style="{ backgroundColor: '#10b981', color: '#fff' }"
          >
            <UIcon name="i-heroicons-check-circle" size="16" />
            {{ notification }}
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
