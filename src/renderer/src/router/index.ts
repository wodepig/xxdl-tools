import { createRouter, createWebHistory } from 'vue-router'
import AppLayout from '../components/layout/AppLayout.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      component: AppLayout,
      children: [
        {
          path: '',
          name: 'home',
          component: () => import('../pages/index.vue')
        },
        {
          path: 'settings',
          name: 'settings',
          component: () => import('../pages/settings.vue')
        }
      ]
    }
  ]
})

export default router
