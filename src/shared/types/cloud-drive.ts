/** 网盘服务商 */
export type CloudDriveProvider = 'baidu' | 'quark'

/** 登录方式 */
export type LoginMethod = 'qrcode' | 'cookie'

/** 网盘登录状态 */
export interface CloudDriveLoginState {
  provider: CloudDriveProvider
  isLoggedIn: boolean
  method: LoginMethod | null
  userInfo?: {
    nickname: string
    avatar?: string
  }
}

/** 网盘文件/文件夹 */
export interface CloudDriveFile {
  id: string
  name: string
  isFolder: boolean
  size?: number
  modifiedAt?: string
  children?: CloudDriveFile[]
}

/** 分享配置 */
export interface ShareConfig {
  viewLimit: number
  expireDays: number
  extractCode: string
}

/** 分享结果 */
export interface ShareResult {
  url: string
  extractCode: string
  expireAt: string
}

/** 网盘展示名称映射 */
export const CLOUD_DRIVE_LABELS: Record<CloudDriveProvider, string> = {
  baidu: '百度网盘',
  quark: '夸克网盘'
}

/** 网盘图标映射 */
export const CLOUD_DRIVE_ICONS: Record<CloudDriveProvider, string> = {
  baidu: 'i-heroicons-cloud',
  quark: 'i-heroicons-cloud-arrow-up'
}
