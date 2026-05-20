import { NextRequest, NextResponse } from 'next/server'
import { verifyAuthServer } from '@/lib/auth-server'
import { connectDB } from '@/lib/db'
import mongoose from 'mongoose'
import Intervention from '@/lib/models/Intervention'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await verifyAuthServer(request)
  if (!auth.isAuthenticated || !auth.user || auth.user.role !== 'CLIENT' || !auth.user.companyClientId) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  await connectDB()
  const { id } = await params
  const userId = new mongoose.Types.ObjectId(auth.user.id)
  const body = await request.json()

  const { signature, name, title } = body
  if (!signature || !name) {
    return NextResponse.json({ error: 'Signature et nom requis' }, { status: 400 })
  }

  const intervention = await Intervention.findOne({
    _id: new mongoose.Types.ObjectId(id),
    clientId: userId
  }).lean() as any

  if (!intervention) {
    return NextResponse.json({ error: 'Intervention introuvable' }, { status: 404 })
  }

  if (intervention.status !== 'completed') {
    return NextResponse.json(
      { error: 'Accusé de réception uniquement sur interventions terminées' },
      { status: 400 }
    )
  }

  await Intervention.updateOne(
    { _id: new mongoose.Types.ObjectId(id) },
    {
      $set: {
        'signatures.client': {
          signature,
          name,
          title: title || '',
          timestamp: new Date()
        },
        clientAcknowledgedAt: new Date()
      }
    }
  )

  return NextResponse.json({ success: true, message: 'Accusé de réception enregistré' })
}
