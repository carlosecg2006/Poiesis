// Tipos compartilhados entre o processo principal (Node) e a interface (React).

export interface NoteMeta {
  /** Caminho relativo ao cofre, sempre com "/" (ex.: "Ideias/poema.md"). */
  path: string
  title: string
  updatedAt: number
  tags: string[]
}

export interface Note extends NoteMeta {
  body: string
  /** Títulos citados com [[link]] dentro da nota. */
  links: string[]
}

export interface Backlink {
  path: string
  title: string
}

export interface SearchHit {
  path: string
  title: string
  snippet: string
  score: number
}

export type ProviderId = 'claude' | 'ollama'
export type ProviderChoice = ProviderId | 'auto'

/** Nível de privacidade de um pedido: "privado" nunca sai do computador. */
export type Privacy = 'normal' | 'privado'

export interface ChatTurn {
  role: 'user' | 'assistant'
  text: string
  provider?: ProviderId
  at: number
}

export interface ConversationMeta {
  id: string
  title: string
  updatedAt: number
}

export interface Conversation extends ConversationMeta {
  privacy: Privacy
  turns: ChatTurn[]
}

export type ChatEvent =
  | { type: 'start'; conversationId: string; provider: ProviderId; reason: string }
  | { type: 'delta'; conversationId: string; text: string }
  | { type: 'done'; conversationId: string }
  | { type: 'error'; conversationId: string; message: string }

export interface Settings {
  vaultPath: string
  provider: ProviderChoice
  ollamaUrl: string
  ollamaModel: string
  hasClaudeKey: boolean
  /** Se a chave da API pode ser guardada com criptografia do sistema. */
  secureStorage: boolean
}

export interface ProviderStatus {
  claude: boolean
  ollama: boolean
}

export interface ModuleInfo {
  id: string
  name: string
  description: string
  capabilities: string[]
  enabled: boolean
}

export interface CommandInfo {
  id: string
  title: string
  module: string
  hint?: string
}

/** API exposta à interface pelo preload (window.poiesis). */
export interface PoiesisApi {
  notes: {
    list(): Promise<NoteMeta[]>
    read(path: string): Promise<Note>
    write(path: string, body: string): Promise<NoteMeta>
    create(title: string, folder?: string): Promise<NoteMeta>
    remove(path: string): Promise<void>
    backlinks(path: string): Promise<Backlink[]>
    resolve(title: string): Promise<string | null>
  }
  search(query: string): Promise<SearchHit[]>
  chat: {
    list(): Promise<ConversationMeta[]>
    get(id: string): Promise<Conversation>
    create(privacy: Privacy): Promise<Conversation>
    send(id: string, text: string): Promise<void>
    onEvent(listener: (event: ChatEvent) => void): () => void
  }
  settings: {
    get(): Promise<Settings>
    update(patch: Partial<Omit<Settings, 'hasClaudeKey' | 'secureStorage'>>): Promise<Settings>
    setClaudeKey(key: string | null): Promise<Settings>
    providers(): Promise<ProviderStatus>
    chooseVault(): Promise<Settings>
  }
  system: {
    modules(): Promise<ModuleInfo[]>
    commands(): Promise<CommandInfo[]>
    run(commandId: string, arg?: string): Promise<string>
    openVault(): Promise<void>
    onNavigate(listener: (space: string) => void): () => void
  }
}
