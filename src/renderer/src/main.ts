import './assets/main.css'

import { createApp } from 'vue'
import App from './App.vue'
import ui from '@nuxt/ui/vue-plugin'
import router from './router'

console.log('[main.ts] Starting app initialization')

// 全局错误捕获
window.addEventListener('error', (event) => {
  console.error('[main.ts] Global error:', event.error || event.message)
})

window.addEventListener('unhandledrejection', (event) => {
  console.error('[main.ts] Unhandled rejection:', event.reason)
})

const app = createApp(App)
console.log('[main.ts] Vue app created')

app.use(ui)
console.log('[main.ts] Nuxt UI plugin registered')

app.use(router)
console.log('[main.ts] Router registered')

app.mount('#app')
console.log('[main.ts] App mounted to #app')
