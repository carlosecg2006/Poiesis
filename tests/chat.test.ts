import { mkdtempSync } from 'node:fs'
import { createServer, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { ChatEvent } from '@shared/types'
import { ChatService, PROFILE_NOTE } from '../src/main/ai/chat'
import { Vault } from '../src/main/vault/vault'

// Servidor falso que imita o Ollama respondendo em streaming.
let server: Server
let url = ''
let lastBody: { messages: { role: string; content: string }[] } | null = null

beforeAll(async () => {
  server = createServer((req, res) => {
    let raw = ''
    req.on('data', (c) => (raw += c))
    req.on('end', () => {
      lastBody = JSON.parse(raw)
      res.writeHead(200, { 'content-type': 'application/x-ndjson' })
      res.write(JSON.stringify({ message: { content: 'Olá, ' } }) + '\n')
      res.end(JSON.stringify({ message: { content: 'Carlos!' }, done: true }) + '\n')
    })
  })
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r))
  url = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
})

afterAll(() => server.close())

async function setup(status = { claude: false, ollama: true }) {
  const vault = new Vault(join(mkdtempSync(join(tmpdir(), 'poiesis-chat-')), 'cofre'))
  await vault.init({ [PROFILE_NOTE]: 'Me chamo Carlos.', 'Sonho.md': 'Voar sobre o mar.' })
  const events: ChatEvent[] = []
  const chat = new ChatService({
    vault,
    getChoice: () => 'auto',
    getClaudeKey: () => null,
    getOllama: () => ({ url, model: 'teste' }),
    status: async () => status,
    emit: (e) => events.push(e)
  })
  return { chat, events }
}

describe('chat', () => {
  it('conversa, transmite a resposta e salva o histórico', async () => {
    const { chat, events } = await setup()
    const conv = await chat.create('normal')
    await chat.send(conv.id, 'O que diz [[Sonho]]?')

    expect(events.map((e) => e.type)).toEqual(['start', 'delta', 'delta', 'done'])
    const saved = await chat.get(conv.id)
    expect(saved.title).toBe('O que diz [[Sonho]]?')
    expect(saved.turns.map((t) => t.text)).toEqual(['O que diz [[Sonho]]?', 'Olá, Carlos!'])

    // O perfil vai no prompt de sistema e a nota citada segue anexada.
    expect(lastBody!.messages[0].content).toContain('Me chamo Carlos.')
    expect(lastBody!.messages.at(-1)!.content).toContain('Voar sobre o mar.')
    expect((await chat.list()).map((c) => c.id)).toEqual([conv.id])
  })

  it('avisa quando não há IA configurada, sem salvar nada', async () => {
    const { chat, events } = await setup({ claude: false, ollama: false })
    const conv = await chat.create('normal')
    await chat.send(conv.id, 'oi')
    expect(events).toEqual([{ type: 'error', conversationId: conv.id, message: expect.stringMatching(/Nenhuma IA/) }])
    expect((await chat.get(conv.id)).turns).toEqual([])
  })
})
