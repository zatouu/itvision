import { NextRequest, NextResponse } from 'next/server'
import { connectMongoose } from '@/lib/mongoose'
import Notification from '@/lib/models/Notification'

export async function GET() {
  try {
    await connectMongoose()
    const recent = await Notification.find().sort({ createdAt: -1 }).limit(50).lean()
    return NextResponse.json({ success: true, notifications: recent })
  } catch (e) {
    return NextResponse.json({ error: 'Erreur liste notifications' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectMongoose()
    const body = await request.json()
    const created = await Notification.create(body)
    // Stub d’envoi immédiat: marquer "sent"
    await Notification.updateOne({ _id: created._id }, { $set: { status: 'sent', sentAt: new Date() } })
    const finalDoc = await Notification.findById(created._id).lean()
    console.log('[NOTIFICATION]', finalDoc)
    return NextResponse.json({ success: true, notification: finalDoc })
  } catch (e) {
    return NextResponse.json({ error: 'Erreur création notification' }, { status: 500 })
  }
}
