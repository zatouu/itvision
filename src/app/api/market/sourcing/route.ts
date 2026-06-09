/**
 * API publique de sourcing — "Trouvez-moi ce produit".
 *
 * POST /api/market/sourcing
 *   Crée une demande de sourcing. Accepte multipart/form-data (avec image)
 *   OU application/json (lien/texte).
 *   - Authentifié : pas besoin de fournir contactPhone (récupéré du compte).
 *   - Anonyme    : contactPhone OBLIGATOIRE (sera notifié par SMS).
 *
 * GET /api/market/sourcing
 *   Liste les demandes de l'utilisateur connecté.
 *   - Auth requise via cookie auth-token (sinon 401).
 *
 * Sécurité :
 *   - Rate limiter dédié (anti-spam).
 *   - Upload image local sécurisé (extension + taille).
 *   - Téléphone normalisé via normalizePhone() — refusé si invalide.
 *   - publicToken signé pour suivi sans compte.
 */

import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import crypto from 'crypto'
import { connectMongoose } from '@/lib/mongoose'
import SourcingRequest, {
  computeSlaDueAt,
  generatePublicToken,
  generateSourcingReference
} from '@/lib/models/SourcingRequest'
import User from '@/lib/models/User'
import { extractAuthToken, verifyAuthToken } from '@/lib/jwt'
import { applyRateLimit, RateLimiter } from '@/lib/rate-limiter'
import { sendSms, normalizePhone } from '@/lib/sms'
import Product from '@/lib/models/Product'
import {
  computeImageEmbedding,
  hammingDistance,
  colorSimilarity,
  isValidEmbedding,
  type ImageEmbedding
} from '@/lib/image-hash'

export const maxDuration = 60
export const dynamic = 'force-dynamic'

// 5 créations / heure / IP pour limiter le spam anonyme
const sourcingCreateLimiter = new RateLimiter(60 * 60 * 1000, 5)

const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
const MAX_IMAGE_SIZE = 8 * 1024 * 1024 // 8 MB

type CreatePayload = {
  source: 'photo' | 'link' | 'text'
  description: string
  title?: string
  qty?: number
  budgetMaxFCFA?: number
  deliveryNeededBy?: string
  categoryHint?: string
  externalUrl?: string
  contactPhone?: string
  contactName?: string
  contactEmail?: string
}

function isValidUrl(raw: string): boolean {
  try {
    const u = new URL(raw)
    return u.protocol === 'http:' || u.protocol === 'https:'
  } catch {
    return false
  }
}

async function persistImage(file: File): Promise<{ url: string; hash: string }> {
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    throw new Error(`Format d'image non supporté (${file.type || 'inconnu'})`)
  }
  if (file.size > MAX_IMAGE_SIZE) {
    throw new Error('Image trop volumineuse (max 8 Mo)')
  }
  const buf = Buffer.from(await file.arrayBuffer())
  const hash = crypto.createHash('sha256').update(buf).digest('hex').slice(0, 32)
  const ext = (path.extname(file.name) || `.${(file.type.split('/')[1] || 'jpg')}`).toLowerCase()
  const safeExt = /^\.(jpg|jpeg|png|webp|gif)$/i.test(ext) ? ext : '.jpg'
  const filename = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${safeExt}`
  const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'sourcing')
  if (!existsSync(uploadDir)) await mkdir(uploadDir, { recursive: true })
  await writeFile(path.join(uploadDir, filename), buf)
  return { url: `/api/uploads/sourcing/${filename}`, hash }
}

function safeNumber(value: unknown, opts?: { min?: number; max?: number; default?: number }): number | undefined {
  if (value === undefined || value === null || value === '') return opts?.default
  const n = Number(value)
  if (!Number.isFinite(n)) return opts?.default
  if (opts?.min !== undefined && n < opts.min) return opts.default
  if (opts?.max !== undefined && n > opts.max) return opts.default
  return n
}

async function buildBaseSiteUrl(request: NextRequest): Promise<string> {
  const fromEnv = process.env.APP_BASE_URL || process.env.NEXT_PUBLIC_APP_URL
  if (fromEnv) return fromEnv.replace(/\/+$/, '')
  const proto = request.headers.get('x-forwarded-proto') || 'https'
  const rawHost = request.headers.get('host') || ''
  const cleanHost = rawHost.replace(/:\d+$/, '') // retire le port (:3000)
  const host = /^market\./i.test(cleanHost) ? cleanHost : `market.${cleanHost}`
  return `${proto}://${host}`
}

