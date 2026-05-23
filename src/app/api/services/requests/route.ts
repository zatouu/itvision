import { NextRequest, NextResponse } from 'next/server'
import { connectMongoose } from '@/lib/mongoose'
import ServiceRequest from '@/lib/models/ServiceRequest'
import { requireAuth } from '@/lib/jwt'

export async function GET(request: NextRequest) {
  try {
    await connectMongoose()
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || undefined
    const q: any = {}
    if (status) q.status = status
    const items = await ServiceRequest.find(q).sort({ createdAt: -1 }).limit(100)
    return NextResponse.json({ items })
  } catch (e) {
    return NextResponse.json({ error: 'Erreur liste demandes' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectMongoose()
    const { userId } = await requireAuth(request)
    const body = await request.json()
    const { category, description, media, location, budget, channel } = body || {}
    if (!category || !location?.coordinates) {
      return NextResponse.json({ error: 'Paramètres invalides' }, { status: 400 })
    }
    const created = await ServiceRequest.create({ clientId: userId, category, description, media, location, budget, channel: channel || 'web' })
    return NextResponse.json({ success: true, item: created })
  } catch (e) {
    return NextResponse.json({ error: 'Erreur création demande' }, { status: 500 })
  }
}
