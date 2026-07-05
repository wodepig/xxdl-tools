import { app } from 'electron'
import { join, dirname } from 'path'

/**
 * 获取应用数据存储根目录
 * - 开发环境：{项目根目录}/data
 * - 生产环境：{exe所在目录}/data
 *
 * 确保数据存放在软件自身目录下，而非 C 盘用户目录。
 */
export function getAppDataDir(): string {
  const base = app.isPackaged
    ? dirname(app.getPath('exe'))
    : app.getAppPath()
  return join(base, 'data')
}
