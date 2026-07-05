import { ipcMain, BrowserWindow } from 'electron'

export function registerSystemHandlers(): void {
  ipcMain.on('system:window-minimize', (event) => {
    BrowserWindow.fromWebContents(event.sender)?.minimize()
  })

  ipcMain.on('system:window-maximize', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (win?.isMaximized()) {
      win.unmaximize()
    } else {
      win?.maximize()
    }
  })

  ipcMain.on('system:window-close', (event) => {
    BrowserWindow.fromWebContents(event.sender)?.close()
  })
}
