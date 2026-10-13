/**
 * Points de retrait (admin)
 *   GET    — tous les points
 *   POST   { name, neighborhood, city?, address, landmark?, phone?, hours?, mapsUrl?, sortOrder? }
 *   PATCH  { id, ...champs, active? }
 *   DELETE ?id= — désactivation (les commandes passées gardent leur point)
 */
import { NextRequest, NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { z } from 'zod'
import { connectMongoose } from '@/lib/mongoose'
import { requireAdminApi } from '@/lib/api-auth'
import PickupPoint from '@/lib/models/PickupPoint'

const ROLES = ['ADMIN', 'SUPER_ADMIN']

const fields = {
  name: z.string().trim().min(2).max(80),
  neighborhood: z.string().trim().min(2).max(80),
  city: z.string().trim().min(2).max(80).optional(),
  address: z.string().trim().min(3).max(200),
  landmark: z.string().trim().max(200).optional(),
  phone: z.string().trim().max(30).optional(),
  hours: z.string().trim().max(120).optional(),
  mapsUrl: z.string().trim().max(500).regex(/^https:\/\//, 'Lien de carte en https').optional().or(z.literal('')),
  sortOrder: z.number().int().min(0).max(9999).optional(),
}
const createSchema = z.object(fields)
const patchSchema = createSchema.partial().extend({ id: z.string(), active: z.boolean().optional() })

export async function GET(request: NextRequest) {
  const auth = await requireAdminApi(request, ROLES)
  if (!auth.ok) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
  await connectMongoose()
  const points = await PickupPoint.find({}).sort({ active: -1, sortOrder: 1, neighborhood: 1 }).lean() as any[]
  return NextResponse.json({ success: true, points: points.map(p => ({ ...p, id: String(p._id), _id: undefined })) })
}

export async function POST(request: NextRequest) {
  const auth = await requireAdminApi(request, ROLES)
  if (!auth.ok) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
  const parsed = createSchema.safeParse(await request.json().catch(() => ({})))
  if (!parsed.success) return NextResponse.json({ success: false, error: parsed.error.issues.map(i => `${i.path.join('.')} : ${i.message}`).join(', ') }, { status: 400 })
  await connectMongoose()
  const point = await PickupPoint.create({ ...parsed.data, city: parsed.data.city || 'Dakar', mapsUrl: parsed.data.mapsUrl || undefined })
  return NextResponse.json({ success: true, id: String(point._id) }, { status: 201 })
}

export async function PATCH(request: NextRequest) {
  const auth = await requireAdminApi(request, ROLES)
  if (!auth.ok) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
  const parsed = patchSchema.safeParse(await request.json().catch(() => ({})))
  if (!parsed.success || !mongoose.isValidObjectId(parsed.data.id)) {
    return NextResponse.json({ success: false, error: 'Données invalides' }, { status: 400 })
  }
  const { id, ...rest } = parsed.data as any
  await connectMongoose()
  const res = await PickupPoint.updateOne({ _id: id }, { $set: rest })
  if (res.matchedCount === 0) return NextResponse.json({ success: false, error: 'Point introuvable' }, { status: 404 })
  return NextResponse.json({ success: true })
}

export async function DELETE(request: NextRequest) {
  const auth = await requireAdminApi(request, ROLES)
  if (!auth.ok) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
  const id = new URL(request.url).searchParams.get('id') || ''
  if (!mongoose.isValidObjectId(id)) return NextResponse.json({ success: false, error: 'Point invalide' }, { status: 400 })
  await connectMongoose()
  await PickupPoint.updateOne({ _id: id }, { $set: { active: false } })
  return NextResponse.json({ success: true })
}