export async function POST(request: NextRequest) {
  const limited = applyRateLimit(request, sourcingCreateLimiter)
  if (limited) return limited

  // Détecter l'utilisateur connecté (optionnel)
  let authUserId: string | undefined
  let authUserPhone: string | undefined
  let authUserName: string | undefined
  let authUserEmail: string | undefined
  try {
    const token = extractAuthToken(request)
    if (token) {
      const decoded = await verifyAuthToken(token)
      authUserId = decoded.userId
      // Enrichir depuis DB pour récupérer le téléphone
      await connectMongoose()
      const user = await User.findById(decoded.userId).select('phone name email').lean() as any
      if (user) {
        authUserPhone = typeof user.phone === 'string' ? user.phone : undefined
        authUserName = typeof user.name === 'string' ? user.name : undefined
        authUserEmail = typeof user.email === 'string' ? user.email : undefined
      }
    }
  } catch {
    // Pas connecté → on continue en anonyme
  }

  // Parsing payload (multipart ou JSON)
  let payload: CreatePayload
  let imageFile: File | null = null
  const contentType = request.headers.get('content-type') || ''
  try {
    if (contentType.includes('multipart/form-data')) {
      const form = await request.formData()
      const raw = form.get('payload')
      if (typeof raw !== 'string') {
        return NextResponse.json({ error: 'Champ "payload" manquant' }, { status: 400 })
      }
      payload = JSON.parse(raw)
      const file = form.get('image')
      if (file && file instanceof File && file.size > 0) imageFile = file
    } else {
      payload = await request.json()
    }
  } catch (err: any) {
    return NextResponse.json({ error: 'Corps de requête invalide' }, { status: 400 })
  }

  // Validation
  if (!payload || typeof payload !== 'object') {
    return NextResponse.json({ error: 'Payload invalide' }, { status: 400 })
  }
  if (!['photo', 'link', 'text'].includes(payload.source)) {
    return NextResponse.json({ error: 'Source invalide' }, { status: 400 })
  }
  const description = (payload.description || '').toString().trim()
  if (description.length < 3) {
    return NextResponse.json(
      { error: 'Décrivez le produit (au moins quelques mots)' },
      { status: 400 }
    )
  }
  if (description.length > 4000) {
    return NextResponse.json({ error: 'Description trop longue (max 4000 caractères)' }, { status: 400 })
  }

  if (payload.source === 'photo' && !imageFile) {
    return NextResponse.json({ error: 'Photo requise pour ce type de demande' }, { status: 400 })
  }
  if (payload.source === 'link') {
    if (!payload.externalUrl || !isValidUrl(payload.externalUrl)) {
      return NextResponse.json({ error: 'Lien externe invalide' }, { status: 400 })
    }
  }

  // Contact
  const rawPhone = (payload.contactPhone || authUserPhone || '').trim()
  if (!rawPhone) {
    return NextResponse.json(
      { error: 'Numéro de téléphone requis pour vous recontacter sous 24h' },
      { status: 400 }
    )
  }
  const phone = normalizePhone(rawPhone)
  if (!phone) {
    return NextResponse.json(
      { error: 'Numéro de téléphone invalide (formats acceptés : +221 7X XXX XX XX, +212 6X XXX XX XX)' },
      { status: 400 }
    )
  }

  // DB
  await connectMongoose()

  // Upload image si fournie
  let imageUrl: string | undefined
  let imageHash: string | undefined
  if (imageFile) {
    try {
      const { url, hash } = await persistImage(imageFile)
      imageUrl = url
      imageHash = hash
    } catch (err: any) {
      return NextResponse.json({ error: err?.message || 'Échec upload image' }, { status: 400 })
    }
  }

  // ── Recherche catalogue automatique si image fournie ──
  // Avant de créer une demande sourcing, on vérifie si le produit existe déjà.
  let catalogMatch: any = null
  if (imageFile) {
    try {
      const fileBuffer = Buffer.from(await imageFile.arrayBuffer())
      const { embedding: queryEmbedding } = await computeImageEmbedding(fileBuffer)
      catalogMatch = await findCatalogMatchByImage(queryEmbedding, description)
    } catch (err) {
      console.warn('[sourcing] Recherche catalogue échec:', err)
    }
  }
  if (catalogMatch) {
    return NextResponse.json(
      {
        success: true,
        catalogMatch,
        message: 'Nous avons trouvé ce produit dans notre catalogue !'
      },
      { status: 200 }
    )
  }

  // Génération identifiants uniques (rejouer si collision improbable)
  let reference = generateSourcingReference()
  let attempts = 0
  while ((await SourcingRequest.exists({ reference })) && attempts < 5) {
    reference = generateSourcingReference()
    attempts++
  }

  const slaDueAt = computeSlaDueAt(new Date())
  const publicToken = generatePublicToken()

  const qty = safeNumber(payload.qty, { min: 1, max: 100000, default: 1 }) || 1
  const budgetMaxFCFA = safeNumber(payload.budgetMaxFCFA, { min: 0 })
  let deliveryNeededBy: Date | undefined
  if (payload.deliveryNeededBy) {
    const d = new Date(payload.deliveryNeededBy)
    if (!Number.isNaN(d.getTime()) && d.getTime() > Date.now()) {
      deliveryNeededBy = d
    }
  }

  const doc = await SourcingRequest.create({
    userId: authUserId,
    contactPhone: phone,
    contactName: (payload.contactName || authUserName || '').toString().trim().slice(0, 100) || undefined,
    contactEmail: (payload.contactEmail || authUserEmail || '').toString().trim().toLowerCase().slice(0, 150) || undefined,
    isAnonymous: !authUserId,

    source: payload.source,
    imageUrl,
    imageHash,
    externalUrl: payload.externalUrl?.toString().trim().slice(0, 1000),
    title: payload.title?.toString().trim().slice(0, 200) || undefined,
    description,
    qty,
    budgetMaxFCFA,
    deliveryNeededBy,
    categoryHint: payload.categoryHint?.toString().trim().slice(0, 100) || undefined,

    status: 'new',
    slaDueAt,
    publicToken,
    reference,
    catalogMatches: []
  })

  // SMS de confirmation (best-effort, on n'échoue pas la requête en cas d'erreur SMS)
  const baseUrl = await buildBaseSiteUrl(request)
  const trackUrl = `${baseUrl}/market/sourcing/${publicToken}`
  const smsBody =
    `IT Vision Market — Demande ${reference} reçue. ` +
    `Nous vous proposons un prix livré sous 24h max. ` +
    `Suivi : ${trackUrl}`
  try {
    await sendSms(phone, smsBody)
  } catch (err) {
    console.warn('[sourcing] SMS confirmation échec:', err)
  }

  return NextResponse.json(
    {
      success: true,
      request: {
        id: String(doc._id),
        reference: doc.reference,
        publicToken: doc.publicToken,
        status: doc.status,
        slaDueAt: doc.slaDueAt,
        trackUrl
      }
    },
    { status: 201 }
  )
}

