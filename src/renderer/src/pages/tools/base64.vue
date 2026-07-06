<script setup lang="ts">
import { ref, watch } from 'vue'

// ——— 状态 ———
const textInput = ref('')
const textOutput = ref('')
const textMode = ref<'encode' | 'decode'>('encode')

const imageSrc = ref('')
const imageBase64Full = ref('')
const imageBase64Pure = ref('')
const imageFileName = ref('')
const isDragOver = ref(false)
const copiedKey = ref<string | null>(null)
let copiedTimer: ReturnType<typeof setTimeout> | null = null

// ——— 复制反馈 ———
function showCopied(key: string): void {
  if (copiedTimer) clearTimeout(copiedTimer)
  copiedKey.value = key
  copiedTimer = setTimeout(() => { copiedKey.value = null }, 1500)
}

// ——— 文本编解码 ———
function detectMode(input: string): 'encode' | 'decode' {
  if (/[\u4e00-\u9fff\u3000-\u303f\uff00-\uffef]/.test(input)) return 'encode'
  if (/[^A-Za-z0-9+/=]/.test(input)) return 'encode'
  if (input.length >= 4 && /^[A-Za-z0-9+/]*={0,2}$/.test(input)) return 'decode'
  return 'encode'
}

function doEncode(text: string): string {
  try {
    const bytes = new TextEncoder().encode(text)
    let binary = ''
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
    return btoa(binary)
  } catch {
    try { return btoa(text) } catch { return '' }
  }
}

function doDecode(base64: string): string {
  try {
    const binary = atob(base64)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
    return new TextDecoder().decode(bytes)
  } catch { return '' }
}

function convertText(): void {
  const input = textInput.value
  if (!input) { textOutput.value = ''; return }
  textMode.value = detectMode(input)
  textOutput.value = textMode.value === 'encode' ? doEncode(input) : doDecode(input)
}

watch(textInput, convertText)

// ——— 图片转 Base64 ———
function loadImageFile(file: File): void {
  if (!file.type.startsWith('image/')) return
  imageFileName.value = file.name
  const reader = new FileReader()
  reader.onload = () => {
    const result = reader.result as string
    imageSrc.value = result
    const commaIdx = result.indexOf(',')
    imageBase64Full.value = result
    imageBase64Pure.value = commaIdx >= 0 ? result.substring(commaIdx + 1) : result
  }
  reader.readAsDataURL(file)
}

function reSelectImage(): void {
  imageSrc.value = ''; imageBase64Full.value = ''; imageBase64Pure.value = ''; imageFileName.value = ''
  const input = document.getElementById('image-file-input') as HTMLInputElement | null
  input?.click()
}

function handleFileChange(event: Event): void {
  const input = event.target as HTMLInputElement
  if (input.files?.[0]) { loadImageFile(input.files[0]); input.value = '' }
}

function handleDrop(e: DragEvent): void {
  isDragOver.value = false
  const file = e.dataTransfer?.files?.[0]
  if (file) loadImageFile(file)
}

function handlePaste(e: ClipboardEvent): void {
  const item = Array.from(e.clipboardData?.items || []).find(i => i.type.startsWith('image/'))
  const file = item?.getAsFile()
  if (file) loadImageFile(file)
}

function handleDropzoneClick(e: MouseEvent): void {
  if (imageSrc.value && (e.target as HTMLElement).tagName === 'IMG') return
  document.getElementById('image-file-input')?.click()
}

function copyText(text: string, key: string): void {
  if (!text) return
  navigator.clipboard.writeText(text).then(() => showCopied(key))
}
</script>

