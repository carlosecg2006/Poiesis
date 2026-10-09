// Configuração do Poiesis: um arquivo JSON legível na pasta de dados do app.
// A chave da API fica separada e criptografada (no Windows, via DPAPI).

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import type { ProviderChoice } from '@shared/types'

export interface Config {
  vaultPath: string
  provider: ProviderChoice
  ollamaUrl: string
  ollamaModel: string
}

export interface SecretCipher {
  available(): boolean
  encrypt(plain: string): Buffer
  decrypt(data: Buffer): string
}

export function defaultConfig(documentsDir: string): Config {
  return {
    vaultPath: join(documentsDir, 'Poiesis'),
    provider: 'auto',
    ollamaUrl: 'http://127.0.0.1:11434',
    ollamaModel: 'llama3.2'
  }
}

export class ConfigStore {
  private config: Config
  private readonly configFile: string
  private readonly secretFile: string

  constructor(
    dataDir: string,
    defaults: Config,
    private readonly cipher: SecretCipher
  ) {
    this.configFile = join(dataDir, 'config.json')
    this.secretFile = join(dataDir, 'secret.bin')
    this.config = { ...defaults, ...this.readJson() }
  }

  get(): Config {
    return { ...this.config }
  }

  update(patch: Partial<Config>): Config {
    const clean = Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined))
    this.config = { ...this.config, ...clean }
    this.write(this.configFile, JSON.stringify(this.config, null, 2))
    return this.get()
  }

  secureStorage(): boolean {
    return this.cipher.available()
  }

  getClaudeKey(): string | null {
    if (process.env.ANTHROPIC_API_KEY) return process.env.ANTHROPIC_API_KEY
    if (!existsSync(this.secretFile)) return null
    try {
      const data = readFileSync(this.secretFile)
      return data.length ? this.cipher.decrypt(data) : null
    } catch {
      return null
    }
  }

  setClaudeKey(key: string | null): void {
    if (!key) {
      this.write(this.secretFile, Buffer.alloc(0))
      return
    }
    if (!this.cipher.available()) {
      throw new Error('Este computador não oferece armazenamento seguro; defina ANTHROPIC_API_KEY.')
    }
    this.write(this.secretFile, this.cipher.encrypt(key.trim()))
  }

  private readJson(): Partial<Config> {
    try {
      return JSON.parse(readFileSync(this.configFile, 'utf8')) as Partial<Config>
    } catch {
      return {}
    }
  }

  private write(file: string, data: string | Buffer): void {
    mkdirSync(dirname(file), { recursive: true })
    writeFileSync(file, data)
  }
}
