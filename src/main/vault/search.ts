// Busca universal (versão inicial): busca por palavras em títulos e textos,
// sem diferenciar maiúsculas e acentos. Na Fase 1 ganha busca por
// significado (vetores) além das palavras.

import type { SearchHit } from '@shared/types'
import { normalizeTitle } from '@shared/markdown'

export interface Searchable {
  path: string
  title: string
  body: string
}

/** Texto normalizado + mapa de cada posição normalizada para a original. */
function normalizeWithMap(text: string): { norm: string; map: number[] } {
  let norm = ''
  const map: number[] = []
  let i = 0
  for (const ch of text) {
    const n = normalizeTitle(ch) || (ch.trim() ? '' : ' ')
    for (let k = 0; k < n.length; k++) map.push(i)
    norm += n
    i += ch.length
  }
  return { norm, map }
}

function snippet(body: string, start: number, length: number): string {
  const from = Math.max(0, start - 60)
  const to = Math.min(body.length, start + length + 80)
  const text = body.slice(from, to).replace(/\s+/g, ' ').trim()
  return (from > 0 ? '…' : '') + text + (to < body.length ? '…' : '')
}

export function search(items: Searchable[], query: string, limit = 30): SearchHit[] {
  const qs = normalizeTitle(query).split(/\s+/).filter(Boolean)
  if (!qs.length) return []
  const hits: SearchHit[] = []
  for (const item of items) {
    const title = normalizeTitle(item.title)
    const { norm, map } = normalizeWithMap(item.body)
    let score = 0
    let first = -1
    let matchedAll = true
    for (const q of qs) {
      const inTitle = title.includes(q)
      const idx = norm.indexOf(q)
      if (!inTitle && idx < 0) {
        matchedAll = false
        break
      }
      if (first < 0 && idx >= 0) first = idx
      const count = idx < 0 ? 0 : norm.split(q).length - 1
      score += (inTitle ? 10 : 0) + Math.min(count, 5)
    }
    if (!matchedAll) continue
    if (title === qs.join(' ')) score += 20
    const text = first < 0 ? snippet(item.body, 0, 0) : snippet(item.body, map[first], qs[0].length)
    hits.push({ path: item.path, title: item.title, snippet: text, score })
  }
  return hits.sort((a, b) => b.score - a.score || a.title.localeCompare(b.title)).slice(0, limit)
}
