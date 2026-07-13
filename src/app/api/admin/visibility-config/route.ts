import { NextRequest, NextResponse } from 'next/server'
import { requireAdminApi } from '@/lib/api-auth'
import { connectMongoose } from '@/lib/mongoose'
import AppConfig from '@/lib/models/AppConfig'
import {
  getVisibilityConfig,
  invalidateVisibilityConfigCache,
  DEFAULT_VISIBILITY_CONFIG,
} from '@/lib/visibility'
import { IVisibilityConfig } from '@/lib/models/AppConfig'

export async function GET(request: NextRequest) {
  const auth = await requireAdminApi(request)
  if (!auth.ok) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
  }

  try {
    const config = await getVisibilityConfig(true)
    return NextResponse.json({ success: true, config })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Erreur' },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAdminApi(request)
  if (!auth.ok) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
  }

  try {
    await connectMongoose()
    const body = await request.json().catch(() => ({}))

    // Validation minimale : on fusionne avec les défauts pour éviter les champs manquants
    const current = await getVisibilityConfig(true)
    const merged: IVisibilityConfig = {
      enabled: body.enabled ?? current.enabled,
      requireKycForNotification: body.requireKycForNotification ?? current.requireKycForNotification,
      defaultRadiusKm: clampNum(body.defaultRadiusKm, current.defaultRadiusKm, 1, 500),
      maxRadiusKm: clampNum(body.maxRadiusKm, current.maxRadiusKm, 1, 1000),
      presenceFreshnessSec: clampNum(body.presenceFreshnessSec, current.presenceFreshnessSec, 30, 86400),
      maxProvidersPerWave: clampNum(body.maxProvidersPerWave, current.maxProvidersPerWave, 1, 500),
      escalation: Array.isArray(body.escalation) && body.escalation.length > 0
        ? body.escalation.map((s: any, i: number) => ({
            stage: Number(s.stage ?? i),
            radiusKm: clampNum(s.radiusKm, 10, 1, 1000),
            delaySec: clampNum(s.delaySec, 0, 0, 3600),
            minOffersToStop: clampNum(s.minOffersToStop, 1, 0, 100),
            minProvidersToStop: clampNum(s.minProvidersToStop, 5, 0, 500),
          }))
        : current.escalation,
      scoreWeights: {
        distance: clampNum(body.scoreWeights?.distance, current.scoreWeights.distance, 0, 10),
        availability: clampNum(body.scoreWeights?.availability, current.scoreWeights.availability, 0, 10),
        category: clampNum(body.scoreWeights?.category, current.scoreWeights.category, 0, 10),
        rating: clampNum(body.scoreWeights?.rating, current.scoreWeights.rating, 0, 10),
        responsiveness: clampNum(body.scoreWeights?.responsiveness, current.scoreWeights.responsiveness, 0, 10),
      },
      tiers: Array.isArray(body.tiers) && body.tiers.length > 0
        ? body.tiers.map((t: any) => ({
            id: String(t.id || 'free'),
            label: String(t.label || t.id || 'Gratuit'),
            radiusKm: Number(t.radiusKm ?? DEFAULT_VISIBILITY_CONFIG.tiers[0].radiusKm),
            priorityLevel: Number(t.priorityLevel ?? 0),
            boostMultiplier: Number(t.boostMultiplier ?? 1),
          }))
        : current.tiers,
      fallback: {
        useLastKnownPosition: body.fallback?.useLastKnownPosition ?? current.fallback.useLastKnownPosition,
        useProfileCity: body.fallback?.useProfileCity ?? current.fallback.useProfileCity,
      },
    }

    await AppConfig.findOneAndUpdate(
      { key: 'global' },
      { $set: { visibility: merged } },
      { upsert: true, new: true },
    )

    invalidateVisibilityConfigCache()
    return NextResponse.json({ success: true, config: merged })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Erreur' },
      { status: 500 },
    )
  }
}

function clampNum(val: any, fallback: number, min: number, max: number): number {
  const n = Number(val)
  if (!Number.isFinite(n)) return fallback
  return Math.min(max, Math.max(min, n))
}
