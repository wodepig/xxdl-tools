/** HAR 查看工具 - 共享类型定义 */

/** 键值对（请求头 / 响应头 / Query / Cookie 通用） */
export interface HarNameValue {
  name: string
  value: string
}

/** 请求体 */
export interface HarPostData {
  mimeType?: string
  text?: string
}

/** 请求 */
export interface HarRequest {
  method: string
  url: string
  httpVersion?: string
  headers?: HarNameValue[]
  queryString?: HarNameValue[]
  cookies?: HarNameValue[]
  headersSize?: number
  bodySize?: number
  postData?: HarPostData
}

/** 响应内容 */
export interface HarResponseContent {
  size?: number
  mimeType?: string
  text?: string
  encoding?: string
}

/** 响应 */
export interface HarResponse {
  status: number
  statusText?: string
  httpVersion?: string
  headers?: HarNameValue[]
  cookies?: HarNameValue[]
  redirectURL?: string
  headersSize?: number
  bodySize?: number
  content?: HarResponseContent
}

/** 时间各阶段（毫秒） */
export interface HarTimings {
  blocked?: number
  dns?: number
  connect?: number
  send?: number
  wait?: number
  receive?: number
  ssl?: number
}

/** 单条请求记录（渲染进程运行时结构，包含游标 id） */
export interface HarEntry {
  _id: string
  startedDateTime?: string
  time?: number
  request: HarRequest
  response: HarResponse
  timings?: HarTimings
}

/** 解析后的 HAR 文件（运行时内存，不持久化原始内容） */
export interface HarFile {
  id: string
  name: string
  path: string
  entries: HarEntry[]
  openedAt: number
}

/** 会话元信息（持久化，不含原始内容，避免 HAR 体积过大） */
export interface HarSession {
  id: string
  name: string
  path: string
  entryCount: number
  createdAt: number
  updatedAt: number
}

/** har-viewer 持久化数据结构 */
export interface HarViewerData {
  sessions: HarSession[]
  activeId: string
}