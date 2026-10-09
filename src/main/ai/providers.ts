// Conexão com os modelos de IA. Cada provedor recebe a conversa e devolve
// o texto aos poucos (streaming), para a resposta aparecer enquanto é escrita.

import Anthropic from '@anthropic-ai/sdk'

export const CLAUDE_MODEL = 'claude-opus-5-5'

export interface StreamResult {
  text: string
  /** Conteúdo exato devolvido pela API, guardado para manter o histórico intacto. */
  content?: Anthropic.Beta.BetaContentBlockParam[]
}

export async function streamClaude(
  apiKey: string,
  system: string,
  messages: Anthropic.Beta.BetaMessageParam[],
  onText: (text: string) => void,
  signal?: AbortSignal
): Promise<StreamResult> {
  const client = new Anthropic({ apiKey })
  const stream = client.beta.messages.stream(
    {
      model: CLAUDE_MODEL,
      max_tokens: 64000,
      // O prompt de sistema fica congelado na conversa: alterar o histórico
      // invalida o raciocínio anterior do modelo e o cache.
      system: [{ type: 'text', text: system, cache_control: { type: 'ephemeral' } }],
      messages,
      thinking: { type: 'adaptive' },
      output_config: { effort: 'medium' },
      // Se o modelo recusar por engano, a API tenta outro modelo automaticamente.
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default'
    },
    { signal }
  )
  stream.on('text', (delta) => onText(delta))
  const message = await stream.finalMessage()
  if (message.stop_reason === 'refusal') {
    throw new Error('O modelo preferiu não responder a este pedido. Tente reformular.')
  }
  const text = message.content
    .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('')
  return { text, content: message.content as Anthropic.Beta.BetaContentBlockParam[] }
}

export function describeClaudeError(err: unknown): string {
  if (err instanceof Anthropic.AuthenticationError) return 'Chave da API inválida. Confira em Ajustes.'
  if (err instanceof Anthropic.PermissionDeniedError) return 'Sua chave não tem permissão para este modelo.'
  if (err instanceof Anthropic.RateLimitError) return 'Muitos pedidos seguidos. Espere um pouco e tente de novo.'
  if (err instanceof Anthropic.BadRequestError) return `Pedido recusado pela API: ${err.message}`
  if (err instanceof Anthropic.APIConnectionError) return 'Sem conexão com a API do Claude. Verifique a internet.'
  if (err instanceof Anthropic.APIError) return `Erro da API (${err.status}): ${err.message}`
  return err instanceof Error ? err.message : String(err)
}

export interface OllamaMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export async function ollamaAvailable(url: string): Promise<boolean> {
  try {
    const res = await fetch(`${url}/api/tags`, { signal: AbortSignal.timeout(1500) })
    return res.ok
  } catch {
    return false
  }
}

export async function streamOllama(
  url: string,
  model: string,
  messages: OllamaMessage[],
  onText: (text: string) => void,
  signal?: AbortSignal
): Promise<StreamResult> {
  const res = await fetch(`${url}/api/chat`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ model, messages, stream: true }),
    signal
  })
  if (!res.ok || !res.body) {
    const detail = await res.text().catch(() => '')
    if (res.status === 404) throw new Error(`Modelo "${model}" não encontrado. Rode: ollama pull ${model}`)
    throw new Error(`Ollama respondeu ${res.status}: ${detail}`)
  }
  const decoder = new TextDecoder()
  let buffer = ''
  let text = ''
  for await (const chunk of res.body as unknown as AsyncIterable<Uint8Array>) {
    buffer += decoder.decode(chunk, { stream: true })
    let nl: number
    while ((nl = buffer.indexOf('\n')) >= 0) {
      const line = buffer.slice(0, nl).trim()
      buffer = buffer.slice(nl + 1)
      if (!line) continue
      const data = JSON.parse(line) as { message?: { content?: string }; error?: string }
      if (data.error) throw new Error(`Ollama: ${data.error}`)
      const delta = data.message?.content ?? ''
      if (delta) {
        text += delta
        onText(delta)
      }
    }
  }
  return { text }
}
