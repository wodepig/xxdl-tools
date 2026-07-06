import { ipcMain, dialog, shell } from 'electron'
import { join, dirname, basename, extname } from 'path'
import { existsSync, mkdirSync, readFileSync, writeFileSync, rmSync, readdirSync } from 'fs'
import AdmZip from 'adm-zip'
import { Jimp } from 'jimp'
import { WATERMARK_IPC } from '../../shared/types/watermark'
import type { WatermarkPreset, ImageInfo, FileInfo, PreviewFileParams } from '../../shared/types/watermark'
import { getAppDataDir } from '../utils/paths'

// ——— 预设存储 ———
function getPresetsPath(): string {
  const dir = join(getAppDataDir(), 'tools')
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  return join(dir, 'watermark.json')
}

function loadPresets(): WatermarkPreset[] {
  const p = getPresetsPath()
  if (!existsSync(p)) return []
  try {
    return JSON.parse(readFileSync(p, 'utf-8'))
  } catch {
    return []
  }
}

function savePresets(presets: WatermarkPreset[]): void {
  writeFileSync(getPresetsPath(), JSON.stringify(presets, null, 2), 'utf-8')
}

function genId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 8)
}

function ensureTempDir(): string {
  const dir = join(getAppDataDir(), 'watermark-temp')
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  return dir
}

function cleanTempDir(tempDir: string): void {
  try {
    if (existsSync(tempDir)) rmSync(tempDir, { recursive: true, force: true })
  } catch { /* ignore */ }
}

function detectFileType(filePath: string): 'docx' | 'pptx' | null {
  const ext = extname(filePath).toLowerCase()
  if (ext === '.docx') return 'docx'
  if (ext === '.pptx') return 'pptx'
  return null
}

function getMediaDir(fileType: 'docx' | 'pptx'): string {
  return fileType === 'docx' ? 'word/media' : 'ppt/media'
}

// ——— 缩略图 base64 ———
async function generatePreview(imagePath: string): Promise<string> {
  try {
    const img = await Jimp.read(imagePath)
    const maxSize = 200
    const w = img.bitmap.width
    const h = img.bitmap.height
    if (w > h) {
      img.resize({ w: maxSize })
    } else {
      img.resize({ h: maxSize })
    }
    const buffer = await img.getBuffer('image/png')
    return `data:image/png;base64,${buffer.toString('base64')}`
  } catch {
    return ''
  }
}

// ——— 应用水印到单张图片 ———
async function applyWatermarkToImage(imagePath: string, preset: WatermarkPreset): Promise<void> {
  const img = await Jimp.read(imagePath)
  const w = img.bitmap.width
  const h = img.bitmap.height

  // 文字水印和图片水印统一使用图片方式处理
  // 文字水印的内容已被渲染进程预渲染为 base64 PNG
  if (!preset.content) return

  try {
    const base64Data = preset.content.replace(/^data:image\/\w+;base64,/, '')
    const watermarkImg = await Jimp.read(Buffer.from(base64Data, 'base64'))
    const ww = watermarkImg.bitmap.width
    const wh = watermarkImg.bitmap.height

    // 缩放（对文字和图片水印都有效）
    const scale = preset.scale || (preset.type === 'image' ? 20 : 100)
    const targetW = Math.floor(ww * scale / 100)
    watermarkImg.resize({ w: targetW })

    if (preset.rotation !== 0) {
      watermarkImg.rotate({ deg: preset.rotation })
    }

    watermarkImg.opacity(Math.max(0.05, preset.opacity / 100))

    if (preset.position === 'tile') {
      // 平铺模式：使用 tileGapX/tileGapY
      const gapX = preset.tileGapX ?? 0
      const gapY = preset.tileGapY ?? 0
      const sw = watermarkImg.bitmap.width
      const sh = watermarkImg.bitmap.height
      const stepX = sw + gapX
      const stepY = sh + gapY
      for (let y = 0; y < h; y += stepY) {
        for (let x = 0; x < w; x += stepX) {
          img.composite(watermarkImg, x, y)
        }
      }
    } else {
      const pad = 20
      let px = 0, py = 0
      const sw = watermarkImg.bitmap.width
      const sh = watermarkImg.bitmap.height
      switch (preset.position) {
        case 'top-left': px = pad; py = pad; break
        case 'top-right': px = w - sw - pad; py = pad; break
        case 'bottom-left': px = pad; py = h - sh - pad; break
        case 'bottom-right': px = w - sw - pad; py = h - sh - pad; break
        default: px = (w - sw) / 2; py = (h - sh) / 2; break
      }
      img.composite(watermarkImg, Math.max(0, px), Math.max(0, py))
    }
  } catch { /* ignore watermark error */ }

  await img.write(imagePath as unknown as `${string}.${string}`)
}

