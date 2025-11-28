import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import { connectMongoose } from '@/lib/mongoose'
import Technician from '@/lib/models/Technician'

function requireAdmin(request: NextRequest) {
  const token = request.cookies.get('auth-token')?.value || request.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) throw new Error('Non authentifié')
  const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any
  if (decoded.role !== 'ADMIN') throw new Error('Accès non autorisé')
  return decoded
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectMongoose()
    requireAdmin(request)

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
    requireAdmin(request)

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

    // Si l'email change, vérifier qu'il n'existe pas déjà
    if (email && email !== existingTech.email) {
      const emailExists = await Technician.findOne({ email, _id: { $ne: id } })
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
    if (email !== undefined) updateData.email = email
    if (phone !== undefined) updateData.phone = phone
    if (specialties !== undefined) updateData.specialties = specialties
    if (certifications !== undefined) updateData.certifications = certifications
    if (experience !== undefined) updateData.experience = experience
    if (isActive !== undefined) updateData.isActive = isActive
    
    if (workingHours) {
      updateData['preferences.workingHours'] = workingHours
    }
    
    // Si un nouveau mot de passe est fourni
    if (password && password.trim()) {
      updateData.passwordHash = await bcrypt.hash(password, 10)
    }

    const technician = await Technician.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    ).select('-passwordHash -deviceTokens')

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
    requireAdmin(request)

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





