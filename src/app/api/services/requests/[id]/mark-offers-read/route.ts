import { NextRequest, NextResponse } from 'next/server'
import { connectMongoose } from '@/lib/mongoose'
import ServiceRequest from '@/lib/models/ServiceRequest'
import { requireAuth } from '@/lib/jwt'

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectMongoose()
    const { userId } = await requireAuth(request)
    const { id } = await params
    const sr = await ServiceRequest.findById(id)
    if (!sr) return NextResponse.json({ error: 'Demande introuvable' }, { status: 404 })
    if (String(sr.clientId) !== String(userId)) {
      return NextResponse.json({ error: 'Interdit' }, { status: 403 })
    }
    sr.clientOffersReadAt = new Date()
    await sr.save()
    return NextResponse.json({ success: true })
  } catch (e: any) {
    if (e.message === 'Non authentifié') return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    console.error('[POST /api/services/requests/:id/mark-offers-read]', e)
    return NextResponse.json({ error: 'Erreur' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  return POST(request, context)
}
