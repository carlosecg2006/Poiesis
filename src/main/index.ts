// Ponto de entrada do Poiesis: liga o núcleo, os módulos e a janela.

import { app, BrowserWindow, dialog, globalShortcut, ipcMain, Menu, safeStorage, shell } from 'electron'
import { join } from 'node:path'
import type { ChatEvent, Privacy, Settings } from '@shared/types'
import { ChatService, PROFILE_NOTE } from './ai/chat'
import { ollamaAvailable } from './ai/providers'
import { EventBus, type CoreEvents } from './core/bus'
import { ConfigStore, defaultConfig } from './core/config'
import { ModuleRegistry } from './core/modules'
import { SEED_NOTES } from './seed'
import { Vault } from './vault/vault'

const GLOBAL_SHORTCUT = 'CommandOrControl+Shift+Space'

let win: BrowserWindow | null = null
const bus = new EventBus<CoreEvents>()
const modules = new ModuleRegistry()
let config: ConfigStore
let vault: Vault
let chat: ChatService

function send(channel: string, payload: unknown): void {
  win?.webContents.send(channel, payload)
}

function navigate(space: string): void {
  showWindow()
  send('system:navigate', space)
}

function showWindow(): void {
  if (!win) return
  if (win.isMinimized()) win.restore()
  win.show()
  win.focus()
}

function settings(): Settings {
  return {
    ...config.get(),
    hasClaudeKey: Boolean(config.getClaudeKey()),
    secureStorage: config.secureStorage()
  }
}

async function providerStatus(): Promise<{ claude: boolean; ollama: boolean }> {
  return { claude: Boolean(config.getClaudeKey()), ollama: await ollamaAvailable(config.get().ollamaUrl) }
}

async function openVault(path: string): Promise<void> {
  vault = new Vault(path)
  await vault.init(SEED_NOTES)
  chat = new ChatService({
    vault,
    getChoice: () => config.get().provider,
    getClaudeKey: () => config.getClaudeKey(),
    getOllama: () => ({ url: config.get().ollamaUrl, model: config.get().ollamaModel }),
    status: providerStatus,
    emit: (event: ChatEvent) => {
      send('chat:event', event)
      if (event.type === 'done') bus.emit('chat:turn', { conversationId: event.conversationId })
    }
  })
}

function registerModules(): void {
  modules.register({
    id: 'nucleo',
    name: 'Núcleo',
    description: 'Navegação, configurações e acesso ao cofre.',
    capabilities: ['system.open'],
    commands: [
      { id: 'ir.central', title: 'Ir para a Central', run: () => (navigate('central'), 'ok') },
      { id: 'ir.notas', title: 'Ir para as Notas', run: () => (navigate('notas'), 'ok') },
      { id: 'ir.chat', title: 'Ir para o Chat', run: () => (navigate('chat'), 'ok') },
      { id: 'ir.ajustes', title: 'Abrir Ajustes', run: () => (navigate('ajustes'), 'ok') },
      {
        id: 'cofre.abrir',
        title: 'Abrir a pasta do cofre no Explorador',
        run: async () => {
          await shell.openPath(vault.root)
          return 'Pasta aberta.'
        }
      }
    ]
  })
  modules.register({
    id: 'notas',
    name: 'Notas',
    description: 'Notas em Markdown, links [[entre ideias]] e busca.',
    capabilities: ['vault.read', 'vault.write'],
    commands: [
      {
        id: 'nota.nova',
        title: 'Nova nota',
        hint: 'título da nota',
        run: async (arg) => {
          const note = await vault.create(arg?.trim() || 'Nova nota')
          navigate(`nota:${note.path}`)
          return `Nota criada: ${note.title}`
        }
      },
      {
        id: 'nota.diario',
        title: 'Nota do dia',
        run: async () => {
          const d = new Date()
          const name = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
          const path = `Diário/${name}.md`
          try {
            await vault.read(path)
          } catch {
            const pretty = d.toLocaleDateString('pt-BR', { dateStyle: 'full' })
            await vault.write(path, `# ${pretty}\n\n## Como estou\n\n## O que quero fazer hoje\n\n## Notas soltas\n\n`)
          }
          navigate(`nota:${path}`)
          return 'Nota do dia aberta.'
        }
      },
      {
        id: 'nota.perfil',
        title: 'Editar "Sobre mim" (o que a IA sabe de você)',
        run: () => (navigate(`nota:${PROFILE_NOTE}`), 'ok')
      }
    ]
  })
  modules.register({
    id: 'ia',
    name: 'Inteligência',
    description: 'Conversa com IA na nuvem (Claude) ou local (Ollama), com escolha automática.',
    capabilities: ['ai.cloud', 'ai.local', 'vault.read'],
    commands: [
      { id: 'chat.novo', title: 'Nova conversa', run: () => (navigate(`chat:novo#${Date.now()}`), 'ok') },
      {
        id: 'chat.privado',
        title: 'Nova conversa privada (só IA local)',
        run: () => (navigate(`chat:privado#${Date.now()}`), 'ok')
      }
    ]
  })
}

