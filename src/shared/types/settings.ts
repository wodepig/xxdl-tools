import type { RecentItem } from './tool'

export interface ToolSettings {
  toolId: string
  settings: Record<string, unknown>
}

export interface AppSettings {
  theme: 'dark' | 'light' | 'system'
  pinnedTools: string[]
  recentTools: RecentItem[]
  toolSettings: ToolSettings[]
  sidebarCollapsed: boolean
  sidebarPinned: boolean
}
