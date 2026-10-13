import { NextResponse } from 'next/server'
import { readSharedPricing, configuredShippingRates } from '@/lib/pricing/shared-settings'

export async function GET() {
  try {
    const pricing = await readSharedPricing()
    const rates = configuredShippingRates(pricing.config)
    const seaFreightEligibility = pricing.config.seaFreightEligibility
    return NextResponse.json({ success: true, rates, seaFreightEligibility, pricingVersion: pricing.version }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message || 'Erreur' }, { status: 500 })
  }
}
