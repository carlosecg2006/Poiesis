// Chat com a IA: conversas salvas no cofre, resposta aparecendo enquanto é
// escrita e indicação de qual modelo respondeu (nuvem ou local).

import { useCallback, useEffect, useRef, useState } from 'react'
import type { Conversation, ConversationMeta, ProviderId } from '@shared/types'
import type { Nav } from '../App'
import { Markdown } from '../components/Markdown'

const PROVIDER_LABEL: Record<ProviderId, string> = { claude: 'Claude · nuvem', ollama: 'Local' }

export function Chat({ nav, intent }: { nav: Nav; intent?: string }) {
  const [list, setList] = useState<ConversationMeta[]>([])
  const [conv, setConv] = useState<Conversation | null>(null)
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState<{ text: string; provider: ProviderId; reason: string } | null>(null)
  const [pendingUser, setPendingUser] = useState<string | null>(null)
  const [error, setError] = useState('')
  const handled = useRef<string | undefined>(undefined)
  const convRef = useRef<Conversation | null>(null)
  const bottom = useRef<HTMLDivElement>(null)
  convRef.current = conv

  const refreshList = useCallback(async () => setList(await window.poiesis.chat.list()), [])

  const send = useCallback(
    async (target: Conversation, text: string) => {
      if (!text.trim()) return
      setError('')
      setPendingUser(text)
      setInput('')
      try {
        await window.poiesis.chat.send(target.id, text)
      } catch (err) {
        setError((err as Error).message)
        setPendingUser(null)
        setInput(text)
      }
    },
    []
  )

  useEffect(() => {
    void refreshList()
  }, [refreshList])

  // Intenções vindas da navegação: novo, privado, abrir:<id>, perguntar:<texto>.
  useEffect(() => {
    if (!intent || handled.current === intent) return
    handled.current = intent
    void (async () => {
      if (intent.startsWith('abrir:')) {
        setConv(await window.poiesis.chat.get(intent.slice(6)))
        return
      }
      const kind = intent.startsWith('perguntar:') ? 'perguntar' : intent.split('#')[0]
      const created = await window.poiesis.chat.create(kind === 'privado' ? 'privado' : 'normal')
      setConv(created)
      void refreshList()
      if (intent.startsWith('perguntar:')) {
        const text = intent.slice('perguntar:'.length)
        if (text.endsWith(': ')) setInput(text)
        else void send(created, text)
      }
    })()
  }, [intent, refreshList, send])

  useEffect(
    () =>
      window.poiesis.chat.onEvent(async (event) => {
        if (event.conversationId !== convRef.current?.id) return
        if (event.type === 'start') setStreaming({ text: '', provider: event.provider, reason: event.reason })
        else if (event.type === 'delta') setStreaming((s) => (s ? { ...s, text: s.text + event.text } : s))
        else if (event.type === 'done') {
          setConv(await window.poiesis.chat.get(event.conversationId))
          setStreaming(null)
          setPendingUser(null)
          void refreshList()
        } else if (event.type === 'error') {
          setError(event.message)
          setStreaming(null)
          setPendingUser((text) => {
            if (text) setInput(text)
            return null
          })
        }
      }),
    [refreshList]
  )

  // Chaves obrigatórias: no Chromium novo, scrollIntoView devolve uma Promise,
  // e o React trataria esse valor como função de limpeza.
  useEffect(() => {
    void bottom.current?.scrollIntoView({ behavior: 'smooth' })
  }, [conv, streaming, pendingUser])

  const openLink = async (title: string): Promise<void> => {
    const path = await window.poiesis.notes.resolve(title)
    if (path) nav.go(`nota:${path}`)
  }

  const busy = pendingUser !== null

  return (
    <div className="chat">
      <div className="chat-list">
        <div className="row gap">
          <button onClick={() => nav.go(`chat:novo#${Date.now()}`)}>Nova conversa</button>
          <button className="ghost" title="Conversa privada: só IA local, nada sai do computador" onClick={() => nav.go(`chat:privado#${Date.now()}`)}>
            🔒
          </button>
        </div>
        <ul>
          {list.map((c) => (
            <li key={c.id} className={conv?.id === c.id ? 'active' : undefined} onClick={() => nav.go(`chat:abrir:${c.id}`)}>
              {c.title}
            </li>
          ))}
        </ul>
      </div>

      <div className="chat-main">
        {conv ? (
          <>
            <div className="chat-head">
              <span>{conv.title}</span>
              {conv.privacy === 'privado' && <span className="pill">🔒 privada · só IA local</span>}
            </div>
            <div className="messages">
              {!conv.turns.length && !pendingUser && (
                <div className="empty-state small-empty">
                  <p className="muted">Pergunte qualquer coisa. Cite notas com [[Título]] para a IA usar o que você escreveu.</p>
                </div>
              )}
              {conv.turns.map((t, i) => (
                <div key={i} className={`msg ${t.role}`}>
                  {t.role === 'assistant' ? <Markdown text={t.text} onLink={(x) => void openLink(x)} /> : <div className="plain">{t.text}</div>}
                  {t.provider && <div className="msg-meta">{PROVIDER_LABEL[t.provider]}</div>}
                </div>
              ))}
              {pendingUser && (
                <div className="msg user">
                  <div className="plain">{pendingUser}</div>
                </div>
              )}
              {streaming && (
                <div className="msg assistant">
                  {streaming.text ? <Markdown text={streaming.text} /> : <div className="typing">pensando…</div>}
                  <div className="msg-meta">
                    {PROVIDER_LABEL[streaming.provider]} — {streaming.reason}
                  </div>
                </div>
              )}
              {error && <div className="error">{error}</div>}
              <div ref={bottom} />
            </div>
            <div className="composer">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    if (!busy) void send(conv, input)
                  }
                }}
                placeholder="Escreva… (Enter envia, Shift+Enter quebra linha)"
                rows={3}
                autoFocus
              />
              <button disabled={busy || !input.trim()} onClick={() => void send(conv, input)}>
                Enviar
              </button>
            </div>
          </>
        ) : (
          <div className="page empty-state">
            <h1>Conversar</h1>
            <p className="muted">Escolha uma conversa ao lado ou comece uma nova.</p>
            <div className="row gap center">
              <button onClick={() => nav.go(`chat:novo#${Date.now()}`)}>Nova conversa</button>
              <button className="ghost" onClick={() => nav.go(`chat:privado#${Date.now()}`)}>🔒 Conversa privada</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
