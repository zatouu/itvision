export interface DisputeNotificationAdapter {
  notifyDisputeOpened(disputeId: string, clientId: string, providerId: string): Promise<void>
  notifyDisputeClosed(disputeId: string, clientId: string, providerId: string): Promise<void>
  notifyDisputeDecisionTaken(disputeId: string, clientId: string, providerId: string, decision: string): Promise<void>
  notifyDisputeEscalated(disputeId: string, adminIds: string[]): Promise<void>
}

export class ConsoleDisputeNotificationAdapter implements DisputeNotificationAdapter {
  async notifyDisputeOpened(disputeId: string, clientId: string, providerId: string): Promise<void> {
    console.log(`[Notification] Litige ouvert ${disputeId} (client=${clientId}, provider=${providerId})`)
  }

  async notifyDisputeClosed(disputeId: string, clientId: string, providerId: string): Promise<void> {
    console.log(`[Notification] Litige clôturé ${disputeId} (client=${clientId}, provider=${providerId})`)
  }

  async notifyDisputeDecisionTaken(
    disputeId: string,
    clientId: string,
    providerId: string,
    decision: string
  ): Promise<void> {
    console.log(`[Notification] Décision prise ${disputeId} décision=${decision}`)
  }

  async notifyDisputeEscalated(disputeId: string, adminIds: string[]): Promise<void> {
    console.log(`[Notification] Escalade litige ${disputeId} admins=${adminIds.join(',')}`)
  }
}
