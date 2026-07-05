<script setup lang="ts">
const emit = defineEmits<{
  'open-settings': []
  'toggle-theme': []
  minimize: []
  maximize: []
  close: []
}>()
</script>

<template>
  <div
    class="flex h-14 w-full shrink-0 items-center justify-between border-b px-6"
    :style="{
      borderColor: 'var(--border)',
      backgroundColor: 'var(--bg-topbar)'
    }"
    style="-webkit-app-region: drag"
  >
    <!-- 左侧 Logo -->
    <div class="flex items-center gap-3">
      <div
        class="flex h-8 w-8 items-center justify-center rounded-lg"
        style="background: linear-gradient(135deg, #6366f1, #a855f7)"
      >
        <UIcon name="i-heroicons-squares-2x2" size="18" class="text-white" />
      </div>
      <span class="text-base font-semibold" style="color: var(--text-primary)">DevToolbox</span>
    </div>

    <!-- 右侧操作按钮 -->
    <div class="flex items-center gap-0.5" style="-webkit-app-region: no-drag">
      <!-- 主题切换 -->
      <button
        class="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg transition-colors hover:bg-[var(--border)]"
        :style="{ color: 'var(--text-secondary)' }"
        title="切换主题"
        @click="emit('toggle-theme')"
      >
        <UIcon name="i-heroicons-sun" size="18" />
      </button>
      <!-- 设置 -->
      <button
        class="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg transition-colors hover:bg-[var(--border)]"
        :style="{ color: 'var(--text-secondary)' }"
        title="设置"
        @click="emit('open-settings')"
      >
        <UIcon name="i-heroicons-cog-6-tooth" size="18" />
      </button>
      <!-- 窗口控制 -->
      <button
        class="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg transition-colors hover:bg-[var(--border)]"
        :style="{ color: 'var(--text-secondary)' }"
        title="最小化"
        @click="emit('minimize')"
      >
        <UIcon name="i-heroicons-minus" size="18" />
      </button>
      <button
        class="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg transition-colors hover:bg-[var(--border)]"
        :style="{ color: 'var(--text-secondary)' }"
        title="最大化"
        @click="emit('maximize')"
      >
        <UIcon name="i-heroicons-arrows-pointing-out" size="18" />
      </button>
      <button
        class="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg transition-colors hover:bg-[var(--border)] hover:text-red-400"
        :style="{ color: 'var(--text-secondary)' }"
        title="关闭"
        @click="emit('close')"
      >
        <UIcon name="i-heroicons-x-mark" size="18" />
      </button>
    </div>
  </div>
</template>
