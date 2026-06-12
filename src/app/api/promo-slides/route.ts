import { NextRequest, NextResponse } from 'next/server'
import { connectMongoose } from '@/lib/mongoose'
import PromoSlide from '@/lib/models/PromoSlide'

export async function GET(request: NextRequest) {
  try {
    await connectMongoose()

    const now = new Date()
    const slides = await PromoSlide.find({
      isActive: true,
      $and: [
        {
          $or: [
            { startDate: { $exists: false } },
            { startDate: null },
            { startDate: { $lte: now } },
          ],
        },
        {
          $or: [
            { endDate: { $exists: false } },
            { endDate: null },
            { endDate: { $gte: now } },
          ],
        },
      ],
    })
      .sort({ order: 1 })
      .lean()

    return NextResponse.json({ success: true, slides })
  } catch {
    return NextResponse.json({ success: false, slides: [] }, { status: 500 })
  }
}
