import type { ToolDefinition, CategorySection } from '../../../shared/types/tool'
import { ToolCategory } from '../../../shared/types/tool'

export const tools: ToolDefinition[] = [
  {
    id: 'json-formatter',
    name: 'JSON 格式化',
    description: '格式化、压缩、验证 JSON 数据，支持语法高亮',
    icon: 'i-heroicons-code-bracket',
    category: ToolCategory.Development,
    accentColor: '#6366f1',
    rating: 4.9,
    tags: ['开发']
  },
  {
    id: 'timestamp',
    name: '时间戳转换',
    description: 'Unix 时间戳与日期互转，支持多种格式输出',
    icon: 'i-heroicons-clock',
    category: ToolCategory.Development,
    accentColor: '#10b981',
    rating: 4.8,
    tags: ['开发']
  },
  {
    id: 'base64',
    name: 'Base64 编解码',
    description: 'Base64 编码/解码，支持图片转 Base64',
    icon: 'i-heroicons-hashtag',
    category: ToolCategory.Security,
    accentColor: '#ec4899',
    rating: 4.7,
    tags: ['安全']
  },
  {
    id: 'qrcode',
    name: '二维码生成',
    description: '生成二维码，支持自定义尺寸、颜色、Logo',
    icon: 'i-heroicons-qr-code',
    category: ToolCategory.Image,
    accentColor: '#06b6d4',
    rating: 4.6,
    tags: ['图片']
  },
  {
    id: 'color-tool',
    name: '颜色工具',
    description: 'HEX/RGB/HSL 互转，调色板生成，颜色对比度',
    icon: 'i-heroicons-swatch',
    category: ToolCategory.Design,
    accentColor: '#8b5cf6',
    rating: 4.5,
    tags: ['设计']
  },
  {
    id: 'regex',
    name: '正则表达式',
    description: '正则测试、可视化、常用表达式库',
    icon: 'i-heroicons-document-text',
    category: ToolCategory.Development,
    accentColor: '#f59e0b',
    rating: 4.4,
    tags: ['开发']
  },
  {
    id: 'password-generator',
    name: '密码生成器',
    description: '生成强密码，支持自定义长度和字符集',
    icon: 'i-heroicons-lock-closed',
    category: ToolCategory.Security,
    accentColor: '#ef4444',
    rating: 4.3,
    tags: ['安全']
  },
  {
    id: 'markdown',
    name: 'Markdown 预览',
    description: '实时预览 Markdown，支持导出 HTML/PDF',
    icon: 'i-heroicons-document',
    category: ToolCategory.Text,
    accentColor: '#14b8a6',
    rating: 4.2,
    tags: ['文本']
  },
  {
    id: 'diff-checker',
    name: '代码对比',
    description: '文本/代码差异对比，行级高亮',
    icon: 'i-heroicons-document-duplicate',
    category: ToolCategory.Development,
    accentColor: '#6366f1',
    rating: 4.1,
    tags: ['开发']
  },
  {
    id: 'image-compress',
    name: '图片压缩',
    description: '批量压缩图片，保持质量减小体积',
    icon: 'i-heroicons-photo',
    category: ToolCategory.Image,
    accentColor: '#10b981',
    rating: 4.0,
    tags: ['图片']
  },
  {
    id: 'http-request',
    name: 'HTTP 请求',
    description: '模拟 HTTP 请求，支持多种方法和 Headers',
    icon: 'i-heroicons-arrow-path',
    category: ToolCategory.Development,
    accentColor: '#ec4899',
    rating: 3.9,
    tags: ['开发']
  },
  {
    id: 'tts',
    name: '文本转语音',
    description: '将文本转换为语音，支持多种音色',
    icon: 'i-heroicons-speaker-wave',
    category: ToolCategory.Text,
    accentColor: '#06b6d4',
    rating: 3.8,
    tags: ['文本']
  }
]

export const categories: CategorySection[] = [
  {
    id: 'all',
    title: '全部工具',
    icon: 'i-heroicons-squares-2x2',
    color: '#6366f1',
    tools
  },
  {
    id: ToolCategory.Development,
    title: '开发工具',
    icon: 'i-heroicons-code-bracket',
    color: '#6366f1',
    tools: tools.filter(t => t.category === ToolCategory.Development)
  },
  {
    id: ToolCategory.Image,
    title: '图片处理',
    icon: 'i-heroicons-photo',
    color: '#10b981',
    tools: tools.filter(t => t.category === ToolCategory.Image)
  },
  {
    id: ToolCategory.Text,
    title: '文本工具',
    icon: 'i-heroicons-document-text',
    color: '#06b6d4',
    tools: tools.filter(t => t.category === ToolCategory.Text)
  },
  {
    id: ToolCategory.Security,
    title: '安全加密',
    icon: 'i-heroicons-shield-check',
    color: '#ec4899',
    tools: tools.filter(t => t.category === ToolCategory.Security)
  },
  {
    id: ToolCategory.Data,
    title: '数据转换',
    icon: 'i-heroicons-arrows-right-left',
    color: '#8b5cf6',
    tools: tools.filter(t => t.category === ToolCategory.Data)
  },
  {
    id: ToolCategory.Design,
    title: '设计工具',
    icon: 'i-heroicons-paint-brush',
    color: '#f59e0b',
    tools: tools.filter(t => t.category === ToolCategory.Design)
  }
]
