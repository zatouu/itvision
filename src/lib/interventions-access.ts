import type { NextRequest } from 'next/server'
import { requireAuth } from '@/lib/jwt'
import { connectMongoose } from '@/lib/mongoose'
import Technician from '@/lib/models/Technician'

// Garde d'acces aux endpoints interventions (admin/planning/scheduling).
// Deplace hors du route file : Next.js n'autorise que les exports HTTP
// dans les fichiers route.ts.
export async function requireInterventionAccess(request: NextRequest) {
  try {
    const { role, userId, email } = await requireAuth(request) as { role: string; userId: string; email?: string }
    const allowed = ['ADMIN', 'SUPER_ADMIN', 'TECHNICIAN', 'PRODUCT_MANAGER'].includes(role)
    if (!allowed) return { ok: false as const, status: 403, error: 'Acces refuse' as const }
    return { ok: true as const, role: String(role), userId: String(userId), email: email ? String(email) : '' }
  } catch {
    return { ok: false as const, status: 401, error: 'Non authentifie' as const }
  }
}

/** Fiche Technician du compte connecté : la liaison se fait par email (Technician n'a pas de userId). */
export async function resolveTechnicianId(email?: string | null): Promise<string | null> {
  if (!email) return null
  await connectMongoose()
  const tech = await Technician.findOne({ email: String(email).toLowerCase().trim() }).select('_id').lean() as { _id?: unknown } | null
  return tech?._id ? String(tech._id) : null
}

export function isAssignedTechnician(
  intervention: { technicienId?: unknown; assignedTechnician?: unknown; technicianIds?: unknown[] },
  technicianId: string | null
): boolean {
  if (!technicianId) return false
  return [intervention.technicienId, intervention.assignedTechnician, ...(intervention.technicianIds || [])]
    .some(x => x && String(x) === technicianId)
}

/** Filtre Mongo « interventions de ce technicien » : responsable, affecté ou membre de l'équipe. */
export function assignedToTechnician(techId: unknown) {
  return { $or: [{ technicienId: techId }, { assignedTechnician: techId }, { technicianIds: techId }] }
}

/** Ensemble des techniciens d'une intervention (responsable en premier, sans doublon). */
export function interventionTechnicianIds(i: { technicienId?: unknown; assignedTechnician?: unknown; technicianIds?: unknown[] }): string[] {
  return [...new Set([i.technicienId, i.assignedTechnician, ...(i.technicianIds || [])].filter(Boolean).map(String))]
}

/** Seules transitions ouvertes au technicien : démarrer puis terminer. */
export const TECHNICIAN_TRANSITIONS: Record<string, string[]> = {
  scheduled: ['in_progress'],
  in_progress: ['completed'],
}
