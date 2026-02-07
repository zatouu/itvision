import { NextResponse } from 'next/server'
import { getCNYToXOFRate, getExchangeRateInfo, DEFAULT_EXCHANGE_RATE } from '@/lib/pricing/exchange-rate'

/**
 * GET /api/exchange-rate
 * Retourne le taux de change actuel CNY → XOF
 */
export async function GET() {
  try {
    const rate = await getCNYToXOFRate()
    const info = getExchangeRateInfo()

    return NextResponse.json({
      success: true,
      rate,
      lastUpdated: info.lastUpdated?.toISOString(),
      source: info.source,
      isFallback: info.isFallback
    })
  } catch (error) {
    console.error('[API Exchange Rate] Erreur:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Impossible de récupérer le taux de change',
      rate: DEFAULT_EXCHANGE_RATE,
      isFallback: true
    }, { status: 200 }) // 200 car on a un fallback
  }
}
