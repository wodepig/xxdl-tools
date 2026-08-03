import { autoUpdater } from 'electron-updater'
import { BrowserWindow, ipcMain } from 'electron'
import { is } from '@electron-toolkit/utils'

// 更新状态常量（同时给渲染进程用）
export const UPDATE_CHANNELS = {
  CHECKING: 'update:checking',
  AVAILABLE: 'update:available',
  NOT_AVAILABLE: 'update:not-available',
  ERROR: 'update:error',
  DOWNLOAD_PROGRESS: 'update:download-progress',
  DOWNLOADED: 'update:downloaded'
}

const trimTrailingSlash = (value: string): string => value.replace(/\/+$/, '')

// 读取构建时注入的环境变量（electron-vite 会把 .env 中 VITE_ 前缀变量注入 import.meta.env）
function readEnvVar(key: string): string {
  const metaValue = (import.meta.env as unknown as Record<string, unknown>)[key]
  const value = process.env[key] ?? (typeof metaValue === 'string' ? metaValue : '')
  return value.trim()
}

// 拼接更新源地址；未配置 VITE_UPD_URL / VITE_UPD_SLUG 时返回空串
function resolveFeedUrl(): string {
  const updUrl = readEnvVar('VITE_UPD_URL')
  const updSlug = readEnvVar('VITE_UPD_SLUG')
  if (!updUrl || !updSlug) return ''
  return `${trimTrailingSlash(updUrl)}/updates/${updSlug}/win32/latest/`
}

function getMainWindow(): BrowserWindow | null {
  const wins = BrowserWindow.getAllWindows()
  return wins.length > 0 ? wins[0] : null
}

// 向渲染进程发送事件
function sendToRenderer(channel: string, data?: unknown): void {
  const win = getMainWindow()
  if (win) {
    win.webContents.send(channel, data)
  }
}

export function registerUpdaterHandlers(): void {
  const feedUrl = resolveFeedUrl()

  // 配置 autoUpdater
  autoUpdater.autoDownload = false // 让用户选择是否下载
  autoUpdater.autoInstallOnAppQuit = true // 退出时自动安装

  // 未配置更新源时禁用自动更新
  if (!feedUrl) {
    console.warn('[updater] 未配置 VITE_UPD_URL / VITE_UPD_SLUG，自动更新已禁用')
  } else {
    autoUpdater.disableWebInstaller = true // 禁止网页安装器
    autoUpdater.forceDevUpdateConfig = true // 开发环境也启用更新检查（便于手动调试）
    autoUpdater.setFeedURL({ provider: 'generic', url: feedUrl })
  }

  // 非开发模式才检查更新
  if (!is.dev && feedUrl) {
    // 启动后延迟检查，避免影响首屏加载
    setTimeout(() => autoUpdater.checkForUpdates(), 5000)
  }

  // ---- autoUpdater 事件 ----
  autoUpdater.on('checking-for-update', () => {
    sendToRenderer(UPDATE_CHANNELS.CHECKING)
  })

  autoUpdater.on('update-available', (info) => {
    sendToRenderer(UPDATE_CHANNELS.AVAILABLE, {
      version: info.version,
      releaseDate: info.releaseDate,
      releaseName: info.releaseName
    })
  })

  autoUpdater.on('update-not-available', () => {
    sendToRenderer(UPDATE_CHANNELS.NOT_AVAILABLE)
  })

  autoUpdater.on('error', (err) => {
    sendToRenderer(UPDATE_CHANNELS.ERROR, { message: err.message })
  })

  autoUpdater.on('download-progress', (progress) => {
    sendToRenderer(UPDATE_CHANNELS.DOWNLOAD_PROGRESS, {
      percent: progress.percent,
      bytesPerSecond: progress.bytesPerSecond,
      transferred: progress.transferred,
      total: progress.total
    })
  })

  autoUpdater.on('update-downloaded', (info) => {
    sendToRenderer(UPDATE_CHANNELS.DOWNLOADED, {
      version: info.version,
      releaseDate: info.releaseDate
    })
  })

  // ---- IPC 处理函数 ----
  // 手动检查更新（开发环境也可用，forceDevUpdateConfig 已开启）
  ipcMain.handle('update:check', async () => {
    if (!feedUrl) {
      sendToRenderer(UPDATE_CHANNELS.ERROR, { message: '未配置更新源' })
      return
    }
    try {
      await autoUpdater.checkForUpdates()
    } catch (err) {
      // 出错时 electron-updater 已 emit error 事件，这里仅防止 unhandled rejection
      console.error('[updater] 检查更新失败:', err)
    }
  })

  // 开始下载更新（开发环境不允许下载）
  ipcMain.handle('update:download', () => {
    if (is.dev) {
      return { ok: false, message: '开发环境不能下载' }
    }
    autoUpdater.downloadUpdate()
    return { ok: true }
  })

  // 退出并安装
  ipcMain.handle('update:quit-and-install', () => {
    autoUpdater.quitAndInstall()
  })
}
