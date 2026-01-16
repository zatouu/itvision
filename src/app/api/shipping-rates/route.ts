import { NextResponse } from 'next/server'
import { getConfiguredShippingRates } from '@/lib/shipping/settings'

export async function GET() {
  try {
    const rates = getConfiguredShippingRates()
    return NextResponse.json({ success: true, rates })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message || 'Erreur' }, { status: 500 })
  }
}
