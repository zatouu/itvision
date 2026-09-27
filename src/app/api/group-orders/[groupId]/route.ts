import { NextRequest, NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { GroupOrder } from '@/lib/models/GroupOrder'
import Product from '@/lib/models/Product'
import { connectDB } from '@/lib/db'
import { validatePhone, formatPhone } from '@/lib/payment-service'
import { requireAdminApi } from '@/lib/api-auth'
import { applyRateLimit, serviceWriteRateLimiter } from '@/lib/rate-limiter'
import { computeEffectivePricing } from '@/lib/pricing/quote-cart'
import { 
  notifyGroupJoinConfirmation, 
  notifyNewParticipant, 
  notifyStatusUpdate 
} from '@/lib/group-order-notifications'
import { assignPaymentRefsAndNotify } from '@/lib/group-order-helpers'
import crypto from 'crypto'
import { readPaymentSettings } from '@/lib/payments/settings'
import { setAuthCookie } from '@/lib/auth-server'
import { resolveGuestOrAuthUser } from '@/lib/guest-checkout'
import { buildGroupOrderPaymentSummary } from '@/lib/group-order-payment-summary'
import { syncChinaPurchaseFromGroupOrder } from '@/lib/china-purchase'
import { creditGrainsForGroupJoin, creditGroupCompleteToParticipants, updateTierFromBalance } from '@/lib/grains'
import { sanitizePublicGroupDetail } from '@/lib/group-orders/public-group'
import { normalizeVariantGroups } from '@/lib/catalog-format'
import { invalidateGroupOrdersCache } from '@/lib/catalog-cache'
import { groupParticipantUnitPrice, validateGroupVariantSelection } from '@/lib/group-orders/pricing'

function hashChatToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex')
}

/**
 * Branches `$switch` pour le recalcul de prix dans le pipeline d'update :
 * chaque combinaison de variantes observée (ids joints par « | ») → facteur
 * d'échelle appliqué au palier de base. Les combinaisons non listées gardent
 * leur prix courant (voir `$ifNull` dans l'expression) : un join concurrent
 * n'est jamais écrasé avec un prix faux.
 */
function buildVariantScaleBranches(
  product: any,
  combos: (string[] | undefined)[]
): { case: any; then: number }[] {
  if (!product) return []
  const hasGroups = (Array.isArray(product.variantGroups) ? product.variantGroups : [])
    .some((g: any) => Array.isArray(g?.variants) && g.variants.length > 0)
  if (!hasGroups) return []

  const base = computeEffectivePricing(product, undefined).displayPrice
  const seen = new Set<string>()
  const branches: { case: any; then: number }[] = []

  for (const ids of combos) {
    const list = (ids || []).filter(Boolean)
    if (list.length === 0) continue
    const eff = computeEffectivePricing(product, list).displayPrice
    const scale = base > 0 ? Math.round((eff / base) * 10000) / 10000 : 1
    // L'ordre des ids stockés peut différer de l'ordre trié : couvrir les deux.
    for (const key of new Set([[...list].sort().join('|'), list.join('|')])) {
      if (seen.has(key)) continue
      seen.add(key)
      branches.push({
        case: { $eq: [{ $join: { input: { $ifNull: ['$$p.variantIds', []] }, on: '|' } }, key] },
        then: scale,
      })
    }
  }
  return branches
}

interface RouteContext {
  params: Promise<{ groupId: string }>
}

