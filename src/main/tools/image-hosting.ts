import { ipcMain, dialog, shell } from 'electron'
import { join, extname, basename } from 'path'
import { writeFileSync } from 'fs'
import OSS from 'ali-oss'
import { IMAGE_HOSTING_IPC, DEFAULT_PREFS } from '../../shared/types/image-hosting'
import type {
  ImageHostingConfig,
  OssConfig,
  ConnectionTestResult,
  UploadedImage,
  UploadResult,
  UploadParams
} from '../../shared/types/image-hosting'
import { getToolData, setToolData } from '../storage'

const TOOL_ID = 'image-hosting'

// ——— 配置存取 ———
function loadConfig(): ImageHostingConfig | null {
  const data = getToolData<Partial<ImageHostingConfig>>(TOOL_ID)
  if (!data || !data.oss || !data.oss.accessKeyId) return null
  return {
    provider: data.provider || 'oss',
    oss: data.oss,
    prefs: { ...DEFAULT_PREFS, ...(data.prefs || {}) }
  }
}

function saveConfig(config: ImageHostingConfig): void {
  setToolData(TOOL_ID, config)
}

// ——— OSS client 工厂 ———
function createClient(oss: OssConfig): OSS {
  const options: OSS.Options = {
    region: oss.region,
    accessKeyId: oss.accessKeyId,
    accessKeySecret: oss.accessKeySecret,
    bucket: oss.bucket
  }
  if (oss.endpoint) {
    options.endpoint = oss.endpoint
  }
  // ali-oss 在 Node 环境下默认 secure=false，使用 http；这里强制 https 更安全
  return new OSS(options)
}

// ——— 生成 objectKey ———
function generateObjectKey(fileName: string, oss: OssConfig): string {
  const ext = extname(fileName)
  const suffix = ext.replace('.', '')
  const baseName = basename(fileName, ext)

  // 优先使用 pathTemplate
  if (oss.pathTemplate && oss.pathTemplate.trim()) {
    return renderPathTemplate(oss.pathTemplate, baseName, suffix)
  }

  const prefix = oss.pathPrefix || ''
  let objectName: string
  switch (oss.namingRule) {
    case 'timestamp': {
      const now = new Date()
      const pad = (n: number) => String(n).padStart(2, '0')
      const ts =
        `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}` +
        `${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`
      const rand = Math.random().toString(36).substring(2, 8)
      objectName = `${ts}_${rand}${ext}`
      break
    }
    case 'date-archive': {
      const now = new Date()
      const pad = (n: number) => String(n).padStart(2, '0')
      const datePath = `${now.getFullYear()}/${pad(now.getMonth() + 1)}/${pad(now.getDate())}`
      objectName = `${datePath}/${fileName}`
      break
    }
    case 'keep':
    default:
      objectName = fileName
      break
  }
  return prefix ? join(prefix, objectName) : objectName
}

// ——— 路径模板渲染 ———
function renderPathTemplate(template: string, baseName: string, suffix: string): string {
  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return template
    .replace(/\{Y\}/g, String(now.getFullYear()))
    .replace(/\{M\}/g, pad(now.getMonth() + 1))
    .replace(/\{D\}/g, pad(now.getDate()))
    .replace(/\{H\}/g, pad(now.getHours()))
    .replace(/\{m\}/g, pad(now.getMinutes()))
    .replace(/\{s\}/g, pad(now.getSeconds()))
    .replace(/\{no_filename\}/g, baseName)
    .replace(/\{since_millisecond\}/g, String(Date.now()))
    .replace(/\{suffix\}/g, suffix)
}

// ——— 生成访问 URL ———
function buildUrl(objectKey: string, oss: OssConfig): string {
  if (oss.customDomain) {
    let domain = oss.customDomain.replace(/\/$/, '')
    // 自动补 https 协议前缀（用户填裸域名时）
    if (!/^https?:\/\//i.test(domain)) {
      domain = `https://${domain}`
    }
    return `${domain}/${objectKey}`
  }
  const endpoint = oss.endpoint || `${oss.region}.aliyuncs.com`
  return `https://${oss.bucket}.${endpoint}/${objectKey}`
}

