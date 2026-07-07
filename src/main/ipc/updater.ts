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
  // 配置 autoUpdater
  autoUpdater.autoDownload = false // 让用户选择是否下载
  autoUpdater.autoInstallOnAppQuit = true // 退出时自动安装

  // 非开发模式才检查更新
  if (!is.dev) {
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
  // 手动检查更新
  ipcMain.handle('update:check', () => {
    autoUpdater.checkForUpdates()
  })

  // 开始下载更新
  ipcMain.handle('update:download', () => {
    autoUpdater.downloadUpdate()
  })

  // 退出并安装
  ipcMain.handle('update:quit-and-install', () => {
    autoUpdater.quitAndInstall()
  })
}
