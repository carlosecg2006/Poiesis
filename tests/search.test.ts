import { describe, expect, it } from 'vitest'
import { search } from '../src/main/vault/search'

const items = [
  { path: 'a.md', title: 'Poema do mar', body: 'Ondas e sal.' },
  { path: 'b.md', title: 'Lista', body: 'Comprar pão, café e maçã. Escrever um poema.' },
  { path: 'c.md', title: 'Nada', body: 'Sem relação.' }
]

describe('busca', () => {
  it('prioriza o título e ignora acentos', () => {
    const hits = search(items, 'poema')
    expect(hits.map((h) => h.path)).toEqual(['a.md', 'b.md'])
    expect(search(items, 'maca')[0].path).toBe('b.md')
  })

  it('exige todas as palavras', () => {
    expect(search(items, 'cafe poema').map((h) => h.path)).toEqual(['b.md'])
    expect(search(items, 'cafe ondas')).toEqual([])
  })

  it('mostra o trecho original, com acentos', () => {
    expect(search(items, 'maca')[0].snippet).toContain('maçã')
  })
})
