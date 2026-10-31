import { NextRequest, NextResponse } from 'next/server'
import { connectMongoose } from '@/lib/mongoose'
import User from '@/lib/models/User'
import { requireAuth } from '@/lib/jwt'

const MAX_ADDRESSES = 10

type AddressPayload = {
  label?: string
  fullName?: string
  phone?: string
  region?: string
  department?: string
  neighborhood?: string
  street?: string
  additionalInfo?: string
  isDefault?: boolean
}

const clean = (v: unknown) => (typeof v === 'string' ? v.trim() : '')

function validate(body: AddressPayload) {
  const addr = {
    label: clean(body.label) || 'Domicile',
    fullName: clean(body.fullName),
    phone: clean(body.phone),
    region: clean(body.region),
    department: clean(body.department),
    neighborhood: clean(body.neighborhood),
    street: clean(body.street),
    additionalInfo: clean(body.additionalInfo) || undefined,
  }
  const missing = ['fullName', 'phone', 'region', 'department', 'neighborhood', 'street']
    .filter((k) => !(addr as any)[k])
  if (missing.length) return { error: `Champs requis : ${missing.join(', ')}` }
  return { addr }
}

const serialize = (a: any) => ({
  id: String(a._id),
  label: a.label,
  fullName: a.fullName,
  phone: a.phone,
  region: a.region,
  department: a.department,
  neighborhood: a.neighborhood,
  street: a.street,
  additionalInfo: a.additionalInfo,
  isDefault: !!a.isDefault,
})

async function loadUser(userId: string) {
  await connectMongoose()
  const user = await User.findById(userId)
  if (user && !user.savedAddresses) user.savedAddresses = [] as any
  return user
}

function errResponse(error: unknown) {
  const msg = error instanceof Error ? error.message : 'Erreur serveur'
  const status = msg === 'Non authentifié' || msg === 'Token invalide' ? 401 : 500
  return NextResponse.json({ error: msg }, { status })
}

export async function GET(request: NextRequest) {
  try {
    const { userId } = await requireAuth(request)
    const user = await loadUser(userId)
    if (!user) return NextResponse.json({ addresses: [] })
    const list = [...(user.savedAddresses || [])]
      .sort((a, b) => Number(b.isDefault) - Number(a.isDefault))
      .map(serialize)
    return NextResponse.json({ addresses: list })
  } catch (error) {
    return errResponse(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await requireAuth(request)
    const body = (await request.json()) as AddressPayload
    const { addr, error } = validate(body)
    if (error || !addr) return NextResponse.json({ error }, { status: 400 })

    const user = await loadUser(userId)
    if (!user) return NextResponse.json({ error: 'Compte non supporté' }, { status: 400 })
    const list = user.savedAddresses!
    if (list.length >= MAX_ADDRESSES) {
      return NextResponse.json({ error: `Maximum ${MAX_ADDRESSES} adresses` }, { status: 400 })
    }

    const makeDefault = body.isDefault === true || list.length === 0
    if (makeDefault) list.forEach((a) => { a.isDefault = false })
    list.push({ ...addr, isDefault: makeDefault } as any)
    const created = list[list.length - 1]
    await user.save()

    return NextResponse.json({ success: true, address: serialize(created) }, { status: 201 })
  } catch (error) {
    return errResponse(error)
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { userId } = await requireAuth(request)
    const body = (await request.json()) as AddressPayload & { id?: string }
    const id = clean(body.id)
    if (!id) return NextResponse.json({ error: 'id requis' }, { status: 400 })

    const user = await loadUser(userId)
    const addr = user?.savedAddresses?.id(id)
    if (!user || !addr) return NextResponse.json({ error: 'Adresse introuvable' }, { status: 404 })
    const list = user.savedAddresses!

    // Mise à jour partielle — seules les clés présentes sont appliquées
    for (const k of ['label', 'fullName', 'phone', 'region', 'department', 'neighborhood', 'street', 'additionalInfo'] as const) {
      if (body[k] !== undefined) {
        const v = clean(body[k])
        if (k !== 'additionalInfo' && k !== 'label' && !v) {
          return NextResponse.json({ error: `${k} ne peut pas être vide` }, { status: 400 })
        }
        ;(addr as any)[k] = k === 'label' ? v || 'Domicile' : v || undefined
      }
    }
    if (body.isDefault === true) {
      list.forEach((a) => { a.isDefault = false })
      addr.isDefault = true
    }
    await user.save()
    return NextResponse.json({ success: true, address: serialize(addr) })
  } catch (error) {
    return errResponse(error)
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { userId } = await requireAuth(request)
    const id = clean(request.nextUrl.searchParams.get('id'))
    if (!id) return NextResponse.json({ error: 'id requis' }, { status: 400 })

    const user = await loadUser(userId)
    const addr = user?.savedAddresses?.id(id)
    if (!user || !addr) return NextResponse.json({ error: 'Adresse introuvable' }, { status: 404 })

    const wasDefault = addr.isDefault
    addr.deleteOne()
    const list = user.savedAddresses!
    if (wasDefault && list.length > 0) {
      list[0].isDefault = true
    }
    await user.save()
    return NextResponse.json({ success: true })
  } catch (error) {
    return errResponse(error)
  }
}
