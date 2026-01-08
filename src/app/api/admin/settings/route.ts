import { NextRequest, NextResponse } from 'next/server'
import { readPricingDefaults, writePricingDefaults } from '@/lib/pricing/settings'
import { requireRole } from '@/lib/auth-server'

export async function GET() {
  // Lecture réservée aux administrateurs (pas d'accès public)
  const auth = await requireRole(['ADMIN'], undefined as any)
  if (!auth) {
    return NextResponse.json({ success: false, error: 'Accès refusé' }, { status: 401 })
  }

  try {
    const defaults = readPricingDefaults()
    return NextResponse.json({ success: true, defaults })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || 'Erreur' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  // Vérifier rôle admin
  const auth = await requireRole(['ADMIN'], request)
  if (!auth) {
    return NextResponse.json({ success: false, error: 'Accès refusé' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const allowed: any = {}

    if (typeof body.defaultExchangeRate === 'number' && body.defaultExchangeRate > 0) allowed.defaultExchangeRate = Math.round(body.defaultExchangeRate)
    if (typeof body.defaultServiceFeeRate === 'number' && body.defaultServiceFeeRate >= 0 && body.defaultServiceFeeRate <= 100) allowed.defaultServiceFeeRate = Number(body.defaultServiceFeeRate)
    if (typeof body.defaultInsuranceRate === 'number' && body.defaultInsuranceRate >= 0 && body.defaultInsuranceRate <= 100) allowed.defaultInsuranceRate = Number(body.defaultInsuranceRate)
    if (typeof body.defaultMarginRate === 'number' && body.defaultMarginRate >= 0 && body.defaultMarginRate <= 200) allowed.defaultMarginRate = Number(body.defaultMarginRate)

    if (Object.keys(allowed).length === 0) {
      return NextResponse.json({ success: false, error: 'Aucun champ valide fourni' }, { status: 400 })
    }

    const updated = writePricingDefaults(allowed)
    return NextResponse.json({ success: true, defaults: updated })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || 'Erreur' }, { status: 500 })
  }
}
