import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import User from '@/lib/models/User'
import { requireAdminApi } from '@/lib/api-auth'

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdminApi(request)
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const { searchParams } = new URL(request.url)
    const qRaw = searchParams.get('q')
    const q = (qRaw || '').trim()

    if (q.length < 2) {
      return NextResponse.json({ users: [] })
    }

    await connectDB()

    const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')

    const users = await User.find(
      {
        $or: [{ email: regex }, { name: regex }, { username: regex }]
      },
      { name: 1, role: 1, avatarUrl: 1, email: 1 }
    )
      .sort({ updatedAt: -1 })
      .limit(10)
      .lean()

    return NextResponse.json({
      users: users.map(u => ({
        id: String(u._id),
        name: u.name,
        role: String(u.role || '').toUpperCase(),
        avatarUrl: u.avatarUrl,
        email: u.email
      }))
    })
  } catch (error) {
    console.error('Erreur search users:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
