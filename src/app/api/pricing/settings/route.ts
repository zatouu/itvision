import { NextResponse } from 'next/server'
import { readSharedPricing } from '@/lib/pricing/shared-settings'

export async function GET() {
  try {
    const pricing = await readSharedPricing()
    return NextResponse.json({ success: true, defaults: pricing.config.defaults, pricingVersion: pricing.version }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (err: unknown) {
    console.error('[pricing-settings] public read failed:', err)
    return NextResponse.json(
      { success: false, error: 'Chargement des tarifs impossible.' },
      { status: 500 }
    )
  }
}