// GET - Détails d'un achat groupé
export async function GET(
  req: NextRequest,
  context: RouteContext
) {
  const { groupId } = await context.params
  
  try {
    await connectDB()
    
    const group = await GroupOrder.findOne({ groupId })
      // Public response: do not leak participant PII / payment details / chat tokens
      .select(
        '-participants.phone -participants.email -participants.paidAmount -participants.paymentReference -participants.transactionId -participants.adminNote -participants.paymentUpdatedAt -participants.chatAccessTokenHash -participants.chatAccessTokenCreatedAt'
      )
      .lean()
    
    if (!group) {
      return NextResponse.json(
        { success: false, error: 'Achat groupé non trouvé' },
        { status: 404 }
      )
    }

    // Exposer les variantes du produit (prix client normalisés) pour le
    // sélecteur de la page de join — flag explicite pour le front.
    let variantGroups: any[] = []
    const groupProductId = (group as any).product?.productId
    if (groupProductId) {
      const groupProduct = await Product.findById(groupProductId)
        .select('variantGroups marginRate exchangeRate')
        .lean() as any
      if (groupProduct) variantGroups = normalizeVariantGroups(groupProduct)
    }

    return NextResponse.json({
      success: true,
      group: {
        ...sanitizePublicGroupDetail(group),
        variantGroups,
        requiresVariant: variantGroups.length > 0,
      }
    })
    
  } catch (error) {
    console.error('Erreur récupération achat groupé:', error)
    return NextResponse.json(
      { success: false, error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}

// POST - Rejoindre un achat groupé
export async function POST(
  req: NextRequest,
  context: RouteContext
) {
  const { groupId } = await context.params
  
  try {
    const rateLimitResponse = await applyRateLimit(req, serviceWriteRateLimiter)
    if (rateLimitResponse) return rateLimitResponse

    const body = await req.json()
    const qty = Number(body?.qty)
    const name = typeof body?.name === 'string' ? body.name.trim() : ''
    const phone = typeof body?.phone === 'string' ? body.phone.trim() : ''
    const email = typeof body?.email === 'string' ? body.email.trim() : undefined

    let auth: { userId: string; role: string; email?: string; name?: string; phone?: string; isNew?: boolean; token?: string; requiresVerification?: boolean }
    try {
      auth = await resolveGuestOrAuthUser(req, { name, phone, email })
    } catch (e) {
      return NextResponse.json({ success: false, error: e instanceof Error ? e.message : 'Non authentifié' }, { status: 401 })
    }

    const settings = readPaymentSettings()
    if (!settings.groupOrders.enabled) {
      return NextResponse.json(
        { success: false, error: 'Les achats groupés sont temporairement désactivés' },
        { status: 503 }
      )
    }
    const groupRules = settings.groupOrders.rules

    await connectDB()

    if (!name || !phone || !Number.isFinite(qty) || !Number.isInteger(qty)) {
      return NextResponse.json(
        { success: false, error: 'Données manquantes: name, phone, qty requis' },
        { status: 400 }
      )
    }

    if (qty < groupRules.minJoinQty) {
      return NextResponse.json(
        { success: false, error: `Quantité invalide: minimum ${groupRules.minJoinQty}` },
        { status: 400 }
      )
    }

    if (qty > groupRules.maxJoinQtyPerParticipant) {
      return NextResponse.json(
        { success: false, error: `Quantité invalide: maximum ${groupRules.maxJoinQtyPerParticipant}` },
        { status: 400 }
      )
    }

    if (!validatePhone(phone)) {
      return NextResponse.json(
        { success: false, error: 'Numéro de téléphone invalide' },
        { status: 400 }
      )
    }
    
    const group = await GroupOrder.findOne({ groupId })
    
    if (!group) {
      return NextResponse.json(
        { success: false, error: 'Achat groupé non trouvé' },
        { status: 404 }
      )
    }
    
    // Vérifications
    if (group.status !== 'open') {
      return NextResponse.json(
        { success: false, error: 'Cet achat groupé n\'est plus ouvert aux inscriptions' },
        { status: 400 }
      )
    }
    
    if (new Date(group.deadline) < new Date()) {
      return NextResponse.json(
        { success: false, error: 'La date limite est dépassée' },
        { status: 400 }
      )
    }

    // Charger le produit pour valider la sélection de variante et calculer
    // le prix participant (paliers groupe mis à l'échelle de la variante).
    const groupProductId = (group as any).product?.productId
    const groupProduct = groupProductId
      ? await Product.findById(groupProductId)
          .select('variantGroups priceTiers price baseCost price1688 marginRate exchangeRate b2bPrice')
          .lean() as any
      : null

    const rawVariantIds = Array.isArray(body?.variantIds) ? body.variantIds : (body?.variantId ? [body.variantId] : [])
    if (!groupProduct && rawVariantIds.length > 0) {
      return NextResponse.json(
        { success: false, error: 'Produit introuvable — impossible de valider la variante' },
        { status: 400 }
      )
    }
    const variantSelection = groupProduct
      ? validateGroupVariantSelection(groupProduct, rawVariantIds)
      : { variantIds: [], variantLabels: [] }
    if ('error' in variantSelection) {
      return NextResponse.json(
        { success: false, error: variantSelection.error },
        { status: 400 }
      )
    }

    const normalizedPhone = formatPhone(phone)
    const now = new Date()

    // ── Claim atomique du slot ─────────────────────────────────────────────
    // L'ancien read-modify-write (findOne → push → save) perdait des
    // participants et dépassait maxQty/maxParticipants sous concurrence.
    // Ici tout est vérifié DANS le filtre et l'écriture est un pipeline Mongo
    // unique : unicité, capacité, prix et statut sont cohérents ou rien.
    const participantLimit =
      typeof group.maxParticipants === 'number' && group.maxParticipants > 0
        ? group.maxParticipants
        : groupRules.maxParticipantsPerGroup

    const newTotalQty = group.currentQty + qty
    const tierPriceAtNewQty = (() => {
      if (group.priceTiers && group.priceTiers.length > 0) {
        const sortedTiers = [...group.priceTiers].sort((a: any, b: any) => b.minQty - a.minQty)
        for (const tier of sortedTiers) {
          if (newTotalQty >= tier.minQty) return tier.price
        }
      }
      return group.product.basePrice
    })()
    // Prix de CE participant : paliers du groupe mis à l'échelle de sa variante
    const participantUnitPrice = groupProduct
      ? groupParticipantUnitPrice(groupProduct, group.product.basePrice, group.priceTiers, variantSelection.variantIds, newTotalQty)
      : tierPriceAtNewQty

    const chatToken = crypto.randomBytes(24).toString('hex')
    const participantId = new mongoose.Types.ObjectId()
    // Les clés optionnelles ne sont ajoutées que si elles ont une valeur : un
    // `undefined` passé à un pipeline d'update est sérialisé en `null` par le
    // driver (userId: null casserait le rattachement et les checks d'unicité).
    const participantDoc: any = {
      _id: participantId,
      name,
      phone: normalizedPhone,
      qty,
      unitPrice: participantUnitPrice,
      totalAmount: qty * participantUnitPrice,
      paidAmount: 0,
      paymentStatus: 'pending',
      chatAccessTokenHash: hashChatToken(chatToken),
      chatAccessTokenCreatedAt: now,
      joinedAt: now
    }
    if (auth.userId) participantDoc.userId = new mongoose.Types.ObjectId(auth.userId)
    if (email) participantDoc.email = email
    if (variantSelection.variantIds.length > 0) {
      participantDoc.variantIds = variantSelection.variantIds
      participantDoc.variantLabels = variantSelection.variantLabels
    }

    const claimFilter: any = {
      groupId,
      status: 'open',
      deadline: { $gte: now },
      'participants.phone': { $ne: normalizedPhone },
    }
    if (auth.userId) {
      claimFilter['participants.userId'] = { $ne: new mongoose.Types.ObjectId(auth.userId) }
    }

    const exprGuards: any[] = []
    if (typeof group.maxQty === 'number' && group.maxQty > 0) {
      exprGuards.push({ $lte: [{ $add: ['$currentQty', qty] }, '$maxQty'] })
    }
    if (participantLimit > 0) {
      exprGuards.push({ $lt: [{ $size: '$participants' }, participantLimit] })
    }
    if (exprGuards.length > 0) {
      claimFilter.$expr = exprGuards.length === 1 ? exprGuards[0] : { $and: exprGuards }
    }

    // Recalcul de tous les participants au nouveau palier (règle « plus on est
    // nombreux, moins c'est cher ») — échelle par variante pré-calculée.
    // Le prix de palier est calculé DANS le pipeline à partir du currentQty
    // réellement écrit : deux joins concurrents ne peuvent pas figer un palier
    // périmé (lecture pré-claim) sur l'ensemble des participants.
    const variantScaleBranches = buildVariantScaleBranches(groupProduct, [
      variantSelection.variantIds,
      ...group.participants.map((p: any) => p.variantIds),
    ])

    const tierPriceExpr: any = {
      $let: {
        vars: {
          tiers: { $sortArray: { input: { $ifNull: ['$priceTiers', []] }, sortBy: { minQty: -1 } } },
        },
        in: {
          $ifNull: [
            {
              $first: {
                $map: {
                  input: {
                    $filter: {
                      input: '$$tiers',
                      as: 't',
                      cond: { $lte: ['$$t.minQty', '$currentQty'] },
                    },
                  },
                  as: 't',
                  in: '$$t.price',
                },
              },
            },
            '$product.basePrice',
          ],
        },
      },
    }

    const unitPriceExpr: any = variantScaleBranches.length > 0
      ? {
          $ifNull: [
            {
              $round: [
                { $multiply: [tierPriceExpr, { $switch: { branches: variantScaleBranches, default: null } }] },
                0,
              ],
            },
            '$$p.unitPrice',
          ],
        }
      : tierPriceExpr

    const updated = await GroupOrder.findOneAndUpdate(
      claimFilter,
      [
        {
          $set: {
            participants: { $concatArrays: ['$participants', [participantDoc]] },
            currentQty: { $add: ['$currentQty', qty] },
            updatedAt: now,
          },
        },
        {
          $set: {
            // currentQty est déjà incrémenté : le palier est celui du volume final
            currentUnitPrice: tierPriceExpr,
            participants: {
              $map: {
                input: '$participants',
                as: 'p',
                in: {
                  $mergeObjects: [
                    '$$p',
                    {
                      unitPrice: unitPriceExpr,
                      totalAmount: { $multiply: ['$$p.qty', unitPriceExpr] },
                    },
                  ],
                },
              },
            },
          },
        },
        {
          $set: {
            status: {
              $cond: [
                {
                  $and: [
                    { $eq: ['$status', 'open'] },
                    { $eq: [groupRules.autoFillOnTargetReached, true] },
                    {
                      $or: [
                        { $gte: ['$currentQty', '$targetQty'] },
                        {
                          $and: [
                            { $gt: [{ $ifNull: ['$maxQty', 0] }, 0] },
                            { $gte: ['$currentQty', '$maxQty'] },
                          ],
                        },
                      ],
                    },
                  ],
                },
                'filled',
                '$status',
              ],
            },
          },
        },
      ],
      { new: true }
    )

    // Le claim a échoué : relire l'état pour renvoyer la raison exacte
    // (course perdue contre un autre join, groupe fermé, capacité atteinte…).
    if (!updated) {
      const current = await GroupOrder.findOne({ groupId }).lean() as any
      if (!current) {
        return NextResponse.json({ success: false, error: 'Achat groupé non trouvé' }, { status: 404 })
      }
      if (current.status !== 'open') {
        return NextResponse.json({ success: false, error: 'Cet achat groupé n\'est plus ouvert aux inscriptions' }, { status: 400 })
      }
      if (new Date(current.deadline) < new Date()) {
        return NextResponse.json({ success: false, error: 'La date limite est dépassée' }, { status: 400 })
      }
      const already = (current.participants || []).some(
        (p: any) =>
          formatPhone(p.phone) === normalizedPhone ||
          (auth.userId && p?.userId && String(p.userId) === String(auth.userId))
      )
      if (already) {
        return NextResponse.json({ success: false, error: 'Vous participez déjà à cet achat groupé' }, { status: 400 })
      }
      if (typeof current.maxQty === 'number' && current.maxQty > 0 && current.currentQty + qty > current.maxQty) {
        const remaining = current.maxQty - current.currentQty
        return NextResponse.json(
          { success: false, error: `Quantité max dépassée. Il reste ${remaining} unité(s) disponible(s).` },
          { status: 400 }
        )
      }
      const currentLimit =
        typeof current.maxParticipants === 'number' && current.maxParticipants > 0
          ? current.maxParticipants
          : groupRules.maxParticipantsPerGroup
      if (currentLimit > 0 && (current.participants?.length || 0) >= currentLimit) {
        return NextResponse.json({ success: false, error: 'Nombre maximum de participants atteint' }, { status: 400 })
      }
      return NextResponse.json(
        { success: false, error: 'Inscription impossible pour le moment, réessayez' },
        { status: 409 }
      )
    }

    const objectiveJustReached = updated.status === 'filled' && group.status === 'open'
    void invalidateGroupOrdersCache()

    // Créditer les grains de fidélité (best effort) — uniquement si identifié
    try {
      if (auth.userId) {
        await creditGrainsForGroupJoin(auth.userId, groupId)
        if (objectiveJustReached) {
          await creditGroupCompleteToParticipants(updated)
        }
        await updateTierFromBalance(auth.userId)
      }
    } catch (grainsErr) {
      console.error('[grains] Erreur crédit grains participation groupe:', grainsErr)
    }

    const createdParticipant: any = (updated.participants as any[])
      .find((p: any) => String(p._id) === String(participantId))
    const chatParticipantId = createdParticipant?._id ? String(createdParticipant._id) : null
    // Prix réellement écrit par le pipeline (palier du volume final) — la
    // valeur JS pré-claim peut être périmée en cas de joins concurrents.
    const finalUnitPrice = Number(createdParticipant?.unitPrice ?? participantUnitPrice)
    const finalTotalAmount = Number(createdParticipant?.totalAmount ?? qty * participantUnitPrice)
    
    // Envoyer les notifications
    try {
      const groupData = {
        groupId: updated.groupId,
        product: updated.product,
        currentQty: updated.currentQty,
        targetQty: updated.targetQty,
        currentUnitPrice: updated.currentUnitPrice,
        deadline: updated.deadline
      }
      
      const newParticipantData = { name, phone: normalizedPhone, email, qty, unitPrice: finalUnitPrice, totalAmount: finalTotalAmount }
      
      // 1. Confirmation au nouveau participant
      await notifyGroupJoinConfirmation(newParticipantData, groupData)
      
      // 2. Notifier les autres participants
      const otherParticipants = (updated.participants as any[])
        .filter((p: any) => p.phone !== normalizedPhone)
        .map((p: any) => ({ name: p.name, email: p.email, phone: p.phone, qty: p.qty, unitPrice: p.unitPrice, totalAmount: p.totalAmount }))
      
      if (otherParticipants.length > 0) {
        await notifyNewParticipant(otherParticipants, newParticipantData, groupData)
      }
      
      // 3. Si objectif atteint : générer les refs de paiement + envoyer liens à tous
      if (objectiveJustReached) {
        await assignPaymentRefsAndNotify(updated)
      }
    } catch (notifError) {
      console.error('Erreur notifications:', notifError)
    }
    
    // Réponse publique : participants masqués, sans montants ni statut paiement
    const safeGroup = sanitizePublicGroupDetail(updated.toObject ? updated.toObject() : updated)

    const response = NextResponse.json({
      success: true,
      message: 'Vous avez rejoint l\'achat groupé avec succès',
      group: safeGroup,
      yourParticipation: {
        qty,
        unitPrice: finalUnitPrice,
        totalAmount: finalTotalAmount,
        variantLabels: variantSelection.variantLabels.length > 0 ? variantSelection.variantLabels : undefined
      },
      chat: {
        token: chatToken,
        participantId: chatParticipantId
      },
      isNewAccount: auth.isNew || false,
      // Contact déjà rattaché à un compte : inscription faite en invité, sans
      // session — le front invite à se connecter pour la retrouver dans « Mon compte ».
      accountExists: auth.requiresVerification === true,
    })

    if (auth.token) {
      setAuthCookie(response, auth.token)
    }

    return response

  } catch (error) {
    console.error('Erreur participation achat groupé:', error)
    return NextResponse.json(
      { success: false, error: 'Erreur lors de l\'inscription' },
      { status: 500 }
    )
  }
}

// PATCH - Modifier un achat groupé (admin)
export async function PATCH(
  req: NextRequest,
  context: RouteContext
) {
  const { groupId } = await context.params
  
  try {
    const auth = await requireAdminApi(req)
    if (!auth.ok) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
    }

    await connectDB()
    
    const body = await req.json()
    const updateData: any = {}
    
    // Champs modifiables
    if (body.status) {
      const allowedStatuses = ['draft', 'open', 'filled', 'ordering', 'ordered', 'shipped', 'delivered', 'cancelled']
      if (!allowedStatuses.includes(body.status)) {
        return NextResponse.json(
          { success: false, error: 'status invalide' },
          { status: 400 }
        )
      }
      updateData.status = body.status
    }
    if (body.deadline) updateData.deadline = new Date(body.deadline)
    if (body.shippingMethod) updateData.shippingMethod = body.shippingMethod
    if (body.shippingCostPerUnit !== undefined) updateData.shippingCostPerUnit = body.shippingCostPerUnit
    if (body.description !== undefined) updateData.description = body.description
    if (body.internalNotes !== undefined) updateData.internalNotes = body.internalNotes
    if (body.linkedOrderId) updateData.linkedOrderId = body.linkedOrderId
    if (body.estimatedDelivery) updateData.estimatedDelivery = new Date(body.estimatedDelivery)
    
    // Mise à jour paiement d'un participant
    if (body.participantPhone && body.paymentUpdate) {
      const group = await GroupOrder.findOne({ groupId })
      if (group) {
        const formattedPhone = formatPhone(body.participantPhone)
        const participant = group.participants.find(
          (p: any) => formatPhone(p.phone) === formattedPhone
        )
        if (participant) {
          if (
            body.paymentUpdate.paymentStatus &&
            !['pending', 'partial', 'paid', 'refunded'].includes(body.paymentUpdate.paymentStatus)
          ) {
            return NextResponse.json(
              { success: false, error: 'paymentStatus invalide' },
              { status: 400 }
            )
          }

          if (body.paymentUpdate.paidAmount !== undefined) {
            const nextPaidAmount = Number(body.paymentUpdate.paidAmount)
            if (!Number.isFinite(nextPaidAmount) || nextPaidAmount < 0) {
              return NextResponse.json(
                { success: false, error: 'paidAmount invalide' },
                { status: 400 }
              )
            }
            if (typeof participant.totalAmount === 'number' && nextPaidAmount > participant.totalAmount) {
              return NextResponse.json(
                { success: false, error: 'paidAmount ne peut pas dépasser totalAmount' },
                { status: 400 }
              )
            }
            participant.paidAmount = nextPaidAmount
          }
          if (body.paymentUpdate.paymentStatus) {
            participant.paymentStatus = body.paymentUpdate.paymentStatus
          }
          await group.save()
          return NextResponse.json({
            success: true,
            message: 'Paiement mis à jour',
            group
          })
        }
      }
    }
    
    updateData.updatedAt = new Date()
    
    // Récupérer le groupe avant mise à jour pour comparer le statut
    const previousGroup = await GroupOrder.findOne({ groupId }).lean() as any
    if (!previousGroup) {
      return NextResponse.json(
        { success: false, error: 'Achat groupé non trouvé' },
        { status: 404 }
      )
    }
    const previousStatus = previousGroup?.status

    if (
      ['ordering', 'ordered'].includes(body.status) &&
      previousStatus !== body.status
    ) {
      const participants = Array.isArray(previousGroup?.participants) ? previousGroup.participants : []
      const unpaidParticipants = participants
        .filter((p: any) => p.paymentStatus !== 'paid')
        .map((p: any) => ({
          name: p.name,
          phone: p.phone,
          paymentStatus: p.paymentStatus,
          totalAmount: Number(p.totalAmount) || 0,
          paidAmount: Number(p.paidAmount) || 0,
          remainingAmount: Math.max(0, (Number(p.totalAmount) || 0) - (Number(p.paidAmount) || 0))
        }))

      if (unpaidParticipants.length > 0 && body.forceOrderingWithUnpaid !== true) {
        return NextResponse.json(
          {
            success: false,
            error: 'Des participants n’ont pas encore payé',
            requiresConfirmation: true,
            paymentSummary: buildGroupOrderPaymentSummary(previousGroup),
            unpaidParticipants
          },
          { status: 409 }
        )
      }
    }

    if (body.status && ['ordering', 'ordered', 'shipped', 'delivered', 'cancelled'].includes(body.status)) {
      const chinaPurchase = await syncChinaPurchaseFromGroupOrder(previousGroup, body.status)
      if (chinaPurchase) {
        updateData.chinaPurchase = chinaPurchase
      }
    }
    
    const group = await GroupOrder.findOneAndUpdate(
      { groupId },
      updateData,
      { new: true }
    ).lean() as any
    void invalidateGroupOrdersCache()
    
    if (!group) {
      return NextResponse.json(
        { success: false, error: 'Achat groupé non trouvé' },
        { status: 404 }
      )
    }
    
    // Envoyer notification si le statut a changé
    if (body.status && body.status !== previousStatus) {
      try {
        const participants = group.participants.map((p: any) => ({
          name: p.name, email: p.email, phone: p.phone, qty: p.qty, unitPrice: p.unitPrice, totalAmount: p.totalAmount
        }))
        const groupData = {
          groupId: group.groupId,
          product: group.product,
          currentQty: group.currentQty,
          targetQty: group.targetQty,
          currentUnitPrice: group.currentUnitPrice,
          deadline: group.deadline
        }
        await notifyStatusUpdate(participants, groupData, body.status, body.statusMessage)

        // Si passage à 'filled' → générer refs paiement + envoyer liens checkout
        if (body.status === 'filled') {
          const groupDoc = await GroupOrder.findOne({ groupId })
          if (groupDoc) {
            await assignPaymentRefsAndNotify(groupDoc)
          }
        }
      } catch (notifError) {
        console.error('Erreur notification statut:', notifError)
      }
    }
    
    return NextResponse.json({
      success: true,
      message: 'Achat groupé mis à jour',
      group
    })
    
  } catch (error) {
    console.error('Erreur modification achat groupé:', error)
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la modification' },
      { status: 500 }
    )
  }
}

// DELETE - Supprimer un achat groupé
export async function DELETE(
  req: NextRequest,
  context: RouteContext
) {
  const { groupId } = await context.params
  
  try {
    const auth = await requireAdminApi(req)
    if (!auth.ok) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
    }

    await connectDB()
    
    const group = await GroupOrder.findOne({ groupId })
    
    if (!group) {
      return NextResponse.json(
        { success: false, error: 'Achat groupé non trouvé' },
        { status: 404 }
      )
    }
    
    // Ne pas supprimer si des paiements ont été effectués
    const hasPaidParticipants = group.participants.some((p: any) => p.paidAmount > 0)
    if (hasPaidParticipants) {
      return NextResponse.json(
        { success: false, error: 'Impossible de supprimer: des paiements ont été effectués' },
        { status: 400 }
      )
    }
    
    await GroupOrder.deleteOne({ groupId })
    
    return NextResponse.json({
      success: true,
      message: 'Achat groupé supprimé'
    })
    
  } catch (error) {
    console.error('Erreur suppression achat groupé:', error)
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la suppression' },
      { status: 500 }
    )
  }
}
