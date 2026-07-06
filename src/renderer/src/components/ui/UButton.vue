<script setup lang="ts">
import { computed } from 'vue'

type BtnVariant = 'solid' | 'outline' | 'ghost' | 'soft'
type BtnColor = 'primary' | 'neutral' | 'success' | 'warning' | 'error' | 'info'
type BtnSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl'

const props = withDefaults(defineProps<{
  variant?: BtnVariant
  color?: BtnColor
  size?: BtnSize
  icon?: string
  square?: boolean
  disabled?: boolean
  loading?: boolean
  title?: string
  label?: string
}>(), {
  variant: 'solid',
  color: 'primary',
  size: 'md',
  square: false,
  disabled: false,
  loading: false,
})

const emit = defineEmits<{
  click: [e: MouseEvent]
}>()

/** 颜色对应的 hex 值 */
const colorMap: Record<BtnColor, string> = {
  primary: '#6366f1',
  neutral: '',
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  info: '#06b6d4'
}

/** 尺寸对应的 padding / height / font-size */
const sizeMap: Record<BtnSize, { h: string; px: string; fs: string; gap: string; iconSize: number }> = {
  xs: { h: '24px', px: '8px', fs: '11px', gap: '4px', iconSize: 14 },
  sm: { h: '28px', px: '10px', fs: '12px', gap: '5px', iconSize: 15 },
  md: { h: '34px', px: '14px', fs: '13px', gap: '6px', iconSize: 16 },
  lg: { h: '40px', px: '18px', fs: '14px', gap: '8px', iconSize: 18 },
  xl: { h: '48px', px: '24px', fs: '16px', gap: '10px', iconSize: 20 }
}

const sizeStyle = computed(() => {
  const s = sizeMap[props.size]
  return {
    height: s.h,
    paddingLeft: props.square ? '0' : s.px,
    paddingRight: props.square ? '0' : s.px,
    width: props.square ? s.h : 'auto',
    fontSize: s.fs,
    gap: s.gap,
    minWidth: props.square ? s.h : 'auto',
    iconSize: s.iconSize
  } as const
})

const colorHex = computed(() => colorMap[props.color])
const isNeutral = computed(() => props.color === 'neutral')

const btnStyle = computed(() => {
  const hex = colorHex.value
  const isN = isNeutral.value

  switch (props.variant) {
    case 'solid':
      if (isN) {
        return {
          backgroundColor: 'var(--bg-hover)',
          color: 'var(--text-primary)',
          border: 'none'
        }
      }
      return {
        backgroundColor: hex,
        color: '#fff',
        border: 'none'
      }
    case 'outline':
      return {
        backgroundColor: 'transparent',
        color: isN ? 'var(--text-primary)' : hex,
        border: `1px solid ${isN ? 'var(--border)' : hex + '44'}`
      }
    case 'ghost':
      return {
        backgroundColor: 'transparent',
        color: isN ? 'var(--text-muted)' : hex,
        border: 'none'
      }
    case 'soft':
      return {
        backgroundColor: isN ? 'var(--bg-elevated)' : hex + '16',
        color: isN ? 'var(--text-primary)' : hex,
        border: 'none'
      }
    default:
      return {}
  }
})

const hoverBg = computed(() => {
  if (props.variant === 'solid' && !isNeutral.value) return colorHex.value + 'dd'
  if (props.variant === 'ghost') return 'var(--bg-hover)'
  return ''
})
</script>

<template>
  <button
    :disabled="disabled || loading"
    :title="title"
    class="inline-flex items-center justify-center rounded-lg font-medium outline-none transition-all duration-150 cursor-pointer select-none
      disabled:opacity-50 disabled:pointer-events-none
      active:scale-[0.97]"
    :style="{
      ...sizeStyle,
      ...btnStyle,
      '--hover-bg': hoverBg,
    }"
    @mouseenter="($event.currentTarget as HTMLElement).style.backgroundColor = hoverBg || btnStyle.backgroundColor || ''"
    @mouseleave="($event.currentTarget as HTMLElement).style.backgroundColor = btnStyle.backgroundColor || ''"
    @click="emit('click', $event)"
  >
    <UIcon
      v-if="loading"
      name="i-heroicons-arrow-path"
      :size="sizeStyle.iconSize"
      class="animate-spin"
    />
    <UIcon
      v-else-if="icon"
      :name="icon"
      :size="sizeStyle.iconSize"
    />
    <span v-if="!square || label">
      <slot />
    </span>
  </button>
</template>
