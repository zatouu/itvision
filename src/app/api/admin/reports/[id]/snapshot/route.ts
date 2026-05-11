import { NextRequest, NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { connectMongoose } from '@/lib/mongoose'
import MaintenanceContract from '@/lib/models/MaintenanceContract'
import { verifyJwtPayload } from '@/lib/jwt'

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
  return payload
}

// POST — Créer un snapshot immuable d'un contrat
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectMongoose()
    const adminPayload = await verifyAdminToken(request)
    const adminUserId = (adminPayload as any).userId as string
    const { id } = await params

    const contract = await MaintenanceContract.findById(id).lean() as any
    if (!contract) {
      return NextResponse.json({ error: 'Contrat introuvable' }, { status: 404 })
    }

    const { reason } = await request.json()

    const snapshot = {
      snapshotAt: new Date(),
      snapshotBy: new mongoose.Types.ObjectId(adminUserId),
      reason: reason || 'Snapshot manuel',
      data: {
        contractNumber: contract.contractNumber,
        status: contract.status,
        type: contract.type,
        startDate: contract.startDate,
        endDate: contract.endDate,
        annualPrice: contract.annualPrice,
        coverage: contract.coverage,
        services: contract.services,
        equipment: contract.equipment,
        stats: contract.stats,
        autoRenewal: contract.autoRenewal,
        notes: contract.notes,
        specialConditions: contract.specialConditions
      }
    }

    await MaintenanceContract.updateOne(
      { _id: id },
      { $push: { snapshots: snapshot } }
    )

    return NextResponse.json({ success: true, snapshot })
  } catch (error: any) {
    const status = error.message === 'Accès non autorisé' || error.message === 'Token manquant' ? 403 : 500
    return NextResponse.json({ error: error.message || 'Erreur serveur' }, { status })
  }
}

// GET — Récupérer les snapshots d'un contrat
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectMongoose()
    await verifyAdminToken(request)
    const { id } = await params

    const contract = await MaintenanceContract.findById(id).select('snapshots').lean() as any
    if (!contract) {
      return NextResponse.json({ error: 'Contrat introuvable' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      snapshots: contract.snapshots || []
    })
  } catch (error: any) {
    const status = error.message === 'Accès non autorisé' || error.message === 'Token manquant' ? 403 : 500
    return NextResponse.json({ error: error.message || 'Erreur serveur' }, { status })
  }
}
