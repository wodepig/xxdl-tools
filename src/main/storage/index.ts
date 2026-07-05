import { readJSON, writeJSON, deleteJSON } from './driver'

export function getToolData<T = Record<string, unknown>>(toolId: string): T {
  return readJSON(toolId) as T
}

export function setToolData<T = Record<string, unknown>>(toolId: string, data: T): void {
  writeJSON(toolId, data)
}

export function deleteToolData(toolId: string): void {
  deleteJSON(toolId)
}
