<script setup lang="ts">
const emit = defineEmits<{
  'open-settings': []
  minimize: []
  maximize: []
  close: []
}>()
</script>

<template>
  <div
    class="flex h-14 w-full shrink-0 items-center justify-between border-b border-[#334155] bg-[#0f172a] px-6"
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
      <span class="text-base font-semibold text-[#f1f5f9]">DevToolbox</span>
    </div>

    <!-- 右侧操作按钮 -->
    <div class="flex items-center gap-1" style="-webkit-app-region: no-drag">
      <UButton
        icon="i-heroicons-cog-6-tooth"
        variant="ghost"
        color="neutral"
        size="sm"
        class="text-[#94a3b8] hover:text-[#f1f5f9]"
        @click="emit('open-settings')"
      />
      <UButton
        icon="i-heroicons-minus"
        variant="ghost"
        color="neutral"
        size="sm"
        class="text-[#94a3b8] hover:text-[#f1f5f9]"
        @click="emit('minimize')"
      />
      <UButton
        icon="i-heroicons-arrows-pointing-out"
        variant="ghost"
        color="neutral"
        size="sm"
        class="text-[#94a3b8] hover:text-[#f1f5f9]"
        @click="emit('maximize')"
      />
      <UButton
        icon="i-heroicons-x-mark"
        variant="ghost"
        color="neutral"
        size="sm"
        class="text-[#94a3b8] hover:text-red-400"
        @click="emit('close')"
      />
    </div>
  </div>
</template>
