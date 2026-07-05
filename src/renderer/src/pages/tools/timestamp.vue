<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'

// ——— 通知系统（替代 useToast） ———
const notification = ref('')
let notiTimer: ReturnType<typeof setTimeout> | null = null
function notify(msg: string): void {
  notification.value = msg
  if (notiTimer) clearTimeout(notiTimer)
  notiTimer = setTimeout(() => { notification.value = '' }, 1500)
}

// ——— 状态 ———
const mode = ref<'seconds' | 'milliseconds'>('seconds')

// 左侧：时间戳 → 日期
const tsInput = ref('1751734980')
const tsPrecision = ref<'s' | 'ms' | 'us'>('s')
const tsResult = ref('')
const tsIso = ref('')

// 右侧：日期 → 时间戳
const dtInput = ref('2026-07-05 21:03:00')
const dtTimezone = ref('Asia/Shanghai')
const dtResultS = ref('')
const dtResultMs = ref('')

// 当前时间
const nowTime = ref('--')
const nowTimestamp = ref('--')

let nowTimer: ReturnType<typeof setInterval> | null = null

// ——— 时区数据 ———
interface TzInfo { label: string; offset: number }
const timezones: TzInfo[] = [
  { label: 'UTC', offset: 0 },
  { label: 'Asia/Shanghai (UTC+8)', offset: 8 },
  { label: 'Asia/Tokyo (UTC+9)', offset: 9 },
  { label: 'America/New_York (UTC-4)', offset: -4 },
  { label: 'Europe/London (UTC+1)', offset: 1 }
]

const precisionItems = [
  { label: '秒 (s)', value: 's' as const },
  { label: '毫秒 (ms)', value: 'ms' as const },
  { label: '微秒 (μs)', value: 'us' as const }
]

function getTzOffset(label: string): number {
  return timezones.find(t => t.label === label)?.offset ?? 8
}

// ——— 更新当前时间 ———
function updateNow(): void {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  nowTime.value = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
  nowTimestamp.value = mode.value === 'seconds'
    ? String(Math.floor(d.getTime() / 1000))
    : String(d.getTime())
}

onMounted(() => { updateNow(); nowTimer = setInterval(updateNow, 1000) })
onUnmounted(() => { if (nowTimer) clearInterval(nowTimer) })

