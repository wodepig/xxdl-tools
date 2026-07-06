/** 水印预设 */
export interface WatermarkPreset {
  id: string
  name: string
  type: 'text' | 'image'
  content: string
  opacity: number
  position: 'center' | 'tile' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
  rotation: number
  fontSize?: number
  color?: string
  scale?: number
  tileGapX?: number   // 平铺水平间距(px)
  tileGapY?: number   // 平铺垂直间距(px)
}

/** 图片信息 */
export interface ImageInfo {
  filename: string
  path: string
  size: number
  preview: string
}

/** 文件信息 */
export interface FileInfo {
  path: string
  type: 'docx' | 'pptx'
  name: string
}

/** 水印应用参数 */
export interface WatermarkApplyParams {
  filePath: string
  fileType: 'docx' | 'pptx'
  imageFilenames: string[]
  presetId: string
  outputPath?: string
  textAsImagePath?: string // 预渲染的文字水印图片路径（文字水印专用）
}

/** 提取结果 */
export interface ExtractResult {
  tempDir: string
  images: ImageInfo[]
  mediaDir: string
}

/** 水印预览参数（编辑器临时预览用） */
export interface PreviewFileParams {
  imagePath: string
  preset: {
    name: string
    type: 'text' | 'image'
    content?: string            // 文字水印内容（文字类型）
    opacity: number
    position: string
    rotation: number
    fontSize?: number
    color?: string
    scale?: number
    watermarkImagePath?: string // 图片水印文件路径（图片类型）
    tileGapX?: number           // 平铺水平间距
    tileGapY?: number           // 平铺垂直间距
  }
}

/** IPC 通道常量 */
export const WATERMARK_IPC = {
  OPEN_FILE: 'watermark:open-file',
  EXTRACT: 'watermark:extract',
  LIST_IMAGES: 'watermark:list-images',
  PREVIEW: 'watermark:preview',
  PREVIEW_FILE: 'watermark:preview-file',
  APPLY: 'watermark:apply',
  SAVE_TEMP_IMAGE: 'watermark:save-temp-image',
  GET_PRESETS: 'watermark:get-presets',
  SAVE_PRESET: 'watermark:save-preset',
  DELETE_PRESET: 'watermark:delete-preset',
  OPEN_FOLDER: 'watermark:open-folder'
} as const
