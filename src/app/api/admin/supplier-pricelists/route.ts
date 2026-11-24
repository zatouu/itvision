/**
 * Grilles de fournisseurs directs (admin) — src/lib/market/supplier-pricelists
 *   GET  ?id=<grille>                  — aperçu calculé (prix, lot minimum, prix rendu, marché), rien n'est écrit
 *   POST { id, confirm: id, keys, publish? } — crée / met à jour les familles cochées (idempotent)
 */
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdminApi } from '@/lib/api-auth'
import { invalidateCatalogCache } from '@/lib/catalog-cache'
import { SUPPLIER_PRICELISTS } from '@/lib/market/supplier-pricelists'
import { applyPricelist, previewPricelist } from '@/lib/market/supplier-pricelists/import'

const READ_ROLES = ['ADMIN', 'SUPER_ADMIN', 'PRODUCT_MANAGER']
const WRITE_ROLES = ['ADMIN', 'SUPER_ADMIN']

const lists = () => Object.values(SUPPLIER_PRICELISTS).map(l => ({ id: l.id, supplier: l.supplier, families: l.families.length }))

const applySchema = z.object({
  id: z.string().min(1),
  confirm: z.string().min(1),
  keys: z.array(z.string().min(1)).min(1).max(500),
  publish: z.boolean().optional(),
})

export async function GET(request: NextRequest) {
  const auth = await requireAdminApi(request, READ_ROLES)
  if (!auth.ok) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })

  const id = request.nextUrl.searchParams.get('id') || Object.keys(SUPPLIER_PRICELISTS)[0]
  const list = SUPPLIER_PRICELISTS[id]
  if (!list) return NextResponse.json({ success: false, error: 'Grille inconnue' }, { status: 404 })
  try {
    return NextResponse.json({ success: true, lists: lists(), canApply: WRITE_ROLES.includes(String(auth.user.role).toUpperCase()), plan: await previewPricelist(list) })
  } catch (err) {
    return NextResponse.json({ success: false, error: err instanceof Error ? err.message : 'Aperçu impossible' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAdminApi(request, WRITE_ROLES)
  if (!auth.ok) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })

  const parsed = applySchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ success: false, error: 'Requête invalide' }, { status: 400 })
  const { id, confirm, keys, publish } = parsed.data
  const list = SUPPLIER_PRICELISTS[id]
  if (!list) return NextResponse.json({ success: false, error: 'Grille inconnue' }, { status: 404 })
  if (confirm !== id) return NextResponse.json({ success: false, error: 'Confirmation incorrecte' }, { status: 400 })

  try {
    const plan = await applyPricelist(list, { publish: !!publish, keys })
    void invalidateCatalogCache()
    console.info(`[supplier-pricelists] ${id} appliquée par ${auth.user.id} (publish=${!!publish}) : ${JSON.stringify(plan.totals)}`)
    return NextResponse.json({ success: true, lists: lists(), canApply: true, plan })
  } catch (err) {
    return NextResponse.json({ success: false, error: err instanceof Error ? err.message : 'Import impossible' }, { status: 500 })
  }
}
