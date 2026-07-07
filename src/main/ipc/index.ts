import { registerSystemHandlers } from './system'
import { registerSettingsHandlers } from './settings'
import { registerDataHandlers } from './data'
import { registerToolHandlers } from '../tools'
import { registerSeentaoRecordHandlers } from './seentao-record'
import { registerUpdaterHandlers } from './updater'

export function registerAllIpcHandlers(): void {
  registerSystemHandlers()
  registerSettingsHandlers()
  registerDataHandlers()
  registerToolHandlers()
  registerSeentaoRecordHandlers()
  registerUpdaterHandlers()
}
