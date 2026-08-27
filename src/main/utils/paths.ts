import { app, dialog } from 'electron'
import { join } from 'path'
import { mkdirSync, readFileSync, writeFileSync } from 'fs'

/**
 * 数据根目录管理。
 *
 * 背景：数据若存放在应用安装目录（exe 旁）的 data/ 下，应用升级或重装时会被覆盖丢失。
 * 因此改为「用户自选数据存储目录」：
 * - 首次启动弹出目录选择框，让用户指定数据根目录；
 * - 所选目录的路径持久化到一个指针文件（存放在 Electron userData 用户配置目录，
 *   升级/重装不会清空，仅几十字节），保证后续启动直接读取，不需重复选择；
 * - 各插件数据、应用设置、预设等均保存在所选数据根目录下，格式与原来保持一致。
 */

/** 存有数据根目录指针的文件名 */
const POINTER_FILE = 'xxdl-tools-data-dir.json'

/** 运行时缓存的数据根目录 */
let dataRoot: string | null = null

function pointerFilePath(): string {
  return join(app.getPath('userData'), POINTER_FILE)
}

function readPointer(): string | null {
  try {
    const raw = JSON.parse(readFileSync(pointerFilePath(), 'utf-8'))
    return typeof raw?.dataDir === 'string' && raw.dataDir ? raw.dataDir : null
  } catch {
    return null
  }
}

function writePointer(dir: string): void {
  writeFileSync(pointerFilePath(), JSON.stringify({ dataDir: dir }, null, 2), 'utf-8')
}

/**
 * 初始化数据根目录（应用启动时调用，同步，不弹窗）：
 * 已有指针则直接使用；否则以「用户配置目录下的 data/」作为临时默认目录，
 * 未写入指针，渲染层检测到未配置后引导用户在软件内选择。
 */
export function initDataRoot(): string {
  if (dataRoot) return dataRoot
  const existing = readPointer()
  dataRoot = existing || join(app.getPath('userData'), 'data')
  mkdirSync(dataRoot, { recursive: true })
  return dataRoot
}

/** 是否已配置数据目录（存在指针文件） */
export function isDataRootConfigured(): boolean {
  return !!readPointer()
}

/** 获取当前数据根目录（同步；未初始化时以用户配置目录下 data/ 兜底） */
export function getDataRootDir(): string {
  if (!dataRoot) {
    dataRoot = readPointer() || join(app.getPath('userData'), 'data')
    mkdirSync(dataRoot, { recursive: true })
  }
  return dataRoot
}

/**
 * 兼容旧引用：返回数据根目录。
 * 保持调用方（settings / watermark / storage driver）无需改动即可跟随用户自选目录。
 */
export function getAppDataDir(): string {
  return getDataRootDir()
}

/** 让用户在设置中重新选择数据目录（不自动迁移既有文件） */
export async function chooseDataRoot(): Promise<string | null> {
  const result = await dialog.showOpenDialog({
    title: '选择新的数据存储目录',
    properties: ['openDirectory', 'createDirectory']
  })
  if (result.canceled || result.filePaths.length === 0) return null
  const next = result.filePaths[0]
  mkdirSync(next, { recursive: true })
  writePointer(next)
  dataRoot = next
  return next
}