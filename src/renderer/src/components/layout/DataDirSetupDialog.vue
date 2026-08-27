<script setup lang="ts">
import { ref, watch } from 'vue'
import { ipcClient } from '../../ipc/client'

const props = defineProps<{ visible: boolean; defaultDir: string }>()
const emit = defineEmits<{
  (e: 'close'): void
  (e: 'configured', dir: string): void
}>()

const choosing = ref(false)

const STORAGE_KEY = 'xxdl-data-dir-setup-dismissed'

watch(
  () => props.visible,
  (v) => {
    if (!v) return
    // 避免每次都弹出：选择过或点过“暂不设置”都不再自动弹出
    if (localStorage.getItem(STORAGE_KEY) === '1') {
      emit('close')
    }
  },
  { immediate: true }
)

async function handleChoose(): Promise<void> {
  if (choosing.value) return
  choosing.value = true
  try {
    const next = await ipcClient.chooseDataDir()
    if (next) {
      localStorage.setItem(STORAGE_KEY, '1')
      emit('configured', next)
    }
  } catch (e) {
    console.error('Failed to choose data dir:', e)
  } finally {
    choosing.value = false
  }
}

function handleDismiss(): void {
  localStorage.setItem(STORAGE_KEY, '1')
  emit('close')
}
</script>

<template>
  <div
    v-if="visible"
    class="fixed inset-0 z-50 flex items-center justify-center"
    style="background-color: rgba(0, 0, 0, 0.5)"
  >
    <div
      class="w-[440px] max-w-[90vw] rounded-2xl border p-6 shadow-2xl"
      :style="{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }"
    >
      <div class="flex items-center gap-3 mb-4">
        <div
          class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
          style="background-color: #06b6d41f; color: #06b6d4"
        >
          <UIcon name="i-heroicons-folder" size="24" />
        </div>
        <div>
          <h2 class="text-lg font-semibold" :style="{ color: 'var(--text-primary)' }">选择数据存储目录</h2>
          <p class="text-xs mt-0.5" :style="{ color: 'var(--text-secondary)' }">首次使用，需要指定数据保存位置</p>
        </div>
      </div>

      <div
        class="mb-4 rounded-xl border p-3 text-[13px] leading-relaxed"
        :style="{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-base)', color: 'var(--text-secondary)' }"
      >
        为保障你的数据安全，应用建议将数据保存在一个<b>固定的、专门的目录</b>中，例如
        <code class="rounded px-1 py-0.5 text-[12px] font-mono" style="background-color: var(--border)">D:\ MyData \ xxdl-tools</code>
        。<br />这样即便应用<b>升级或重装</b>，历史数据也不会丢失。
      </div>

      <div class="mb-5 rounded-lg border px-3 py-2 font-mono text-[12px] break-all" :style="{ borderColor: 'var(--border)', color: 'var(--text-muted)' }">
        当前默认目录：{{ defaultDir }}
      </div>

      <div class="flex justify-end gap-2">
        <button
          class="h-9 cursor-pointer rounded-lg px-4 text-[13px] transition-colors"
          :style="{
            backgroundColor: 'transparent',
            color: 'var(--text-secondary)',
            border: '1px solid var(--border)'
          }"
          @click="handleDismiss"
        >
          暂不设置
        </button>
        <button
          class="flex h-9 cursor-pointer items-center gap-1.5 rounded-lg px-4 text-[13px] font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          :style="{ backgroundColor: '#06b6d4' }"
          :disabled="choosing"
          @click="handleChoose"
        >
          <UIcon v-if="choosing" name="i-heroicons-arrow-path" size="14" class="animate-spin" />
          <UIcon v-else name="i-heroicons-folder-open" size="14" />
          {{ choosing ? '请选择…' : '选择数据目录' }}
        </button>
      </div>
    </div>
  </div>
</template>