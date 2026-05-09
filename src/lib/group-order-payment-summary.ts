export interface GroupOrderPaymentSummary {
  participants: number
  paidParticipants: number
  partialParticipants: number
  unpaidParticipants: number
  totalAmount: number
  paidAmount: number
  remainingAmount: number
  paidRatio: number
}

export function buildGroupOrderPaymentSummary(group: any): GroupOrderPaymentSummary {
  const participants = Array.isArray(group?.participants) ? group.participants : []
  const summary = participants.reduce(
    (acc: Omit<GroupOrderPaymentSummary, 'paidRatio'>, participant: any) => {
      const totalAmount = Number(participant.totalAmount) || 0
      const paidAmount = Number(participant.paidAmount) || 0
      acc.totalAmount += totalAmount
      acc.paidAmount += paidAmount
      acc.remainingAmount += Math.max(0, totalAmount - paidAmount)
      if (participant.paymentStatus === 'paid') acc.paidParticipants += 1
      if (participant.paymentStatus === 'partial') acc.partialParticipants += 1
      if (participant.paymentStatus !== 'paid') acc.unpaidParticipants += 1
      return acc
    },
    {
      participants: participants.length,
      paidParticipants: 0,
      partialParticipants: 0,
      unpaidParticipants: 0,
      totalAmount: 0,
      paidAmount: 0,
      remainingAmount: 0
    }
  )

  return {
    ...summary,
    paidRatio: summary.participants > 0 ? Math.round((summary.paidParticipants / summary.participants) * 100) : 0
  }
}

export function withGroupOrderPaymentSummary<T extends Record<string, any>>(group: T): T & { paymentSummary: GroupOrderPaymentSummary } {
  return {
    ...group,
    paymentSummary: buildGroupOrderPaymentSummary(group)
  }
}
