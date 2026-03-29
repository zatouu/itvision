import { NextResponse } from 'next/server'
import { readPricingDefaults } from '@/lib/pricing/settings'

export async function GET() {
  try {
    const defaults = readPricingDefaults()
    return NextResponse.json({ success: true, defaults })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erreur lecture settings pricing'
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    )
  }
}
