import { ipcMain, dialog } from 'electron'
import { writeFile } from 'fs/promises'

interface SaveJsonParams {
  defaultName: string
  content: string
}

export function registerJsonFormatterHandlers(): void {
  ipcMain.handle('json-formatter:save-file', async (_event, params: SaveJsonParams) => {
    const { canceled, filePath } = await dialog.showSaveDialog({
      title: '导出 JSON',
      defaultPath: `${params.defaultName || 'data'}.json`,
      filters: [{ name: 'JSON 文件', extensions: ['json'] }]
    })
    if (canceled || !filePath) return { ok: false, canceled: true }
    await writeFile(filePath, params.content, 'utf-8')
    return { ok: true, path: filePath }
  })
}
