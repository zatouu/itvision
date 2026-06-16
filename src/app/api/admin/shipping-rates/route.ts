import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth-server'
import {
  getConfiguredShippingRates,
  readSeaFreightEligibilitySettings,
  readShippingRateOverrides,
  writeSeaFreightEligibilitySettings,
  writeShippingRateOverrides,
} from '@/lib/shipping/settings'

export async function GET(request: NextRequest) {
  const auth = await requireRole(['ADMIN'], request)
  if (!auth) {
    return NextResponse.json({ success: false, error: 'Accès refusé' }, { status: 401 })
  }

  try {
    const overrides = readShippingRateOverrides()
    const rates = getConfiguredShippingRates()
    const seaFreightEligibility = readSeaFreightEligibilitySettings()
    return NextResponse.json({ success: true, overrides, rates, seaFreightEligibility })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || 'Erreur' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireRole(['ADMIN'], request)
  if (!auth) {
    return NextResponse.json({ success: false, error: 'Accès refusé' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const ratesPayload = body?.rates && typeof body.rates === 'object' ? body.rates : body
    const updated = writeShippingRateOverrides(ratesPayload)
    const seaFreightEligibility = body?.seaFreightEligibility && typeof body.seaFreightEligibility === 'object'
      ? writeSeaFreightEligibilitySettings(body.seaFreightEligibility)
      : readSeaFreightEligibilitySettings()
    const rates = getConfiguredShippingRates()
    return NextResponse.json({ success: true, overrides: updated, rates, seaFreightEligibility })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || 'Erreur' }, { status: 500 })
  }
}
