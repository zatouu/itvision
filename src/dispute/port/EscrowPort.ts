export interface EscrowPort {
  getPaymentIdForMission(missionId: string): Promise<string | null>
  holdPayment(paymentId: string): Promise<void>
  releasePayment(paymentId: string): Promise<void>
  refundPayment(paymentId: string, amount?: number): Promise<void>
}
