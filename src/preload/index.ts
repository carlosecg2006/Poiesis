// Ponte segura entre a interface e o núcleo: a interface só enxerga
// as funções listadas aqui (window.poiesis), nunca o Node inteiro.

import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron'
import type { ChatEvent, PoiesisApi } from '@shared/types'

const api: PoiesisApi = {
  notes: {
    list: () => ipcRenderer.invoke('notes:list'),
    read: (path) => ipcRenderer.invoke('notes:read', path),
    write: (path, body) => ipcRenderer.invoke('notes:write', path, body),
    create: (title, folder) => ipcRenderer.invoke('notes:create', title, folder),
    remove: (path) => ipcRenderer.invoke('notes:remove', path),
    backlinks: (path) => ipcRenderer.invoke('notes:backlinks', path),
    resolve: (title) => ipcRenderer.invoke('notes:resolve', title)
  },
  search: (query) => ipcRenderer.invoke('search', query),
  chat: {
    list: () => ipcRenderer.invoke('chat:list'),
    get: (id) => ipcRenderer.invoke('chat:get', id),
    create: (privacy) => ipcRenderer.invoke('chat:create', privacy),
    send: (id, text) => ipcRenderer.invoke('chat:send', id, text),
    onEvent: (listener) => {
      const handler = (_e: IpcRendererEvent, event: ChatEvent): void => listener(event)
      ipcRenderer.on('chat:event', handler)
      return () => ipcRenderer.removeListener('chat:event', handler)
    }
  },
  settings: {
    get: () => ipcRenderer.invoke('settings:get'),
    update: (patch) => ipcRenderer.invoke('settings:update', patch),
    setClaudeKey: (key) => ipcRenderer.invoke('settings:setClaudeKey', key),
    providers: () => ipcRenderer.invoke('settings:providers'),
    chooseVault: () => ipcRenderer.invoke('settings:chooseVault')
  },
  system: {
    modules: () => ipcRenderer.invoke('system:modules'),
    commands: () => ipcRenderer.invoke('system:commands'),
    run: (id, arg) => ipcRenderer.invoke('system:run', id, arg),
    openVault: () => ipcRenderer.invoke('system:openVault'),
    onNavigate: (listener) => {
      const handler = (_e: IpcRendererEvent, space: string): void => listener(space)
      ipcRenderer.on('system:navigate', handler)
      return () => ipcRenderer.removeListener('system:navigate', handler)
    }
  }
}

contextBridge.exposeInMainWorld('poiesis', api)
