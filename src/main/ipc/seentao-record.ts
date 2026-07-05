import { ipcMain, dialog } from 'electron'
import { SEENTAO_IPC } from '../../shared/types/seentao-record'
import type {
  SeentaoRecord,
  SeentaoRecordConfig
} from '../../shared/types/seentao-record'
import { seentaoRecordStore } from './seentao-record-store'

/** 当前存储路径（运行时缓存） */
let currentStoragePath = ''

export function registerSeentaoRecordHandlers(): void {
  // 选择目录
  ipcMain.handle(SEENTAO_IPC.SELECT_DIRECTORY, async (_event): Promise<string | null> => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory'],
      title: '选择数据存储目录'
    })
    return result.canceled || result.filePaths.length === 0 ? null : result.filePaths[0]
  })

  // 初始化存储路径
  ipcMain.handle(SEENTAO_IPC.INIT, async (_event, storagePath: string): Promise<void> => {
    currentStoragePath = storagePath
    seentaoRecordStore.initStoragePath(storagePath)
  })

  // 获取配置
  ipcMain.handle(SEENTAO_IPC.CONFIG, async (_event, storagePath: string): Promise<SeentaoRecordConfig | null> => {
    return seentaoRecordStore.getConfig(storagePath)
  })

  // 按年月列出记录
  ipcMain.handle(SEENTAO_IPC.LIST, async (_event, yearMonth: string) => {
    if (!currentStoragePath) return []
    return seentaoRecordStore.getAllMonthRecords(currentStoragePath, yearMonth)
  })

  // 创建记录（图片已通过 SAVE_IMAGE 单独保存，这里只传文件名）
  ipcMain.handle(SEENTAO_IPC.CREATE, async (
    _event,
    yearMonth: string,
    record: Omit<SeentaoRecord, 'id' | 'createdAt'>,
  ): Promise<SeentaoRecord> => {
    if (!currentStoragePath) throw new Error('存储路径未配置')

    // 创建记录
    const now = new Date()
    const pad = (n: number) => String(n).padStart(2, '0')
    const dateKey = `${pad(now.getDate())}`

    // 生成 ID
    const id = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}`
    const createdAt = now.toISOString()

    const newRecord: SeentaoRecord = {
      id,
      createdAt,
      ...record,
    }

    // 保存到文件
    const existingRecords = seentaoRecordStore.getRecords(currentStoragePath, yearMonth, dateKey)
    existingRecords.push(newRecord)
    seentaoRecordStore.saveRecords(currentStoragePath, yearMonth, dateKey, existingRecords)

    return newRecord
  })

  // 获取单条记录
  ipcMain.handle(SEENTAO_IPC.GET, async (
    _event,
    yearMonth: string,
    dateKey: string,
    recordId: string
  ): Promise<SeentaoRecord | null> => {
    if (!currentStoragePath) return null
    const records = seentaoRecordStore.getRecords(currentStoragePath, yearMonth, dateKey)
    return records.find(r => r.id === recordId) || null
  })

  // 删除记录
  ipcMain.handle(SEENTAO_IPC.DELETE, async (
    _event,
    yearMonth: string,
    dateKey: string,
    recordId: string,
    imageFilenames: string[]
  ): Promise<void> => {
    if (!currentStoragePath) throw new Error('存储路径未配置')
    seentaoRecordStore.deleteRecord(currentStoragePath, yearMonth, dateKey, recordId, imageFilenames)
  })

  // 获取图片
  ipcMain.handle(SEENTAO_IPC.GET_IMAGE, async (
    _event,
    yearMonth: string,
    filename: string
  ): Promise<string | null> => {
    if (!currentStoragePath) return null
    return seentaoRecordStore.getImage(currentStoragePath, yearMonth, filename)
  })

  // 保存单张图片（分开 IPC 避免结构化克隆大体积数据）
  ipcMain.handle(SEENTAO_IPC.SAVE_IMAGE, async (
    _event,
    yearMonth: string,
    base64Data: string
  ): Promise<string> => {
    if (!currentStoragePath) throw new Error('存储路径未配置')
    const matches = base64Data.match(/^data:image\/(png|jpeg|jpg|gif|webp);base64,(.+)$/)
    if (!matches) throw new Error('不支持的图片格式')
    const buffer = Buffer.from(matches[2], 'base64')
    return seentaoRecordStore.saveImage(currentStoragePath, yearMonth, buffer)
  })
}
