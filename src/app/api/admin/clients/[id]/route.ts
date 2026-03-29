import { NextRequest, NextResponse } from 'next/server'
import { connectMongoose } from '@/lib/mongoose'
import Client from '@/lib/models/Client'
import Contact from '@/lib/models/Contact'
import User from '@/lib/models/User'
import { requireAuth } from '@/lib/jwt'

function requireAdmin(request: NextRequest) {
  return requireAuth(request).then(({ role }) => {
    const r = String(role || '').toUpperCase()
    if (!['ADMIN', 'SUPER_ADMIN'].includes(r)) throw new Error('Accès non autorisé')
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

    // Charger les contacts associés
    const contacts = await Contact.find({ clientId: id }).sort({ isPrimary: -1, nom: 1 }).lean()
    const contactsMapped = contacts.map((c: any) => ({ ...c, id: String(c._id) }))

    return NextResponse.json({ success: true, client, contacts: contactsMapped })
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
    const { name, email, phone, company, address, city, country, canAccessPortal, notes, isActive, tags, category, rating, contacts, contactPrincipal } = body
    const normalizedEmail = email !== undefined ? String(email).toLowerCase().trim() : undefined

    // Vérifier si le client existe
    const existingClient = await Client.findById(id)
    if (!existingClient) {
      return NextResponse.json({ 
        success: false, 
        error: 'Client non trouvé' 
      }, { status: 404 })
    }

    // Si l'email change, vérifier qu'il n'existe pas déjà
    if (normalizedEmail && normalizedEmail !== existingClient.email) {
      const emailExists = await Client.findOne({ email: normalizedEmail, _id: { $ne: id } })
      if (emailExists) {
        return NextResponse.json({ 
          success: false, 
          error: 'Un client avec cet email existe déjà' 
        }, { status: 400 })
      }
    }

    // Synchroniser le compte utilisateur CLIENT lié à cette entreprise
    const linkedUser = await User.findOne({ companyClientId: id, role: 'CLIENT' })
    if (linkedUser) {
      const userSetData: any = {
        ...(name !== undefined ? { name } : {}),
        ...(phone !== undefined ? { phone } : {}),
        ...(company !== undefined ? { company: company || name || linkedUser.name } : {}),
        ...(canAccessPortal !== undefined ? { isActive: Boolean(canAccessPortal) } : {}),
        companyClientId: id
      }

      if (normalizedEmail && normalizedEmail !== linkedUser.email) {
        const existingUserWithEmail = await User.findOne({ email: normalizedEmail, _id: { $ne: linkedUser._id } })
        if (!existingUserWithEmail) {
          userSetData.email = normalizedEmail
        }
      }

      await User.updateOne({ _id: linkedUser._id }, { $set: userSetData })
    }

    // Mettre à jour le client
    const updateData: any = {}
    if (name !== undefined) updateData.name = name
    if (normalizedEmail !== undefined) updateData.email = normalizedEmail
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

    if (contactPrincipal !== undefined) updateData.contactPerson = contactPrincipal

    const client = await Client.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    )

    // Mettre à jour les contacts supplémentaires si fournis
    if (Array.isArray(contacts)) {
      // Supprimer les anciens contacts et recréer
      await Contact.deleteMany({ clientId: id })
      const contactDocs = contacts
        .filter((c: any) => c.nom?.trim())
        .map((c: any) => ({
          clientId: id,
          nom: c.nom.trim(),
          fonction: c.fonction?.trim() || undefined,
          telephone: c.telephone?.trim() || undefined,
          email: c.email?.trim().toLowerCase() || undefined,
          isPrimary: c.isPrimary || false
        }))
      if (contactDocs.length > 0) {
        await Contact.insertMany(contactDocs)
      }
    }

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

    // Nettoyer les données liées
    await Contact.deleteMany({ clientId: id })

    // Dissocier et désactiver les utilisateurs liés à ce client entreprise
    await User.updateMany(
      { companyClientId: id },
      { $set: { isActive: false }, $unset: { companyClientId: 1 } }
    )

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
