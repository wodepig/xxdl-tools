import { ipcMain } from 'electron'
import { join } from 'path'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import type { AppSettings } from '../../shared/types/settings'
import { getAppDataDir } from '../utils/paths'

const defaultSettings: AppSettings = {
  theme: 'dark',
  pinnedTools: [],
  recentTools: [],
  toolSettings: [],
  sidebarCollapsed: false,
  sidebarPinned: false
}

function getSettingsPath(): string {
  const dir = getAppDataDir()
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }
  return join(dir, 'settings.json')
}

function readSettings(): AppSettings {
  const path = getSettingsPath()
  if (!existsSync(path)) {
    writeFileSync(path, JSON.stringify(defaultSettings, null, 2))
    return defaultSettings
  }
  return JSON.parse(readFileSync(path, 'utf-8'))
}

function writeSettings(settings: AppSettings): void {
  writeFileSync(getSettingsPath(), JSON.stringify(settings, null, 2))
}

export function registerSettingsHandlers(): void {
  ipcMain.handle('settings:get', () => {
    return readSettings()
  })

  ipcMain.handle('settings:set', (_event, partial: Partial<AppSettings>) => {
    const current = readSettings()
    const updated = { ...current, ...partial }
    writeSettings(updated)
  })
}
