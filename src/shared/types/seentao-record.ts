/** 单条刷课记录 */
export interface SeentaoRecord {
  /** UUID，自动生成 */
  id: string
  /** ISO 时间戳，自动生成 */
  createdAt: string
  /** 学员姓名（可选） */
  studentName: string
  /** 课程名称（可选） */
  courseName: string
  /** 刷课备注内容 */
  note: string
  /** 关联的图片文件名列表 */
  images: string[]
  /** 可选标签 */
  tags?: string[]
}

/** 某天的记录数据（文件名 = DD.json） */
export interface DayRecords {
  /** 日期，如 '05' */
  date: string
  /** 记录列表 */
  records: SeentaoRecord[]
}

/** 工具配置 */
export interface SeentaoRecordConfig {
  /** 数据存储根路径 */
  storagePath: string
  /** 是否已初始化 */
  initialized: boolean
}

/** IPC 请求：按年月列出所有日期的记录 */
export interface SeentaoListRequest {
  yearMonth: string // 'YYYYMM'
}

/** IPC 响应：某年月的所有记录 */
export interface SeentaoListResponse {
  yearMonth: string
  days: DayRecords[]
}

/** IPC 请求：创建记录 */
export interface SeentaoCreateRequest {
  yearMonth: string
  record: Omit<SeentaoRecord, 'id' | 'createdAt'>
  /** base64 编码的图片数据 */
  imageDataList: string[]
}

/** IPC 请求：获取单条记录 */
export interface SeentaoGetRequest {
  yearMonth: string
  dateKey: string
  recordId: string
}

/** IPC 请求：删除记录 */
export interface SeentaoDeleteRequest {
  yearMonth: string
  dateKey: string
  recordId: string
  imageFilenames: string[]
}

/** IPC 请求：获取图片 */
export interface SeentaoGetImageRequest {
  yearMonth: string
  filename: string
}

/** IPC 通道常量 */
export const SEENTAO_IPC = {
  INIT: 'seentao-record:init',
  CONFIG: 'seentao-record:config',
  LIST: 'seentao-record:list',
  CREATE: 'seentao-record:create',
  GET: 'seentao-record:get',
  DELETE: 'seentao-record:delete',
  GET_IMAGE: 'seentao-record:get-image',
  SELECT_DIRECTORY: 'seentao-record:select-directory',
  SAVE_IMAGE: 'seentao-record:save-image'
} as const
