import { NextRequest, NextResponse } from 'next/server'
import { readPricingDefaults, writePricingDefaults } from '@/lib/pricing/settings'
import { requireAdminApi } from '@/lib/api-auth'

export async function GET(request: NextRequest) {
  const auth = await requireAdminApi(request, ['ADMIN', 'SUPER_ADMIN'])
  if (!auth.ok) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
  }

  try {
    const defaults = readPricingDefaults()
    return NextResponse.json({ success: true, defaults })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || 'Erreur' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAdminApi(request, ['ADMIN', 'SUPER_ADMIN'])
  if (!auth.ok) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
  }

  try {
    const body = await request.json()
    const allowed: any = {}

    if (typeof body.defaultExchangeRate === 'number' && body.defaultExchangeRate > 0) allowed.defaultExchangeRate = Math.round(body.defaultExchangeRate)
    if (typeof body.defaultServiceFeeRate === 'number' && body.defaultServiceFeeRate >= 0 && body.defaultServiceFeeRate <= 100) allowed.defaultServiceFeeRate = Number(body.defaultServiceFeeRate)
    if (typeof body.defaultInsuranceRate === 'number' && body.defaultInsuranceRate >= 0 && body.defaultInsuranceRate <= 100) allowed.defaultInsuranceRate = Number(body.defaultInsuranceRate)

    if (Object.keys(allowed).length === 0) {
      return NextResponse.json({ success: false, error: 'Aucun champ valide fourni' }, { status: 400 })
    }

    const updated = writePricingDefaults(allowed)
    return NextResponse.json({ success: true, defaults: updated })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || 'Erreur' }, { status: 500 })
  }
}
