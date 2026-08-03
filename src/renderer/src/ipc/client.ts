import type { AppSettings } from '../../../shared/types/settings'
import { SEENTAO_IPC } from '../../../shared/types/seentao-record'
import type { SeentaoRecord, DayRecords, SeentaoRecordConfig } from '../../../shared/types/seentao-record'
import type { HttpRequestParams, HttpResponse } from '../../../main/tools/yingdao-study'
import { WATERMARK_IPC } from '../../../shared/types/watermark'
import type { WatermarkPreset, FileInfo, ImageInfo, PreviewFileParams } from '../../../shared/types/watermark'
import { IMAGE_HOSTING_IPC } from '../../../shared/types/image-hosting'
import type {
  ImageHostingConfig,
  OssConfig,
  ConnectionTestResult,
  UploadedImage,
  UploadResult,
  UploadParams
} from '../../../shared/types/image-hosting'

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
    ipc.invoke('data:get', toolId),
  setToolData: <T = Record<string, unknown>>(
    toolId: string,
    data: T
  ): Promise<void> => ipc.invoke('data:set', toolId, data),
  deleteToolData: (toolId: string): Promise<void> =>
    ipc.invoke('data:delete', toolId),

  // 清空所有工具数据
  clearAllToolData: (toolIds: string[]): Promise<void[]> =>
    Promise.all(toolIds.map((id) => ipc.invoke('data:delete', id))),

  // 新道云刷课记录
  seentaoRecord: {
    selectDirectory: (): Promise<string | null> =>
      ipc.invoke(SEENTAO_IPC.SELECT_DIRECTORY),
    init: (storagePath: string): Promise<void> =>
      ipc.invoke(SEENTAO_IPC.INIT, storagePath),
    getConfig: (storagePath: string): Promise<SeentaoRecordConfig | null> =>
      ipc.invoke(SEENTAO_IPC.CONFIG, storagePath),
    list: (yearMonth: string): Promise<DayRecords[]> =>
      ipc.invoke(SEENTAO_IPC.LIST, yearMonth),
    create: (
      yearMonth: string,
      record: Omit<SeentaoRecord, 'id' | 'createdAt'>
    ): Promise<SeentaoRecord> =>
      ipc.invoke(SEENTAO_IPC.CREATE, yearMonth, record),
    get: (yearMonth: string, dateKey: string, recordId: string): Promise<SeentaoRecord | null> =>
      ipc.invoke(SEENTAO_IPC.GET, yearMonth, dateKey, recordId),
    delete: (
      yearMonth: string,
      dateKey: string,
      recordId: string,
      imageFilenames: string[]
    ): Promise<void> =>
      ipc.invoke(SEENTAO_IPC.DELETE, yearMonth, dateKey, recordId, imageFilenames),
    getImage: (yearMonth: string, filename: string): Promise<string | null> =>
      ipc.invoke(SEENTAO_IPC.GET_IMAGE, yearMonth, filename),
    saveImage: (yearMonth: string, base64Data: string): Promise<string> =>
      ipc.invoke(SEENTAO_IPC.SAVE_IMAGE, yearMonth, base64Data)
  },

  // 影刀学习时长
  sendHttpRequest: (params: HttpRequestParams): Promise<HttpResponse> =>
    ipc.invoke('yingdao-study:send-request', params),

  // DOCX/PPT 水印添加
  watermark: {
    openFile: (): Promise<FileInfo | null> =>
      ipc.invoke(WATERMARK_IPC.OPEN_FILE),
    extract: (filePath: string, fileType: 'docx' | 'pptx'): Promise<{ images: ImageInfo[]; tempDir: string } | null> =>
      ipc.invoke(WATERMARK_IPC.EXTRACT, filePath, fileType),
    preview: (imageBase64: string, preset: WatermarkPreset): Promise<string> =>
      ipc.invoke(WATERMARK_IPC.PREVIEW, imageBase64, preset),
    previewFile: (params: PreviewFileParams): Promise<{ original: string; watermarked: string } | null> =>
      ipc.invoke(WATERMARK_IPC.PREVIEW_FILE, params),
    apply: (params: {
      filePath: string
      fileType: 'docx' | 'pptx'
      imageFilenames: string[]
      presetId: string
      outputPath?: string
      textAsImagePath?: string
    }): Promise<string | null> =>
      ipc.invoke(WATERMARK_IPC.APPLY, params),
    saveTempImage: (base64: string): Promise<string> =>
      ipc.invoke(WATERMARK_IPC.SAVE_TEMP_IMAGE, base64),
    getPresets: (): Promise<WatermarkPreset[]> =>
      ipc.invoke(WATERMARK_IPC.GET_PRESETS),
    savePreset: (preset: WatermarkPreset): Promise<void> =>
      ipc.invoke(WATERMARK_IPC.SAVE_PRESET, preset),
    deletePreset: (id: string): Promise<void> =>
      ipc.invoke(WATERMARK_IPC.DELETE_PRESET, id),
    openFolder: (filePath: string): Promise<void> =>
      ipc.invoke(WATERMARK_IPC.OPEN_FOLDER, filePath)
  },

  // 图床工具
  imageHosting: {
    getConfig: (): Promise<ImageHostingConfig | null> =>
      ipc.invoke(IMAGE_HOSTING_IPC.GET_CONFIG),
    saveConfig: (config: ImageHostingConfig): Promise<void> =>
      ipc.invoke(IMAGE_HOSTING_IPC.SAVE_CONFIG, config),
    testConnection: (oss: OssConfig): Promise<ConnectionTestResult> =>
      ipc.invoke(IMAGE_HOSTING_IPC.TEST_CONNECTION, oss),
    upload: (params: UploadParams): Promise<UploadResult> =>
      ipc.invoke(IMAGE_HOSTING_IPC.UPLOAD, params),
    list: (): Promise<UploadedImage[]> =>
      ipc.invoke(IMAGE_HOSTING_IPC.LIST),
    delete: (key: string): Promise<void> =>
      ipc.invoke(IMAGE_HOSTING_IPC.DELETE, key),
    download: (key: string): Promise<void> =>
      ipc.invoke(IMAGE_HOSTING_IPC.DOWNLOAD, key),
    openUrl: (url: string): Promise<void> =>
      ipc.invoke(IMAGE_HOSTING_IPC.OPEN_URL, url)
  },

  // 通用 IPC 调用（供高级使用）
  invoke: <T = unknown>(channel: string, ...args: unknown[]): Promise<T> =>
    ipc.invoke(channel, ...args),
  send: (channel: string, ...args: unknown[]): void => {
    ipc.send(channel, ...args)
  },
  on: (channel: string, callback: (...args: unknown[]) => void): void => {
    ipc.on(channel, callback)
  },

  // 自动更新
  checkForUpdates: (): Promise<void> => ipc.invoke('update:check'),
  downloadUpdate: (): Promise<{ ok: boolean; message?: string } | undefined> =>
    ipc.invoke('update:download'),
  quitAndInstall: (): Promise<void> => ipc.invoke('update:quit-and-install'),

  // 更新状态事件监听
  onUpdateChecking: (callback: () => void): void => {
    ipc.on('update:checking', callback)
  },
  onUpdateAvailable: (callback: (info: { version: string }) => void): void => {
    ipc.on('update:available', (_event, info) => callback(info))
  },
  onUpdateNotAvailable: (callback: () => void): void => {
    ipc.on('update:not-available', callback)
  },
  onUpdateError: (callback: (info: { message: string }) => void): void => {
    ipc.on('update:error', (_event, info) => callback(info))
  },
  onUpdateDownloadProgress: (callback: (progress: { percent: number }) => void): void => {
    ipc.on('update:download-progress', (_event, progress) => callback(progress))
  },
  onUpdateDownloaded: (callback: (info: { version: string }) => void): void => {
    ipc.on('update:downloaded', (_event, info) => callback(info))
  }
}
