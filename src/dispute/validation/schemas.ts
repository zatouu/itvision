import { z } from 'zod'
import {
  DisputeStatus,
  DisputePriority,
  DisputeReason,
  DisputeDecision,
} from '../domain/enums'

const objectId = z.string().regex(/^[a-fA-F0-9]{24}$/, 'Identifiant MongoDB invalide')

function enumValidator(values: string[], label: string) {
  return z.string().refine((v) => values.includes(v), {
    message: `${label} invalide : ${values.join(', ')}`,
  })
}

export const createDisputeSchema = z.object({
  missionId: objectId,
  clientId: z.string().min(1),
  providerId: objectId,
  paymentId: objectId.optional().nullable(),
  reason: enumValidator(Object.values(DisputeReason), 'Raison'),
  description: z.string().min(1).max(5000),
  priority: enumValidator(Object.values(DisputePriority), 'Priorité').optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
})

export const addMessageSchema = z.object({
  message: z.string().min(1).max(5000),
})

export const addEvidenceSchema = z.object({
  type: z.enum(['image', 'video', 'audio', 'pdf', 'other']),
  url: z.string().url(),
  comment: z.string().max(1000).optional(),
})

export const assignDisputeSchema = z.object({
  adminId: objectId,
})

export const requestEvidenceSchema = z.object({
  target: z.enum(['CLIENT', 'PROVIDER']),
})

export const takeDecisionSchema = z.object({
  decision: enumValidator(Object.values(DisputeDecision), 'Décision'),
  reason: z.string().min(1).max(2000),
  amount: z.number().min(0).optional().nullable(),
})

export const appealDisputeSchema = z.object({
  reason: z.string().min(1).max(2000),
})

export const closeDisputeSchema = z.object({
  reason: z.string().max(1000).optional(),
})

export const listDisputeQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: enumValidator(Object.values(DisputeStatus), 'Statut').optional(),
  priority: enumValidator(Object.values(DisputePriority), 'Priorité').optional(),
  reason: enumValidator(Object.values(DisputeReason), 'Raison').optional(),
  clientId: z.string().optional(),
  providerId: objectId.optional(),
  assignedAdminId: objectId.optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  sortBy: z.enum(['createdAt', 'updatedAt', 'priority']).default('updatedAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
})
