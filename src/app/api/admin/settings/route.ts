import { NextRequest, NextResponse } from 'next/server'
import { readSharedPricing, writeSharedPricing, PricingConflictError } from '@/lib/pricing/shared-settings'
import { requireAdminApi, PRODUCT_STAFF_ROLES } from '@/lib/api-auth'
import { pricingDefaultsUpdateSchema, validate } from '@/lib/validation'

export async function GET(request: NextRequest) {
  // Lecture ouverte au PRODUCT_MANAGER (page /admin/produits/b2b-pricing) ;
  // l'écriture des réglages globaux (POST) reste réservée aux admins.
  const auth = await requireAdminApi(request, PRODUCT_STAFF_ROLES)
  if (!auth.ok) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
  }

  try {
    const pricing = await readSharedPricing()
    return NextResponse.json({
      success: true,
      defaults: pricing.config.defaults,
      pricingVersion: pricing.version,
      permissions: { canWrite: ['ADMIN', 'SUPER_ADMIN'].includes(auth.user.role.toUpperCase()) },
    }, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (err: unknown) {
    console.error('[pricing-settings] read failed:', err)
    return NextResponse.json({ success: false, error: 'Lecture des réglages impossible.' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAdminApi(request, ['ADMIN', 'SUPER_ADMIN'])
  if (!auth.ok) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
  }

  try {
    const body = await request.json().catch(() => null)
    if (!Number.isInteger(body?.pricingVersion) || body.pricingVersion < 1) {
      return NextResponse.json({ success: false, error: 'Version requise. Rechargez les reglages.' }, { status: 400 })
    }
    const validated = validate(pricingDefaultsUpdateSchema, body.defaults)
    if (!validated.success) {
      return NextResponse.json({ success: false, error: validated.error }, { status: 400 })
    }

    const updated = await writeSharedPricing({ defaults: validated.data }, body.pricingVersion)
    return NextResponse.json({ success: true, defaults: updated.config.defaults, pricingVersion: updated.version })
  } catch (err: unknown) {
    if (err instanceof PricingConflictError) return NextResponse.json({ success: false, error: err.message }, { status: 409 })
    console.error('[pricing-settings] write failed:', err)
    return NextResponse.json({ success: false, error: 'Enregistrement des réglages impossible.' }, { status: 500 })
  }
}
