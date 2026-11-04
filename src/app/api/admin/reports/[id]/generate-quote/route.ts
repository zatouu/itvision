import { NextRequest, NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { connectMongoose } from '@/lib/mongoose'
import MaintenanceReport from '@/lib/models/MaintenanceReport'
import MaintenanceContract from '@/lib/models/MaintenanceContract'
import AdminQuote from '@/lib/models/AdminQuote'
import { logDataAccess } from '@/lib/security-logger'
import { requireApiUser, authErrorResponse, ADMIN_ROLES } from '@/lib/api-auth'
import { nextQuoteNumero, DEFAULT_BRS_THRESHOLD } from '@/lib/finance/billing'
import { buildReportQuoteLines, priceReportQuote } from '@/lib/finance/report-quote'

const CONTRACT_COVERAGE_CAP = 500000 // FCFA HT couverts par le contrat

// POST — Devis brouillon (AdminQuote réel) depuis un rapport validé
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  let claimedId: string | null = null
  try {
    await connectMongoose()
    const { userId } = await requireApiUser(request, ADMIN_ROLES)
    logDataAccess('admin_reports', 'generate_quote', request, userId)
    const { id } = await params

    const report = await MaintenanceReport.findById(id)
      .populate('clientId', 'name company email phone address')
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

    if (report.quoteGenerated || report.quoteId) {
      return NextResponse.json(
        { error: 'Un devis a déjà été généré pour ce rapport', quoteId: report.quoteId || report.quoteNumber },
        { status: 409 }
      )
    }

    // Réservation atomique : deux clics simultanés ne créent pas deux devis
    const claim = await MaintenanceReport.updateOne(
      { _id: report._id, quoteGenerated: { $ne: true }, quoteId: { $exists: false } },
      { $set: { quoteGenerated: true, quoteGeneratedAt: new Date() } }
    )
    if (claim.modifiedCount === 0) {
      return NextResponse.json({ error: 'Un devis a déjà été généré pour ce rapport' }, { status: 409 })
    }
    claimedId = String(report._id)

    const lines = buildReportQuoteLines(report)
    const totals = priceReportQuote(lines)

    // Couverture contrat (champs réels : coverage.interventionsIncluded / interventionsUsed)
    const client = report.clientId || {}
    const contract = client?._id
      ? await MaintenanceContract.findOne({ clientId: client._id, status: 'active' })
          .select('contractNumber coverage')
          .lean() as any
      : null
    const included = contract?.coverage?.interventionsIncluded || 0
    const used = contract?.coverage?.interventionsUsed || 0
    const contractRemaining = Math.max(0, included - used)
    const contractCovered = !!contract && contractRemaining > 0 && totals.subtotal <= CONTRACT_COVERAGE_CAP

    const notes = [
      Array.isArray(report.recommendations) && report.recommendations.length
        ? `Recommandations : ${report.recommendations.join('; ')}`
        : '',
      contractCovered ? `Intervention couverte par le contrat ${contract.contractNumber || ''} (${contractRemaining} restante(s)).` : '',
    ].filter(Boolean).join('\n')

    const quote = await AdminQuote.create({
      numero: await nextQuoteNumero(),
      title: `Maintenance — ${report.site || 'site client'}`,
      date: new Date(),
      client: {
        name: client?.company || client?.name || 'Client',
        address: client?.address || '',
        phone: client?.phone || '',
        email: client?.email || '',
      },
      // report.clientId référence le modèle Client (entreprise) : c'est le lien portail entreprise
      clientCompanyId: client?._id || undefined,
      projectId: report.projectId || undefined,
      products: totals.products.map(l => ({
        description: l.description,
        quantity: l.quantity,
        unitPrice: l.unitPrice,
        netUnitPrice: l.netUnitPrice,
        taxable: !l.isLabor,
        isLabor: l.isLabor,
        total: l.total,
      })),
      subtotal: totals.subtotal,
      applyBRS: true,
      brsThreshold: DEFAULT_BRS_THRESHOLD,
      brsAmount: totals.brsAmount,
      taxAmount: totals.taxAmount,
      other: 0,
      total: totals.total,
      status: 'draft',
      notes: notes || undefined,
      conditions: 'Devis valable 30 jours.',
      createdBy: userId,
    })

    await MaintenanceReport.updateOne(
      { _id: report._id },
      {
        $set: {
          quoteId: quote._id,
          quoteNumber: quote.numero,
          'billing.needsQuote': false,
          'billing.quoteId': quote._id,
          'billing.quoteStatus': 'draft',
          'billing.lastUpdatedAt': new Date(),
        },
      }
    )

    return NextResponse.json({
      success: true,
      quote: {
        _id: String(quote._id),
        numero: quote.numero,
        subtotal: quote.subtotal,
        brsAmount: quote.brsAmount,
        taxAmount: quote.taxAmount,
        total: quote.total,
        status: quote.status,
      },
      contractCovered,
      contractRemaining,
      message: contractCovered
        ? `Devis ${quote.numero} créé (brouillon) — ${contractRemaining} intervention(s) restante(s) sur contrat`
        : `Devis ${quote.numero} créé (brouillon) — hors contrat`,
    }, { status: 201 })

  } catch (error) {
    // Libère la réservation si la création a échoué
    if (claimedId) {
      await MaintenanceReport.updateOne(
        { _id: claimedId, quoteId: { $exists: false } },
        { $set: { quoteGenerated: false }, $unset: { quoteGeneratedAt: 1 } }
      ).catch(() => {})
    }
    const authRes = authErrorResponse(error)
    if (authRes) return authRes
    console.error('Erreur génération devis:', error)
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    )
  }
}
