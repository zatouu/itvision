import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import { connectMongoose } from '@/lib/mongoose'
import MaintenanceContract from '@/lib/models/MaintenanceContract'
import MaintenanceActivity from '@/lib/models/MaintenanceActivity'
import { generateMaintenanceVisits } from '@/lib/maintenance/schedule'

type DecodedToken = {
  userId: string
  role: string
  email: string
}

const DEFAULT_WINDOW_DAYS = 90

function addDays(base: Date, days: number) {
  const clone = new Date(base)
  clone.setDate(clone.getDate() + days)
  return clone
}

async function verifyToken(request: NextRequest): Promise<DecodedToken> {
  const token =
    request.cookies.get('auth-token')?.value ||
    request.headers.get('authorization')?.replace('Bearer ', '')

  if (!token) {
    throw new Error('Non authentifié')
  }

  const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'default-secret-key')
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

const parseDate = (value: string | null, fallback: Date) => {
  if (!value) return fallback
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? fallback : parsed
}

const getSourceLabel = (activity: any) => {
  if (activity.category === 'product_install') return 'installation'
  if (activity.category === 'contract_visit' && activity.isContractual) return 'contract'
  return 'marketplace'
}

export async function GET(request: NextRequest) {
  try {
    const { userId, role } = await verifyToken(request)

    if (role !== 'CLIENT') {
      return NextResponse.json({ error: 'Accès réservé aux clients' }, { status: 403 })
    }

    await connectMongoose()

    const { searchParams } = new URL(request.url)
    const from = parseDate(searchParams.get('from'), new Date())
    const to = parseDate(searchParams.get('to'), addDays(from, DEFAULT_WINDOW_DAYS))
    const statusFilter = searchParams.get('status')
    const sourceFilter = searchParams.get('source')

    const contracts = await MaintenanceContract.find({
      clientId: userId,
      status: { $nin: ['terminated', 'cancelled'] }
    })
      .populate('preferredTechnicians', 'name email phone')
      .populate('clientId', 'name company')
      .lean()

    const contractVisits = contracts
      .flatMap((contract) =>
        generateMaintenanceVisits(contract as any, { from, to }).map((visit) => ({
          id: visit.id,
          date: visit.date,
          site: visit.site,
          contractId: visit.contractId,
          contractName: visit.contractName,
          clientName: visit.clientName,
          source: 'contract',
          status: 'scheduled',
          isContractual: true,
          preferredTechnicians: visit.preferredTechnicians || [],
          marketplace: null
        }))
      )

    const contractIds = contracts.map((contract) => contract._id)

    const activities = await MaintenanceActivity.find({
      date: { $gte: from, $lte: to },
      $or: [
        { clientId: userId },
        { contractId: { $in: contractIds } }
      ]
    })
      .populate('preferredTechnicians', 'name email phone')
      .lean()

    const activityVisits = activities.map((activity) => {
      const doc = activity as Record<string, any>
      return {
        id: doc._id?.toString?.() || '',
        date: doc.date?.toISOString?.() || new Date().toISOString(),
        site: doc.site,
        contractId: doc.contractId?.toString?.(),
        contractName: doc.contractName,
        clientName: doc.clientName,
        source: getSourceLabel(doc),
        status: doc.status,
        isContractual: doc.isContractual,
        preferredTechnicians: Array.isArray(doc.preferredTechnicians)
          ? doc.preferredTechnicians.map((tech: any) => ({
              _id: tech?._id?.toString?.() || '',
              name: tech?.name || 'Technicien',
              email: tech?.email,
              phone: tech?.phone
            }))
          : [],
        marketplace: {
          activityId: doc._id?.toString?.() || '',
          allowMarketplace: doc.allowMarketplace,
          reason: doc.marketplaceReason,
          bidsCount: doc.bidsCount,
          bestBidAmount: doc.bestBidAmount,
          category: doc.category,
          product:
            doc.category === 'product_install'
              ? {
                  productId: doc.productId,
                  productName: doc.productName,
                  options: doc.installationOptions
                }
              : undefined
        }
      }
    })

    let visits = [...contractVisits, ...activityVisits]

    if (sourceFilter && sourceFilter !== 'all') {
      visits = visits.filter((visit) => visit.source === sourceFilter)
    }

    if (statusFilter && statusFilter !== 'all') {
      visits = visits.filter((visit) => visit.status === statusFilter)
    }

    visits.sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    )

    return NextResponse.json({
      success: true,
      visits
    })
  } catch (error) {
    console.error('Erreur récupération visites client:', error)
    const message = error instanceof Error ? error.message : 'Erreur serveur'
    const status = message.includes('auth') || message.includes('Token') ? 401 : 500
    return NextResponse.json({ error: message }, { status })
  }
}

