/**
 * « Trouvez-moi » côté portail entreprise.
 *
 * GET  /api/client-enterprise/sourcing — demandes de la société
 * POST /api/client-enterprise/sourcing — créer une demande (produit absent du catalogue)
 *
 * Le domaine corporate ne touche JAMAIS le modèle market SourcingRequest :
 * tout passe par /api/internal/market/sourcing-request* (cf. AGENTS.md règle 1).
 * L'agent `sourcing_request` existant est déclenché côté market.
 */
import { NextRequest, NextResponse } from 'next/server'
import { requireDomainAccess, requireCompanyCapability } from '@/lib/domain-access'
import { internalPost } from '@/lib/internal-auth'
import { logAuditEvent } from '@/lib/audit'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const result = await requireDomainAccess(request, 'corporate')
  if (!result.ok) return result.response
  const { access } = result

  const companyClientId = access.profiles.companyClientId
  if (!companyClientId) {
    return NextResponse.json({ error: 'Pas de société liée' }, { status: 403 })
  }

  const data = await internalPost<{ requests?: unknown[] }>(request, '/api/internal/market/sourcing-request/list', {
    companyClientId,
    limit: 20,
  })

  if (!data) {
    return NextResponse.json({ error: 'Service de sourcing indisponible' }, { status: 503 })
  }

  return NextResponse.json({ requests: data.requests || [] })
}

export async function POST(request: NextRequest) {
  const result = await requireDomainAccess(request, 'corporate')
  if (!result.ok) return result.response
  const { access } = result

  const denied = requireCompanyCapability(access, 'sourcing:request')
  if (denied) return denied

  const companyClientId = access.profiles.companyClientId
  if (!companyClientId) {
    return NextResponse.json({ error: 'Pas de société liée' }, { status: 403 })
  }

  const body = await request.json().catch(() => ({} as any))
  const description = String(body?.description || '').trim()
  if (description.length < 10) {
    return NextResponse.json({ error: 'Décrivez le produit recherché (10 caractères min.)' }, { status: 400 })
  }

  const data = await internalPost<{ ok?: boolean; reference?: string; id?: string; slaDueAt?: string; error?: string }>(
    request,
    '/api/internal/market/sourcing-request',
    {
      companyClientId,
      userId: access.userId,
      contactPhone: String(body?.contactPhone || '').trim(),
      contactName: String(body?.contactName || '').trim(),
      contactEmail: access.email,
      title: String(body?.title || '').trim(),
      description,
      qty: body?.qty,
      budgetMaxFCFA: body?.budgetMaxFCFA,
      externalUrl: body?.externalUrl,
      categoryHint: body?.categoryHint,
    }
  )

  if (!data || data.error) {
    return NextResponse.json(
      { error: data?.error || 'Service de sourcing indisponible' },
      { status: data?.error ? 400 : 503 }
    )
  }

  void logAuditEvent({
    entityType: 'SourcingRequest',
    entityId: data.id || 'unknown',
    action: 'corporate_sourcing_request',
    userId: access.userId,
    userRole: 'CLIENT',
    clientCompanyId: companyClientId,
    metadata: { reference: data.reference, companyRole: access.companyRole },
  })

  return NextResponse.json({ success: true, reference: data.reference, id: data.id, slaDueAt: data.slaDueAt }, { status: 201 })
}