export async function GET(request: NextRequest) {
  try {
    const token = extractAuthToken(request)
    if (!token) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    const decoded = await verifyAuthToken(token)

    await connectMongoose()
    const items = await SourcingRequest.find({ userId: decoded.userId })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean()

    return NextResponse.json({
      success: true,
      items: items.map(r => ({
        id: String(r._id),
        reference: r.reference,
        publicToken: r.publicToken,
        status: r.status,
        title: r.title,
        description: r.description,
        source: r.source,
        imageUrl: r.imageUrl,
        externalUrl: r.externalUrl,
        qty: r.qty,
        slaDueAt: r.slaDueAt,
        createdAt: r.createdAt,
        proposal: r.proposal
          ? {
              productName: r.proposal.productName,
              productImage: r.proposal.productImage,
              totalClientPrice: r.proposal.totalClientPrice,
              currency: r.proposal.currency,
              deliveryDays: r.proposal.deliveryDays,
              expiresAt: r.proposal.expiresAt
            }
          : null
      }))
    })
  } catch (err: any) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  }
}

// ── Helpers recherche catalogue ──────────────────────────────────────────────

const CATALOG_MATCH_THRESHOLD = 75 // doit correspondre à HIGH_CONFIDENCE_SCORE

async function findCatalogMatchByImage(queryEmbedding: ImageEmbedding, description?: string): Promise<any | null> {
  const products = await Product.find({
    isPublished: true,
    imageEmbedding: { $exists: true, $ne: null }
  })
    .select('name image category priceAmount currency slug imageEmbedding tags')
    .lean()

  let best: any = null
  let bestScore = 0

  for (const p of products as any[]) {
    if (!isValidEmbedding(p.imageEmbedding)) continue
    const visualScore = Math.round((1 - hammingDistance(queryEmbedding, p.imageEmbedding as ImageEmbedding)) * 100)
    const colorScore = Math.round(colorSimilarity(queryEmbedding, p.imageEmbedding as ImageEmbedding) * 100)
    let finalScore = Math.round(visualScore * 0.7 + colorScore * 0.3)
    // Boost catégorie basé sur la description
    finalScore = Math.min(100, finalScore + computeSourcingBoost(p, description))
    if (finalScore > bestScore) {
      bestScore = finalScore
      best = { product: p, visualScore, colorScore, finalScore }
    }
  }

  if (!best || bestScore < CATALOG_MATCH_THRESHOLD) return null

  const p = best.product
  return {
    id: String(p._id),
    name: p.name,
    image: p.image,
    category: p.category,
    price: p.price,
    currency: p.currency,
    visualScore: best.visualScore,
    colorScore: best.colorScore,
    finalScore: best.finalScore
  }
}

function computeSourcingBoost(p: any, description?: string): number {
  if (!description || !p) return 0
  const terms = description.toLowerCase().split(/\s+/).filter((t: string) => t.length >= 2)
  if (terms.length === 0) return 0
  const searchable = [
    String(p.name || ''),
    String(p.category || ''),
    ...(Array.isArray(p.tags) ? p.tags.map(String) : [])
  ].join(' ').toLowerCase()
  let matches = 0
  for (const term of terms) {
    if (searchable.includes(term)) matches++
  }
  return Math.round((matches / terms.length) * 20)
}
