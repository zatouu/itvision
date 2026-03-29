import { NextRequest, NextResponse } from 'next/server'
import { readPricingDefaults, writePricingDefaults, type PricingDefaults } from '@/lib/pricing/settings'
import { requireAdminApi } from '@/lib/api-auth'

export async function GET(request: NextRequest) {
  const auth = await requireAdminApi(request, ['ADMIN', 'SUPER_ADMIN'])
  if (!auth.ok) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
  }

  try {
    const defaults = readPricingDefaults()
    return NextResponse.json({ success: true, defaults })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erreur'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAdminApi(request, ['ADMIN', 'SUPER_ADMIN'])
  if (!auth.ok) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
  }

  try {
    const body = await request.json()
    const allowed: Partial<PricingDefaults> = {}

    if (typeof body.defaultExchangeRate === 'number' && body.defaultExchangeRate > 0) allowed.defaultExchangeRate = Math.round(body.defaultExchangeRate)
    if (typeof body.defaultServiceFeeRate === 'number' && body.defaultServiceFeeRate >= 0 && body.defaultServiceFeeRate <= 100) allowed.defaultServiceFeeRate = Number(body.defaultServiceFeeRate)
    if (typeof body.defaultInsuranceRate === 'number' && body.defaultInsuranceRate >= 0 && body.defaultInsuranceRate <= 100) allowed.defaultInsuranceRate = Number(body.defaultInsuranceRate)
    if (typeof body.defaultB2BDiscountPercent === 'number' && body.defaultB2BDiscountPercent >= 1 && body.defaultB2BDiscountPercent <= 50) {
      allowed.defaultB2BDiscountPercent = Number(body.defaultB2BDiscountPercent)
    }
    if (Array.isArray(body.serviceFeeTiers)) {
      allowed.serviceFeeTiers = body.serviceFeeTiers
    }

    if (Object.keys(allowed).length === 0) {
      return NextResponse.json({ success: false, error: 'Aucun champ valide fourni' }, { status: 400 })
    }

    const updated = writePricingDefaults(allowed)
    return NextResponse.json({ success: true, defaults: updated })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erreur'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
