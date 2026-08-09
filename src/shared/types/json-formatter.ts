export interface JsonSession {
  id: string
  name: string
  content: string
  createdAt: number
  updatedAt: number
}

export interface JsonFormatterData {
  sessions: JsonSession[]
  activeId: string
  indent: number | string
}

export interface JsonTreeNode {
  key: string | null
  type: 'object' | 'array' | 'string' | 'number' | 'boolean' | 'null'
  text: string
  children?: JsonTreeNode[]
  expanded: boolean
}
