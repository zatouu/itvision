import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { connectMongoose } from '@/lib/mongoose'
import Technician from '@/lib/models/Technician'
import User from '@/lib/models/User'
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
    const technician = await Technician.findById(id)
      .select('-passwordHash -deviceTokens')
      .lean()

    if (!technician) {
      return NextResponse.json({ 
        success: false, 
        error: 'Technicien non trouvé' 
      }, { status: 404 })
    }

    return NextResponse.json({ success: true, technician })
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
    const { 
      name, 
      email, 
      phone, 
      password,
      specialties, 
      certifications, 
      experience,
      workingHours,
      isActive 
    } = body

    // Vérifier si le technicien existe
    const existingTech = await Technician.findById(id)
    if (!existingTech) {
      return NextResponse.json({ 
        success: false, 
        error: 'Technicien non trouvé' 
      }, { status: 404 })
    }

    const normalizedEmail = email ? String(email).toLowerCase().trim() : undefined

    // Si l'email change, vérifier qu'il n'existe pas déjà
    if (normalizedEmail && normalizedEmail !== String(existingTech.email).toLowerCase()) {
      const emailExists = await Technician.findOne({ email: normalizedEmail, _id: { $ne: id } })
      if (emailExists) {
        return NextResponse.json({ 
          success: false, 
          error: 'Un technicien avec cet email existe déjà' 
        }, { status: 400 })
      }
    }

    // Préparer les données de mise à jour
    const updateData: any = {}
    if (name !== undefined) updateData.name = name
    if (normalizedEmail !== undefined) updateData.email = normalizedEmail
    if (phone !== undefined) updateData.phone = phone
    if (specialties !== undefined) updateData.specialties = specialties
    if (certifications !== undefined) updateData.certifications = certifications
    if (experience !== undefined) updateData.experience = experience
    if (isActive !== undefined) updateData.isActive = isActive
    
    if (workingHours) {
      updateData['preferences.workingHours'] = workingHours
    }
    
    // Si un nouveau mot de passe est fourni
    let newPasswordHash: string | undefined
    if (password && password.trim()) {
      newPasswordHash = await bcrypt.hash(password, 10)
      updateData.passwordHash = newPasswordHash
    }

    const technician = await Technician.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    ).select('-passwordHash -deviceTokens')

    // Synchroniser le User TECHNICIAN associé (email + mot de passe)
    try {
      const userEmailRegex = new RegExp('^' + String(existingTech.email).toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i')
      const userUpdate: any = {}
      if (normalizedEmail !== undefined) userUpdate.email = normalizedEmail
      if (newPasswordHash !== undefined) userUpdate.passwordHash = newPasswordHash
      if (name !== undefined) userUpdate.name = name
      if (phone !== undefined) userUpdate.phone = phone
      if (isActive !== undefined) userUpdate.isActive = isActive
      if (Object.keys(userUpdate).length > 0) {
        const user = await User.findOne({ email: { $regex: userEmailRegex }, role: 'TECHNICIAN' })
        if (user) {
          await User.updateOne({ _id: user._id }, { $set: userUpdate })
        } else if (normalizedEmail !== undefined) {
          // Si le User n'existe pas encore, le créer à partir du technicien mis à jour
          await User.create({
            username: normalizedEmail.split('@')[0] + '_tech_' + Date.now().toString(36),
            email: normalizedEmail,
            passwordHash: newPasswordHash || existingTech.passwordHash,
            name: name || existingTech.name,
            phone: phone || existingTech.phone || '',
            role: 'TECHNICIAN',
            isActive: isActive !== undefined ? isActive : existingTech.isActive
          })
        }
      }
    } catch (syncError) {
      console.error('[PUT /api/admin/technicians/[id]] sync user failed', syncError)
    }

    return NextResponse.json({ 
      success: true, 
      technician,
      message: 'Technicien mis à jour avec succès'
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

    // Vérifier si le technicien existe
    const technician = await Technician.findById(id)
    if (!technician) {
      return NextResponse.json({ 
        success: false, 
        error: 'Technicien non trouvé' 
      }, { status: 404 })
    }

    // Supprimer le technicien
    await Technician.findByIdAndDelete(id)

    return NextResponse.json({ 
      success: true,
      message: 'Technicien supprimé avec succès'
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur lors de la suppression'
    const status = message.includes('auth') || message.includes('autorisé') ? 401 : 500
    return NextResponse.json({ error: message, success: false }, { status })
  }
}





