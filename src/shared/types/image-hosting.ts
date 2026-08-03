/** 图床 Provider 类型（预留扩展：oss | qiniu | cos | github ...） */
export type ImageProvider = 'oss'

/** 复制链接格式 */
export type CopyFormat = 'url' | 'md' | 'html'

/** 列表读取图片数量选项 */
export type ListCount = 5 | 10 | 20 | 50

/** 文件命名规则 */
export type NamingRule = 'keep' | 'timestamp' | 'date-archive'

/** 连接状态（用于右上角按钮状态点） */
export type ConnectionStatus = 'connected' | 'disconnected' | 'unconfigured'

/** 阿里云 OSS 配置 */
export interface OssConfig {
  region: string              // 如 oss-cn-hangzhou
  accessKeyId: string         // RAM 用户 AccessKey ID
  accessKeySecret: string     // RAM 用户 AccessKey Secret
  bucket: string              // Bucket 名称
  endpoint?: string           // 留空则使用 {region}.aliyuncs.com
  customDomain?: string       // 自定义域名，如 https://img.example.com
  pathPrefix?: string         // 存储路径前缀，如 uploads/（与 pathTemplate 二选一）
  namingRule: NamingRule      // 文件命名规则（pathTemplate 为空时生效）
  /**
   * 路径模板（优先于 pathPrefix + namingRule）
   * 支持占位符：
   *   {Y}                - 年（4位）
   *   {M}                - 月（2位）
   *   {D}                - 日（2位）
   *   {H}                - 时（2位，24h）
   *   {m}                - 分（2位）
   *   {s}                - 秒（2位）
   *   {no_filename}      - 原文件名（不含扩展名）
   *   {since_millisecond} - 毫秒级时间戳
   *   {suffix}           - 扩展名（不含点）
   * 示例：{Y}/{M}/{no_filename}{since_millisecond}-{Y}-{M}-{D}-{H}{m}{s}.{suffix}
   */
  pathTemplate?: string
}

/** 图床工具偏好设置 */
export interface ImageHostingPrefs {
  autoCopyEnabled: boolean    // 上传成功后是否自动复制链接
  copyFormat: CopyFormat      // 复制格式：URL / MD / HTML
  listCount: ListCount        // 最近上传列表读取条数：5 / 10 / 20 / 50
}

/** 图床工具完整配置（持久化到 tools/image-hosting.json） */
export interface ImageHostingConfig {
  provider: ImageProvider
  oss: OssConfig
  prefs: ImageHostingPrefs
}

/** 连接测试结果 */
export interface ConnectionTestResult {
  ok: boolean
  message: string
  bucketInfo?: {
    name: string
    region: string
    creationDate: string
  }
}

/** 上传后的图片信息（列表项） */
export interface UploadedImage {
  key: string                 // OSS 对象 key（完整路径）
  name: string                // 文件名（去掉路径前缀）
  size: number                // 字节数
  lastModified: string        // ISO 时间字符串
  url: string                 // 访问 URL
  format: string              // 文件扩展名（png/jpg/...）
}

/** 上传结果 */
export interface UploadResult {
  key: string
  url: string
  size: number
  name: string
}

/** 上传参数 */
export interface UploadParams {
  fileName: string            // 原始文件名
  fileBase64: string          // 文件 base64（含或不含 data: 前缀均可）
  mimeType: string            // MIME 类型，如 image/png
}

/** 按格式生成复制文本 */
export function formatCopyText(url: string, name: string, format: CopyFormat): string {
  switch (format) {
    case 'md':
      return `![${name}](${url})`
    case 'html':
      return `<img src="${url}" alt="${name}" />`
    case 'url':
    default:
      return url
  }
}

/** 默认偏好 */
export const DEFAULT_PREFS: ImageHostingPrefs = {
  autoCopyEnabled: true,
  copyFormat: 'url',
  listCount: 50
}

/** IPC 通道常量 */
export const IMAGE_HOSTING_IPC = {
  GET_CONFIG: 'image-hosting:get-config',
  SAVE_CONFIG: 'image-hosting:save-config',
  TEST_CONNECTION: 'image-hosting:test-connection',
  UPLOAD: 'image-hosting:upload',
  LIST: 'image-hosting:list',
  DELETE: 'image-hosting:delete',
  DOWNLOAD: 'image-hosting:download',
  OPEN_URL: 'image-hosting:open-url'
} as const
