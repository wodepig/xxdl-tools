import { ipcMain, dialog } from 'electron'
import { readFile, writeFile } from 'fs/promises'

interface OpenedFile {
  name: string
  path: string
  content: string
}

export interface OpenFilesResult {
  canceled: boolean
  files?: OpenedFile[]
}

export interface WriteFileResult {
  ok: boolean
  error?: string
}

/**
 * HAR 查看工具：通过系统文件选择对话框一次性打开多个 .har / .json 文件，
 * 返回文件名、路径与文件内容，由渲染进程解析。
 */
export function registerHarViewerHandlers(): void {
  ipcMain.handle('har-viewer:open-files', async (_event): Promise<OpenFilesResult> => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
      title: '打开 HAR 文件',
      properties: ['openFile', 'multiSelections'],
      filters: [
        { name: 'HAR / JSON 文件', extensions: ['har', 'json'] },
        { name: '所有文件', extensions: ['*'] }
      ]
    })
    if (canceled || !filePaths || filePaths.length === 0) return { canceled: true }

    const files: OpenedFile[] = []
    for (const filePath of filePaths) {
      try {
        const content = await readFile(filePath, 'utf-8')
        const name = filePath.split(/[\\/]/).pop() || 'har'
        files.push({ name, path: filePath, content })
      } catch {
        // 单个文件读取失败时跳过，不中断其余文件
        continue
      }
    }
    return { canceled: false, files }
  })

  // 按路径重新读取单个 HAR 文件（用于启动时恢复会话）
  ipcMain.handle('har-viewer:read-file', async (_event, filePath: unknown): Promise<string | null> => {
    if (typeof filePath !== 'string' || !filePath) return null
    try {
      return await readFile(filePath, 'utf-8')
    } catch {
      return null
    }
  })

  // 编辑后写回源 HAR 文件
  ipcMain.handle(
    'har-viewer:write-file',
    async (_event, filePath: unknown, content: unknown): Promise<WriteFileResult> => {
      if (typeof filePath !== 'string' || !filePath || typeof content !== 'string') {
        return { ok: false, error: '参数无效' }
      }
      try {
        await writeFile(filePath, content, 'utf-8')
        return { ok: true }
      } catch (e) {
        return { ok: false, error: e instanceof Error ? e.message : String(e) }
      }
    }
  )
}