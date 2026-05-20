import { NextRequest, NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { connectMongoose } from '@/lib/mongoose'
import MaintenanceReport from '@/lib/models/MaintenanceReport'
import MaintenanceContract from '@/lib/models/MaintenanceContract'
import { verifyJwtPayload } from '@/lib/jwt'
import { logDataAccess } from '@/lib/security-logger'

async function verifyAdminToken(request: NextRequest) {
  const token =
    request.cookies.get('auth-token')?.value ||
    request.cookies.get('admin-auth-token')?.value ||
    request.headers.get('authorization')?.replace('Bearer ', '')

  if (!token) throw new Error('Token manquant')
  const payload = await verifyJwtPayload(token)
  const normalizedRole = String((payload as any).role || '').toUpperCase()
  if (normalizedRole !== 'ADMIN' && normalizedRole !== 'SUPERVISOR') {
    throw new Error('Accès non autorisé')
  }
  logDataAccess('admin_reports', 'generate_quote', request, (payload as any).userId)
  return { ...payload, role: normalizedRole }
}

// POST — Génération automatique d'un devis depuis un rapport validé
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectMongoose()
    const adminPayload = await verifyAdminToken(request)
    const userId = (adminPayload as any).userId as string
    const { id } = await params

    const report = await MaintenanceReport.findById(id)
      .populate('technicianId', 'name')
      .populate('clientId', 'name company email')
      .populate('interventionId')
      .lean() as any

    if (!report) {
      return NextResponse.json({ error: 'Rapport introuvable' }, { status: 404 })
    }

    if (report.status !== 'validated' && report.status !== 'published') {
      return NextResponse.json(
        { error: 'Le rapport doit être validé avant de générer un devis' },
        { status: 400 }
      )
    }

    if (report.quoteGenerated) {
      return NextResponse.json(
        { error: 'Un devis a déjà été généré pour ce rapport', quoteId: report.quoteId },
        { status: 409 }
      )
    }

    // Calculer les lignes de devis à partir des travaux réalisés
    const lineItems: { description: string; quantity: number; unitPrice: number; total: number }[] = []

    // Matériel installé
    if (report.equipmentInstalled?.length > 0) {
      for (const eq of report.equipmentInstalled) {
        lineItems.push({
          description: `Matériel: ${eq.name || eq.type || 'Équipement'}`,
          quantity: eq.quantity || 1,
          unitPrice: eq.unitPrice || 0,
          total: (eq.quantity || 1) * (eq.unitPrice || 0)
        })
      }
    }

    // Main d'œuvre
    const duree = report.totalDuration || report.interventionDuration || 2
    const hourlyRate = 35000 // FCFA/h — configurable
    lineItems.push({
      description: 'Main d\'œuvre technique',
      quantity: duree,
      unitPrice: hourlyRate,
      total: duree * hourlyRate
    })

    // Dépenses additionnelles
    if (report.additionalExpenses?.length > 0) {
      for (const exp of report.additionalExpenses) {
        lineItems.push({
          description: exp.description || 'Frais annexes',
          quantity: 1,
          unitPrice: exp.amount || 0,
          total: exp.amount || 0
        })
      }
    }

    const subtotal = lineItems.reduce((sum, item) => sum + item.total, 0)
    const tvaRate = 0.18
    const tva = Math.round(subtotal * tvaRate)
    const total = subtotal + tva

    // Vérifier couverture contrat
    let contractCovered = false
    let contractRemaining = 0
    if (report.clientId?._id) {
      const contract = await MaintenanceContract.findOne({
        clientId: report.clientId._id,
        status: 'active'
      }).select('interventionsUsed interventionsLimit').lean() as any
      if (contract) {
        contractRemaining = (contract.interventionsLimit || 0) - (contract.interventionsUsed || 0)
        contractCovered = contractRemaining > 0 && subtotal <= 500000 // plafond couvert
      }
    }

    const quote = {
      reportId: report._id,
      quoteNumber: `DV-${Date.now().toString(36).toUpperCase()}`,
      clientId: report.clientId?._id,
      technicianId: report.technicianId?._id,
      generatedBy: userId,
      generatedAt: new Date(),
      lineItems,
      subtotal,
      tva,
      total,
      contractCovered,
      contractRemaining,
      status: 'draft',
      notes: report.recommendations
        ? `Recommandations: ${report.recommendations.join('; ')}`
        : undefined
    }

    // Mettre à jour le rapport
    await MaintenanceReport.updateOne(
      { _id: id },
      {
        $set: {
          quoteGenerated: true,
          quoteId: quote.quoteNumber,
          quoteGeneratedAt: new Date()
        }
      }
    )

    return NextResponse.json({
      success: true,
      quote,
      message: contractCovered
        ? `Devis généré — ${contractRemaining} interventions restantes sur contrat`
        : 'Devis généré — hors contrat'
    })

  } catch (error: any) {
    console.error('Erreur génération devis:', error)
    const status = error.message === 'Accès non autorisé' ? 403 : 500
    return NextResponse.json(
      { error: error.message || 'Erreur interne du serveur' },
      { status }
    )
  }
}
