import { ipcMain } from 'electron'
import { getToolData, setToolData } from '../storage'

const TOOL_ID = 'example-tool'

/**
 * 示例工具 IPC handler
 * 
 * 每个工具的主进程处理器应：
 * 1. 使用 `tool:<toolId>:<action>` 命名空间注册 IPC channel
 * 2. 使用 `getToolData(toolId)` / `setToolData(toolId, data)` 读写持久化数据
 * 3. 有独立的 register 函数，在 registerToolHandlers 中统一调用
 */
export function registerExampleToolHandlers(): void {
  // 示例：处理工具特定操作
  ipcMain.handle(`tool:${TOOL_ID}:process`, async (_event, input: unknown) => {
    // 1. 读取已有数据
    const data = getToolData(TOOL_ID)
    
    // 2. 执行处理逻辑（这里仅为示例）
    const result = {
      input,
      processed: true,
      timestamp: Date.now()
    }
    
    // 3. 保存到持久化存储
    setToolData(TOOL_ID, {
      ...data,
      lastProcessed: result
    })
    
    return result
  })

  // 示例：获取工具数据
  ipcMain.handle(`tool:${TOOL_ID}:get-data`, async () => {
    return getToolData(TOOL_ID)
  })

  // 示例：重置工具数据
  ipcMain.handle(`tool:${TOOL_ID}:reset`, async () => {
    setToolData(TOOL_ID, {})
    return { success: true }
  })
}
