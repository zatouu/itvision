import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { connectMongoose } from '@/lib/mongoose'
import Technician from '@/lib/models/Technician'

function requireAdmin(request: NextRequest) {
  const token = request.cookies.get('auth-token')?.value || request.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) throw new Error('Non authentifié')
  const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any
  if (decoded.role !== 'ADMIN') throw new Error('Accès non autorisé')
  return decoded
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
    const { isAvailable } = body

    if (typeof isAvailable !== 'boolean') {
      return NextResponse.json({ 
        success: false, 
        error: 'Le paramètre isAvailable doit être un booléen' 
      }, { status: 400 })
    }

    const technician = await Technician.findByIdAndUpdate(
      id,
      { $set: { isAvailable } },
      { new: true }
    ).select('-passwordHash -deviceTokens')

    if (!technician) {
      return NextResponse.json({ 
        success: false, 
        error: 'Technicien non trouvé' 
      }, { status: 404 })
    }

    return NextResponse.json({ 
      success: true, 
      technician,
      message: `Technicien marqué comme ${isAvailable ? 'disponible' : 'occupé'}`
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur'
    const status = message.includes('auth') || message.includes('autorisé') ? 401 : 500
    return NextResponse.json({ error: message, success: false }, { status })
  }
}





