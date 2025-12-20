import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { connectMongoose } from '@/lib/mongoose'
import Contact from '@/lib/models/Contact'

function requireAdmin(request: NextRequest) {
  const token = request.cookies.get('auth-token')?.value || request.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) throw new Error('Non authentifié')
  const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any
  if (String(decoded.role || '').toUpperCase() !== 'ADMIN') throw new Error('Accès non autorisé')
  return decoded
}

// GET - Liste des contacts d'un client
export async function GET(request: NextRequest) {
  try {
    await connectMongoose()
    requireAdmin(request)

    const { searchParams } = new URL(request.url)
    const clientId = searchParams.get('clientId')

    if (!clientId) {
      return NextResponse.json({ error: 'clientId requis' }, { status: 400 })
    }

    const contacts = await Contact.find({ clientId }).sort({ isPrimary: -1, nom: 1 }).lean()

    return NextResponse.json({
      success: true,
      contacts: contacts.map((c: any) => ({ ...c, id: String(c._id) }))
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// POST - Créer un contact
export async function POST(request: NextRequest) {
  try {
    await connectMongoose()
    requireAdmin(request)

    const body = await request.json()
    const { clientId, nom, fonction, telephone, email, isPrimary } = body

    if (!clientId || !nom) {
      return NextResponse.json({ error: 'clientId et nom requis' }, { status: 400 })
    }

    // Si c'est le contact principal, désactiver les autres
    if (isPrimary) {
      await Contact.updateMany({ clientId, isPrimary: true }, { isPrimary: false })
    }

    const contact = await Contact.create({
      clientId,
      nom,
      fonction,
      telephone,
      email,
      isPrimary: isPrimary || false
    })

    return NextResponse.json({
      success: true,
      contact: {
        id: String(contact._id),
        ...contact.toObject()
      }
    }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// PUT - Modifier un contact
export async function PUT(request: NextRequest) {
  try {
    await connectMongoose()
    requireAdmin(request)

    const body = await request.json()
    const { id, ...updateData } = body

    if (!id) {
      return NextResponse.json({ error: 'ID contact requis' }, { status: 400 })
    }

    // Si on définit comme principal, désactiver les autres
    if (updateData.isPrimary) {
      const contact = await Contact.findById(id)
      if (contact) {
        await Contact.updateMany(
          { clientId: contact.clientId, _id: { $ne: id }, isPrimary: true },
          { isPrimary: false }
        )
      }
    }

    const contact = await Contact.findByIdAndUpdate(id, updateData, { new: true })

    if (!contact) {
      return NextResponse.json({ error: 'Contact non trouvé' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      contact: {
        id: String(contact._id),
        ...contact.toObject()
      }
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// DELETE - Supprimer un contact
export async function DELETE(request: NextRequest) {
  try {
    await connectMongoose()
    requireAdmin(request)

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'ID contact requis' }, { status: 400 })
    }

    await Contact.findByIdAndDelete(id)

    return NextResponse.json({ success: true, message: 'Contact supprimé' })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}










