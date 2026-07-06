import { registerYingdaoStudyHandlers } from './yingdao-study'

/**
 * 注册所有工具的 IPC handler
 * 每个工具新增时，在这里添加对应的 register 调用
 */
export function registerToolHandlers(): void {
  registerYingdaoStudyHandlers()
}
