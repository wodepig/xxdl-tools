import { registerSystemHandlers } from './system'
import { registerSettingsHandlers } from './settings'
import { registerDataHandlers } from './data'
import { registerToolHandlers } from '../tools'

export function registerAllIpcHandlers(): void {
  registerSystemHandlers()
  registerSettingsHandlers()
  registerDataHandlers()
  registerToolHandlers()
}
