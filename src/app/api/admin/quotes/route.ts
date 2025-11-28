import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import AdminQuote from '@/lib/models/AdminQuote'

// GET: Récupérer tous les devis
export async function GET(request: NextRequest) {
  try {
    // Autoriser l'accès pour les administrateurs (vérification côté middleware)
    await connectDB()
    
    // Récupérer tous les devis
    const quotes = await AdminQuote.find()
      .sort({ createdAt: -1 })
      .lean()

    return NextResponse.json({ quotes })
  } catch (error) {
    console.error('Erreur GET /api/admin/quotes:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des devis' },
      { status: 500 }
    )
  }
}

// POST: Créer ou mettre à jour un devis
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    await connectDB()
    
    // Créer ou mettre à jour le devis
    const quoteData = {
      numero: body.numero,
      date: new Date(body.date),
      client: body.client,
      products: body.products,
      subtotal: body.subtotal,
      brsAmount: body.brsAmount,
      taxAmount: body.taxAmount,
      other: body.other || 0,
      total: body.total,
      status: body.status || 'draft',
      notes: body.notes,
      bonCommande: body.bonCommande,
      dateLivraison: body.dateLivraison,
      conditions: body.conditions,
      createdBy: 'admin' // Sera mis à jour avec l'auth plus tard
    }

    const quote = new AdminQuote(quoteData)
    await quote.save()

    return NextResponse.json({ 
      success: true, 
      quote: quote.toObject() 
    })
  } catch (error) {
    console.error('Erreur POST /api/admin/quotes:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la sauvegarde du devis' },
      { status: 500 }
    )
  }
}

// DELETE: Supprimer un devis
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const quoteId = searchParams.get('id')

    if (!quoteId) {
      return NextResponse.json({ error: 'ID manquant' }, { status: 400 })
    }

    await connectDB()
    
    await AdminQuote.findByIdAndDelete(quoteId)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erreur DELETE /api/admin/quotes:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la suppression du devis' },
      { status: 500 }
    )
  }
}

