import { NextRequest, NextResponse } from 'next/server'
import { verifyAuthServer } from '@/lib/auth-server'
import { connectDB } from '@/lib/db'
import InAppNotification from '@/lib/models/InAppNotification'

export async function GET(request: NextRequest) {
  const auth = await verifyAuthServer(request)
  if (!auth.isAuthenticated || !auth.user) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }
  await connectDB()

  const userId = auth.user.id
  const notifs = await InAppNotification.find({
    deletedBy: { $ne: userId },
    $or: [
      { userId },
      { roles: auth.user.role },
      { roles: { $exists: false }, userId: { $exists: false } }
    ]
  })
    .sort({ createdAt: -1 })
    .limit(30)
    .lean()

  return NextResponse.json(notifs)
}

export async function PATCH(request: NextRequest) {
  const auth = await verifyAuthServer(request)
  if (!auth.isAuthenticated || !auth.user) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const body = await request.json()
  await connectDB()

  const userId = auth.user.id

  if (body.all) {
    await InAppNotification.updateMany(
      {
        deletedBy: { $ne: userId },
        readBy: { $ne: userId },
        $or: [
          { userId },
          { roles: auth.user.role },
          { roles: { $exists: false }, userId: { $exists: false } }
        ]
      },
      { $addToSet: { readBy: userId } }
    )
  } else if (body.id) {
    await InAppNotification.updateOne(
      { _id: body.id },
      { $addToSet: { readBy: userId } }
    )
  }

  return NextResponse.json({ ok: true })
}

export async function DELETE(request: NextRequest) {
  const auth = await verifyAuthServer(request)
  if (!auth.isAuthenticated || !auth.user) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const body = await request.json()
  if (!body.id) return NextResponse.json({ error: 'id requis' }, { status: 400 })

  await connectDB()
  await InAppNotification.updateOne(
    { _id: body.id },
    { $addToSet: { deletedBy: auth.user.id } }
  )

  return NextResponse.json({ ok: true })
}
