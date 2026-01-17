import { NextRequest, NextResponse } from 'next/server'
import { connectMongoose } from '@/lib/mongoose'
import Client from '@/lib/models/Client'
import { requireAuth } from '@/lib/jwt'

function requireAdmin(request: NextRequest) {
  return requireAuth(request).then(({ role }) => {
    if (String(role || '').toUpperCase() !== 'ADMIN') throw new Error('Accès non autorisé')
  })
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectMongoose()
    await requireAdmin(request)

    const { id } = await params
    const client = await Client.findById(id).lean()

    if (!client) {
      return NextResponse.json({ 
        success: false, 
        error: 'Client non trouvé' 
      }, { status: 404 })
    }

    return NextResponse.json({ success: true, client })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur'
    const status = message.includes('auth') || message.includes('autorisé') ? 401 : 500
    return NextResponse.json({ error: message, success: false }, { status })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectMongoose()
    await requireAdmin(request)

    const { id } = await params
    const body = await request.json()
    const { name, email, phone, company, address, city, country, canAccessPortal, notes, isActive, tags, category, rating } = body

    // Vérifier si le client existe
    const existingClient = await Client.findById(id)
    if (!existingClient) {
      return NextResponse.json({ 
        success: false, 
        error: 'Client non trouvé' 
      }, { status: 404 })
    }

    // Si l'email change, vérifier qu'il n'existe pas déjà
    if (email && email !== existingClient.email) {
      const emailExists = await Client.findOne({ email, _id: { $ne: id } })
      if (emailExists) {
        return NextResponse.json({ 
          success: false, 
          error: 'Un client avec cet email existe déjà' 
        }, { status: 400 })
      }
    }

    // Mettre à jour le client
    const updateData: any = {}
    if (name !== undefined) updateData.name = name
    if (email !== undefined) updateData.email = email
    if (phone !== undefined) updateData.phone = phone
    if (company !== undefined) updateData.company = company
    if (address !== undefined) updateData.address = address
    if (city !== undefined) updateData.city = city
    if (country !== undefined) updateData.country = country
    if (notes !== undefined) updateData.notes = notes
    if (isActive !== undefined) updateData.isActive = isActive
    if (tags !== undefined) updateData.tags = tags
    if (category !== undefined) updateData.category = category
    if (rating !== undefined) updateData.rating = rating
    if (canAccessPortal !== undefined) {
      updateData['permissions.canAccessPortal'] = canAccessPortal
    }
    updateData.lastContact = new Date()

    const client = await Client.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    )

    return NextResponse.json({ 
      success: true, 
      client,
      message: 'Client mis à jour avec succès'
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur lors de la mise à jour'
    const status = message.includes('auth') || message.includes('autorisé') ? 401 : 500
    return NextResponse.json({ error: message, success: false }, { status })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectMongoose()
    await requireAdmin(request)

    const { id } = await params

    // Vérifier si le client existe
    const client = await Client.findById(id)
    if (!client) {
      return NextResponse.json({ 
        success: false, 
        error: 'Client non trouvé' 
      }, { status: 404 })
    }

    // Supprimer le client
    await Client.findByIdAndDelete(id)

    return NextResponse.json({ 
      success: true,
      message: 'Client supprimé avec succès'
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur lors de la suppression'
    const status = message.includes('auth') || message.includes('autorisé') ? 401 : 500
    return NextResponse.json({ error: message, success: false }, { status })
  }
}
