import type { EventPublisher, DomainEvent } from '../event/EventPublisher'
import type { DisputeNotificationAdapter } from '../notification/DisputeNotificationAdapter'

export class DisputeNotificationListener {
  constructor(
    private readonly publisher: EventPublisher,
    private readonly adapter: DisputeNotificationAdapter
  ) {}

  start(): () => void {
    const unsubscribes: Array<() => void> = []

    unsubscribes.push(
      this.publisher.subscribe('DisputeOpened', async (event: DomainEvent) => {
        const e = event as any
        await this.adapter.notifyDisputeOpened(e.disputeId, e.clientId, e.providerId)
      })
    )

    unsubscribes.push(
      this.publisher.subscribe('DisputeClosed', async (event: DomainEvent) => {
        const e = event as any
        await this.adapter.notifyDisputeClosed(e.disputeId, e.clientId, e.providerId)
      })
    )

    unsubscribes.push(
      this.publisher.subscribe('DisputeDecisionTaken', async (event: DomainEvent) => {
        const e = event as any
        await this.adapter.notifyDisputeDecisionTaken(e.disputeId, e.clientId, e.providerId, e.decision)
      })
    )

    unsubscribes.push(
      this.publisher.subscribe('DisputeEscalated', async (event: DomainEvent) => {
        const e = event as any
        await this.adapter.notifyDisputeEscalated(e.disputeId, e.adminIds || [])
      })
    )

    return () => {
      for (const unsub of unsubscribes) unsub()
    }
  }
}
