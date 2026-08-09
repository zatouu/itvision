import { NextResponse } from 'next/server'
import { readPaymentSettings } from '@/lib/payments/settings'

/**
 * Config publique de paiement manuel (QR Wave marchand).
 * Utilisée par les apps mobiles pour afficher le numéro marchand + consignes.
 * GET /api/payments/manual-config
 */
export async function GET() {
  try {
    const settings = readPaymentSettings()
    const wavePhone = settings.providers?.manual?.waveMerchantPhone || ''
    const waveQrUrl = settings.providers?.manual?.waveQrUrl || ''
    const wavePayUrl = settings.providers?.manual?.wavePayUrl || ''
    return NextResponse.json({
      success: true,
      waveQrEnabled: !!wavePhone,
      waveMerchantPhone: wavePhone,
      waveQrUrl,
      wavePayUrl,
      instructions: settings.providers?.manual?.instructions || '',
    })
  } catch {
    return NextResponse.json({ success: false, waveQrEnabled: false })
  }
}
