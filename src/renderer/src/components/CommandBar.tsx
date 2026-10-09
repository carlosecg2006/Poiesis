// Linha de comando universal: comandos dos módulos + buscar, perguntar à IA
// ou criar nota com qualquer texto digitado.

import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import type { CommandInfo, NoteMeta } from '@shared/types'
import type { Nav } from '../App'

interface Props {
  seed: string
  nav: Nav
  onClose(): void
}

interface Item {
  key: string
  title: string
  detail?: string
  run(): Promise<void> | void
}

function fold(s: string): string {
  return s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()
}

export function CommandBar({ seed, nav, onClose }: Props) {
  const [query, setQuery] = useState(seed)
  const [commands, setCommands] = useState<CommandInfo[]>([])
  const [notes, setNotes] = useState<NoteMeta[]>([])
  const [selected, setSelected] = useState(0)
  const [message, setMessage] = useState('')
  const input = useRef<HTMLInputElement>(null)

  useEffect(() => {
    void window.poiesis.system.commands().then(setCommands)
    void window.poiesis.notes.list().then(setNotes)
    input.current?.focus()
  }, [])

  const items = useMemo<Item[]>(() => {
    const q = fold(query.trim())
    const runCommand = (c: CommandInfo, arg?: string) => async () => {
      try {
        const out = await window.poiesis.system.run(c.id, arg)
        if (out !== 'ok') setMessage(out)
        onClose()
      } catch (err) {
        setMessage((err as Error).message)
      }
    }
    const cmdItems: Item[] = commands
      .filter((c) => !q || fold(c.title).includes(q))
      .map((c) => ({ key: c.id, title: c.title, detail: c.module, run: runCommand(c) }))
    if (!q) return cmdItems
    const noteItems: Item[] = notes
      .filter((n) => fold(n.title).includes(q))
      .slice(0, 6)
      .map((n) => ({ key: `n:${n.path}`, title: n.title, detail: 'nota', run: () => nav.go(`nota:${n.path}`) }))
    const text = query.trim()
    const newNote = commands.find((c) => c.id === 'nota.nova')
    const actions: Item[] = [
      { key: 'ask', title: `Perguntar à IA: “${text}”`, detail: 'chat', run: () => nav.go(`chat:perguntar:${text}`) },
      { key: 'search', title: `Buscar “${text}” em tudo`, detail: 'busca', run: () => nav.go(`busca:${text}`) }
    ]
    if (newNote) actions.push({ key: 'new', title: `Criar nota “${text}”`, detail: 'notas', run: runCommand(newNote, text) })
    return [...cmdItems, ...noteItems, ...actions]
  }, [query, commands, notes, nav, onClose])

  useEffect(() => {
    setSelected(0)
  }, [query])

  const onKey = (e: KeyboardEvent): void => {
    if (e.key === 'Escape') onClose()
    else if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelected((s) => Math.min(s + 1, items.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelected((s) => Math.max(s - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      void items[selected]?.run()
    }
  }

  return (
    <div className="overlay" onMouseDown={onClose}>
      <div className="command-bar" onMouseDown={(e) => e.stopPropagation()}>
        <input
          ref={input}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={onKey}
          placeholder="Digite um comando, uma busca ou uma pergunta…"
        />
        {message && <div className="command-message">{message}</div>}
        <ul>
          {items.map((item, i) => (
            <li
              key={item.key}
              className={i === selected ? 'selected' : undefined}
              onMouseEnter={() => setSelected(i)}
              onClick={() => void item.run()}
            >
              <span>{item.title}</span>
              {item.detail && <span className="detail">{item.detail}</span>}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
