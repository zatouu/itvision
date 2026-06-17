import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { GroupOrder } from '@/lib/models/GroupOrder'
import { getConfiguredShippingRates } from '@/lib/shipping/settings'
import { calculateBilledWeight } from '@/lib/pricing/volumetric-weight'

export const dynamic = 'force-dynamic'

/**
 * GET /api/shipping/rates-public
 * Retourne les tarifs de transport configurés + un coût par unité estimé
 * basé sur un produit moyen (1 kg, volume ~0.015 m³) pour le simulateur.
 * Aucune auth requise.
 */
export async function GET() {
  try {
    await connectDB()

    const rates = getConfiguredShippingRates()
    const now = new Date()

    // Produit de référence moyen pour estimation simulateur
    const referenceWeightKg = 1.0
    const referenceVolumeM3 = 0.015
    const referenceQty = 10 // simulateur par défaut qty

    const weightInfo = calculateBilledWeight({
      actualWeightKg: referenceWeightKg,
      lengthCm: 25,
      widthCm: 20,
      heightCm: 30
    })

    const mapped = Object.values(rates).map((method) => {
      let costPerUnit = 0
      let unit = ''

      if (method.billing === 'per_kg') {
        const billed = weightInfo.billedWeight * method.rate
        const totalCost = Math.max(method.minimumCharge || 0, billed)
        costPerUnit = Math.round(totalCost / referenceQty)
        unit = 'F/kg'
      } else {
        // per_cubic_meter
        const billed = referenceVolumeM3 * method.rate
        const totalCost = Math.max(method.minimumCharge || 0, billed)
        costPerUnit = Math.round(totalCost / referenceQty)
        unit = 'F/m³'
      }

      return {
        id: method.id,
        label: method.label,
        description: method.description,
        durationDays: method.durationDays,
        billing: method.billing,
        rate: method.rate,
        minimumCharge: method.minimumCharge,
        costPerUnit, // estimé pour ~10 unités d'un produit moyen
        unit,
      }
    })

    // Moyennes des groupes actifs pour pré-remplir le simulateur
    const activeGroups = await GroupOrder.find({
      status: { $in: ['open', 'filled'] },
      deadline: { $gte: now }
    })
      .select('product.basePrice currentUnitPrice currentQty targetQty')
      .limit(50)
      .lean()

    let avgBasePrice = 50000
    let avgDiscount = 25
    let avgQty = 10

    if (activeGroups.length > 0) {
      const totalBase = activeGroups.reduce((s: number, g: any) => s + (g.product?.basePrice || 0), 0)
      const totalDiscount = activeGroups.reduce((s: number, g: any) => {
        const base = g.product?.basePrice || 0
        const current = g.currentUnitPrice || base
        if (base <= 0) return s
        return s + Math.max(0, Math.round(((base - current) / base) * 100))
      }, 0)
      const totalQty = activeGroups.reduce((s: number, g: any) => s + (g.currentQty || 0), 0)

      avgBasePrice = Math.round(totalBase / activeGroups.length)
      avgDiscount = Math.round(totalDiscount / activeGroups.length)
      avgQty = Math.round(totalQty / activeGroups.length)
    }

    // Valeurs par défaut bornées pour le simulateur
    const defaults = {
      soloPrice: Math.max(5000, Math.min(200000, Math.round(avgBasePrice / 5000) * 5000)),
      discount: Math.max(5, Math.min(60, avgDiscount)),
      qty: Math.max(5, Math.min(200, Math.round(avgQty / 5) * 5)),
    }

    return NextResponse.json({
      success: true,
      rates: mapped,
      defaults,
    })
  } catch (error) {
    console.error('GET /api/shipping/rates-public error:', error)
    return NextResponse.json({
      success: false,
      error: 'Erreur serveur',
    }, { status: 500 })
  }
}
