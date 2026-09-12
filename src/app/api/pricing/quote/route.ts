import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { verifyAuthServer } from '@/lib/auth-server'
import { rateLimitRequest, tooManyResponse } from '@/lib/rate-limit'
import { quoteCart } from '@/lib/pricing/quote-cart'
import { validate } from '@/lib/validation'

/**
 * POST /api/pricing/quote
 *
 * Devis panier côté serveur — MÊME calcul que POST /api/order.
 * Permet d'afficher la décomposition exacte (prix sourcing + frais de service
 * + assurance + transport) avant la création de commande.
 * Le client n'envoie que les ids produits : les prix sont relus en DB.
 */
const quoteSchema = z.object({
  cart: z
    .array(
      z.object({
        id: z.string().min(1),
        qty: z.number().int().min(1).max(10000).default(1),
        variantIds: z.array(z.string()).optional(),
      })
    )
    .min(1)
    .max(100),
  shippingMethod: z.string().optional(),
  promo: z.object({ code: z.string().min(1).max(64) }).optional(),
  allShipping: z.boolean().optional(),
})

export async function POST(req: NextRequest) {
  try {
    const limit = await rateLimitRequest(req, { windowMs: 60_000, max: 30, keyPrefix: 'pricing:quote' })
    if (limit && !limit.ok) return tooManyResponse(limit.retryAfter)

    const rawBody = await req.json().catch(() => null)
    const validated = validate(quoteSchema, rawBody)
    if (!validated.success) {
      return NextResponse.json({ success: false, error: validated.error }, { status: 400 })
    }

    const { cart, shippingMethod, promo, allShipping } = validated.data

    // Tier marketplace pour les prix wholesale (optionnel — invité = standard)
    const auth = await verifyAuthServer(req)
    const marketplaceTier = auth.isAuthenticated ? auth.user?.marketplaceTier || 'standard' : 'standard'

    const result = await quoteCart({
      cart,
      shippingMethod,
      marketplaceTier,
      promoCode: promo?.code,
      checkStock: false,
      includeAllShipping: allShipping,
    })

    if (!result.ok) {
      return NextResponse.json({ success: false, error: result.error }, { status: result.status })
    }

    return NextResponse.json({ success: true, quote: result.quote })
  } catch (e) {
    console.error('[pricing/quote] Erreur:', e)
    return NextResponse.json(
      { success: false, error: 'Erreur lors du calcul du devis' },
      { status: 500 }
    )
  }
}
