import { NextRequest, NextResponse } from 'next/server'
import { verifyAuthServer } from '@/lib/auth-server'
import { z } from 'zod'
import { internalShippingCostsSchema } from '@/lib/shipping/settings'
import { ShippingCostsConflictError } from '@/lib/shipping/shared-costs'
import { configuredShippingRates, readSharedTariffs, writeSharedPricing, PricingConflictError, shippingRatesSchema, seaEligibilitySchema } from '@/lib/pricing/shared-settings'

const updateSchema = z.object({
  pricingVersion: z.number().int().positive(),
  rates: shippingRatesSchema.partial().optional(),
  internalCosts: internalShippingCostsSchema.optional(),
  internalCostsVersion: z.number().int().positive().optional(),
  seaFreightEligibility: seaEligibilitySchema.partial().optional(),
  adjustTolerance: z.number().finite().min(0).max(0.5).optional(),
}).strict().refine(body => body.internalCosts === undefined || body.internalCostsVersion !== undefined)

async function response() {
  const { pricing, costs } = await readSharedTariffs()
  return NextResponse.json({ success: true, pricingVersion: pricing.version, overrides: pricing.config.shippingRates, rates: configuredShippingRates(pricing.config), internalCosts: costs.costs, internalCostsVersion: costs.version, seaFreightEligibility: pricing.config.seaFreightEligibility, adjustTolerance: pricing.config.adjustTolerance }, { headers: { 'Cache-Control': 'private, no-store' } })
}

export async function GET(request: NextRequest) {
  const auth = await verifyAuthServer(request)
  if (!auth.isAuthenticated || !auth.user) {
    return NextResponse.json({ success: false, error: 'Non authentifié' }, { status: 401 })
  }
  if (!['ADMIN', 'SUPER_ADMIN'].includes(auth.user.role.toUpperCase())) {
    return NextResponse.json({ success: false, error: 'Accès refusé' }, { status: 403 })
  }

  try {
    return await response()
  } catch (err: any) {
    console.error('[shipping-settings] read failed:', err)
    return NextResponse.json({ success: false, error: 'Lecture des tarifs impossible.' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const auth = await verifyAuthServer(request)
  if (!auth.isAuthenticated || !auth.user) {
    return NextResponse.json({ success: false, error: 'Non authentifié' }, { status: 401 })
  }
  if (!['ADMIN', 'SUPER_ADMIN'].includes(auth.user.role.toUpperCase())) {
    return NextResponse.json({ success: false, error: 'Accès refusé' }, { status: 403 })
  }

  try {
    const parsed = updateSchema.safeParse(await request.json().catch(() => null))
    if (!parsed.success) return NextResponse.json({ success: false, error: 'Tarifs ou versions invalides. Rechargez les reglages.' }, { status: 400 })
    const body = parsed.data
    await writeSharedPricing({ shippingRates: body.rates || {}, seaFreightEligibility: body.seaFreightEligibility, adjustTolerance: body.adjustTolerance }, body.pricingVersion,
      body.internalCosts ? { payload: body.internalCosts, expectedVersion: body.internalCostsVersion! } : undefined)
    return await response()
  } catch (err: any) {
    if (err instanceof ShippingCostsConflictError || err instanceof PricingConflictError) {
      return NextResponse.json({ success: false, error: err.message }, { status: 409 })
    }
    console.error('[shipping-settings] write failed:', err)
    return NextResponse.json({ success: false, error: 'Enregistrement des tarifs impossible.' }, { status: 500 })
  }
}
