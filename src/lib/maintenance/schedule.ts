import { IMaintenanceContract } from '@/lib/models/MaintenanceContract'

export type MaintenanceVisit = {
  id: string
  contractId: string
  contractName: string
  clientId: string
  clientName: string
  date: string
  site?: string
  priority: 'low' | 'medium' | 'high'
  estimatedDurationHours: number
  zone?: string
  isContractual: boolean
  preferredTechnicians?: Array<{
    _id: string
    name: string
    email?: string
    phone?: string
  }>
}

const addDays = (date: Date, days: number) => {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

const frequencyToDays = (frequency?: string, interventionsIncluded?: number) => {
  if (!frequency) {
    if (interventionsIncluded && interventionsIncluded > 0) {
      return Math.floor(365 / interventionsIncluded)
    }
    return 60
  }
  const lower = frequency.toLowerCase()
  if (lower.includes('hebdom')) return 7
  if (lower.includes('bi') && lower.includes('hebdom')) return 14
  if (lower.includes('mens')) return 30
  if (lower.includes('bimes')) return 60
  if (lower.includes('trimes')) return 90
  if (lower.includes('semestre')) return 182
  if (lower.includes('annuel')) return 365
  return interventionsIncluded && interventionsIncluded > 0
    ? Math.floor(365 / interventionsIncluded)
    : 60
}

const inferIntervalDays = (contract: IMaintenanceContract) => {
  if (contract.services?.length) {
    const freq = contract.services[0]?.frequency
    return frequencyToDays(freq, contract.coverage?.interventionsIncluded)
  }
  return frequencyToDays(undefined, contract.coverage?.interventionsIncluded)
}

export const generateMaintenanceVisits = (
  contract: IMaintenanceContract,
  options?: { from?: Date; to?: Date }
): MaintenanceVisit[] => {
  if (contract.status !== 'active') return []
  const contractRecord = contract as unknown as Record<string, any>
  const contractIdString =
    contractRecord._id?.toString?.() || (typeof contractRecord._id === 'string' ? contractRecord._id : '')
  const clientIdString =
    contractRecord.clientId?.toString?.() ||
    (typeof contractRecord.clientId === 'string' ? contractRecord.clientId : '')
  const nearExpiration =
    typeof (contract as unknown as { isNearExpiration?: () => boolean }).isNearExpiration === 'function'
      ? (contract as unknown as { isNearExpiration?: () => boolean }).isNearExpiration!()
      : false
  const from = options?.from ?? new Date()
  const to = options?.to ?? addDays(from, 90)
  const startDate = contract.startDate ? new Date(contract.startDate) : new Date()
  const effectiveStart = startDate > from ? startDate : from
  const intervalDays = inferIntervalDays(contract)

  const sites =
    contract.equipment?.length
      ? Array.from(
          new Set(
            contract.equipment.map((equipment) => equipment.location || contract.name)
          )
        )
      : [contract.name]

  const visits: MaintenanceVisit[] = []
  let cursor = new Date(effectiveStart)
  let counter = 0
  while (cursor <= to && counter < 50) {
    sites.forEach((site) => {
      visits.push({
        id: `${contractIdString || contract.name}-${site}-${cursor.toISOString().slice(0, 10)}`,
        contractId: contractIdString,
        contractName: contract.name,
        clientId: clientIdString,
        clientName:
          contractRecord.clientId?.company ||
          contractRecord.clientId?.name ||
          contractRecord.clientName ||
          'Client',
        date: cursor.toISOString(),
        site,
        priority: nearExpiration ? 'high' : 'medium',
        estimatedDurationHours: 4,
        zone: undefined,
        isContractual: true,
        preferredTechnicians: Array.isArray(contractRecord.preferredTechnicians)
          ? contractRecord.preferredTechnicians.map((tech: any) => ({
              _id: tech?._id?.toString?.() || tech?.toString?.() || '',
              name: tech?.name || 'Technicien',
              email: tech?.email,
              phone: tech?.phone
            }))
          : []
      })
    })
    cursor = addDays(cursor, intervalDays)
    counter += 1
  }
  return visits
}

