<script setup lang="ts">
import { ref, computed } from 'vue'

const props = withDefaults(defineProps<{
  selectedCount?: number
  disabled?: boolean
}>(), {
  selectedCount: 0,
  disabled: false,
})

const emit = defineEmits<{
  share: [config: { viewLimit: number; expireDays: number; extractCode: string }]
}>()

const viewLimit = ref(3)
const expireDays = ref(7)
const extractCode = ref(generateExtractCode())
const shareResult = ref<{ url: string; extractCode: string; expireAt: string } | null>(null)

const expireOptions = [
  { value: 1, label: '1天' },
  { value: 3, label: '3天' },
  { value: 7, label: '7天' },
  { value: 30, label: '30天' },
]

function generateExtractCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

function generateRandomId(): string {
  return Math.random().toString(36).substring(2, 10)
}

function generateMockShareUrl(): string {
  return `https://pan.example.com/s/${generateRandomId()}`
}

function calcExpireAt(days: number): string {
  const now = new Date()
  now.setDate(now.getDate() + days)
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  const h = String(now.getHours()).padStart(2, '0')
  const min = String(now.getMinutes()).padStart(2, '0')
  return `${y}-${m}-${d} ${h}:${min}`
}

function refreshExtractCode(): void {
  extractCode.value = generateExtractCode()
}

function handleGenerate(): void {
  const config = {
    viewLimit: viewLimit.value,
    expireDays: expireDays.value,
    extractCode: extractCode.value,
  }
  emit('share', config)
  shareResult.value = {
    url: generateMockShareUrl(),
    extractCode: extractCode.value,
    expireAt: calcExpireAt(expireDays.value),
  }
}

function handleCopy(): void {
  if (!shareResult.value) return
  const text = `分享链接：${shareResult.value.url}\n提取码：${shareResult.value.extractCode}\n过期时间：${shareResult.value.expireAt}`
  navigator.clipboard.writeText(text)
}

function handleRegenerate(): void {
  shareResult.value = null
  extractCode.value = generateExtractCode()
}

const buttonText = computed(() => {
  if (props.selectedCount === 0) return '请先选择文件'
  return `生成分享链接 (已选 ${props.selectedCount} 个文件)`
})
</script>

