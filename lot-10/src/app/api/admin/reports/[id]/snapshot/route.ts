import { NextRequest, NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { connectMongoose } from '@/lib/mongoose'
import MaintenanceContract from '@/lib/models/MaintenanceContract'
import { requireApiUser, authErrorResponse, ADMIN_ROLES } from '@/lib/api-auth'

function errorResponse(error: unknown) {
  const authRes = authErrorResponse(error)
  if (authRes) return authRes
  console.error('[admin/reports/snapshot]', error)
  return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
}

// POST — Créer un snapshot immuable d'un contrat
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectMongoose()
    const { userId: adminUserId } = await requireApiUser(request, ADMIN_ROLES)
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
  } catch (error) {
    return errorResponse(error)
  }
}

// GET — Récupérer les snapshots d'un contrat
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectMongoose()
    await requireApiUser(request, ADMIN_ROLES)
    const { id } = await params

    const contract = await MaintenanceContract.findById(id).select('snapshots').lean() as any
    if (!contract) {
      return NextResponse.json({ error: 'Contrat introuvable' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      snapshots: contract.snapshots || []
    })
  } catch (error) {
    return errorResponse(error)
  }
}
