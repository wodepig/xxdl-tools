import { ipcMain } from 'electron'
import { getToolData, setToolData, deleteToolData } from '../storage'

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
}
