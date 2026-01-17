import { NextRequest, NextResponse } from 'next/server'
import { connectMongoose } from '@/lib/mongoose'
import Product from '@/lib/models/Product.validated'
import { requireAuth } from '@/lib/jwt'

async function requireManagerRole(request: NextRequest) {
  try {
    const { role } = await requireAuth(request)
    const allowed = role === 'ADMIN' || role === 'PRODUCT_MANAGER'
    if (!allowed) return { ok: false as const, status: 403, error: 'Accès refusé' as const }
    return { ok: true as const }
  } catch {
    return { ok: false as const, status: 401, error: 'Non authentifié' as const }
  }
}

type BulkSet = {
  isPublished?: boolean
  isFeatured?: boolean
  category?: string | null
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

    if (typeof set.isPublished === 'boolean') updateSet.isPublished = set.isPublished
    if (typeof set.isFeatured === 'boolean') updateSet.isFeatured = set.isFeatured

    if (set.category !== undefined) {
      if (set.category === null) {
        updateUnset.category = 1
      } else if (typeof set.category === 'string') {
        const trimmed = set.category.trim()
        if (!trimmed) updateUnset.category = 1
        else updateSet.category = trimmed
      }
    }

    if (Object.keys(updateSet).length === 0 && Object.keys(updateUnset).length === 0) {
      return NextResponse.json({ success: false, error: 'Aucun champ à mettre à jour' }, { status: 400 })
    }

    const updateDoc: any = {}
    if (Object.keys(updateSet).length) updateDoc.$set = updateSet
    if (Object.keys(updateUnset).length) updateDoc.$unset = updateUnset

    const result: any = await Product.updateMany({ _id: { $in: cleanIds } }, updateDoc)

    return NextResponse.json({
      success: true,
      matchedCount: Number(result?.matchedCount ?? result?.n ?? 0),
      modifiedCount: Number(result?.modifiedCount ?? result?.nModified ?? 0)
    })
  } catch (error) {
    console.error('PATCH /api/products/bulk error', error)
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 })
  }
}
