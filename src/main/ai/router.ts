// Roteador de IA: decide qual modelo atende cada pedido.
// Regra de ouro: conversas privadas nunca saem do computador.

import type { Privacy, ProviderChoice, ProviderId, ProviderStatus } from '@shared/types'

export interface RouteDecision {
  provider: ProviderId
  reason: string
}

export class RouteError extends Error {}

export function route(choice: ProviderChoice, privacy: Privacy, status: ProviderStatus): RouteDecision {
  if (privacy === 'privado') {
    if (status.ollama) return { provider: 'ollama', reason: 'conversa privada: IA local, nada sai do computador' }
    throw new RouteError(
      'Conversas privadas usam só IA local. Instale o Ollama (ollama.com) e baixe um modelo para usar este modo.'
    )
  }
  if (choice === 'claude') {
    if (status.claude) return { provider: 'claude', reason: 'escolhido nos ajustes' }
    throw new RouteError('Claude está selecionado, mas falta a chave da API. Adicione-a em Ajustes.')
  }
  if (choice === 'ollama') {
    if (status.ollama) return { provider: 'ollama', reason: 'escolhido nos ajustes' }
    throw new RouteError('O Ollama está selecionado, mas não respondeu. Ele está aberto?')
  }
  if (status.claude) return { provider: 'claude', reason: 'automático: modelo mais capaz disponível' }
  if (status.ollama) return { provider: 'ollama', reason: 'automático: sem chave da nuvem, usando IA local' }
  throw new RouteError('Nenhuma IA configurada. Adicione sua chave da API do Claude em Ajustes ou instale o Ollama.')
}
