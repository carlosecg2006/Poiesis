import { describe, expect, it } from 'vitest'
import { normalizeTitle, parseLinks, parseTags, safeFileName, titleFromPath } from '../src/shared/markdown'

describe('markdown', () => {
  it('extrai [[links]] com apelido e seção, sem repetir', () => {
    const body = 'Veja [[A teia]], [[Sobre mim|eu]] e [[a teia#fios]]. ```[[código]]```'
    expect(parseLinks(body)).toEqual(['A teia', 'Sobre mim'])
  })

  it('extrai #tags com acentos e ignora títulos', () => {
    expect(parseTags('# Título\nIsto é #ideia e #Música/rock, não#isso')).toEqual(['ideia', 'música/rock'])
  })

  it('compara títulos sem acento nem maiúscula', () => {
    expect(normalizeTitle('Canção Ária')).toBe(normalizeTitle('cancao aria'))
  })

  it('gera nomes de arquivo válidos no Windows', () => {
    expect(safeFileName('a/b:c*?"<>|. ')).toBe('a b c')
    expect(safeFileName('CON')).toBe('CON_')
    expect(safeFileName('   ')).toBe('Sem título')
  })

  it('título vem do nome do arquivo', () => {
    expect(titleFromPath('Ideias/A teia.md')).toBe('A teia')
  })
})
