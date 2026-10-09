// Registro de módulos: como os módulos do kernel Linux, cada parte do
// Poiesis se registra declarando o que faz (capacidades) e quais comandos
// oferece. Integrações futuras (Spotify, Gmail, Windows...) entram aqui.

import type { CommandInfo, ModuleInfo } from '@shared/types'

/** Capacidades que um módulo pode pedir. Ações sensíveis exigem permissão. */
export const CAPABILITIES = {
  'vault.read': 'Ler notas do cofre',
  'vault.write': 'Criar e alterar notas do cofre',
  'ai.cloud': 'Enviar texto para modelos de IA na nuvem',
  'ai.local': 'Usar modelos de IA locais',
  'system.open': 'Abrir arquivos e pastas no computador',
  'system.shell': 'Executar comandos no terminal',
  'net.fetch': 'Acessar a internet'
} as const

export type Capability = keyof typeof CAPABILITIES

export interface Command {
  id: string
  title: string
  hint?: string
  run(arg?: string): Promise<string> | string
}

export interface PoiesisModule {
  id: string
  name: string
  description: string
  capabilities: Capability[]
  commands?: Command[]
}

export class ModuleRegistry {
  private modules = new Map<string, PoiesisModule>()
  private disabled = new Set<string>()

  register(mod: PoiesisModule): void {
    if (this.modules.has(mod.id)) throw new Error(`Módulo já registrado: ${mod.id}`)
    for (const cap of mod.capabilities) {
      if (!(cap in CAPABILITIES)) throw new Error(`Capacidade desconhecida em ${mod.id}: ${cap}`)
    }
    this.modules.set(mod.id, mod)
  }

  setEnabled(id: string, enabled: boolean): void {
    if (enabled) this.disabled.delete(id)
    else this.disabled.add(id)
  }

  list(): ModuleInfo[] {
    return [...this.modules.values()].map((m) => ({
      id: m.id,
      name: m.name,
      description: m.description,
      capabilities: m.capabilities,
      enabled: !this.disabled.has(m.id)
    }))
  }

  commands(): CommandInfo[] {
    const out: CommandInfo[] = []
    for (const mod of this.modules.values()) {
      if (this.disabled.has(mod.id)) continue
      for (const cmd of mod.commands ?? []) {
        out.push({ id: cmd.id, title: cmd.title, module: mod.id, hint: cmd.hint })
      }
    }
    return out
  }

  async run(commandId: string, arg?: string): Promise<string> {
    for (const mod of this.modules.values()) {
      const cmd = mod.commands?.find((c) => c.id === commandId)
      if (!cmd) continue
      if (this.disabled.has(mod.id)) throw new Error(`O módulo "${mod.name}" está desligado.`)
      return await cmd.run(arg)
    }
    throw new Error(`Comando não encontrado: ${commandId}`)
  }
}
