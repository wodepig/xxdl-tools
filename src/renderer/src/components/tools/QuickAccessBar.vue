<script setup lang="ts">
import { computed } from 'vue'
import { useSettingsStore } from '../../stores/settingsStore'
import { useToolsStore } from '../../stores/toolsStore'

const emit = defineEmits<{ toolClick: [toolId: string] }>()
const { pinnedTools } = useSettingsStore()
const { tools } = useToolsStore()

const pinnedItems = computed(() =>
  tools.filter(t => pinnedTools.value.includes(t.id))
)
</script>

<template>
  <div v-if="pinnedItems.length > 0" class="flex gap-3 mb-8 flex-wrap">
    <UButton
      v-for="item in pinnedItems"
      :key="item.id"
      variant="solid"
      size="sm"
      @click="emit('toolClick', item.id)"
    >
      {{ item.name }}
    </UButton>
  </div>
</template>
