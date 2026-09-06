import type { NextRequest } from 'next/server'
import { requireAuth } from '@/lib/jwt'

// Garde d'acces aux endpoints interventions (admin/planning/scheduling).
// Deplace hors du route file : Next.js n'autorise que les exports HTTP
// dans les fichiers route.ts.
export async function requireInterventionAccess(request: NextRequest) {
  try {
    const { role } = await requireAuth(request)
    const allowed = ['ADMIN', 'TECHNICIAN', 'PRODUCT_MANAGER'].includes(role)
    if (!allowed) return { ok: false as const, status: 403, error: 'Acces refuse' as const }
    return { ok: true as const }
  } catch {
    return { ok: false as const, status: 401, error: 'Non authentifie' as const }
  }
}
