// Conversas com a IA. Cada conversa é um arquivo JSON dentro do cofre
// (.poiesis/conversas), então o histórico fica com você, entre sessões.

import { randomUUID } from 'node:crypto'
import { mkdir, readdir, readFile, rename, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import type Anthropic from '@anthropic-ai/sdk'
import type { ChatEvent, Conversation, ConversationMeta, Privacy, ProviderChoice, ProviderStatus } from '@shared/types'
import { parseLinks } from '@shared/markdown'
import { SYSTEM_DIR, type Vault } from '../vault/vault'
import { describeClaudeError, streamClaude, streamOllama, type OllamaMessage } from './providers'
import { route, RouteError } from './router'

export const PROFILE_NOTE = 'Poiesis/Sobre mim.md'

interface StoredConversation extends Conversation {
  createdAt: number
  /** Prompt de sistema congelado na criação da conversa. */
  system: string
  /** Histórico exatamente como enviado à API (só cresce, nunca é editado). */
  api: Anthropic.Beta.BetaMessageParam[]
}

export interface ChatDeps {
  vault: Vault
  getChoice(): ProviderChoice
  getClaudeKey(): string | null
  getOllama(): { url: string; model: string }
  status(): Promise<ProviderStatus>
  emit(event: ChatEvent): void
}

const BASE_PROMPT = `Você é o Poiesis, o "segundo cérebro" do seu usuário: um assistente pessoal que funciona como extensão da memória, da criatividade e da organização dele.

Como agir:
- Responda em português do Brasil, de forma calorosa, direta e sem enrolação.
- Use o que você sabe sobre o usuário (abaixo) para personalizar as respostas.
- Quando o usuário citar notas com [[Título]], o conteúdo delas vem anexado à mensagem; baseie-se nele e diga quando algo não estiver nas notas.
- Pense de forma interdisciplinar: conecte ideias de áreas diferentes quando isso ajudar.
- Se não souber algo, diga. Não invente fatos sobre a vida do usuário.`

export class ChatService {
  private busy = new Set<string>()

  constructor(private readonly deps: ChatDeps) {}

  private get dir(): string {
    return join(this.deps.vault.root, SYSTEM_DIR, 'conversas')
  }

  async list(): Promise<ConversationMeta[]> {
    let files: string[] = []
    try {
      files = (await readdir(this.dir)).filter((f) => f.endsWith('.json'))
    } catch {
      return []
    }
    const out: ConversationMeta[] = []
    for (const file of files) {
      try {
        const c = JSON.parse(await readFile(join(this.dir, file), 'utf8')) as StoredConversation
        out.push({ id: c.id, title: c.title, updatedAt: c.updatedAt })
      } catch {
        // arquivo corrompido: ignora em vez de travar a lista
      }
    }
    return out.sort((a, b) => b.updatedAt - a.updatedAt)
  }

  async get(id: string): Promise<Conversation> {
    const { id: cid, title, updatedAt, privacy, turns } = await this.load(id)
    return { id: cid, title, updatedAt, privacy, turns }
  }

  async create(privacy: Privacy): Promise<Conversation> {
    const now = Date.now()
    const conv: StoredConversation = {
      id: randomUUID(),
      title: 'Nova conversa',
      privacy,
      createdAt: now,
      updatedAt: now,
      system: await this.buildSystemPrompt(),
      turns: [],
      api: []
    }
    await this.save(conv)
    return this.get(conv.id)
  }

  async send(id: string, text: string): Promise<void> {
    if (!text.trim()) return
    if (this.busy.has(id)) throw new Error('Espere a resposta anterior terminar.')
    this.busy.add(id)
    try {
      await this.doSend(id, text.trim())
    } finally {
      this.busy.delete(id)
    }
  }

  private async doSend(id: string, text: string): Promise<void> {
    const conv = await this.load(id)
    const emit = this.deps.emit

    let decision
    try {
      decision = route(this.deps.getChoice(), conv.privacy, await this.deps.status())
    } catch (err) {
      emit({ type: 'error', conversationId: id, message: err instanceof RouteError ? err.message : String(err) })
      return
    }
    emit({ type: 'start', conversationId: id, provider: decision.provider, reason: decision.reason })

    const userContent = await this.buildUserContent(text)
    const onText = (delta: string): void => emit({ type: 'delta', conversationId: id, text: delta })

    let answer: string
    let assistantContent: Anthropic.Beta.BetaMessageParam['content']
    try {
      if (decision.provider === 'claude') {
        const key = this.deps.getClaudeKey()
        if (!key) throw new Error('Falta a chave da API do Claude.')
        const result = await streamClaude(key, conv.system, [...conv.api, { role: 'user', content: userContent }], onText)
        answer = result.text
        assistantContent = result.content ?? result.text
      } else {
        const { url, model } = this.deps.getOllama()
        const messages: OllamaMessage[] = [
          { role: 'system', content: conv.system },
          ...conv.api.map((m) => ({ role: m.role, content: flatten(m.content) })),
          { role: 'user', content: flatten(userContent) }
        ]
        answer = (await streamOllama(url, model, messages, onText)).text
        assistantContent = answer
      }
    } catch (err) {
      const message = decision.provider === 'claude' ? describeClaudeError(err) : (err as Error).message
      emit({ type: 'error', conversationId: id, message })
      return
    }

    const now = Date.now()
    conv.api.push({ role: 'user', content: userContent }, { role: 'assistant', content: assistantContent })
    conv.turns.push({ role: 'user', text, at: now }, { role: 'assistant', text: answer, provider: decision.provider, at: Date.now() })
    if (conv.title === 'Nova conversa') conv.title = makeTitle(text)
    conv.updatedAt = Date.now()
    await this.save(conv)
    emit({ type: 'done', conversationId: id })
  }

  /** Mensagem do usuário + data/hora atual + notas citadas com [[...]]. */
  private async buildUserContent(text: string): Promise<Anthropic.Beta.BetaTextBlockParam[]> {
    const blocks: Anthropic.Beta.BetaTextBlockParam[] = [{ type: 'text', text }]
    const attachments: string[] = []
    for (const title of parseLinks(text).slice(0, 10)) {
      const path = await this.deps.vault.resolve(title)
      if (!path) {
        attachments.push(`<nota titulo="${title}">(não existe nota com este título)</nota>`)
        continue
      }
      const note = await this.deps.vault.read(path)
      attachments.push(`<nota titulo="${note.title}" caminho="${note.path}">\n${note.body.slice(0, 40000)}\n</nota>`)
    }
    const now = new Date().toLocaleString('pt-BR', { dateStyle: 'full', timeStyle: 'short' })
    blocks.push({ type: 'text', text: `[contexto automático] Agora: ${now}.${attachments.length ? `\nNotas citadas:\n${attachments.join('\n')}` : ''}` })
    return blocks
  }

  private async buildSystemPrompt(): Promise<string> {
    let profile = ''
    try {
      profile = (await this.deps.vault.read(PROFILE_NOTE)).body.trim()
    } catch {
      // sem nota de perfil ainda
    }
    return profile ? `${BASE_PROMPT}\n\n<sobre_o_usuario>\n${profile}\n</sobre_o_usuario>` : BASE_PROMPT
  }

  private async load(id: string): Promise<StoredConversation> {
    if (!/^[\w-]+$/.test(id)) throw new Error('Conversa inválida')
    return JSON.parse(await readFile(join(this.dir, `${id}.json`), 'utf8')) as StoredConversation
  }

  private async save(conv: StoredConversation): Promise<void> {
    await mkdir(this.dir, { recursive: true })
    const file = join(this.dir, `${conv.id}.json`)
    await writeFile(`${file}.tmp`, JSON.stringify(conv, null, 2), 'utf8')
    await rename(`${file}.tmp`, file)
  }
}

function flatten(content: Anthropic.Beta.BetaMessageParam['content']): string {
  if (typeof content === 'string') return content
  return content
    .map((b) => (b.type === 'text' ? b.text : ''))
    .filter(Boolean)
    .join('\n\n')
}

export function makeTitle(text: string): string {
  const line = text.replace(/\s+/g, ' ').trim()
  return line.length > 60 ? `${line.slice(0, 57)}…` : line
}
