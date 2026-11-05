import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron'
import { IPC, type DesktopApi } from '../shared/api'
import type { AppState } from '../shared/types'

function subscribe<T>(channel: string, listener: (payload: T) => void): () => void {
  const handler = (_event: IpcRendererEvent, payload: T) => listener(payload)
  ipcRenderer.on(channel, handler)
  return () => ipcRenderer.off(channel, handler)
}

const api: DesktopApi = {
  getState: () => ipcRenderer.invoke(IPC.getState),
  onState: (listener) => subscribe<AppState>(IPC.state, listener),
  onTimeUp: (listener) => subscribe<void>(IPC.timeUp, listener),
  timer: (action) => ipcRenderer.invoke(IPC.timer, action),
  saveTasks: (tasks, date) => ipcRenderer.invoke(IPC.saveTasks, tasks, date),
  saveSettings: (patch) => ipcRenderer.invoke(IPC.saveSettings, patch),
  openPlanner: () => ipcRenderer.send(IPC.openPlanner),
  setWidgetCollapsed: (collapsed) => ipcRenderer.send(IPC.widgetCollapsed, collapsed),
  hideWidget: () => ipcRenderer.send(IPC.hideWidget)
}

contextBridge.exposeInMainWorld('api', api)