<template>
  <div
    class="rounded-xl border p-5"
    :style="{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }"
  >
    <h3 class="mb-4 text-sm font-semibold" :style="{ color: 'var(--text-primary)' }">分享配置</h3>

    <!-- 查看次数限制 -->
    <div class="mb-4">
      <label class="mb-1.5 block text-xs font-medium" :style="{ color: 'var(--text-secondary)' }">限制查看次数</label>
      <input
        v-model.number="viewLimit"
        type="number"
        min="1"
        class="w-full rounded-lg border px-3.5 py-2.5 text-sm outline-none transition-all focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]"
        :style="{
          backgroundColor: 'var(--bg-input)',
          borderColor: 'var(--border)',
          color: 'var(--text-primary)',
        }"
      />
    </div>

    <!-- 有效期 -->
    <div class="mb-4">
      <label class="mb-1.5 block text-xs font-medium" :style="{ color: 'var(--text-secondary)' }">有效期</label>
      <select
        v-model.number="expireDays"
        class="w-full rounded-lg border px-3.5 py-2.5 text-sm outline-none transition-all focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]"
        :style="{
          backgroundColor: 'var(--bg-input)',
          borderColor: 'var(--border)',
          color: 'var(--text-primary)',
        }"
      >
        <option
          v-for="opt in expireOptions"
          :key="opt.value"
          :value="opt.value"
        >{{ opt.label }}</option>
      </select>
    </div>

    <!-- 提取码 -->
    <div class="mb-5">
      <label class="mb-1.5 block text-xs font-medium" :style="{ color: 'var(--text-secondary)' }">提取码</label>
      <div class="flex gap-2">
        <input
          v-model="extractCode"
          type="text"
          maxlength="6"
          class="flex-1 rounded-lg border px-3.5 py-2.5 text-sm outline-none transition-all focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]"
          :style="{
            backgroundColor: 'var(--bg-input)',
            borderColor: 'var(--border)',
            color: 'var(--text-primary)',
          }"
        />
        <button
          class="flex items-center justify-center rounded-lg border px-3 transition-all hover:opacity-80"
          :style="{
            borderColor: 'var(--border)',
            backgroundColor: 'var(--bg-elevated)',
            color: 'var(--text-secondary)',
          }"
          title="重新生成提取码"
          @click="refreshExtractCode"
        >
          <UIcon name="i-heroicons-arrow-path" size="16" />
        </button>
      </div>
    </div>

    <!-- 生成分享链接按钮 -->
    <button
      :disabled="selectedCount === 0"
      class="w-full rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition-all disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98]"
      :style="{
        backgroundColor: selectedCount > 0 ? 'var(--accent, #6366f1)' : '#6366f1',
      }"
      @click="handleGenerate"
    >
      {{ buttonText }}
    </button>

    <!-- 分享结果 -->
    <div
      v-if="shareResult"
      class="mt-5 rounded-xl border p-4"
      :style="{ borderColor: '#10b981', backgroundColor: 'var(--bg-card)' }"
    >
      <div class="mb-3 flex items-center gap-2">
        <UIcon name="i-heroicons-check-circle" size="18" style="color: #10b981" />
        <span class="text-sm font-semibold" :style="{ color: 'var(--text-primary)' }">分享成功</span>
      </div>

      <!-- 分享链接 -->
      <div class="mb-3">
        <label class="mb-1 block text-xs font-medium" :style="{ color: 'var(--text-secondary)' }">分享链接</label>
        <div
          class="rounded-lg border px-3.5 py-2.5 text-sm break-all select-all"
          :style="{
            backgroundColor: 'var(--bg-elevated)',
            borderColor: 'var(--border)',
            color: 'var(--text-primary)',
          }"
        >{{ shareResult.url }}</div>
      </div>

      <!-- 提取码 -->
      <div class="mb-3">
        <label class="mb-1 block text-xs font-medium" :style="{ color: 'var(--text-secondary)' }">提取码</label>
        <div
          class="rounded-lg border px-3.5 py-2.5 text-sm font-mono tracking-wider"
          :style="{
            backgroundColor: 'var(--bg-elevated)',
            borderColor: 'var(--border)',
            color: 'var(--text-primary)',
          }"
        >{{ shareResult.extractCode }}</div>
      </div>

      <!-- 过期时间 -->
      <div class="mb-4">
        <label class="mb-1 block text-xs font-medium" :style="{ color: 'var(--text-secondary)' }">过期时间</label>
        <div
          class="rounded-lg border px-3.5 py-2.5 text-sm"
          :style="{
            backgroundColor: 'var(--bg-elevated)',
            borderColor: 'var(--border)',
            color: 'var(--text-primary)',
          }"
        >{{ shareResult.expireAt }}</div>
      </div>

      <!-- 操作按钮 -->
      <div class="flex gap-3">
        <button
          class="flex-1 rounded-lg px-4 py-2 text-sm font-medium text-white transition-all active:scale-[0.98]"
          style="background-color: #6366f1"
          @click="handleCopy"
        >
          <span class="flex items-center justify-center gap-1.5">
            <UIcon name="i-heroicons-clipboard-document" size="16" />
            复制链接
          </span>
        </button>
        <button
          class="flex-1 rounded-lg border px-4 py-2 text-sm font-medium transition-all active:scale-[0.98]"
          :style="{
            borderColor: 'var(--border)',
            color: 'var(--text-primary)',
          }"
          @click="handleRegenerate"
        >
          <span class="flex items-center justify-center gap-1.5">
            <UIcon name="i-heroicons-arrow-path" size="16" />
            重新生成
          </span>
        </button>
      </div>
    </div>
  </div>
</template>
