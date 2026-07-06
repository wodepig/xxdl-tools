import { createRouter, createWebHashHistory } from 'vue-router'
import AppLayout from '../components/layout/AppLayout.vue'

console.log('[router] Creating router instance')

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: '/',
      component: AppLayout,
      children: [
        {
          path: '',
          name: 'home',
          component: () => {
            console.log('[router] Loading index.vue (home)')
            return import('../pages/index.vue')
          }
        },
        {
          path: 'settings',
          name: 'settings',
          component: () => {
            console.log('[router] Loading settings.vue')
            return import('../pages/settings.vue')
          }
        },
        {
          path: 'tools/:id',
          name: 'tool',
          component: () => {
            console.log('[router] Loading tool-page.vue')
            return import('../pages/tool-page.vue')
          }
        }
      ]
    }
  ]
})

router.beforeEach((to, _from) => {
  console.log('[router] Navigating to:', to.path, 'name:', to.name)
})

router.afterEach((to) => {
  console.log('[router] Navigation completed:', to.path)
})

export default router
