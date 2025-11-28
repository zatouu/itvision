import { NextRequest, NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { connectMongoose } from '@/lib/mongoose'
import Intervention from '@/lib/models/Intervention'
import Quote from '@/lib/models/Quote'
import Product from '@/lib/models/Product'
import User from '@/lib/models/User'
import Project from '@/lib/models/Project'
import Technician from '@/lib/models/Technician'
import { addNotification } from '@/lib/notifications-memory'
import jwt from 'jsonwebtoken'

function requireAuth(request: NextRequest) {
  const token = request.cookies.get('auth-token')?.value || request.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return { ok: false, status: 401, error: 'Non authentifié' as const, userId: null }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as any
    const role = String(decoded.role || '').toUpperCase()
    const allowed = ['ADMIN','TECHNICIAN','PRODUCT_MANAGER'].includes(role)
    if (!allowed) return { ok: false, status: 403, error: 'Accès refusé' as const, userId: null }
    return { ok: true, userId: decoded.id || decoded.userId }
  } catch {
    return { ok: false, status: 401, error: 'Token invalide' as const, userId: null }
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectMongoose()
    const auth = requireAuth(request)
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })
    
    const body = await request.json()
    const { 
      technicienId, clientId, projectId, date, heureDebut, heureFin, 
      typeIntervention, description, activites, observations, 
      recommandations, photosAvant, photosApres, 
      site, signatures, gpsLocation, status, priority 
    } = body || {}
    
    if (!clientId || !date || !technicienId || !typeIntervention) {
      return NextResponse.json({ error: 'Champs obligatoires manquants' }, { status: 400 })
    }

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
      date: new Date(date),
      heureDebut,
      heureFin,
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
      status: status || 'soumis',
      priority: priority || 'medium',
      title: `Intervention ${typeIntervention}`,
      service: typeIntervention
    })
    
    // Ajouter entrée historique
    if (intervention.addHistoryEntry) {
      intervention.addHistoryEntry('created', technicienId, { status: intervention.status })
      await intervention.save()
    }

    // Génération automatique de devis si recommandations et status = 'soumis'
    let generatedQuote = null
    const hasRecommendations = recommandations && Array.isArray(recommandations) && recommandations.length > 0
    
    if (hasRecommendations && status === 'soumis') {
      try {
        // Récupérer les informations des produits recommandés
        const productPromises = recommandations.map(async (rec: any) => {
          const product = await Product.findOne({ name: new RegExp(rec.produit, 'i') }).lean()
          const productData = product && !Array.isArray(product) ? product : null
          return {
            productId: productData?._id || 'UNKNOWN',
            name: rec.produit,
            quantity: rec.quantite || 1,
            unitPrice: productData?.price || productData?.priceAmount || 0,
            marginRate: productData?.marginRate || 30,
            totalPrice: (productData?.price || productData?.priceAmount || 0) * (rec.quantite || 1),
            commentaire: rec.commentaire
          }
        })
        
        const products = await Promise.all(productPromises)
        
        // Calculer les totaux
        const subtotal = products.reduce((sum, p) => sum + p.totalPrice, 0)
        const marginTotal = products.reduce((sum, p) => sum + (p.totalPrice * (p.marginRate / 100)), 0)
        const totalHT = subtotal + marginTotal
        const totalTTC = totalHT * 1.18 // TVA 18%
        
        // Créer le devis
        const quote = await Quote.create({
          clientId,
          projectId: projectId || undefined,
          serviceCode: typeIntervention.toUpperCase(),
          status: 'draft',
          products: products.map(p => ({
            productId: String(p.productId),
            name: p.name,
            quantity: p.quantity,
            unitPrice: p.unitPrice,
            marginRate: p.marginRate,
            totalPrice: p.totalPrice
          })),
          subtotal,
          marginTotal,
          totalHT,
          totalTTC,
          currency: 'Fcfa',
          assignedTechnicianId: technicienId,
          notes: `Devis généré automatiquement depuis l'intervention ${intervention.interventionNumber || intervention._id}\n\nObservations: ${observations || 'N/A'}`
        })
        
        // Lier le devis à l'intervention
        intervention.quoteId = quote._id as mongoose.Types.ObjectId
        intervention.quoteGenerated = true
        await intervention.save()
        
        generatedQuote = {
          id: String(quote._id),
          totalTTC: quote.totalTTC,
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