function registerIpc(): void {
  ipcMain.handle('notes:list', () => vault.list())
  ipcMain.handle('notes:read', (_e, path: string) => vault.read(path))
  ipcMain.handle('notes:write', async (_e, path: string, body: string) => {
    const meta = await vault.write(path, body)
    bus.emit('note:saved', { path })
    return meta
  })
  ipcMain.handle('notes:create', (_e, title: string, folder?: string) => vault.create(title, folder))
  ipcMain.handle('notes:remove', async (_e, path: string) => {
    await vault.remove(path)
    bus.emit('note:removed', { path })
  })
  ipcMain.handle('notes:backlinks', (_e, path: string) => vault.backlinks(path))
  ipcMain.handle('notes:resolve', (_e, title: string) => vault.resolve(title))
  ipcMain.handle('search', (_e, query: string) => vault.search(query))

  ipcMain.handle('chat:list', () => chat.list())
  ipcMain.handle('chat:get', (_e, id: string) => chat.get(id))
  ipcMain.handle('chat:create', (_e, privacy: Privacy) => chat.create(privacy))
  ipcMain.handle('chat:send', (_e, id: string, text: string) => chat.send(id, text))

  ipcMain.handle('settings:get', () => settings())
  ipcMain.handle('settings:update', async (_e, patch: Partial<Settings>) => {
    const before = config.get().vaultPath
    config.update({
      vaultPath: patch.vaultPath,
      provider: patch.provider,
      ollamaUrl: patch.ollamaUrl,
      ollamaModel: patch.ollamaModel
    })
    if (config.get().vaultPath !== before) await openVault(config.get().vaultPath)
    return settings()
  })
  ipcMain.handle('settings:setClaudeKey', (_e, key: string | null) => {
    config.setClaudeKey(key)
    return settings()
  })
  ipcMain.handle('settings:providers', () => providerStatus())
  ipcMain.handle('settings:chooseVault', async () => {
    const result = await dialog.showOpenDialog(win!, {
      title: 'Escolha a pasta do cofre',
      properties: ['openDirectory', 'createDirectory']
    })
    if (!result.canceled && result.filePaths[0]) {
      config.update({ vaultPath: result.filePaths[0] })
      await openVault(result.filePaths[0])
    }
    return settings()
  })

  ipcMain.handle('system:modules', () => modules.list())
  ipcMain.handle('system:commands', () => modules.commands())
  ipcMain.handle('system:run', (_e, id: string, arg?: string) => modules.run(id, arg))
  ipcMain.handle('system:openVault', () => shell.openPath(vault.root).then(() => undefined))
}

function createWindow(): void {
  win = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 900,
    minHeight: 600,
    show: false,
    title: 'Poiesis',
    backgroundColor: '#0f1115',
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      sandbox: false,
      nodeIntegration: false
    }
  })
  win.on('ready-to-show', () => win?.show())
  // Links externos abrem no navegador, nunca dentro do app.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/.test(url)) void shell.openExternal(url)
    return { action: 'deny' }
  })
  win.on('closed', () => (win = null))

  if (process.env.ELECTRON_RENDERER_URL) void win.loadURL(process.env.ELECTRON_RENDERER_URL)
  else void win.loadFile(join(__dirname, '../renderer/index.html'))
}

if (!app.requestSingleInstanceLock()) {
  app.quit()
} else {
  app.on('second-instance', showWindow)

  app.whenReady().then(async () => {
    app.setAppUserModelId('app.poiesis.desktop')
    Menu.setApplicationMenu(null)
    config = new ConfigStore(app.getPath('userData'), defaultConfig(app.getPath('documents')), {
      available: () => safeStorage.isEncryptionAvailable(),
      encrypt: (plain) => safeStorage.encryptString(plain),
      decrypt: (data) => safeStorage.decryptString(data)
    })
    await openVault(config.get().vaultPath)
    registerModules()
    registerIpc()
    createWindow()
    globalShortcut.register(GLOBAL_SHORTCUT, () => navigate('comando'))

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
  })

  app.on('will-quit', () => globalShortcut.unregisterAll())
  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
  })
}
