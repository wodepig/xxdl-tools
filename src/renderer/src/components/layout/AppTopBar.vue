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
        <UIcon name="i-heroicons-squares-2x2" class="text-white" size="18" />
      </div>
      <span class="text-base font-semibold" style="color: var(--text-primary)">DevToolbox</span>
    </div>

    <!-- 右侧操作按钮 -->
    <div class="flex items-center gap-1" style="-webkit-app-region: no-drag">
      <!-- 主题切换 -->
      <UButton
        icon="i-heroicons-sun"
        variant="ghost"
        color="neutral"
        size="sm"
        class="hover:scale-110"
        :style="{ color: 'var(--text-secondary)' }"
        title="切换主题"
        @click="emit('toggle-theme')"
      />
      <!-- 设置 -->
      <UButton
        icon="i-heroicons-cog-6-tooth"
        variant="ghost"
        color="neutral"
        size="sm"
        :style="{ color: 'var(--text-secondary)' }"
        @click="emit('open-settings')"
      />
      <!-- 窗口控制 -->
      <UButton
        icon="i-heroicons-minus"
        variant="ghost"
        color="neutral"
        size="sm"
        :style="{ color: 'var(--text-secondary)' }"
        @click="emit('minimize')"
      />
      <UButton
        icon="i-heroicons-arrows-pointing-out"
        variant="ghost"
        color="neutral"
        size="sm"
        :style="{ color: 'var(--text-secondary)' }"
        @click="emit('maximize')"
      />
      <UButton
        icon="i-heroicons-x-mark"
        variant="ghost"
        color="neutral"
        size="sm"
        :style="{ color: 'var(--text-secondary)' }"
        class="hover:text-red-400"
        @click="emit('close')"
      />
    </div>
  </div>
</template>
