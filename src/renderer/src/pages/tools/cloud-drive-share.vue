<script setup lang="ts">
import { ref, computed } from 'vue'
import type { CloudDriveProvider } from '../../../../shared/types/cloud-drive'
import CloudDriveLogin from '../../components/tools/cloud-drive/CloudDriveLogin.vue'
import CloudDriveFileList from '../../components/tools/cloud-drive/CloudDriveFileList.vue'
import CloudDriveShareForm from '../../components/tools/cloud-drive/CloudDriveShareForm.vue'

type ProviderTab = { key: CloudDriveProvider; label: string }

const tabs: ProviderTab[] = [
  { key: 'baidu', label: '百度网盘' },
  { key: 'quark', label: '夸克网盘' }
]

const activeTab = ref<CloudDriveProvider>('baidu')

// Login state per provider
const loginStates = ref<Record<CloudDriveProvider, { isLoggedIn: boolean; userName: string }>>({
  baidu: { isLoggedIn: false, userName: '' },
  quark: { isLoggedIn: false, userName: '' }
})

// Selected file IDs
const selectedFileIds = ref<string[]>([])

const currentLoginState = computed(() => loginStates.value[activeTab.value])
const isLoggedIn = computed(() => currentLoginState.value.isLoggedIn)

function handleCookieLogin(cookie: string) {
  // Demo: simulate login success
  loginStates.value[activeTab.value] = {
    isLoggedIn: true,
    userName: `用户_${cookie.substring(0, 4)}`
  }
}

function handleQrcodeLogin() {
  // Demo: simulate QR login success
  loginStates.value[activeTab.value] = {
    isLoggedIn: true,
    userName: '扫码用户'
  }
}

function handleLogout() {
  loginStates.value[activeTab.value] = {
    isLoggedIn: false,
    userName: ''
  }
  selectedFileIds.value = []
}

function handleFileSelect(ids: string[]) {
  selectedFileIds.value = ids
}

function handleShare(config: { viewLimit: number; expireDays: number; extractCode: string }) {
  // Demo: share result is handled internally by CloudDriveShareForm
  // In the future, this will make actual network requests
  console.log('Share config:', config, 'provider:', activeTab.value)
}
</script>

<template>
  <div class="mx-auto max-w-4xl space-y-5">
    <!-- Tab Switcher -->
    <div
      class="inline-flex rounded-xl p-1 gap-1"
      :style="{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }"
    >
      <button
        v-for="tab in tabs"
        :key="tab.key"
        class="rounded-lg px-5 py-2 text-sm font-medium transition-all"
        :class="activeTab === tab.key ? 'bg-[rgba(99,102,241,0.15)] text-[#6366f1]' : ''"
        :style="activeTab !== tab.key ? { color: 'var(--text-secondary)' } : {}"
        @click="activeTab = tab.key"
      >
        {{ tab.label }}
      </button>
    </div>

    <!-- Login -->
    <CloudDriveLogin
      :provider="activeTab"
      :is-logged-in="isLoggedIn"
      :user-name="currentLoginState.userName"
      @login-cookie="handleCookieLogin"
      @login-qrcode="handleQrcodeLogin"
      @logout="handleLogout"
    />

    <!-- Content after login -->
    <template v-if="isLoggedIn">
      <CloudDriveFileList
        :provider="activeTab"
        @update:selected="handleFileSelect"
      />

      <CloudDriveShareForm
        :selected-count="selectedFileIds.length"
        :disabled="selectedFileIds.length === 0"
        @share="handleShare"
      />
    </template>
  </div>
</template>