// ——— 提取文件扩展名 ———
function getFormat(key: string): string {
  return extname(key).replace('.', '').toLowerCase()
}

// ——— 注册 IPC handlers ———
export function registerImageHostingHandlers(): void {
  // 获取配置
  ipcMain.handle(IMAGE_HOSTING_IPC.GET_CONFIG, (): ImageHostingConfig | null => {
    return loadConfig()
  })

  // 保存配置
  ipcMain.handle(
    IMAGE_HOSTING_IPC.SAVE_CONFIG,
    (_event, config: ImageHostingConfig): void => {
      saveConfig(config)
    }
  )

  // 测试连接
  ipcMain.handle(
    IMAGE_HOSTING_IPC.TEST_CONNECTION,
    async (_event, oss: OssConfig): Promise<ConnectionTestResult> => {
      try {
        const client = createClient(oss)
        const result = await client.list({ 'max-keys': 1 }, {})
        if (result?.res?.status === 200) {
          return {
            ok: true,
            message: '连接成功',
            bucketInfo: {
              name: oss.bucket,
              region: oss.region,
              creationDate: ''
            }
          }
        }
        return { ok: false, message: '连接异常，状态码：' + (result?.res?.status ?? 'unknown') }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        return { ok: false, message }
      }
    }
  )

  // 上传
  ipcMain.handle(
    IMAGE_HOSTING_IPC.UPLOAD,
    async (_event, params: UploadParams): Promise<UploadResult> => {
      const config = loadConfig()
      if (!config) {
        throw new Error('未配置 OSS')
      }
      const client = createClient(config.oss)
      const objectKey = generateObjectKey(params.fileName, config.oss)

      const base64Data = params.fileBase64.replace(/^data:[^;]+;base64,/, '')
      const buffer = Buffer.from(base64Data, 'base64')

      await client.put(objectKey, buffer, {
        mime: params.mimeType,
        headers: { 'Content-Type': params.mimeType }
      })

      const url = buildUrl(objectKey, config.oss)
      return {
        key: objectKey,
        url,
        size: buffer.length,
        name: basename(objectKey)
      }
    }
  )

  // 列表（读取条数可在配置中设置：5 / 10 / 20 / 50，默认 50）
  // 始终按 pathPrefix 过滤；pathTemplate 仅决定上传命名，不影响列表范围
  ipcMain.handle(IMAGE_HOSTING_IPC.LIST, async (): Promise<UploadedImage[]> => {
    const config = loadConfig()
    if (!config) return []

    const client = createClient(config.oss)
    const prefix = config.oss.pathPrefix || ''
    const maxKeys = config.prefs.listCount || DEFAULT_PREFS.listCount
    const result = await client.list(
      { 'max-keys': maxKeys, prefix, delimiter: '' },
      {}
    )

    const objects = (result.objects || []).filter((o) => !o.name.endsWith('/'))
    const images: UploadedImage[] = objects
      .map((o) => ({
        key: o.name,
        name: basename(o.name),
        size: o.size || 0,
        lastModified: o.lastModified || new Date().toISOString(),
        url: buildUrl(o.name, config.oss),
        format: getFormat(o.name)
      }))
      .sort((a, b) => (a.lastModified < b.lastModified ? 1 : -1))

    return images
  })

  // 删除
  ipcMain.handle(IMAGE_HOSTING_IPC.DELETE, async (_event, key: string): Promise<void> => {
    const config = loadConfig()
    if (!config) return
    const client = createClient(config.oss)
    await client.delete(key)
  })

  // 下载
  ipcMain.handle(IMAGE_HOSTING_IPC.DOWNLOAD, async (_event, key: string): Promise<void> => {
    const config = loadConfig()
    if (!config) return
    const client = createClient(config.oss)

    const saveResult = await dialog.showSaveDialog({
      defaultPath: basename(key),
      filters: [{ name: '所有文件', extensions: ['*'] }]
    })
    if (saveResult.canceled || !saveResult.filePath) return

    const result = await client.get(key)
    writeFileSync(saveResult.filePath, result.content as Buffer)
  })

  // 在浏览器中打开
  ipcMain.handle(IMAGE_HOSTING_IPC.OPEN_URL, async (_event, url: string): Promise<void> => {
    await shell.openExternal(url)
  })
}
