import { app } from 'electron'
import { join } from 'path'
import { readFileSync, writeFileSync, existsSync, mkdirSync, unlinkSync } from 'fs'

function getDataDir(): string {
  const dir = join(app.getPath('userData'), 'data')
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }
  return dir
}

function getFilePath(toolId: string): string {
  return join(getDataDir(), `${toolId}.json`)
}

export function readJSON(toolId: string): Record<string, unknown> {
  const filePath = getFilePath(toolId)
  if (!existsSync(filePath)) {
    return {}
  }
  try {
    return JSON.parse(readFileSync(filePath, 'utf-8'))
  } catch {
    return {}
  }
}

export function writeJSON(toolId: string, data: unknown): void {
  writeFileSync(getFilePath(toolId), JSON.stringify(data, null, 2), 'utf-8')
}

export function deleteJSON(toolId: string): void {
  const filePath = getFilePath(toolId)
  if (existsSync(filePath)) {
    unlinkSync(filePath)
  }
}
