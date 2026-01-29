import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth-server'
import { readPriceOverrides, writePriceOverrides } from '@/lib/pricing/overrides'

export async function GET(request: NextRequest) {
  const auth = await requireRole(['ADMIN', 'SUPER_ADMIN', 'TECHNICIAN'], request)
  if (!auth) {
    return NextResponse.json({ success: false, error: 'Accès refusé' }, { status: 401 })
  }

  try {
    const overrides = readPriceOverrides()
    return NextResponse.json({ success: true, overrides })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || 'Erreur' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireRole(['ADMIN', 'SUPER_ADMIN'], request)
  if (!auth) {
    return NextResponse.json({ success: false, error: 'Accès refusé' }, { status: 401 })
  }

  try {
    const body = await request.json()
    // Validation basique
    if (!Array.isArray(body)) {
      return NextResponse.json({ success: false, error: 'Format invalide (attendu: array)' }, { status: 400 })
    }
    const updated = writePriceOverrides(body)
    return NextResponse.json({ success: true, overrides: updated })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || 'Erreur' }, { status: 500 })
  }
}
