import type { EventPublisher, DomainEvent } from '../event/EventPublisher'
import type { MissionPort } from '../port/MissionPort'
import type { EscrowPort } from '../port/EscrowPort'

export class DisputeEscrowListener {
  constructor(
    private readonly publisher: EventPublisher,
    private readonly missionPort: MissionPort,
    private readonly escrowPort: EscrowPort
  ) {}

  start(): () => void {
    const unsubscribes: Array<() => void> = []

    unsubscribes.push(
      this.publisher.subscribe('EscrowFreezeRequested', async (event: DomainEvent) => {
        const e = event as any
        if (e.missionId) await this.missionPort.lockMission(e.missionId)
        if (e.paymentId) await this.escrowPort.holdPayment(e.paymentId)
      })
    )

    unsubscribes.push(
      this.publisher.subscribe('EscrowReleaseRequested', async (event: DomainEvent) => {
        const e = event as any
        if (e.missionId) await this.missionPort.unlockMission(e.missionId)
        if (e.paymentId) await this.escrowPort.releasePayment(e.paymentId)
      })
    )

    unsubscribes.push(
      this.publisher.subscribe('EscrowRefundRequested', async (event: DomainEvent) => {
        const e = event as any
        if (e.paymentId) await this.escrowPort.refundPayment(e.paymentId, e.amount ?? undefined)
      })
    )

    unsubscribes.push(
      this.publisher.subscribe('DisputeClosed', async (event: DomainEvent) => {
        const e = event as any
        if (e.dispute?.missionId) await this.missionPort.unlockMission(e.dispute.missionId)
      })
    )

    return () => {
      for (const unsub of unsubscribes) unsub()
    }
  }
}
