import { NextRequest, NextResponse } from 'next/server'
import { verifyAuthServer } from '@/lib/auth-server'
import { connectDB } from '@/lib/db'
import mongoose from 'mongoose'
import User from '@/lib/models/User'
import Client from '@/lib/models/Client'

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuthServer(request)
    if (!auth.isAuthenticated || !auth.user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }
    if (auth.user.role !== 'CLIENT') {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
    }

    await connectDB()

    let companyClientId = auth.user.companyClientId

    // Fallback DB si absent du JWT (vieux token)
    if (!companyClientId) {
      const dbUser = await User.findById(auth.user.id).select('companyClientId').lean() as any
      if (dbUser?.companyClientId) {
        companyClientId = String(dbUser.companyClientId)
      }
    }

    if (!companyClientId) {
      return NextResponse.json({ companyName: null, isEnterprise: false })
    }

    const company = await Client.findById(new mongoose.Types.ObjectId(companyClientId))
      .select('name company email phone address city country contactPerson notes logo preferences permissions')
      .lean() as any

    const dbUser = await User.findById(auth.user.id)
      .select('name email phone companyClientId')
      .lean() as any

    return NextResponse.json({
      isEnterprise: true,
      userId: auth.user.id,
      userName: dbUser?.name || auth.user.name || auth.user.email,
      userEmail: dbUser?.email || auth.user.email,
      userPhone: dbUser?.phone || null,
      companyClientId,
      companyName: company?.company || company?.name || 'Votre entreprise',
      companyEmail: company?.email || null,
      companyPhone: company?.phone || null,
      companyAddress: company?.address || null,
      companyCity: company?.city || null,
      companyCountry: company?.country || 'Sénégal',
      companyContactPerson: company?.contactPerson || null,
      companyNotes: company?.notes || null,
      companyLogo: company?.logo || null,
      preferences: company?.preferences || { emailNotifications: true, smsNotifications: false, reportFormat: 'web', language: 'fr' },
      permissions: company?.permissions || { canViewReports: true, canRequestMaintenance: true, canAccessPortal: true },
    })
  } catch (error) {
    console.error('[/api/client-enterprise/me] GET', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const auth = await verifyAuthServer(request)
    if (!auth.isAuthenticated || !auth.user || auth.user.role !== 'CLIENT') {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const body = await request.json()
    await connectDB()

    const userId = auth.user.id
    let companyClientId = auth.user.companyClientId

    if (!companyClientId) {
      const dbUser = await User.findById(userId).select('companyClientId').lean() as any
      if (dbUser?.companyClientId) {
        companyClientId = String(dbUser.companyClientId)
      }
    }

    const updates: any = {}

    // Mise à jour utilisateur
    if (body.userName !== undefined) updates.name = body.userName
    if (body.userPhone !== undefined) updates.phone = body.userPhone
    if (Object.keys(updates).length > 0) {
      await User.findByIdAndUpdate(userId, updates, { new: true })
    }

    // Mise à jour entreprise
    if (companyClientId) {
      const companyUpdates: any = {}
      if (body.companyName !== undefined) companyUpdates.company = body.companyName
      if (body.companyEmail !== undefined) companyUpdates.email = body.companyEmail
      if (body.companyPhone !== undefined) companyUpdates.phone = body.companyPhone
      if (body.companyAddress !== undefined) companyUpdates.address = body.companyAddress
      if (body.companyCity !== undefined) companyUpdates.city = body.companyCity
      if (body.companyCountry !== undefined) companyUpdates.country = body.companyCountry
      if (body.companyContactPerson !== undefined) companyUpdates.contactPerson = body.companyContactPerson
      if (body.companyNotes !== undefined) companyUpdates.notes = body.companyNotes
      if (body.preferences !== undefined) companyUpdates.preferences = body.preferences

      if (Object.keys(companyUpdates).length > 0) {
        await Client.findByIdAndUpdate(new mongoose.Types.ObjectId(companyClientId), companyUpdates, { new: true })
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[/api/client-enterprise/me] PUT', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
