import { join } from 'path'
import { existsSync, mkdirSync, readFileSync, writeFileSync, unlinkSync, readdirSync } from 'fs'
import type { SeentaoRecord, SeentaoRecordConfig, DayRecords } from '../../shared/types/seentao-record'

/** 生成 4 位随机字符串 */
function randomStr(): string {
  return Math.random().toString(36).substring(2, 6)
}

/** 获取存储配置路径 */
function getConfigPath(storagePath: string): string {
  return join(storagePath, 'config.json')
}

/** 获取年月目录路径 */
function getYearMonthDir(storagePath: string, yearMonth: string): string {
  return join(storagePath, 'records', yearMonth)
}

/** 获取某天记录文件路径 */
function getDayFilePath(storagePath: string, yearMonth: string, dateKey: string): string {
  return join(getYearMonthDir(storagePath, yearMonth), `${dateKey}.json`)
}

/** 获取图片目录路径 */
function getImagesDir(storagePath: string, yearMonth: string): string {
  return join(getYearMonthDir(storagePath, yearMonth), 'images')
}

/** 获取图片文件路径 */
function getImagePath(storagePath: string, yearMonth: string, filename: string): string {
  return join(getImagesDir(storagePath, yearMonth), filename)
}

export const seentaoRecordStore = {
  /** 初始化存储目录 */
  initStoragePath(storagePath: string): void {
    const recordsDir = join(storagePath, 'records')
    if (!existsSync(recordsDir)) {
      mkdirSync(recordsDir, { recursive: true })
    }
    const configPath = getConfigPath(storagePath)
    if (!existsSync(configPath)) {
      const config: SeentaoRecordConfig = { storagePath, initialized: true }
      writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8')
    }
  },

  /** 读取配置 */
  getConfig(storagePath: string): SeentaoRecordConfig | null {
    const configPath = getConfigPath(storagePath)
    if (!existsSync(configPath)) return null
    try {
      return JSON.parse(readFileSync(configPath, 'utf-8'))
    } catch {
      return null
    }
  },

  /** 获取某天记录 */
  getRecords(storagePath: string, yearMonth: string, dateKey: string): SeentaoRecord[] {
    const filePath = getDayFilePath(storagePath, yearMonth, dateKey)
    if (!existsSync(filePath)) return []
    try {
      const data: DayRecords = JSON.parse(readFileSync(filePath, 'utf-8'))
      return data.records || []
    } catch {
      return []
    }
  },

  /** 保存某天记录 */
  saveRecords(storagePath: string, yearMonth: string, dateKey: string, records: SeentaoRecord[]): void {
    const dir = getYearMonthDir(storagePath, yearMonth)
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true })
    }
    const data: DayRecords = { date: dateKey, records }
    writeFileSync(getDayFilePath(storagePath, yearMonth, dateKey), JSON.stringify(data, null, 2), 'utf-8')
  },

  /** 获取某年月的所有日期记录 */
  getAllMonthRecords(storagePath: string, yearMonth: string): DayRecords[] {
    const dir = getYearMonthDir(storagePath, yearMonth)
    if (!existsSync(dir)) return []
    const files = readdirSync(dir).filter(f => f.endsWith('.json'))
    const days: DayRecords[] = []
    for (const file of files) {
      try {
        const data: DayRecords = JSON.parse(readFileSync(join(dir, file), 'utf-8'))
        days.push(data)
      } catch {
        // skip invalid files
      }
    }
    // 按日期倒序
    days.sort((a, b) => b.date.localeCompare(a.date))
    return days
  },

  /** 保存图片，返回文件名 */
  saveImage(storagePath: string, yearMonth: string, imageBuffer: Buffer): string {
    const imagesDir = getImagesDir(storagePath, yearMonth)
    if (!existsSync(imagesDir)) {
      mkdirSync(imagesDir, { recursive: true })
    }
    const filename = `${Date.now()}_${randomStr()}.png`
    writeFileSync(getImagePath(storagePath, yearMonth, filename), imageBuffer)
    return filename
  },

  /** 读取图片，返回 base64 */
  getImage(storagePath: string, yearMonth: string, filename: string): string | null {
    const filePath = getImagePath(storagePath, yearMonth, filename)
    if (!existsSync(filePath)) return null
    try {
      const buffer = readFileSync(filePath)
      return `data:image/png;base64,${buffer.toString('base64')}`
    } catch {
      return null
    }
  },

  /** 删除记录及其关联图片 */
  deleteRecord(storagePath: string, yearMonth: string, dateKey: string, recordId: string, imageFilenames: string[]): void {
    // 删除关联图片
    for (const filename of imageFilenames) {
      const imgPath = getImagePath(storagePath, yearMonth, filename)
      if (existsSync(imgPath)) {
        try { unlinkSync(imgPath) } catch { /* ignore */ }
      }
    }
    // 删除记录
    const records = seentaoRecordStore.getRecords(storagePath, yearMonth, dateKey)
    const filtered = records.filter(r => r.id !== recordId)
    if (filtered.length !== records.length) {
      seentaoRecordStore.saveRecords(storagePath, yearMonth, dateKey, filtered)
    }
  }
}
