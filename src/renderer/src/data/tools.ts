import type { ToolDefinition, CategorySection } from '../../../shared/types/tool'
import { ToolCategory } from '../../../shared/types/tool'

export const tools: ToolDefinition[] = [
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
    id: 'yingdao-study',
    name: '影刀学习时长',
    description: '影刀学习时长回溯计算，自动生成请求并发送',
    icon: 'i-heroicons-play-circle',
    category: ToolCategory.Development,
    accentColor: '#f59e0b',
    rating: 4.5,
    tags: ['开发', '业务']
  },
  {
    id: 'seentao-record',
    name: '新道云刷课记录',
    description: '记录学员刷课信息与截图，支持按年月归档',
    icon: 'i-heroicons-academic-cap',
    category: ToolCategory.Data,
    accentColor: '#f97316',
    rating: 4.0,
    tags: ['数据', '业务']
  },
  {
    id: 'watermark',
    name: 'DOCX/PPT 水印添加',
    description: '给 Word/PPT 文档中的图片批量添加文字或图片水印',
    icon: 'i-heroicons-photo',
    category: ToolCategory.Image,
    accentColor: '#06b6d4',
    rating: 4.0,
    tags: ['图片', '文档']
  },
  {
    id: 'cloud-drive-share',
    name: '网盘快捷分享',
    description: '百度网盘/夸克网盘文件浏览与分享，支持查看次数限制',
    icon: 'i-heroicons-share',
    category: ToolCategory.Data,
    accentColor: '#3b82f6',
    rating: 4.0,
    tags: ['网盘', '分享']
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
    id: ToolCategory.Image,
    title: '图片处理',
    icon: 'i-heroicons-photo',
    color: '#10b981',
    tools: tools.filter(t => t.category === ToolCategory.Image)
  }
]
