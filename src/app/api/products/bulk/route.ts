import { NextRequest, NextResponse } from 'next/server'
import { connectMongoose } from '@/lib/mongoose'
import Product from '@/lib/models/Product'
import { requireAuth } from '@/lib/jwt'
import { PRODUCT_STAFF_ROLES } from '@/lib/api-auth'
import { itvOwnProductClause } from '@/lib/market/corporate-catalog'

async function requireManagerRole(request: NextRequest) {
  try {
    const { role } = await requireAuth(request)
    const allowed = PRODUCT_STAFF_ROLES.includes(String(role || '').toUpperCase())
    if (!allowed) return { ok: false as const, status: 403, error: 'Accès refusé' as const }
    return { ok: true as const }
  } catch {
    return { ok: false as const, status: 401, error: 'Non authentifié' as const }
  }
}

const VALID_CHANNELS = ['marketplace', 'corporate', 'xeuy-bi'] as const

type BulkSet = {
  isPublished?: boolean
  isFeatured?: boolean
  category?: string | null
  channels?: string[]
  corporateVisible?: boolean
  addChannel?: string
  removeChannel?: string
}

export async function PATCH(request: NextRequest) {
  const auth = await requireManagerRole(request)
  if (!auth.ok) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })

  try {
    await connectMongoose()

    const body = await request.json().catch(() => ({}))
    const ids = Array.isArray(body?.ids) ? body.ids : []
    const set: BulkSet = body?.set && typeof body.set === 'object' ? body.set : {}

    const cleanIds = ids
      .map((id: any) => (typeof id === 'string' ? id.trim() : ''))
      .filter(Boolean)

    if (cleanIds.length === 0) {
      return NextResponse.json({ success: false, error: 'ids requis' }, { status: 400 })
    }
    if (cleanIds.length > 500) {
      return NextResponse.json({ success: false, error: 'Trop d\'éléments (max 500)' }, { status: 400 })
    }

    const updateSet: Record<string, unknown> = {}
    const updateUnset: Record<string, 1> = {}
    const updateAddToSet: Record<string, unknown> = {}
    const updatePull: Record<string, unknown> = {}

    if (typeof set.isPublished === 'boolean') updateSet.isPublished = set.isPublished
    if (typeof set.isFeatured === 'boolean') updateSet.isFeatured = set.isFeatured
    if (typeof set.corporateVisible === 'boolean') updateSet.corporateVisible = set.corporateVisible

    if (Array.isArray(set.channels)) {
      const clean = set.channels
        .map((c: any) => (typeof c === 'string' ? c.trim().toLowerCase() : ''))
        .filter((c: any) => VALID_CHANNELS.includes(c as typeof VALID_CHANNELS[number]))
      if (clean.length > 0) updateSet.channels = clean
    }

    if (typeof set.addChannel === 'string') {
      const c = set.addChannel.trim().toLowerCase()
      if (VALID_CHANNELS.includes(c as typeof VALID_CHANNELS[number])) {
        updateAddToSet.channels = c
      }
    }
    if (typeof set.removeChannel === 'string') {
      const c = set.removeChannel.trim().toLowerCase()
      if (VALID_CHANNELS.includes(c as typeof VALID_CHANNELS[number])) {
        updatePull.channels = c
      }
    }

    if (set.category !== undefined) {
      if (set.category === null) {
        updateUnset.category = 1
      } else if (typeof set.category === 'string') {
        const trimmed = set.category.trim()
        if (!trimmed) updateUnset.category = 1
        else updateSet.category = trimmed
      }
    }

    if (
      Object.keys(updateSet).length === 0 &&
      Object.keys(updateUnset).length === 0 &&
      Object.keys(updateAddToSet).length === 0 &&
      Object.keys(updatePull).length === 0
    ) {
      return NextResponse.json({ success: false, error: 'Aucun champ à mettre à jour' }, { status: 400 })
    }

    const updateDoc: any = {}
    if (Object.keys(updateSet).length) updateDoc.$set = updateSet
    if (Object.keys(updateUnset).length) updateDoc.$unset = updateUnset
    if (Object.keys(updateAddToSet).length) updateDoc.$addToSet = updateAddToSet
    if (Object.keys(updatePull).length) updateDoc.$pull = updatePull

    // Règle B2B : un produit de vendeur tiers (shopId) n'entre jamais dans le
    // catalogue corporate — l'update est donc restreint aux produits IT Vision
    // (cf. src/lib/market/corporate-catalog.ts) et les autres sont signalés.
    const exposesCorporate =
      updateSet.corporateVisible === true ||
      (Array.isArray(updateSet.channels) && updateSet.channels.includes('corporate')) ||
      updateAddToSet.channels === 'corporate'

    const filter: Record<string, unknown> = { _id: { $in: cleanIds } }
    if (exposesCorporate) {
      filter.$and = [itvOwnProductClause()]
    }

    const result: any = await Product.updateMany(filter, updateDoc)

    const matchedCount = Number(result?.matchedCount ?? result?.n ?? 0)
    const vendorSkipped = exposesCorporate ? cleanIds.length - matchedCount : 0

    return NextResponse.json({
      success: true,
      matchedCount,
      modifiedCount: Number(result?.modifiedCount ?? result?.nModified ?? 0),
      ...(vendorSkipped > 0
        ? {
            vendorSkipped,
            warning: `${vendorSkipped} produit(s) de vendeur tiers ignoré(s) : le catalogue B2B est réservé aux produits IT Vision.`,
          }
        : {}),
    })
  } catch (error) {
    console.error('PATCH /api/products/bulk error', error)
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 })
  }
}
