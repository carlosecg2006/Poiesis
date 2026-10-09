import { useEffect, useState } from 'react'
import type { SearchHit } from '@shared/types'
import type { Nav } from '../App'

export function Busca({ nav, initial }: { nav: Nav; initial?: string }) {
  const [query, setQuery] = useState(initial ?? '')
  const [hits, setHits] = useState<SearchHit[]>([])

  useEffect(() => {
    setQuery(initial ?? '')
  }, [initial])

  useEffect(() => {
    const t = setTimeout(() => {
      if (query.trim()) void window.poiesis.search(query).then(setHits)
      else setHits([])
    }, 150)
    return () => clearTimeout(t)
  }, [query])

  return (
    <div className="page">
      <h1>Busca universal</h1>
      <input className="search-input" autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar em todas as notas…" />
      <p className="muted small">Por enquanto busca nas notas do cofre. Nas próximas fases: arquivos, e-mails, conversas e busca por significado.</p>
      <ul className="hits">
        {hits.map((h) => (
          <li key={h.path} onClick={() => nav.go(`nota:${h.path}`)}>
            <div className="hit-title">{h.title}</div>
            <div className="muted small">{h.path}</div>
            <div className="hit-snippet">{h.snippet}</div>
          </li>
        ))}
        {query.trim() && !hits.length && <li className="muted">Nada encontrado.</li>}
      </ul>
    </div>
  )
}
