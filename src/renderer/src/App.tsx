import { useCallback, useEffect, useState } from 'react'
import { CommandBar } from './components/CommandBar'
import { Ajustes } from './spaces/Ajustes'
import { Busca } from './spaces/Busca'
import { Central } from './spaces/Central'
import { Chat } from './spaces/Chat'
import { EmBreve } from './spaces/EmBreve'
import { Notas } from './spaces/Notas'

export interface Nav {
  go(target: string): void
}

interface SpaceDef {
  id: string
  label: string
  icon: string
  phase?: number
}

const SPACES: SpaceDef[] = [
  { id: 'central', label: 'Central', icon: '◎' },
  { id: 'notas', label: 'Notas', icon: '✎' },
  { id: 'chat', label: 'Chat', icon: '✦' },
  { id: 'busca', label: 'Busca', icon: '⌕' },
  { id: 'grafo', label: 'Teia', icon: '⁂', phase: 1 },
  { id: 'agenda', label: 'Agenda', icon: '◷', phase: 2 },
  { id: 'projetos', label: 'Projetos', icon: '▤', phase: 2 },
  { id: 'agentes', label: 'Agentes', icon: '⚙', phase: 3 },
  { id: 'contatos', label: 'Contatos', icon: '☺', phase: 4 },
  { id: 'estudio', label: 'Estúdio', icon: '♫', phase: 4 },
  { id: 'biblioteca', label: 'Biblioteca', icon: '❡', phase: 4 },
  { id: 'cartas', label: 'Cartas', icon: '✉', phase: 4 },
  { id: 'refugio', label: 'Refúgio', icon: '❀', phase: 4 }
]

/** Destinos: "central", "nota:<caminho>", "chat:novo", "chat:privado", "busca:<texto>"... */
export function App() {
  const [target, setTarget] = useState('central')
  const [commandOpen, setCommandOpen] = useState(false)
  const [commandSeed, setCommandSeed] = useState('')

  const go = useCallback((next: string) => {
    if (next === 'comando') {
      setCommandSeed('')
      setCommandOpen(true)
      return
    }
    setCommandOpen(false)
    setTarget(next)
  }, [])

  useEffect(() => window.poiesis.system.onNavigate(go), [go])

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setCommandSeed('')
        setCommandOpen((open) => !open)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const [space, arg] = splitTarget(target)
  const nav: Nav = { go }
  const current = SPACES.find((s) => s.id === space)

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand" onClick={() => go('central')}>
          <span className="brand-mark">π</span>
          <span>Poiesis</span>
        </div>
        <button className="command-trigger" onClick={() => setCommandOpen(true)}>
          <span>Comando…</span>
          <kbd>Ctrl K</kbd>
        </button>
        <nav>
          {SPACES.map((s) => (
            <button
              key={s.id}
              className={`nav-item${space === s.id ? ' active' : ''}${s.phase ? ' soon' : ''}`}
              onClick={() => go(s.id)}
              title={s.phase ? `Chega na Fase ${s.phase}` : s.label}
            >
              <span className="nav-icon">{s.icon}</span>
              <span>{s.label}</span>
              {s.phase && <span className="phase">fase {s.phase}</span>}
            </button>
          ))}
        </nav>
        <button className={`nav-item settings${space === 'ajustes' ? ' active' : ''}`} onClick={() => go('ajustes')}>
          <span className="nav-icon">⚒</span>
          <span>Ajustes</span>
        </button>
      </aside>
      <main className="content">
        {space === 'central' && <Central nav={nav} />}
        {space === 'notas' && <Notas nav={nav} openPath={arg} />}
        {space === 'chat' && <Chat nav={nav} intent={arg} />}
        {space === 'busca' && <Busca nav={nav} initial={arg} />}
        {space === 'ajustes' && <Ajustes />}
        {current?.phase && <EmBreve title={current.label} phase={current.phase} />}
      </main>
      {commandOpen && <CommandBar seed={commandSeed} nav={nav} onClose={() => setCommandOpen(false)} />}
    </div>
  )
}

function splitTarget(target: string): [string, string | undefined] {
  const idx = target.indexOf(':')
  if (idx < 0) return [target === 'nota' ? 'notas' : target, undefined]
  const space = target.slice(0, idx)
  return [space === 'nota' ? 'notas' : space, target.slice(idx + 1)]
}
