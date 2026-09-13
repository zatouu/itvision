import { NextRequest, NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { connectMongoose } from '@/lib/mongoose'
import Intervention from '@/lib/models/Intervention'
import AdminQuote from '@/lib/models/AdminQuote'
import Client from '@/lib/models/Client'
import Technician from '@/lib/models/Technician'
import { internalPost } from '@/lib/internal-auth'
import { generateQuoteNumero } from '@/lib/quote-number'
import { addNotification } from '@/lib/notifications-memory'
import { requireAuth } from '@/lib/jwt'

async function requireInterventionSubmitAccess(request: NextRequest) {
  try {
    const { role, userId } = await requireAuth(request)
    const allowed = ['ADMIN', 'TECHNICIAN', 'PRODUCT_MANAGER'].includes(role)
    if (!allowed) return { ok: false as const, status: 403, error: 'Accès refusé' as const, userId: null }
    return { ok: true as const, userId }
  } catch {
    return { ok: false as const, status: 401, error: 'Non authentifié' as const, userId: null }
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectMongoose()
    const auth = await requireInterventionSubmitAccess(request)
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

    const body = await request.json()
    const {
      technicienId: bodyTechnicienId, clientId, projectId, date, heureDebut, heureFin,
      typeIntervention, description, activites, observations,
      recommandations, photosAvant, photosApres,
      site, signatures, gpsLocation, status, priority
    } = body || {}

    // Résoudre le technicien connecté si non précisé
    let technicienId = bodyTechnicienId
    if (!technicienId && auth.userId) {
      const tech = await Technician.findOne({ userId: auth.userId }).lean() as any
      if (tech?._id) technicienId = String(tech._id)
    }

    if (!clientId || !date || !technicienId || !typeIntervention) {
      return NextResponse.json({ error: 'Champs obligatoires manquants' }, { status: 400 })
    }

    const scheduledDate = date ? new Date(date) : new Date()
    const startTime = heureDebut || '09:00'
    const durationHours = Number(body.estimatedDuration) || 2
    const computeEndTime = (start: string, duration: number) => {
      const [h, m] = start.split(':').map((part: string) => parseInt(part, 10))
      if (Number.isNaN(h) || Number.isNaN(m)) return '10:00'
      const d = new Date()
      d.setHours(h)
      d.setMinutes(m)
      d.setSeconds(0)
      d.setMilliseconds(0)
      d.setHours(d.getHours() + Math.max(duration, 1))
      return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
    }

    const statusLabels = new Set(['pending', 'scheduled', 'in_progress', 'completed', 'cancelled', 'brouillon', 'soumis'])
    const rawStatus = status && statusLabels.has(status) ? status : 'pending'
    const normalizedStatus = rawStatus === 'brouillon' ? 'pending' : (rawStatus === 'soumis' ? 'pending' : rawStatus)
    const submitted = rawStatus === 'soumis'

    // Format photos avec métadonnées si nécessaire
    const formatPhotos = (photos: any[]): any[] => {
      if (!photos || photos.length === 0) return []
      return photos.map(p => {
        if (typeof p === 'string') {
          // Format legacy : juste l'URL
          return { url: p, timestamp: new Date() }
        }
        // Format nouveau : objet avec métadonnées
        return { url: p.url || p, caption: p.caption, timestamp: p.timestamp || new Date(), gps: p.gps }
      })
    }

    // Créer l'intervention
    const intervention = await Intervention.create({
      technicienId,
      clientId,
      projectId: projectId || undefined,
      date: scheduledDate,
      scheduledDate: scheduledDate.toISOString().split('T')[0],
      scheduledTime: startTime,
      heureDebut: startTime,
      heureFin: heureFin || computeEndTime(startTime, durationHours),
      // La durée sera calculée automatiquement par le pre-save hook
      typeIntervention,
      site: site || undefined,
      description: description || '',
      activites: activites || '',
      observations: observations || '',
      recommandations: recommandations || [],
      photosAvant: formatPhotos(photosAvant || []),
      photosApres: formatPhotos(photosApres || []),
      signatures: signatures || undefined,
      gpsLocation: gpsLocation ? { ...gpsLocation, timestamp: new Date() } : undefined,
      status: normalizedStatus,
      priority: priority || 'medium',
      title: `Intervention ${typeIntervention}`,
      service: typeIntervention
    })

    // Ajouter entrée historique
    if (intervention.addHistoryEntry) {
      intervention.addHistoryEntry('created', technicienId, { status: intervention.status, submitted })
      await intervention.save()
    }

    // Génération automatique de devis si recommandations et soumission effective (status = 'soumis')
    let generatedQuote = null
    const hasRecommendations = recommandations && Array.isArray(recommandations) && recommandations.length > 0

    if (submitted && hasRecommendations) {
      try {
        // Résoudre les produits marketplace via l'API interne (frontière de domaine)
        const names = recommandations.map((rec: any) => String(rec.produit || '')).filter(Boolean)
        const lookup = await internalPost<{ results: Array<{ name: string; found: boolean; productId?: string; unitPrice?: number; marginRate?: number }> }>(
          request,
          '/api/internal/market/product-lookup',
          { names }
        )
        if (!lookup) throw new Error('Lookup produits interne indisponible — devis non généré')
        const byName = new Map((lookup.results || []).map(r => [r.name, r]))

        const products = recommandations.map((rec: any) => {
          const match = byName.get(String(rec.produit || ''))
          const unitPrice = match?.unitPrice ?? 0
          const quantity = rec.quantite || 1
          const marginRate = match?.marginRate ?? 0
          // Prix unitaire marge incluse (AdminQuote n'a pas de champ marge par ligne)
          const effectiveUnit = Math.round(unitPrice * (1 + marginRate / 100))
          return {
            productId: match?.productId,
            name: String(rec.produit || ''),
            quantity,
            unitPrice: effectiveUnit,
            total: effectiveUnit * quantity,
            commentaire: rec.commentaire
          }
        })

        // Calculer les totaux (HT = marge incluse, TTC = HT + TVA 18%)
        const totalHT = products.reduce((sum: number, p: any) => sum + p.total, 0)
        const taxAmount = Math.round(totalHT * 0.18)
        const totalTTC = totalHT + taxAmount

        // Infos client pour le devis
        const clientDoc = await Client.findById(clientId).select('name email phone address company').lean() as any
        const client = {
          name: clientDoc?.company || clientDoc?.name || 'Client',
          address: clientDoc?.address || '',
          phone: clientDoc?.phone || '',
          email: clientDoc?.email || ''
        }

        // Créer le devis (AdminQuote — visible dans /admin/quotes)
        const quote = await AdminQuote.create({
          numero: await generateQuoteNumero(),
          title: `Intervention ${String(typeIntervention).toUpperCase()}`,
          date: new Date(),
          client,
          clientCompanyId: clientId || undefined,
          projectId: projectId || undefined,
          products: products.map((p: any) => ({
            productId: p.productId || undefined,
            description: p.name,
            quantity: p.quantity,
            unitPrice: p.unitPrice,
            taxable: true,
            total: p.total
          })),
          subtotal: totalHT,
          taxAmount,
          total: totalTTC,
          status: 'draft',
          notes: `Devis généré automatiquement depuis l'intervention ${intervention.interventionNumber || intervention._id}\n\nObservations: ${observations || 'N/A'}`,
          createdBy: auth.userId ? String(auth.userId) : undefined
        })

        // Lier le devis à l'intervention
        intervention.quoteId = quote._id as mongoose.Types.ObjectId
        intervention.quoteGenerated = true
        await intervention.save()

        generatedQuote = {
          id: String(quote._id),
          totalTTC: quote.total,
          productsCount: products.length
        }
      } catch (quoteError) {
        console.error('Erreur génération devis automatique:', quoteError)
        // On ne bloque pas la création de l'intervention si le devis échoue
      }
    }

    // Notification admin
    try {
      const technician = await Technician.findById(technicienId).lean() as any
      const techName = technician?.name || 'Technicien'
      const message = generatedQuote
        ? `${techName} a soumis une intervention avec ${recommandations.length} recommandation(s) — devis automatique généré (${generatedQuote.totalTTC.toLocaleString('fr-FR')} Fcfa)`
        : hasRecommendations
        ? `${techName} a soumis une intervention avec ${recommandations.length} recommandation(s) — devis à générer par l'admin`
        : `${techName} a soumis une intervention — en attente de validation`

      addNotification({
        userId: 'admin',
        type: generatedQuote ? 'success' : 'info',
        title: generatedQuote ? 'Intervention + Devis créés' : 'Nouvelle intervention soumise',
        message,
        actionUrl: generatedQuote
          ? `/admin/quotes?id=${generatedQuote.id}`
          : `/admin/interventions?id=${intervention._id}`,
        metadata: {
          interventionId: String(intervention._id),
          interventionNumber: intervention.interventionNumber,
          technicianId: String(technicienId),
          clientId: String(clientId),
          projectId: projectId ? String(projectId) : undefined,
          hasRecommendations,
          recommendationsCount: hasRecommendations ? recommandations.length : 0,
          quoteId: generatedQuote?.id,
          quoteTotal: generatedQuote?.totalTTC
        }
      })
    } catch (notifError) {
      console.error('Erreur notification admin:', notifError)
    }

    return NextResponse.json({
      success: true,
      intervention: {
        id: String(intervention._id),
        interventionNumber: intervention.interventionNumber
      },
      quote: generatedQuote ? {
        id: generatedQuote.id,
        totalTTC: generatedQuote.totalTTC,
        productsCount: generatedQuote.productsCount,
        status: 'draft'
      } : null
    }, { status: 201 })

  } catch (error) {
    console.error('Erreur soumission intervention:', error)
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 })
  }
}

