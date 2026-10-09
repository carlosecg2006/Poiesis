// Central: o painel do dia. Relógio, captura rápida e o que está recente.

import { useEffect, useState } from 'react'
import type { ConversationMeta, NoteMeta } from '@shared/types'
import type { Nav } from '../App'

const INBOX = 'Caixa de entrada.md'

function greeting(hour: number): string {
  if (hour < 5) return 'Boa madrugada'
  if (hour < 12) return 'Bom dia'
  if (hour < 18) return 'Boa tarde'
  return 'Boa noite'
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

export function Central({ nav }: { nav: Nav }) {
  const [now, setNow] = useState(new Date())
  const [notes, setNotes] = useState<NoteMeta[]>([])
  const [chats, setChats] = useState<ConversationMeta[]>([])
  const [capture, setCapture] = useState('')
  const [saved, setSaved] = useState('')

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 15000)
    void window.poiesis.notes.list().then(setNotes)
    void window.poiesis.chat.list().then(setChats)
    return () => clearInterval(t)
  }, [])

  // "Escrever qualquer coisa": tudo cai na caixa de entrada, com data e hora.
  const saveCapture = async (): Promise<void> => {
    const text = capture.trim()
    if (!text) return
    let body = '# Caixa de entrada\n\nTudo que você anotou rápido. Organize quando quiser.\n'
    try {
      body = (await window.poiesis.notes.read(INBOX)).body
    } catch {
      // primeira captura: cria a nota
    }
    const stamp = new Date().toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
    await window.poiesis.notes.write(INBOX, `${body.trimEnd()}\n\n- **${stamp}** — ${text.replace(/\n/g, '\n  ')}\n`)
    setCapture('')
    setSaved('Guardado na Caixa de entrada.')
    setTimeout(() => setSaved(''), 2500)
    setNotes(await window.poiesis.notes.list())
  }

  return (
    <div className="page central">
      <header className="central-head">
        <div>
          <h1>{greeting(now.getHours())}.</h1>
          <p className="muted">{capitalize(now.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }))}</p>
        </div>
        <div className="clock">{now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</div>
      </header>

      <section className="card capture">
        <h2>Escreva qualquer coisa</h2>
        <textarea
          value={capture}
          onChange={(e) => setCapture(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) void saveCapture()
          }}
          placeholder="Uma ideia, um lembrete, um sentimento, uma lista… (Ctrl+Enter para guardar)"
          rows={3}
        />
        <div className="row">
          <span className="muted small">{saved}</span>
          <div className="row gap">
            <button className="ghost" onClick={() => nav.go(`nota:${INBOX}`)}>Ver caixa de entrada</button>
            <button onClick={() => void saveCapture()} disabled={!capture.trim()}>Guardar</button>
          </div>
        </div>
      </section>

      <div className="grid-2">
        <section className="card">
          <h2>Notas recentes</h2>
          <ul className="list">
            {notes.slice(0, 8).map((n) => (
              <li key={n.path} onClick={() => nav.go(`nota:${n.path}`)}>
                <span>{n.title}</span>
                <span className="muted small">{new Date(n.updatedAt).toLocaleDateString('pt-BR')}</span>
              </li>
            ))}
            {!notes.length && <li className="muted">Nenhuma nota ainda.</li>}
          </ul>
        </section>
        <section className="card">
          <h2>Conversas recentes</h2>
          <ul className="list">
            {chats.slice(0, 8).map((c) => (
              <li key={c.id} onClick={() => nav.go(`chat:abrir:${c.id}`)}>
                <span>{c.title}</span>
                <span className="muted small">{new Date(c.updatedAt).toLocaleDateString('pt-BR')}</span>
              </li>
            ))}
            {!chats.length && (
              <li className="muted" onClick={() => nav.go('chat:novo')}>
                Nenhuma conversa ainda. Comece uma →
              </li>
            )}
          </ul>
        </section>
      </div>
    </div>
  )
}
