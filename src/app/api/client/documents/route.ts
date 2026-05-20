import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import { connectMongoose } from '@/lib/mongoose'
import Project from '@/lib/models/Project'
import Quote from '@/lib/models/Quote'
import AdminQuote from '@/lib/models/AdminQuote'
import AdminInvoice from '@/lib/models/AdminInvoice'
import User from '@/lib/models/User'
import { getJwtSecretKey } from '@/lib/jwt-secret'

interface DecodedToken {
  userId: string
  role: string
  email: string
}

async function verifyToken(request: NextRequest): Promise<DecodedToken> {
  const token = request.cookies.get('auth-token')?.value || request.headers.get('authorization')?.replace('Bearer ', '')
  
  if (!token) {
    throw new Error('Non authentifié')
  }

  const secret = getJwtSecretKey()
  const { payload } = await jwtVerify(token, secret)
  
  if (!payload.userId || !payload.role || !payload.email) {
    throw new Error('Token invalide')
  }
  
  return {
    userId: payload.userId as string,
    role: payload.role as string,
    email: payload.email as string
  }
}

export async function GET(request: NextRequest) {
  try {
    const { userId, role } = await verifyToken(request)
    
    if (role !== 'CLIENT') {
      return NextResponse.json({ error: 'Accès réservé aux clients' }, { status: 403 })
    }

    await connectMongoose()

    const user = await User.findById(userId).select({ companyClientId: 1 }).lean() as any
    const companyClientId = user?.companyClientId ? String(user.companyClientId) : null

    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') // 'quote', 'contract', 'invoice', 'report', 'all'
    const projectId = searchParams.get('projectId')

    const documents: any[] = []

    // Documents des projets
    const projectQuery: any = {
      $or: [
        { clientId: userId },
        ...(companyClientId ? [{ clientCompanyId: companyClientId }] : [])
      ]
    }
    if (projectId) projectQuery._id = projectId

    const projects = await Project.find(projectQuery).lean()
    
    projects.forEach((project: any) => {
      if (project.documents && Array.isArray(project.documents)) {
        project.documents
          .filter((doc: any) => doc.clientVisible !== false)
          .forEach((doc: any) => {
            if (!type || type === 'all' || doc.type === type) {
              documents.push({
                _id: doc._id?.toString() || Math.random().toString(),
                name: doc.name,
                type: doc.type || 'document',
                url: doc.url,
                size: doc.size,
                uploadDate: doc.uploadDate,
                projectId: project._id.toString(),
                projectName: project.name,
                category: 'project'
              })
            }
          })
      }
    })

    // Devis (Quotes)
    if (!type || type === 'all' || type === 'quote') {
      const quotes = await Quote.find({ clientId: userId }).lean()
      quotes.forEach((quote: any) => {
        documents.push({
          _id: quote._id.toString(),
          name: `Devis ${quote.numero || quote._id.toString().slice(-6)}`,
          type: 'quote',
          status: quote.status,
          date: quote.createdAt,
          amount: quote.total,
          category: 'quote'
        })
      })

      // Admin Quotes
      const adminQuoteQuery: any = {
        $or: [
          { clientUserId: userId },
          ...(companyClientId ? [{ clientCompanyId: companyClientId }] : [])
        ]
      }
      if (projectId) adminQuoteQuery.projectId = projectId

      const adminQuotes = await AdminQuote.find(adminQuoteQuery).lean()
      adminQuotes.forEach((quote: any) => {
        documents.push({
          _id: quote._id.toString(),
          name: `Devis ${quote.numero}`,
          type: 'quote',
          status: quote.status,
          date: quote.date,
          amount: quote.total,
          category: 'admin_quote'
        })
      })
    }

    // Factures (Invoices)
    if (!type || type === 'all' || type === 'invoice') {
      const invoiceQuery: any = {
        $or: [
          { clientUserId: userId },
          ...(companyClientId ? [{ clientCompanyId: companyClientId }] : [])
        ]
      }
      if (projectId) invoiceQuery.projectId = projectId

      const invoices = await AdminInvoice.find(invoiceQuery).lean()

      invoices.forEach((inv: any) => {
        documents.push({
          _id: inv._id.toString(),
          name: `Facture ${inv.numero}`,
          type: 'invoice',
          status: inv.status,
          date: inv.date,
          amount: inv.total,
          category: 'admin_invoice'
        })
      })
    }

    // Trier par date (les plus récents en premier)
    documents.sort((a, b) => {
      const dateA = new Date(a.uploadDate || a.date || 0).getTime()
      const dateB = new Date(b.uploadDate || b.date || 0).getTime()
      return dateB - dateA
    })

    return NextResponse.json({
      success: true,
      documents
    })
  } catch (error) {
    console.error('Erreur récupération documents client:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur serveur' },
      { status: 500 }
    )
  }
}

