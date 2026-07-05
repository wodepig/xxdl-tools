import { resolve } from 'path'
import { defineConfig } from 'electron-vite'
import vue from '@vitejs/plugin-vue'
import ui from '@nuxt/ui/vite'

export default defineConfig({
  main: {},
  preload: {},
  renderer: {
    resolve: {
      alias: {
        '@renderer': resolve('src/renderer/src'),
        // 重定向 Nuxt UI 的 Icon 组件到自定义组件（避免 @nuxt/icon 的 Nuxt runtime 依赖）
        '@nuxt/ui/runtime/components/Icon.vue': resolve(
          'src/renderer/src/components/ui/UIcon.vue'
        )
      }
    },
    plugins: [
      vue(),
      ui()
    ]
  }
})
