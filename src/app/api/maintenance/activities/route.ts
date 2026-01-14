import { NextRequest, NextResponse } from 'next/server'
import { connectMongoose } from '@/lib/mongoose'
import MaintenanceActivity from '@/lib/models/MaintenanceActivity'
import MaintenanceContract from '@/lib/models/MaintenanceContract'
import { jwtVerify } from 'jose'

async function verifyToken(request: NextRequest) {
  const token =
    request.cookies.get('auth-token')?.value ||
    request.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) throw new Error('Non authentifié')
  const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'default-secret-key')
  const { payload } = await jwtVerify(token, secret)
  return {
    userId: payload.userId as string,
    role: String(payload.role || '').toUpperCase()
  }
}

export async function GET(request: NextRequest) {
  try {
    const { role } = await verifyToken(request)
    if (!['ADMIN', 'TECHNICIAN'].includes(role)) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    await connectMongoose()
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const visitId = searchParams.get('visitId')

    const query: Record<string, any> = {}
    if (status && status !== 'all') {
      query.status = status
    }
    if (visitId) {
      query.visitId = visitId
    }

    const activities = await MaintenanceActivity.find(query)
      .sort({ date: 1 })
      .populate('preferredTechnicians', 'name email phone')
      .lean() as any[]

    return NextResponse.json({
      success: true,
      activities: activities.map((activity) => ({
        id: activity._id.toString(),
        visitId: activity.visitId,
        contractId: activity.contractId?.toString(),
        contractName: activity.contractName,
        clientName: activity.clientName,
        site: activity.site,
        date: activity.date,
        status: activity.status,
        bidsCount: activity.bidsCount,
        bestBidAmount: activity.bestBidAmount,
        category: activity.category,
        allowMarketplace: activity.allowMarketplace,
        isContractual: activity.isContractual,
        productId: activity.productId,
        productName: activity.productName,
        installationOptions: activity.installationOptions,
        clientContact: activity.clientContact,
        marketplaceReason: activity.marketplaceReason,
        preferredTechnicians: Array.isArray(activity.preferredTechnicians)
          ? activity.preferredTechnicians.map((tech: any) => ({
              _id: tech?._id?.toString?.(),
              name: tech?.name,
              email: tech?.email,
              phone: tech?.phone
            }))
          : undefined
      }))
    })
  } catch (error) {
    console.error('Erreur chargement activités maintenance:', error)
    const message = error instanceof Error ? error.message : 'Erreur serveur'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId, role } = await verifyToken(request)
    if (role !== 'ADMIN') {
      return NextResponse.json({ error: 'Accès réservé aux administrateurs' }, { status: 403 })
    }

    await connectMongoose()
    const body = await request.json()
    const {
      visitId,
      contractId,
      contractName,
      clientId,
      clientName,
      site,
      date,
      category = contractId ? 'contract_visit' : 'ad_hoc',
      isContractual = Boolean(contractId),
      allowMarketplace = !isContractual,
      productId,
      productName,
      installationOptions,
      clientContact,
      preferredTechnicians,
      marketplaceReason
    } = body

    if (!clientName || !date) {
      return NextResponse.json({ error: 'Paramètres incomplets' }, { status: 400 })
    }

    if (visitId) {
      const existing = await MaintenanceActivity.findOne({ visitId })
      if (existing) {
        return NextResponse.json({ success: true, activityId: existing._id.toString() })
      }
    }

    let resolvedClientId = clientId
    if (contractId) {
      const contract = await MaintenanceContract.findById(contractId).select('clientId')
      if (!contract) {
        return NextResponse.json({ error: 'Contrat introuvable' }, { status: 404 })
      }
      resolvedClientId = contract.clientId.toString()
    }

    const activity = await MaintenanceActivity.create({
      visitId,
      contractId: contractId || undefined,
      contractName,
      clientId: resolvedClientId,
      clientName,
      site,
      date: new Date(date),
      category,
      isContractual,
      allowMarketplace,
      productId,
      productName,
      installationOptions,
      clientContact,
      preferredTechnicians: Array.isArray(preferredTechnicians) ? preferredTechnicians : undefined,
      marketplaceReason,
      status: 'open',
      createdBy: userId
    })

    return NextResponse.json({
      success: true,
      activityId: activity._id.toString()
    })
  } catch (error) {
    console.error('Erreur publication activité maintenance:', error)
    const message = error instanceof Error ? error.message : 'Erreur serveur'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