// ——— 转换函数 ———
function formatDate(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

function parseDateToTs(str: string, offset: number): number {
  const cleaned = str.replace(/[TZ]/g, ' ').trim()
  const d = new Date(cleaned)
  if (isNaN(d.getTime())) return NaN
  const utcMs = d.getTime() - offset * 3600000
  return mode.value === 'seconds' ? Math.floor(utcMs / 1000) : utcMs
}

// ——— 左侧转换 ———
function updateTsToDate(): void {
  const val = tsInput.value.trim()
  if (!val) { tsResult.value = ''; tsIso.value = ''; return }
  const num = Number(val)
  if (isNaN(num) || num < 0) { tsResult.value = '无效'; tsIso.value = ''; return }
  const ms = mode.value === 'seconds' ? num * 1000 : num
  const d = new Date(ms)
  if (isNaN(d.getTime())) { tsResult.value = '溢出'; tsIso.value = ''; return }
  tsResult.value = formatDate(d)
  tsIso.value = d.toISOString()
}

// ——— 右侧转换 ———
function updateDtToTs(): void {
  const val = dtInput.value.trim()
  if (!val) { dtResultS.value = ''; dtResultMs.value = ''; return }
  const offset = getTzOffset(dtTimezone.value)
  const ts = parseDateToTs(val, offset)
  if (isNaN(ts)) {
    dtResultS.value = '无效'
    dtResultMs.value = ''
    return
  }
  if (mode.value === 'seconds') {
    dtResultS.value = String(Math.floor(ts))
    dtResultMs.value = String(ts * 1000)
  } else {
    dtResultS.value = String(Math.floor(ts / 1000))
    dtResultMs.value = String(ts)
  }
}

watch(tsInput, updateTsToDate)
watch(mode, () => { updateNow(); updateTsToDate(); updateDtToTs() })
watch(tsPrecision, () => { /* placeholder */ })
watch([dtInput, dtTimezone], updateDtToTs)

// ——— 交换方向 ———
function swapDirection(): void {
  if (tsResult.value && !dtInput.value) {
    dtInput.value = tsResult.value
  } else if (dtResultS.value && !tsInput.value) {
    tsInput.value = dtResultS.value
  } else if (tsInput.value || dtInput.value) {
    if (tsResult.value) dtInput.value = tsResult.value
    if (dtResultS.value) tsInput.value = dtResultS.value
  }
}

// ——— 填入当前时间 ———
function fillNowToDt(): void {
  const d = new Date()
  dtInput.value = formatDate(d)
}

// ——— 复制 & 粘贴 ———
async function copy(text: string): Promise<void> {
  if (!text || text === '无效' || text === '溢出') return
  try {
    await navigator.clipboard.writeText(text)
    notify('✓ 已复制')
  } catch { /* ignore */ }
}

async function paste(target: 'ts' | 'dt'): Promise<void> {
  try {
    const text = await navigator.clipboard.readText()
    if (target === 'ts') tsInput.value = text
    else dtInput.value = text
    notify('✓ 已粘贴')
  } catch { /* ignore */ }
}

// ——— 常用格式 ———
const formatItems = computed(() => {
  const val = tsInput.value.trim()
  const num = Number(val)
  if (!val || isNaN(num)) {
    return [
      { name: 'RFC 3339', value: '2026-07-05T21:03:00+08:00' },
      { name: 'ISO 8601', value: '2026-07-05T21:03:00Z' },
      { name: 'RFC 2822', value: 'Sun, 05 Jul 2026 21:03:00 GMT' },
      { name: 'Unix 秒', value: '1751734980' },
      { name: 'Unix 毫秒', value: '1751734980000' },
      { name: 'MySQL', value: '2026-07-05 21:03:00' }
    ]
  }
  const ms = mode.value === 'seconds' ? num * 1000 : num
  const d = new Date(ms)
  if (isNaN(d.getTime())) {
    return [
      { name: 'RFC 3339', value: '--' },
      { name: 'ISO 8601', value: '--' },
      { name: 'RFC 2822', value: '--' },
      { name: 'Unix 秒', value: '--' },
      { name: 'Unix 毫秒', value: '--' },
      { name: 'MySQL', value: '--' }
    ]
  }
  const pad = (n: number) => String(n).padStart(2, '0')
  return [
    { name: 'RFC 3339', value: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}+08:00` },
    { name: 'ISO 8601', value: d.toISOString() },
    { name: 'RFC 2822', value: d.toUTCString().replace('GMT', 'GMT+8') },
    { name: 'Unix 秒', value: mode.value === 'seconds' ? String(Math.floor(ms / 1000)) : String(Math.floor(ms / 1000)) },
    { name: 'Unix 毫秒', value: String(ms) },
    { name: 'MySQL', value: formatDate(d) }
  ]
})

// 初始化
updateTsToDate()
updateDtToTs()
</script>

<template>
  <div class="space-y-6">

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

    <!-- ===== 当前时间栏 ===== -->
    <div
      class="flex items-center justify-between rounded-xl border px-6 py-5"
      :style="{
        backgroundColor: 'var(--bg-card)',
        borderColor: 'var(--border)',
        backgroundImage: 'linear-gradient(135deg, rgba(99,102,241,0.08), rgba(16,185,129,0.08))'
      }"
    >
      <div class="flex items-center gap-4">
        <div
          class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl"
          :style="{ backgroundColor: 'rgba(99,102,241,0.15)', color: '#6366f1' }"
        >
          <UIcon name="i-heroicons-clock" size="24" />
        </div>
        <div>
          <div class="text-sm" :style="{ color: 'var(--text-secondary)' }">当前时间</div>
          <div
            class="text-[26px] font-bold tracking-wider font-mono"
            :style="{
              background: 'linear-gradient(90deg, #6366f1, #10b981)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }"
          >{{ nowTime }}</div>
        </div>
      </div>
      <div class="flex flex-col items-end gap-2">
        <div
          class="flex items-center gap-2 rounded-lg border px-3 py-2"
          :style="{ backgroundColor: 'var(--bg-base)', borderColor: 'var(--border)' }"
        >
          <span
            class="min-w-[130px] text-right text-lg font-semibold font-mono"
            :style="{ color: '#6366f1' }"
          >{{ nowTimestamp }}</span>
          <div
            class="flex overflow-hidden rounded border"
            :style="{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-card)' }"
          >
            <button
              class="cursor-pointer px-2.5 py-1 text-[11px] font-medium transition-all"
              :style="{
                backgroundColor: mode === 'seconds' ? '#6366f1' : 'transparent',
                color: mode === 'seconds' ? '#fff' : 'var(--text-muted)'
              }"
              @click="mode = 'seconds'"
            >秒</button>
            <button
              class="cursor-pointer px-2.5 py-1 text-[11px] font-medium transition-all"
              :style="{
                backgroundColor: mode === 'milliseconds' ? '#6366f1' : 'transparent',
                color: mode === 'milliseconds' ? '#fff' : 'var(--text-muted)'
              }"
              @click="mode = 'milliseconds'"
            >毫秒</button>
          </div>
          <button
            class="flex h-7 w-7 cursor-pointer items-center justify-center rounded text-sm transition-colors"
            :style="{ color: 'var(--text-muted)' }"
            title="复制"
            @click="copy(nowTimestamp)"
          ><UIcon name="i-heroicons-document-duplicate" size="14" /></button>
        </div>
        <div class="text-[11px] text-right" :style="{ color: 'var(--text-muted)' }">Unix 时间戳</div>
      </div>
    </div>

    <!-- ===== 转换区域 ===== -->
    <div class="flex items-start gap-5">
      <!-- 左侧：时间戳 → 日期 -->
      <div
        class="flex-1 rounded-xl border"
        :style="{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }"
      >
        <div
          class="flex items-center gap-2 border-b px-5 py-3.5 text-sm font-semibold"
          :style="{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }"
        >
          <UIcon name="i-heroicons-arrow-right" size="16" style="color: #10b981" />
          时间戳 → 日期
        </div>
        <div class="space-y-4 p-5">
          <!-- Unix 时间戳输入 -->
          <div>
            <label class="mb-1.5 block text-xs" :style="{ color: 'var(--text-muted)' }">Unix 时间戳</label>
            <div class="relative">
              <input
                :value="tsInput"
                placeholder="输入时间戳..."
                class="w-full rounded-lg border px-4 py-2.5 pr-20 text-sm font-mono outline-none transition-all"
                :style="{ backgroundColor: 'var(--bg-base)', borderColor: 'var(--border)', color: 'var(--text-primary)' }"
                @input="tsInput = ($event.target as HTMLInputElement).value"
                @focus="($event.target as HTMLElement).style.borderColor = '#6366f1'"
                @blur="($event.target as HTMLElement).style.borderColor = 'var(--border)'"
              />
              <div class="absolute right-1.5 top-1/2 flex -translate-y-1/2 gap-0.5">
                <button class="flex h-7 w-7 cursor-pointer items-center justify-center rounded text-sm transition-colors hover:bg-[var(--border)]" :style="{ color: 'var(--text-muted)' }" title="粘贴" @click="paste('ts')"><UIcon name="i-heroicons-clipboard" size="14" /></button>
                <button class="flex h-7 w-7 cursor-pointer items-center justify-center rounded text-sm transition-colors hover:bg-[var(--border)]" :style="{ color: 'var(--text-muted)' }" title="复制" @click="copy(tsInput)"><UIcon name="i-heroicons-document-duplicate" size="14" /></button>
              </div>
            </div>
          </div>
          <!-- 精度 -->
          <div>
            <label class="mb-1.5 block text-xs" :style="{ color: 'var(--text-muted)' }">精度</label>
            <select
              :value="tsPrecision"
              class="w-full cursor-pointer rounded-lg border px-4 py-2.5 text-sm outline-none transition-all"
              :style="{ backgroundColor: 'var(--bg-base)', borderColor: 'var(--border)', color: 'var(--text-primary)' }"
              @change="tsPrecision = ($event.target as HTMLSelectElement).value as 's' | 'ms' | 'us'"
              @focus="($event.target as HTMLElement).style.borderColor = '#6366f1'"
              @blur="($event.target as HTMLElement).style.borderColor = 'var(--border)'"
            >
              <option v-for="p in precisionItems" :key="p.value" :value="p.value">{{ p.label }}</option>
            </select>
          </div>
          <!-- 转换结果 -->
          <div>
            <label class="mb-1.5 block text-xs" :style="{ color: 'var(--text-muted)' }">转换结果</label>
            <div class="relative">
              <input
                :value="tsResult"
                readonly
                class="w-full rounded-lg border px-4 py-2.5 pr-10 text-sm font-mono outline-none"
                :style="{
                  backgroundColor: 'rgba(16,185,129,0.05)',
                  borderColor: 'rgba(16,185,129,0.3)',
                  color: (tsResult === '无效' || tsResult === '溢出') ? '#ef4444' : '#10b981'
                }"
              />
              <div class="absolute right-1.5 top-1/2 -translate-y-1/2">
                <button class="flex h-7 w-7 cursor-pointer items-center justify-center rounded text-sm transition-colors hover:bg-[var(--border)]" :style="{ color: 'var(--text-muted)' }" title="复制" @click="copy(tsResult)"><UIcon name="i-heroicons-document-duplicate" size="14" /></button>
              </div>
            </div>
          </div>
          <!-- ISO 8601 -->
          <div>
            <label class="mb-1.5 block text-xs" :style="{ color: 'var(--text-muted)' }">ISO 8601</label>
            <div class="relative">
              <input
                :value="tsIso"
                readonly
                class="w-full rounded-lg border px-4 py-2.5 pr-10 text-sm font-mono outline-none"
                :style="{ backgroundColor: 'rgba(16,185,129,0.05)', borderColor: 'rgba(16,185,129,0.3)', color: '#10b981' }"
              />
              <div class="absolute right-1.5 top-1/2 -translate-y-1/2">
                <button class="flex h-7 w-7 cursor-pointer items-center justify-center rounded text-sm transition-colors hover:bg-[var(--border)]" :style="{ color: 'var(--text-muted)' }" title="复制" @click="copy(tsIso)"><UIcon name="i-heroicons-document-duplicate" size="14" /></button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 交换按钮 -->
      <button
        class="mt-14 flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full border transition-all duration-300 hover:rotate-180"
        :style="{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)', color: '#6366f1' }"
        title="交换方向"
        @mouseenter="($event.currentTarget as HTMLElement).style.backgroundColor = '#6366f1'; ($event.currentTarget as HTMLElement).style.color = '#fff'"
        @mouseleave="($event.currentTarget as HTMLElement).style.backgroundColor = 'var(--bg-card)'; ($event.currentTarget as HTMLElement).style.color = '#6366f1'"
        @click="swapDirection"
      >
        <UIcon name="i-heroicons-arrows-right-left" size="18" />
      </button>

      <!-- 右侧：日期 → 时间戳 -->
      <div
        class="flex-1 rounded-xl border"
        :style="{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }"
      >
        <div
          class="flex items-center gap-2 border-b px-5 py-3.5 text-sm font-semibold"
          :style="{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }"
        >
          <UIcon name="i-heroicons-arrow-left" size="16" style="color: #6366f1" />
          日期 → 时间戳
        </div>
        <div class="space-y-4 p-5">
          <!-- 日期时间 -->
          <div>
            <label class="mb-1.5 block text-xs" :style="{ color: 'var(--text-muted)' }">日期时间</label>
            <div class="relative">
              <input
                :value="dtInput"
                placeholder="YYYY-MM-DD HH:mm:ss"
                class="w-full rounded-lg border px-4 py-2.5 pr-28 text-sm font-mono outline-none transition-all"
                :style="{ backgroundColor: 'var(--bg-base)', borderColor: 'var(--border)', color: 'var(--text-primary)' }"
                @input="dtInput = ($event.target as HTMLInputElement).value"
                @focus="($event.target as HTMLElement).style.borderColor = '#6366f1'"
                @blur="($event.target as HTMLElement).style.borderColor = 'var(--border)'"
              />
              <div class="absolute right-1.5 top-1/2 flex -translate-y-1/2 gap-0.5">
                <button class="flex h-7 w-7 cursor-pointer items-center justify-center rounded text-sm transition-colors hover:bg-[var(--border)]" :style="{ color: 'var(--text-muted)' }" title="粘贴" @click="paste('dt')"><UIcon name="i-heroicons-clipboard" size="14" /></button>
                <button class="flex h-7 w-7 cursor-pointer items-center justify-center rounded text-sm transition-colors hover:bg-[var(--border)]" :style="{ color: 'var(--text-muted)' }" title="复制" @click="copy(dtInput)"><UIcon name="i-heroicons-document-duplicate" size="14" /></button>
                <button class="flex h-7 w-7 cursor-pointer items-center justify-center rounded text-sm transition-colors hover:bg-[var(--border)]" :style="{ color: 'var(--text-muted)' }" title="填入当前时间" @click="fillNowToDt"><UIcon name="i-heroicons-clock" size="14" /></button>
              </div>
            </div>
          </div>
          <!-- 时区 -->
          <div>
            <label class="mb-1.5 block text-xs" :style="{ color: 'var(--text-muted)' }">时区</label>
            <select
              :value="dtTimezone"
              class="w-full cursor-pointer rounded-lg border px-4 py-2.5 text-sm outline-none transition-all"
              :style="{ backgroundColor: 'var(--bg-base)', borderColor: 'var(--border)', color: 'var(--text-primary)' }"
              @change="dtTimezone = ($event.target as HTMLSelectElement).value"
              @focus="($event.target as HTMLElement).style.borderColor = '#6366f1'"
              @blur="($event.target as HTMLElement).style.borderColor = 'var(--border)'"
            >
              <option v-for="tz in timezones" :key="tz.label" :value="tz.label">{{ tz.label }}</option>
            </select>
          </div>
          <!-- 转换结果 (秒) -->
          <div>
            <label class="mb-1.5 block text-xs" :style="{ color: 'var(--text-muted)' }">转换结果 (秒)</label>
            <div class="relative">
              <input
                :value="dtResultS"
                readonly
                class="w-full rounded-lg border px-4 py-2.5 pr-10 text-sm font-mono outline-none"
                :style="{
                  backgroundColor: 'rgba(99,102,241,0.05)',
                  borderColor: 'rgba(99,102,241,0.3)',
                  color: dtResultS === '无效' ? '#ef4444' : '#6366f1'
                }"
              />
              <div class="absolute right-1.5 top-1/2 -translate-y-1/2">
                <button class="flex h-7 w-7 cursor-pointer items-center justify-center rounded text-sm transition-colors hover:bg-[var(--border)]" :style="{ color: 'var(--text-muted)' }" title="复制" @click="copy(dtResultS)"><UIcon name="i-heroicons-document-duplicate" size="14" /></button>
              </div>
            </div>
          </div>
          <!-- 转换结果 (毫秒) -->
          <div>
            <label class="mb-1.5 block text-xs" :style="{ color: 'var(--text-muted)' }">转换结果 (毫秒)</label>
            <div class="relative">
              <input
                :value="dtResultMs"
                readonly
                class="w-full rounded-lg border px-4 py-2.5 pr-10 text-sm font-mono outline-none"
                :style="{
                  backgroundColor: 'rgba(99,102,241,0.05)',
                  borderColor: 'rgba(99,102,241,0.3)',
                  color: dtResultMs === '无效' ? '#ef4444' : '#6366f1'
                }"
              />
              <div class="absolute right-1.5 top-1/2 -translate-y-1/2">
                <button class="flex h-7 w-7 cursor-pointer items-center justify-center rounded text-sm transition-colors hover:bg-[var(--border)]" :style="{ color: 'var(--text-muted)' }" title="复制" @click="copy(dtResultMs)"><UIcon name="i-heroicons-document-duplicate" size="14" /></button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ===== 常用格式参考 ===== -->
    <div
      class="rounded-xl border"
      :style="{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }"
    >
      <div
        class="flex items-center gap-2 border-b px-5 py-3.5 text-sm font-semibold"
        :style="{ borderColor: 'var(--border)', color: 'var(--text-primary)' }"
      >
        <UIcon name="i-heroicons-calendar" size="16" style="color: #f59e0b" />
        常用格式参考
      </div>
      <div class="grid grid-cols-3 gap-3 p-5">
        <div
          v-for="item in formatItems"
          :key="item.name"
          class="group relative cursor-pointer rounded-lg border p-3 transition-all hover:border-[#6366f1]"
          :style="{ backgroundColor: 'var(--bg-base)', borderColor: 'var(--border)' }"
          @click="copy(item.value)"
        >
          <div
            class="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded text-xs transition-all opacity-0 group-hover:opacity-100"
            :style="{ color: 'var(--text-muted)' }"
          >
            <UIcon name="i-heroicons-document-duplicate" size="12" />
          </div>
          <div class="mb-1 text-xs" :style="{ color: 'var(--text-muted)' }">{{ item.name }}</div>
          <div class="truncate text-sm font-mono font-medium" :style="{ color: 'var(--text-primary)' }">{{ item.value }}</div>
        </div>
      </div>
    </div>
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
select {
  appearance: auto;
  -webkit-appearance: auto;
}
</style>
