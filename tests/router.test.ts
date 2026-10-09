import { describe, expect, it } from 'vitest'
import { route, RouteError } from '../src/main/ai/router'

const both = { claude: true, ollama: true }

describe('roteador de IA', () => {
  it('conversa privada nunca vai para a nuvem', () => {
    expect(route('claude', 'privado', both).provider).toBe('ollama')
    expect(() => route('auto', 'privado', { claude: true, ollama: false })).toThrow(RouteError)
  })

  it('automático prefere Claude e cai para o local', () => {
    expect(route('auto', 'normal', both).provider).toBe('claude')
    expect(route('auto', 'normal', { claude: false, ollama: true }).provider).toBe('ollama')
    expect(() => route('auto', 'normal', { claude: false, ollama: false })).toThrow(/Nenhuma IA/)
  })

  it('respeita a escolha explícita', () => {
    expect(route('ollama', 'normal', both).provider).toBe('ollama')
    expect(() => route('claude', 'normal', { claude: false, ollama: true })).toThrow(/chave/)
  })
})
