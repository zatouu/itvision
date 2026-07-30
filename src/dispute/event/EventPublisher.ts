export type DomainEvent = { type: string; [key: string]: any }

export type EventHandler<T extends DomainEvent = DomainEvent> = (
  event: T
) => void | Promise<void>

export interface EventPublisher {
  publish<T extends DomainEvent>(event: T): void
  subscribe<T extends DomainEvent>(eventType: string, handler: EventHandler<T>): () => void
}

export class InMemoryEventPublisher implements EventPublisher {
  private handlers = new Map<string, Set<EventHandler>>()

  publish<T extends DomainEvent>(event: T): void {
    const set = this.handlers.get(event.type)
    if (!set) return
    for (const handler of set) {
      try {
        const result = handler(event)
        if (result && typeof result.then === 'function') {
          result.catch((err: any) => {
            console.error(`[EventPublisher] Erreur handler ${event.type}:`, err?.message || err)
          })
        }
      } catch (err: any) {
        console.error(`[EventPublisher] Erreur handler ${event.type}:`, err?.message || err)
      }
    }
  }

  subscribe<T extends DomainEvent>(eventType: string, handler: EventHandler<T>): () => void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, new Set())
    }
    const set = this.handlers.get(eventType)!
    const wrapped = handler as EventHandler
    set.add(wrapped)
    return () => {
      set.delete(wrapped)
      if (set.size === 0) this.handlers.delete(eventType)
    }
  }
}
