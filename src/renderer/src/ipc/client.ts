import type { AppSettings } from '../../../shared/types/settings'

const ipc = window.electron.ipcRenderer

export const ipcClient = {
  // 系统级
  minimize: (): void => {
    ipc.send('system:window-minimize')
  },
  maximize: (): void => {
    ipc.send('system:window-maximize')
  },
  close: (): void => {
    ipc.send('system:window-close')
  },

  // 配置管理
  getSettings: (): Promise<AppSettings> => ipc.invoke('settings:get'),
  setSettings: (settings: Partial<AppSettings>): Promise<void> =>
    ipc.invoke('settings:set', settings),

  // 工具数据存储
  getToolData: <T = Record<string, unknown>>(toolId: string): Promise<T> =>
    ipc.invoke(`data:get:${toolId}`),
  setToolData: <T = Record<string, unknown>>(
    toolId: string,
    data: T
  ): Promise<void> => ipc.invoke(`data:set:${toolId}`, data),
  deleteToolData: (toolId: string): Promise<void> =>
    ipc.invoke(`data:delete:${toolId}`),

  // 通用 IPC 调用（供高级使用）
  invoke: <T = unknown>(channel: string, ...args: unknown[]): Promise<T> =>
    ipc.invoke(channel, ...args),
  send: (channel: string, ...args: unknown[]): void => {
    ipc.send(channel, ...args)
  },
  on: (channel: string, callback: (...args: unknown[]) => void): void => {
    ipc.on(channel, callback)
  }
}
