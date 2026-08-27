import { ipcMain } from 'electron'
import { getToolData, setToolData, deleteToolData } from '../storage'
import { getDataRootDir, chooseDataRoot, isDataRootConfigured } from '../utils/paths'

export function registerDataHandlers(): void {
  ipcMain.handle('data:get', (_event, toolId: string) => {
    return getToolData(toolId)
  })

  ipcMain.handle('data:set', (_event, toolId: string, data: unknown) => {
    setToolData(toolId, data)
  })

  ipcMain.handle('data:delete', (_event, toolId: string) => {
    deleteToolData(toolId)
  })

  // 获取当前数据目录
  ipcMain.handle('storage:get-data-dir', (): string => {
    return getDataRootDir()
  })

  // 是否已配置数据目录
  ipcMain.handle('storage:is-data-configured', (): boolean => {
    return isDataRootConfigured()
  })

  // 让用户重新选择数据目录
  ipcMain.handle('storage:choose-data-dir', async (): Promise<string | null> => {
    return chooseDataRoot()
  })
}