<template>
  <div class="flex h-full flex-col overflow-hidden">
    <div class="flex-1 overflow-y-auto p-6">
      <div class="mx-auto flex max-w-5xl flex-col gap-6 xl:flex-row">

        <!-- ===== 卡片 1：文本编解码 ===== -->
        <div class="flex flex-1 flex-col rounded-xl border" :style="{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-card)' }">
          <!-- 卡片头部 -->
          <div class="flex items-center justify-between border-b px-5 py-3.5" :style="{ borderColor: 'var(--border)' }">
            <div class="flex items-center gap-2.5">
              <div class="h-2.5 w-2.5 rounded-full" style="background-color: #ec4899"></div>
              <span class="text-sm font-semibold" :style="{ color: 'var(--text-primary)' }">文本编解码</span>
            </div>
            <span
              v-if="textInput"
              class="rounded-md px-2 py-0.5 text-[11px] font-medium"
              :style="{
                backgroundColor: textMode === 'encode' ? '#ec489918' : '#10b98118',
                color: textMode === 'encode' ? '#ec4899' : '#10b981'
              }"
            >{{ textMode === 'encode' ? '编码模式' : '解码模式' }}</span>
          </div>

          <!-- 卡片内容 -->
          <div class="flex flex-col gap-5 p-5">
            <!-- 输入 -->
            <div>
              <label class="mb-1.5 block text-xs font-medium" :style="{ color: 'var(--text-muted)' }">输入</label>
              <textarea
                v-model="textInput"
                placeholder="输入文本或 Base64 字符串…"
                rows="5"
                class="w-full resize-none rounded-lg border px-3.5 py-2.5 text-sm font-mono leading-relaxed outline-none transition-all focus:border-[#ec4899] focus:ring-1 focus:ring-[#ec489933]"
                :style="{
                  borderColor: 'var(--border)',
                  backgroundColor: 'var(--bg-input)',
                  color: 'var(--text-primary)'
                }"
              ></textarea>
            </div>

            <!-- 输出 -->
            <div>
              <div class="mb-1.5 flex items-center justify-between">
                <label class="text-xs font-medium" :style="{ color: 'var(--text-muted)' }">转换结果</label>
                <span v-if="textOutput" class="text-[10px]" :style="{ color: 'var(--text-muted)' }">
                  {{ textOutput.length }} 字符
                </span>
              </div>
              <div class="relative">
                <textarea
                  :value="textOutput"
                  readonly
                  rows="5"
                  class="w-full resize-none rounded-lg border px-3.5 py-2.5 text-sm font-mono leading-relaxed outline-none"
                  :style="{
                    borderColor: 'var(--border)',
                    backgroundColor: 'var(--bg-elevated)',
                    color: 'var(--text-primary)'
                  }"
                ></textarea>
                <UButton
                  v-if="textOutput"
                  variant="ghost"
                  color="neutral"
                  size="xs"
                  square
                  class="absolute right-2.5 top-2.5"
                  title="复制结果"
                  @click="copyText(textOutput, 'text-result')"
                >
                  <UIcon v-if="copiedKey !== 'text-result'" name="i-heroicons-document-duplicate" size="14" />
                  <UIcon v-else name="i-heroicons-check" size="14" style="color: #10b981" />
                </UButton>
              </div>
            </div>

            <!-- 提示信息 -->
            <div
              class="rounded-lg px-3 py-2 text-[11px] leading-relaxed"
              :style="{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-muted)' }"
            >
              <div v-if="textInput && textMode === 'encode'">
                ⚡ 已自动切换为<strong style="color:#ec4899">编码模式</strong> — 输入文本含中文或特殊字符
              </div>
              <div v-else-if="textInput && textMode === 'decode'">
                ⚡ 已自动切换为<strong style="color:#10b981">解码模式</strong> — 输入内容符合 Base64 格式
              </div>
              <div v-else>输入自动检测编码或解码模式</div>
              <div class="mt-1 opacity-70">支持中文 UTF-8 编码 / 标准 Base64 解码</div>
            </div>
          </div>
        </div>

        <!-- ===== 卡片 2：图片转 Base64 ===== -->
        <div class="flex flex-1 flex-col rounded-xl border" :style="{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-card)' }">
          <!-- 卡片头部 -->
          <div class="flex items-center justify-between border-b px-5 py-3.5" :style="{ borderColor: 'var(--border)' }">
            <div class="flex items-center gap-2.5">
              <div class="h-2.5 w-2.5 rounded-full" style="background-color: #06b6d4"></div>
              <span class="text-sm font-semibold" :style="{ color: 'var(--text-primary)' }">图片转 Base64</span>
            </div>
          </div>

          <!-- 卡片内容 -->
          <div class="flex flex-col gap-5 p-5">
            <!-- 拖拽/选择区域 -->
            <div
              class="relative flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed py-10 transition-all"
              :class="{ 'opacity-80': imageSrc }"
              :style="{
                borderColor: isDragOver ? '#06b6d4' : 'var(--border)',
                backgroundColor: isDragOver ? '#06b6d408' : 'var(--bg-elevated)'
              }"
              tabindex="0"
              @drop.prevent="handleDrop"
              @dragover.prevent="isDragOver = true"
              @dragleave="isDragOver = false"
              @click="handleDropzoneClick"
              @paste="handlePaste"
            >
              <input
                id="image-file-input"
                type="file"
                accept="image/*"
                class="hidden"
                @change="handleFileChange"
              />

              <img
                v-if="imageSrc"
                :src="imageSrc"
                class="mb-3 max-h-40 max-w-full rounded-lg object-contain shadow-sm"
                alt="预览"
              />
              <div
                v-else
                class="mb-3 flex h-14 w-14 items-center justify-center rounded-xl"
                :style="{ backgroundColor: '#06b6d412' }"
              >
                <UIcon name="i-heroicons-photo" size="24" style="color: #06b6d4" />
              </div>

              <template v-if="!imageSrc">
                <div class="mb-1 text-sm font-medium" :style="{ color: 'var(--text-primary)' }">选择图片或拖拽到此区域</div>
                <div class="text-xs" :style="{ color: 'var(--text-muted)' }">支持 PNG / JPEG / GIF / WebP，可 Ctrl+V 粘贴截图</div>
              </template>
              <template v-else>
                <div class="mb-1 text-xs font-medium" :style="{ color: 'var(--text-primary)' }">{{ imageFileName }}</div>
                <UButton
                  v-if="imageSrc"
                  variant="solid"
                  color="info"
                  size="sm"
                  class="mt-2"
                  @click.stop="reSelectImage"
                >
                  <UIcon name="i-heroicons-arrow-path" size="12" />
                  重新选择
                </UButton>
              </template>
            </div>

            <!-- 完整 Data URL -->
            <div v-if="imageBase64Full">
              <div class="mb-1.5 flex items-center justify-between">
                <label class="text-xs font-medium" :style="{ color: 'var(--text-muted)' }">完整 Data URL</label>
                <span class="text-[10px]" :style="{ color: 'var(--text-muted)' }">{{ imageBase64Full.length }} 字符</span>
              </div>
              <div class="relative">
                <textarea
                  :value="imageBase64Full"
                  readonly
                  rows="3"
                  class="w-full resize-none rounded-lg border px-3 py-2.5 text-xs font-mono leading-relaxed outline-none"
                  :style="{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-elevated)', color: 'var(--text-primary)' }"
                ></textarea>
                <UButton
                  variant="ghost"
                  color="neutral"
                  size="xs"
                  square
                  class="absolute right-2.5 top-2.5"
                  title="复制完整 Data URL"
                  @click="copyText(imageBase64Full, 'full')"
                >
                  <UIcon v-if="copiedKey !== 'full'" name="i-heroicons-document-duplicate" size="14" />
                  <UIcon v-else name="i-heroicons-check" size="14" style="color: #10b981" />
                </UButton>
              </div>
            </div>

            <!-- 纯 Base64 -->
            <div v-if="imageBase64Pure">
              <div class="mb-1.5 flex items-center justify-between">
                <label class="text-xs font-medium" :style="{ color: 'var(--text-muted)' }">纯 Base64（不含头）</label>
                <span class="text-[10px]" :style="{ color: 'var(--text-muted)' }">{{ imageBase64Pure.length }} 字符</span>
              </div>
              <div class="relative">
                <textarea
                  :value="imageBase64Pure"
                  readonly
                  rows="3"
                  class="w-full resize-none rounded-lg border px-3 py-2.5 text-xs font-mono leading-relaxed outline-none"
                  :style="{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-elevated)', color: 'var(--text-primary)' }"
                ></textarea>
                <UButton
                  variant="ghost"
                  color="neutral"
                  size="xs"
                  square
                  class="absolute right-2.5 top-2.5"
                  title="复制纯 Base64"
                  @click="copyText(imageBase64Pure, 'pure')"
                >
                  <UIcon v-if="copiedKey !== 'pure'" name="i-heroicons-document-duplicate" size="14" />
                  <UIcon v-else name="i-heroicons-check" size="14" style="color: #10b981" />
                </UButton>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  </div>
</template>
