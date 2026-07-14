import { NextRequest, NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { connectMongoose } from '@/lib/mongoose'
import { requireAuth } from '@/lib/jwt'
import ProviderProfile from '@/lib/models/ProviderProfile'

export async function POST(request: NextRequest) {
  try {
    await connectMongoose()
    const { userId } = await requireAuth(request)

    const body = await request.json().catch(() => ({}))
    const lat = Number(body.lat)
    const lng = Number(body.lng)
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return NextResponse.json({ success: false, error: 'lat/lng invalides' }, { status: 400 })
    }

    const status = body.status === 'offline' ? 'offline' : 'available'
    const name = body.name || ''
    const email = body.email || ''

    // Met à jour la présence in-memory / Redis via le module redis-geo.js
    try {
      const geo = require('@/../lib/redis-geo')
      if (geo && typeof geo.updateProviderPosition === 'function') {
        await geo.updateProviderPosition(userId, { lat, lng, status, name, email })
      }
    } catch (e: any) {
      console.warn('[POST /api/provider/location] redis-geo update failed:', e?.message)
    }

    // Persiste dans le profil pour le fallback last_known du Visibility Engine
    ProviderProfile.findOneAndUpdate(
      { userId: new mongoose.Types.ObjectId(userId) },
      { $set: { 'zone.coordinates': [lng, lat], 'zone.updatedAt': new Date() } },
      { upsert: true }
    ).catch(() => {})

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('[POST /api/provider/location] error:', error)
    return NextResponse.json({ success: false, error: error?.message || 'Erreur' }, { status: 500 })
  }
}
