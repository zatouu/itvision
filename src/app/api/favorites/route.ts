import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import User from '@/lib/models/User'
import Client from '@/lib/models/Client'
import { requireAuth } from '@/lib/jwt'

function normalizeIds(input: unknown): string[] {
  if (!Array.isArray(input)) return []
  const out: string[] = []
  const seen = new Set<string>()
  for (const raw of input) {
    if (typeof raw !== 'string') continue
    const id = raw.trim()
    if (!id) continue
    if (seen.has(id)) continue
    seen.add(id)
    out.push(id)
  }
  return out
}

async function loadAccountModel(userId: string) {
  const user = await User.findById(userId)
  if (user) return user
  const client = await Client.findById(userId)
  return client
}

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req)
    await connectDB()

    const account: any = await loadAccountModel(String(auth.userId))
    if (!account) {
      return NextResponse.json({ success: false, error: 'Compte introuvable' }, { status: 404 })
    }

    const favorites: string[] = Array.isArray(account.favoriteProductIds) ? account.favoriteProductIds : []

    return NextResponse.json({ success: true, favorites })
  } catch {
    return NextResponse.json({ success: false, error: 'Non authentifié' }, { status: 401 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const auth = await requireAuth(req)
    await connectDB()

    const body = await req.json().catch(() => ({}))
    const favorites = normalizeIds((body as any)?.favorites)

    // garde-fou
    const limited = favorites.slice(0, 500)

    const account: any = await loadAccountModel(String(auth.userId))
    if (!account) {
      return NextResponse.json({ success: false, error: 'Compte introuvable' }, { status: 404 })
    }

    account.favoriteProductIds = limited
    await account.save()

    return NextResponse.json({ success: true, favorites: limited })
  } catch {
    return NextResponse.json({ success: false, error: 'Non authentifié' }, { status: 401 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req)
    await connectDB()

    const body = await req.json().catch(() => ({}))
    const productId = typeof (body as any)?.productId === 'string' ? (body as any).productId.trim() : ''
    if (!productId) {
      return NextResponse.json({ success: false, error: 'productId requis' }, { status: 400 })
    }

    const account: any = await loadAccountModel(String(auth.userId))
    if (!account) {
      return NextResponse.json({ success: false, error: 'Compte introuvable' }, { status: 404 })
    }

    const current: string[] = Array.isArray(account.favoriteProductIds) ? account.favoriteProductIds : []
    const set = new Set(current)
    set.add(productId)
    const next = Array.from(set).slice(0, 500)

    account.favoriteProductIds = next
    await account.save()

    return NextResponse.json({ success: true, favorites: next })
  } catch {
    return NextResponse.json({ success: false, error: 'Non authentifié' }, { status: 401 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const auth = await requireAuth(req)
    await connectDB()

    const { searchParams } = new URL(req.url)
    const productId = (searchParams.get('productId') || '').trim()
    if (!productId) {
      return NextResponse.json({ success: false, error: 'productId requis' }, { status: 400 })
    }

    const account: any = await loadAccountModel(String(auth.userId))
    if (!account) {
      return NextResponse.json({ success: false, error: 'Compte introuvable' }, { status: 404 })
    }

    const current: string[] = Array.isArray(account.favoriteProductIds) ? account.favoriteProductIds : []
    const next = current.filter((id: string) => id !== productId)

    account.favoriteProductIds = next
    await account.save()

    return NextResponse.json({ success: true, favorites: next })
  } catch {
    return NextResponse.json({ success: false, error: 'Non authentifié' }, { status: 401 })
  }
}
