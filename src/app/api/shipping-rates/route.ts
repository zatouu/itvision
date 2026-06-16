import { NextResponse } from 'next/server'
import { getConfiguredShippingRates, readSeaFreightEligibilitySettings } from '@/lib/shipping/settings'

export async function GET() {
  try {
    const rates = getConfiguredShippingRates()
    const seaFreightEligibility = readSeaFreightEligibilitySettings()
    return NextResponse.json({ success: true, rates, seaFreightEligibility })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message || 'Erreur' }, { status: 500 })
  }
}
