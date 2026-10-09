// Notas: lista, editor com salvamento automático, leitura com [[links]]
// clicáveis e as conexões de entrada (backlinks) de cada nota.

import { useCallback, useEffect, useRef, useState } from 'react'
import { parseLinks } from '@shared/markdown'
import type { Backlink, Note, NoteMeta } from '@shared/types'
import type { Nav } from '../App'
import { Markdown } from '../components/Markdown'

function fold(s: string): string {
  return s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()
}

export function Notas({ nav, openPath }: { nav: Nav; openPath?: string }) {
  const [notes, setNotes] = useState<NoteMeta[]>([])
  const [filter, setFilter] = useState('')
  const [note, setNote] = useState<Note | null>(null)
  const [body, setBody] = useState('')
  const [mode, setMode] = useState<'editar' | 'ler'>('editar')
  const [backlinks, setBacklinks] = useState<Backlink[]>([])
  const [status, setStatus] = useState('')
  const pending = useRef<{ path: string; body: string } | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)

  const refreshList = useCallback(async () => setNotes(await window.poiesis.notes.list()), [])

  const flush = useCallback(async () => {
    clearTimeout(timer.current)
    const job = pending.current
    pending.current = null
    if (!job) return
    await window.poiesis.notes.write(job.path, job.body)
    setStatus('Salvo')
    void refreshList()
  }, [refreshList])

  const open = useCallback(
    async (path: string) => {
      await flush()
      try {
        const n = await window.poiesis.notes.read(path)
        setNote(n)
        setBody(n.body)
        setBacklinks(await window.poiesis.notes.backlinks(path))
        setStatus('')
      } catch {
        setStatus(`Não encontrei a nota ${path}`)
      }
    },
    [flush]
  )

  useEffect(() => {
    void refreshList()
    return () => void flush()
  }, [refreshList, flush])

  useEffect(() => {
    if (openPath) void open(openPath)
  }, [openPath, open])

  const onChange = (value: string): void => {
    if (!note) return
    setBody(value)
    setStatus('Editando…')
    pending.current = { path: note.path, body: value }
    clearTimeout(timer.current)
    timer.current = setTimeout(() => void flush(), 700)
  }

  // Clicar num [[link]]: abre a nota; se não existir, cria (como no Obsidian).
  const followLink = async (title: string): Promise<void> => {
    const path = await window.poiesis.notes.resolve(title)
    if (path) return nav.go(`nota:${path}`)
    const created = await window.poiesis.notes.create(title)
    await refreshList()
    nav.go(`nota:${created.path}`)
  }

  const createNote = async (): Promise<void> => {
    const created = await window.poiesis.notes.create(filter.trim() || 'Nova nota')
    setFilter('')
    await refreshList()
    nav.go(`nota:${created.path}`)
  }

  const removeNote = async (): Promise<void> => {
    if (!note || !confirm(`Mover "${note.title}" para a lixeira do cofre?`)) return
    pending.current = null
    await window.poiesis.notes.remove(note.path)
    setNote(null)
    setBody('')
    await refreshList()
  }

  const visible = notes.filter((n) => !filter || fold(n.title).includes(fold(filter)) || n.tags.some((t) => t.includes(fold(filter))))

  return (
    <div className="notes">
      <div className="notes-list">
        <div className="notes-list-head">
          <input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Filtrar ou criar…" onKeyDown={(e) => e.key === 'Enter' && !visible.length && void createNote()} />
          <button onClick={() => void createNote()} title="Nova nota">＋</button>
        </div>
        <ul>
          {visible.map((n) => (
            <li key={n.path} className={note?.path === n.path ? 'active' : undefined} onClick={() => nav.go(`nota:${n.path}`)}>
              <div>{n.title}</div>
              {n.path.includes('/') && <div className="muted small">{n.path.slice(0, n.path.lastIndexOf('/'))}</div>}
            </li>
          ))}
        </ul>
      </div>

      {note ? (
        <div className="editor">
          <div className="editor-head">
            <div>
              <div className="editor-title">{note.title}</div>
              <div className="muted small">{note.path} · {status}</div>
            </div>
            <div className="row gap">
              <div className="segmented">
                <button className={mode === 'editar' ? 'on' : ''} onClick={() => setMode('editar')}>Editar</button>
                <button className={mode === 'ler' ? 'on' : ''} onClick={() => setMode('ler')}>Ler</button>
              </div>
              <button className="ghost" onClick={() => nav.go(`chat:perguntar:Sobre a nota [[${note.title}]]: `)}>Perguntar à IA</button>
              <button className="ghost danger" onClick={() => void removeNote()}>Lixeira</button>
            </div>
          </div>
          <div className="editor-body">
            {mode === 'editar' ? (
              <textarea value={body} onChange={(e) => onChange(e.target.value)} onBlur={() => void flush()} spellCheck />
            ) : (
              <div className="reader">
                <Markdown text={body} onLink={(t) => void followLink(t)} />
              </div>
            )}
            <aside className="connections">
              <h3>Liga para</h3>
              <ul>
                {parseLinks(body).map((t) => (
                  <li key={t} onClick={() => void followLink(t)}>{t}</li>
                ))}
              </ul>
              <h3>Ligado por</h3>
              <ul>
                {backlinks.map((b) => (
                  <li key={b.path} onClick={() => nav.go(`nota:${b.path}`)}>{b.title}</li>
                ))}
                {!backlinks.length && <li className="muted">Nenhuma nota aponta para esta ainda.</li>}
              </ul>
            </aside>
          </div>
        </div>
      ) : (
        <div className="page empty-state">
          <h1>Suas notas</h1>
          <p className="muted">Escolha uma nota ao lado ou crie uma nova. Use [[colchetes duplos]] para ligar ideias.</p>
          <p className="muted small">{status}</p>
        </div>
      )}
    </div>
  )
}
