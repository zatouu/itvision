import { NextRequest, NextResponse } from 'next/server'
import { requireAdminApi } from '@/lib/api-auth'
import { readPaymentSettings, writePaymentSettings } from '@/lib/payments/settings'

export async function GET(request: NextRequest) {
  const auth = await requireAdminApi(request)
  if (!auth.ok) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
  }

  try {
    const settings = readPaymentSettings()
    return NextResponse.json({ success: true, settings })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Erreur' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAdminApi(request)
  if (!auth.ok) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
  }

  try {
    const body = await request.json().catch(() => ({}))
    const settings = writePaymentSettings(body)
    return NextResponse.json({ success: true, settings })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Erreur' },
      { status: 500 }
    )
  }
}
