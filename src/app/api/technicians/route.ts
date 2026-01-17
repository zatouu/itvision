import { NextRequest, NextResponse } from 'next/server'
import { connectMongoose } from '@/lib/mongoose'
import Technician from '@/lib/models/Technician'
import bcrypt from 'bcryptjs'
import { requireAuth } from '@/lib/jwt'

async function requireAdmin(request: NextRequest) {
  try {
    const { role } = await requireAuth(request)
    if (role !== 'ADMIN') return { ok: false as const, status: 403, error: 'Accès refusé' as const }
    return { ok: true as const }
  } catch {
    return { ok: false as const, status: 401, error: 'Non authentifié' as const }
  }
}

// GET - Récupérer tous les techniciens
export async function GET(request: NextRequest) {
  try {
    await connectMongoose()
    
    const { searchParams } = new URL(request.url)
    const zone = searchParams.get('zone') || undefined
    const skills = searchParams.get('skills')?.split(',').filter(Boolean) || []
    const available = searchParams.get('available')
    const email = searchParams.get('email') || undefined
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100)
    const skip = Math.max(parseInt(searchParams.get('skip') || '0'), 0)

    const query: any = {}
    if (zone && zone !== 'all') query['preferences.zone'] = zone
    if (skills.length > 0) query.specialties = { $all: skills }
    if (available != null) query.isAvailable = available === 'true'
    if (email) query.email = email.toLowerCase()

    const [items, total] = await Promise.all([
      Technician.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Technician.countDocuments(query)
    ])

    return NextResponse.json({ success: true, technicians: items, total })

  } catch (error) {
    console.error('Erreur API techniciens:', error)
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    )
  }
}

// POST - Ajouter un nouveau technicien
export async function POST(request: NextRequest) {
  try {
    await connectMongoose()
    const auth = await requireAdmin(request)
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })
    
    const body = await request.json()
    const { name, email, phone, specialties, experience, isAvailable, password } = body || {}

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: 'Champs requis manquants' },
        { status: 400 }
      )
    }

    const exists = await Technician.findOne({ email: email.toLowerCase() }).lean()
    if (exists) return NextResponse.json({ error: 'Technicien déjà existant' }, { status: 409 })

    const passwordHash = await bcrypt.hash(password, 12)
    const created = await Technician.create({
      name,
      email: email.toLowerCase(),
      phone: phone || '',
      passwordHash,
      specialties: Array.isArray(specialties) ? specialties : [],
      experience: Number(experience) || 0,
      isAvailable: isAvailable !== false,
    })

    return NextResponse.json({ success: true, technician: { id: String(created._id), name: created.name, email: created.email, phone: created.phone, isAvailable: created.isAvailable, specialties: created.specialties } }, { status: 201 })

  } catch (error) {
    console.error('Erreur création technicien:', error)
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    )
  }
}

// PATCH - Mettre à jour partiellement un technicien
export async function PATCH(request: NextRequest) {
  try {
    await connectMongoose()
    const auth = await requireAdmin(request)
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

    const body = await request.json()
    const { id, action, ...data } = body || {}
    if (!id) return NextResponse.json({ error: 'ID requis' }, { status: 400 })

    if (action === 'set_availability' && typeof data.isAvailable === 'boolean') {
      await Technician.updateOne({ _id: id }, { $set: { isAvailable: data.isAvailable } })
    } else if (action === 'reset_password' && data.newPassword) {
      const passwordHash = await bcrypt.hash(String(data.newPassword), 12)
      await Technician.updateOne({ _id: id }, { $set: { passwordHash } })
    } else {
      await Technician.updateOne({ _id: id }, { $set: data })
    }

    const updated = await Technician.findById(id).lean()
    return NextResponse.json({ success: true, technician: updated })
  } catch (error) {
    return NextResponse.json({ error: 'Erreur mise à jour' }, { status: 500 })
  }
}

// DELETE - Supprimer un technicien
export async function DELETE(request: NextRequest) {
  try {
    await connectMongoose()
    const auth = await requireAdmin(request)
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'ID requis' }, { status: 400 })
    await Technician.deleteOne({ _id: id })
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Erreur suppression' }, { status: 500 })
  }
}
