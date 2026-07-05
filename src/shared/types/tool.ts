export enum ToolCategory {
  Development = 'development',
  Image = 'image',
  Text = 'text',
  Security = 'security',
  Data = 'data',
  Design = 'design'
}

export interface ToolDefinition {
  id: string
  name: string
  description: string
  icon: string
  category: ToolCategory
  accentColor: string
  route?: string
  rating?: number
  tags?: string[]
  configurable?: boolean
}

export interface RecentItem {
  toolId: string
  toolName: string
  icon: string
  description: string
  timestamp: number
}

export interface CategorySection {
  id: string
  title: string
  icon: string
  color: string
  tools: ToolDefinition[]
}
