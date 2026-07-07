<script setup lang="ts">
const props = withDefaults(defineProps<{
  provider?: 'baidu' | 'quark'
  isLoggedIn?: boolean
  userName?: string
}>(), {
  provider: 'baidu',
  isLoggedIn: false,
  userName: ''
})

const emit = defineEmits<{
  'login-cookie': [cookie: string]
  'login-qrcode': []
  logout: []
}>()

const providerName: Record<'baidu' | 'quark', string> = {
  baidu: '百度网盘',
  quark: '夸克网盘'
}

const cookie = defineModel<string>('cookie', { default: '' })

function handleCookieLogin() {
  if (cookie.value.trim()) {
    emit('login-cookie', cookie.value.trim())
  }
}
</script>

<template>
  <div
    class="rounded-xl p-5"
    :style="{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }"
  >
    <!-- 未登录状态 -->
    <template v-if="!isLoggedIn">
      <h3 class="text-sm font-semibold mb-4" :style="{ color: 'var(--text-primary)' }">
        登录 {{ providerName[provider] }}
      </h3>

      <!-- 扫码登录 -->
      <div
        class="rounded-xl p-6 mb-4 flex flex-col items-center justify-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
        :style="{
          border: '2px dashed var(--border)',
          backgroundColor: 'var(--bg-base)'
        }"
        @click="emit('login-qrcode')"
      >
        <UIcon name="i-heroicons-qr-code" class="w-10 h-10" :style="{ color: 'var(--text-secondary)' }" />
        <span class="text-sm font-medium" :style="{ color: 'var(--text-primary)' }">扫码登录</span>
        <span class="text-xs" :style="{ color: 'var(--text-secondary)' }">
          请使用{{ providerName[provider] }}APP扫码
        </span>
      </div>

      <!-- Cookie 登录 -->
      <div class="space-y-3">
        <div class="flex items-center gap-2">
          <span class="text-xs font-medium" :style="{ color: 'var(--text-secondary)' }">Cookie 登录</span>
          <div class="flex-1 h-px" :style="{ backgroundColor: 'var(--border)' }" />
        </div>
        <textarea
          v-model="cookie"
          placeholder="请在此粘贴 Cookie..."
          class="w-full rounded-lg p-3 text-xs resize-none focus:outline-none"
          :style="{
            backgroundColor: 'var(--bg-base)',
            border: '1px solid var(--border)',
            color: 'var(--text-primary)'
          }"
          rows="4"
        />
        <button
          class="w-full rounded-lg py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          :style="{ backgroundColor: 'var(--accent, #3b82f6)' }"
          :disabled="!cookie.trim()"
          @click="handleCookieLogin"
        >
          登录
        </button>
      </div>
    </template>

    <!-- 已登录状态 -->
    <template v-else>
      <div class="flex flex-col items-center gap-4 py-4">
        <div
          class="w-14 h-14 rounded-full flex items-center justify-center text-lg font-semibold text-white"
          :style="{ backgroundColor: 'var(--accent, #3b82f6)' }"
        >
          {{ userName ? userName.charAt(0).toUpperCase() : '?' }}
        </div>
        <span class="text-sm font-medium" :style="{ color: 'var(--text-primary)' }">
          {{ userName }}
        </span>
        <button
          class="rounded-lg px-5 py-1.5 text-xs font-medium transition-opacity hover:opacity-80"
          :style="{
            border: '1px solid var(--border)',
            color: 'var(--text-secondary)'
          }"
          @click="emit('logout')"
        >
          退出登录
        </button>
      </div>
    </template>
  </div>
</template>