// ——— 注册 IPC handlers ———
export function registerWatermarkHandlers(): void {
  // 打开文件
  ipcMain.handle(WATERMARK_IPC.OPEN_FILE, async (): Promise<FileInfo | null> => {
    const result = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [
        { name: 'Office 文档', extensions: ['docx', 'pptx'] },
        { name: 'Word 文档', extensions: ['docx'] },
        { name: 'PPT 演示文稿', extensions: ['pptx'] }
      ]
    })
    if (result.canceled || !result.filePaths[0]) return null
    const filePath = result.filePaths[0]
    const fileType = detectFileType(filePath)
    if (!fileType) return null
    return { path: filePath, type: fileType, name: basename(filePath) }
  })

  // 提取并列出图片
  ipcMain.handle(WATERMARK_IPC.EXTRACT, async (_event, filePath: string, fileType: 'docx' | 'pptx'): Promise<{ images: ImageInfo[]; tempDir: string } | null> => {
    try {
      const zip = new AdmZip(filePath)
      const tempUuid = genId()
      const tempDir = join(ensureTempDir(), tempUuid)
      zip.extractAllTo(tempDir, true)

      const mediaDir = join(tempDir, getMediaDir(fileType))
      if (!existsSync(mediaDir)) return { images: [], tempDir }

      const files = readdirSync(mediaDir)
      const imageFiles = files.filter(f => /\.(png|jpg|jpeg|gif|webp|bmp|tiff?)$/i.test(f))

      const images: ImageInfo[] = []
      for (const f of imageFiles) {
        const fullPath = join(mediaDir, f)
        try {
          const stat = readFileSync(fullPath)
          const preview = await generatePreview(fullPath)
          images.push({ filename: f, path: fullPath, size: stat.length, preview })
        } catch { /* skip */ }
      }
      return { images, tempDir }
    } catch {
      return null
    }
  })

  // 预览水印
  ipcMain.handle(WATERMARK_IPC.PREVIEW, async (_event, imageBase64: string, preset: WatermarkPreset): Promise<string> => {
    try {
      const tempPreviewDir = join(ensureTempDir(), 'preview')
      if (!existsSync(tempPreviewDir)) mkdirSync(tempPreviewDir, { recursive: true })
      const tempPath = join(tempPreviewDir, 'preview.png')
      const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '')
      writeFileSync(tempPath, Buffer.from(base64Data, 'base64'))
      await applyWatermarkToImage(tempPath, preset)
      const result = await generatePreview(tempPath)
      rmSync(tempPath, { force: true })
      return result
    } catch {
      return imageBase64
    }
  })

  // 预览水印（从文件路径）
  ipcMain.handle(WATERMARK_IPC.PREVIEW_FILE, async (_event, params: PreviewFileParams): Promise<{ original: string; watermarked: string } | null> => {
    try {
      if (!existsSync(params.imagePath)) return null
      const original = await generatePreview(params.imagePath)
      // 复制到临时文件，避免修改原图
      const tempPreviewDir = join(ensureTempDir(), 'preview')
      if (!existsSync(tempPreviewDir)) mkdirSync(tempPreviewDir, { recursive: true })
      const tempPath = join(tempPreviewDir, `preview_${genId()}.png`)
      writeFileSync(tempPath, readFileSync(params.imagePath))

      // 组装完整的 preset
      const basePreset: WatermarkPreset = {
        id: 'preview',
        name: params.preset.name,
        type: params.preset.type,
        content: '',
        opacity: params.preset.opacity,
        position: params.preset.position as WatermarkPreset['position'],
        rotation: params.preset.rotation,
        fontSize: params.preset.fontSize,
        color: params.preset.color,
        scale: params.preset.scale,
        tileGapX: params.preset.tileGapX,
        tileGapY: params.preset.tileGapY
      }

      if (params.preset.type === 'image' && params.preset.watermarkImagePath) {
        // 图片水印或预渲染的文字水印：从文件读取 base64
        const imgBase64 = readFileSync(params.preset.watermarkImagePath).toString('base64')
        basePreset.content = `data:image/png;base64,${imgBase64}`
      } else {
        basePreset.content = params.preset.content || ''
      }

      await applyWatermarkToImage(tempPath, basePreset)
      const watermarked = await generatePreview(tempPath)
      rmSync(tempPath, { force: true })
      return { original, watermarked }
    } catch (err) {
      console.error('[watermark] preview-file error:', err)
      return null
    }
  })

  // 保存临时图片（避免 IPC 传输大 base64）
  ipcMain.handle(WATERMARK_IPC.SAVE_TEMP_IMAGE, async (_event, base64: string): Promise<string> => {
    const tempAssetsDir = join(ensureTempDir(), 'assets')
    if (!existsSync(tempAssetsDir)) mkdirSync(tempAssetsDir, { recursive: true })
    const filePath = join(tempAssetsDir, `temp_${genId()}.png`)
    const raw = base64.replace(/^data:image\/\w+;base64,/, '')
    writeFileSync(filePath, Buffer.from(raw, 'base64'))
    return filePath
  })

  // 应用水印
  ipcMain.handle(WATERMARK_IPC.APPLY, async (_event, params: {
    filePath: string
    fileType: 'docx' | 'pptx'
    imageFilenames: string[]
    presetId: string
    outputPath?: string
    textAsImagePath?: string
  }): Promise<string | null> => {
    try {
      // 从保存的预设中加载完整数据
      const allPresets = loadPresets()
      const savedPreset = allPresets.find(p => p.id === params.presetId)
      if (!savedPreset) return null

      // 如果是文字水印且提供了预渲染图片，使用图片内容
      const effectivePreset = { ...savedPreset }
      if (params.textAsImagePath) {
        // 读取预渲染的文字图片
        const imgData = readFileSync(params.textAsImagePath).toString('base64')
        effectivePreset.content = `data:image/png;base64,${imgData}`
      }

      const zip = new AdmZip(params.filePath)
      const tempUuid = genId()
      const tempDir = join(ensureTempDir(), tempUuid)
      zip.extractAllTo(tempDir, true)

      const mediaDir = join(tempDir, getMediaDir(params.fileType))
      for (const filename of params.imageFilenames) {
        const imagePath = join(mediaDir, filename)
        if (existsSync(imagePath)) {
          await applyWatermarkToImage(imagePath, effectivePreset)
        }
      }

      const outputName = `watermarked_${basename(params.filePath)}`
      const outputPath = params.outputPath || join(dirname(params.filePath), outputName)
      const outZip = new AdmZip()
      outZip.addLocalFolder(tempDir)
      outZip.writeZip(outputPath)
      cleanTempDir(tempDir)
      return outputPath
    } catch {
      return null
    }
  })

  // 获取预设列表
  ipcMain.handle(WATERMARK_IPC.GET_PRESETS, (): WatermarkPreset[] => loadPresets())

  // 保存预设
  ipcMain.handle(WATERMARK_IPC.SAVE_PRESET, (_event, preset: WatermarkPreset): void => {
    const presets = loadPresets()
    const idx = presets.findIndex(p => p.id === preset.id)
    if (idx >= 0) presets[idx] = preset
    else presets.push(preset)
    savePresets(presets)
  })

  // 删除预设
  ipcMain.handle(WATERMARK_IPC.DELETE_PRESET, async (_event, id: string): Promise<void> => {
    try {
      const presets = loadPresets()
      savePresets(presets.filter(p => p.id !== id))
    } catch { /* ignore */ }
  })

  // 在文件管理器中显示
  ipcMain.handle(WATERMARK_IPC.OPEN_FOLDER, async (_event, filePath: string): Promise<void> => {
    shell.showItemInFolder(filePath)
  })
}
