/**
 * POST /api/admin/market/sourcing/[id]/proposal
 *   Enregistre la proposition (draft ou envoi). Body:
 *   {
 *     send: boolean,                           // si true => statut proposal_sent + SMS
 *     proposal: {
 *       productName, productImage?, productGallery?, supplierUrl?, supplierName?, notes?,
 *       price1688?, exchangeRate?, productCostFCFA, serviceFeeRate, insuranceRate,
 *       shippingMethod, shippingCost,
 *       qty, weightKg?, lengthCm?, widthCm?, heightCm?,
 *       deliveryDays,
 *       expiresInHours? (défaut 72),
 *       alternativeOffers?: [...]
 *     }
 *   }
 *   Les *Amount et totalClientPrice sont recalculés serveur-side pour cohérence.
 */

import { NextRequest, NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { connectMongoose } from '@/lib/mongoose'
import SourcingRequest from '@/lib/models/SourcingRequest'
import User from '@/lib/models/User'
import { requireAuth } from '@/lib/jwt'
import { sendSms } from '@/lib/sms'

export const dynamic = 'force-dynamic'

const ADMIN_ROLES = new Set(['ADMIN', 'SUPER_ADMIN', 'PRODUCT_MANAGER'])

function buildBaseSiteUrl(request: NextRequest): string {
  const fromEnv = process.env.APP_BASE_URL || process.env.NEXT_PUBLIC_APP_URL
  if (fromEnv) return fromEnv.replace(/\/+$/, '')
  const proto = request.headers.get('x-forwarded-proto') || 'https'
  const host = (request.headers.get('host') || '').replace(/^market\./i, '')
  return `${proto}://${host}`
}

function asNumber(v: unknown): number | undefined {
  if (v === undefined || v === null || v === '') return undefined
  const n = Number(v)
  return Number.isFinite(n) && n >= 0 ? n : undefined
}

function fmtFcfa(n: number): string {
  return Math.round(n).toLocaleString('fr-FR') + ' FCFA'
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // Auth
  let userId: string, role: string, name: string | undefined
  try {
    const auth = await requireAuth(request)
    if (!ADMIN_ROLES.has(String(auth.role).toUpperCase())) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }
    userId = auth.userId
    role = auth.role
    name = auth.username
  } catch {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  }

  if (!mongoose.isValidObjectId(params.id)) {
    return NextResponse.json({ error: 'ID invalide' }, { status: 400 })
  }

  let body: any
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'JSON invalide' }, { status: 400 })
  }

  const p = body?.proposal
  if (!p || typeof p !== 'object') {
    return NextResponse.json({ error: 'Proposition manquante' }, { status: 400 })
  }

  // Validation des champs requis
  const productName = (p.productName || '').toString().trim()
  if (!productName) {
    return NextResponse.json({ error: 'Nom produit requis' }, { status: 400 })
  }
  const productCostFCFA = asNumber(p.productCostFCFA)
  if (productCostFCFA === undefined) {
    return NextResponse.json({ error: 'Coût produit FCFA requis' }, { status: 400 })
  }
  const serviceFeeRate = asNumber(p.serviceFeeRate)
  if (serviceFeeRate === undefined || serviceFeeRate > 100) {
    return NextResponse.json({ error: 'Taux frais service invalide' }, { status: 400 })
  }
  const insuranceRate = asNumber(p.insuranceRate)
  if (insuranceRate === undefined || insuranceRate > 100) {
    return NextResponse.json({ error: 'Taux assurance invalide' }, { status: 400 })
  }
  const shippingCost = asNumber(p.shippingCost)
  if (shippingCost === undefined) {
    return NextResponse.json({ error: 'Coût transport requis' }, { status: 400 })
  }
  const shippingMethod = ['air_express', 'air_economy', 'sea_freight'].includes(p.shippingMethod)
    ? p.shippingMethod
    : null
  if (!shippingMethod) {
    return NextResponse.json({ error: 'Méthode transport invalide' }, { status: 400 })
  }
  const qty = Math.max(1, Math.floor(asNumber(p.qty) || 1))
  const deliveryDays = Math.max(1, Math.min(180, Math.floor(asNumber(p.deliveryDays) || 0)))
  if (!deliveryDays) {
    return NextResponse.json({ error: 'Délai de livraison invalide' }, { status: 400 })
  }

  // Recalcul cohérent (autoritatif côté serveur)
  const serviceFeeAmount = Math.round(productCostFCFA * (serviceFeeRate / 100))
  const insuranceAmount = Math.round(productCostFCFA * (insuranceRate / 100))
  const totalClientPrice = Math.round(productCostFCFA + serviceFeeAmount + insuranceAmount + shippingCost)

  const expiresInHours = Math.max(1, Math.min(168, Math.floor(asNumber(p.expiresInHours) || 72)))
  const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000)

  await connectMongoose()
  const doc = await SourcingRequest.findById(params.id)
  if (!doc) return NextResponse.json({ error: 'Demande introuvable' }, { status: 404 })
  if (['fulfilled', 'cancelled'].includes(doc.status)) {
    return NextResponse.json(
      { error: `Demande déjà ${doc.status}, modification interdite` },
      { status: 409 }
    )
  }

  // Récupérer nom admin pour traçabilité
  let proposedByName = name || ''
  try {
    const user = await User.findById(userId).select('name username').lean() as any
    if (user) proposedByName = user.name || user.username || proposedByName
  } catch {}

  const validAlternatives = Array.isArray(p.alternativeOffers)
    ? p.alternativeOffers
        .slice(0, 5)
        .map((a: any) => ({
          label: String(a?.label || '').trim().slice(0, 100),
          totalClientPrice: Number(a?.totalClientPrice) || 0,
          deliveryDays: Math.max(1, Math.min(180, Math.floor(Number(a?.deliveryDays) || 0))),
          notes: a?.notes ? String(a.notes).slice(0, 500) : undefined
        }))
        .filter((a: any) => a.label && a.totalClientPrice > 0 && a.deliveryDays > 0)
    : []

  doc.proposal = {
    productName: productName.slice(0, 300),
    productImage: p.productImage?.toString().trim() || undefined,
    productGallery: Array.isArray(p.productGallery)
      ? p.productGallery.filter((u: any) => typeof u === 'string').slice(0, 10)
      : [],
    supplierUrl: p.supplierUrl?.toString().trim() || undefined,
    supplierName: p.supplierName?.toString().trim().slice(0, 200) || undefined,
    notes: p.notes?.toString().slice(0, 2000) || undefined,
    price1688: asNumber(p.price1688),
    exchangeRate: asNumber(p.exchangeRate),
    productCostFCFA,
    serviceFeeRate,
    serviceFeeAmount,
    insuranceRate,
    insuranceAmount,
    shippingMethod,
    shippingCost,
    totalClientPrice,
    currency: 'FCFA',
    qty,
    weightKg: asNumber(p.weightKg),
    lengthCm: asNumber(p.lengthCm),
    widthCm: asNumber(p.widthCm),
    heightCm: asNumber(p.heightCm),
    deliveryDays,
    proposedBy: userId,
    proposedByName,
    proposedAt: new Date(),
    expiresAt,
    alternativeOffers: validAlternatives
  }

  const send = body.send === true
  if (send) {
    doc.status = 'proposal_sent'
    doc.proposalSentAt = new Date()

    const baseUrl = buildBaseSiteUrl(request)
    const trackUrl = `${baseUrl}/market/sourcing/${doc.publicToken}`
    const sms =
      `IT Vision Market — ${doc.reference} : votre proposition est prête. ` +
      `${productName.slice(0, 40)} — ${fmtFcfa(totalClientPrice)} livré en ${deliveryDays}j. ` +
      `Valider : ${trackUrl}`
    try {
      const ok = await sendSms(doc.contactPhone, sms)
      if (!ok) console.warn('[sourcing] SMS proposition non envoyé pour', doc.reference)
    } catch (err) {
      console.warn('[sourcing] SMS proposition erreur:', err)
    }
  } else {
    doc.status = 'proposal_ready'
  }

  await doc.save()
  return NextResponse.json({ success: true, request: doc.toObject() })
}
