// Barramento de eventos do núcleo: módulos se comunicam publicando e
// assinando eventos, sem depender uns dos outros diretamente.

type Handler<T> = (payload: T) => void

export class EventBus<Events extends Record<string, unknown>> {
  private handlers = new Map<keyof Events, Set<Handler<never>>>()

  on<K extends keyof Events>(event: K, handler: Handler<Events[K]>): () => void {
    let set = this.handlers.get(event)
    if (!set) {
      set = new Set()
      this.handlers.set(event, set)
    }
    set.add(handler as Handler<never>)
    return () => set.delete(handler as Handler<never>)
  }

  emit<K extends keyof Events>(event: K, payload: Events[K]): void {
    for (const handler of this.handlers.get(event) ?? []) {
      try {
        ;(handler as Handler<Events[K]>)(payload)
      } catch (err) {
        console.error(`[bus] erro no evento ${String(event)}:`, err)
      }
    }
  }
}

export interface CoreEvents extends Record<string, unknown> {
  'note:saved': { path: string }
  'note:removed': { path: string }
  'chat:turn': { conversationId: string }
}
