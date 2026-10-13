/** GET /api/market/pickup-points — points de retrait actifs (public) */
import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import PickupPoint from '@/lib/models/PickupPoint'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    await connectDB()
    const points = await PickupPoint.find({ active: true })
      .sort({ sortOrder: 1, neighborhood: 1 })
      .select('name neighborhood city address landmark phone hours mapsUrl')
      .limit(200)
      .lean() as any[]
    return NextResponse.json({
      success: true,
      points: points.map(p => ({
        id: String(p._id),
        name: p.name,
        neighborhood: p.neighborhood,
        city: p.city,
        address: p.address,
        landmark: p.landmark,
        phone: p.phone,
        hours: p.hours,
        mapsUrl: p.mapsUrl,
      })),
    }, { headers: { 'Cache-Control': 'public, max-age=300' } })
  } catch (error) {
    console.error('GET /api/market/pickup-points error:', error)
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 })
  }
}
