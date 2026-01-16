import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth-server'
import { getConfiguredShippingRates, readShippingRateOverrides, writeShippingRateOverrides } from '@/lib/shipping/settings'

export async function GET(request: NextRequest) {
  const auth = await requireRole(['ADMIN'], request)
  if (!auth) {
    return NextResponse.json({ success: false, error: 'Accès refusé' }, { status: 401 })
  }

  try {
    const overrides = readShippingRateOverrides()
    const rates = getConfiguredShippingRates()
    return NextResponse.json({ success: true, overrides, rates })
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
    const updated = writeShippingRateOverrides(body)
    const rates = getConfiguredShippingRates()
    return NextResponse.json({ success: true, overrides: updated, rates })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || 'Erreur' }, { status: 500 })
  }
}
