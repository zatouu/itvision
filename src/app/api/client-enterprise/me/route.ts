import { NextRequest, NextResponse } from 'next/server'
import { verifyAuthServer } from '@/lib/auth-server'
import { connectDB } from '@/lib/db'
import mongoose from 'mongoose'
import User from '@/lib/models/User'
import Client from '@/lib/models/Client'
import CorporateProfile from '@/lib/models/CorporateProfile'
import { loadUserWithProfiles } from '@/lib/user-profiles'
import { resolveUserAccess } from '@/lib/domain-access'

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

    const access = await resolveUserAccess({ userId: auth.user.id, role: auth.user.role, email: auth.user.email, companyClientId: auth.user.companyClientId })
    const companyClientId = access?.profiles.companyClientId
    const profileData = await loadUserWithProfiles(auth.user.id)
    const corporateProfile = profileData?.corporateProfile

    if (!companyClientId) {
      return NextResponse.json({ companyName: null, isEnterprise: false })
    }

    const company = await Client.findById(new mongoose.Types.ObjectId(companyClientId))
      .select('name company email phone address city country contactPerson notes logo preferences permissions')
      .lean() as any

    const dbUser = profileData?.user || (await User.findById(auth.user.id)
      .select('name email phone companyClientId')
      .lean() as any)

    return NextResponse.json({
      isEnterprise: true,
      userId: auth.user.id,
      userName: dbUser?.name || auth.user.name || auth.user.email,
      userEmail: dbUser?.email || auth.user.email,
      userPhone: dbUser?.phone || null,
      companyClientId,
      companyName: company?.company || company?.name || corporateProfile?.company || 'Votre entreprise',
      companyEmail: company?.email || null,
      companyPhone: company?.phone || null,
      companyAddress: company?.address || corporateProfile?.address || null,
      companyCity: company?.city || corporateProfile?.city || null,
      companyCountry: company?.country || corporateProfile?.country || 'Sénégal',
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
    const access = await resolveUserAccess({ userId, role: auth.user.role, email: auth.user.email, companyClientId: auth.user.companyClientId })
    const companyClientId = access?.profiles.companyClientId
    const profileData = await loadUserWithProfiles(userId)
    const corporateProfile = profileData?.corporateProfile

    const userUpdates: any = {}
    const userUnsets: Record<string, 1> = {}
    if (body.userName !== undefined && body.userName !== null) userUpdates.name = body.userName
    if (body.userPhone !== undefined) {
      if (body.userPhone) userUpdates.phone = body.userPhone
      else userUnsets.phone = 1
    }
    if (Object.keys(userUpdates).length > 0 || Object.keys(userUnsets).length > 0) {
      const update: any = {}
      if (Object.keys(userUpdates).length > 0) update.$set = userUpdates
      if (Object.keys(userUnsets).length > 0) update.$unset = userUnsets
      await User.findByIdAndUpdate(userId, update, { new: true })
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

      // Ne jamais ecrire de null (validator $jsonSchema eventuel)
      for (const k of Object.keys(companyUpdates)) {
        if (companyUpdates[k] === null) delete companyUpdates[k]
      }

      if (Object.keys(companyUpdates).length > 0) {
        await Client.findByIdAndUpdate(new mongoose.Types.ObjectId(companyClientId), { $set: companyUpdates }, { new: true })
      }
    }

    // Mise à jour du profil corporate découplé
    const corporateUpdates: any = {}
    if (body.companyName) corporateUpdates.company = body.companyName
    if (body.companyAddress) corporateUpdates.address = body.companyAddress
    if (body.companyCity) corporateUpdates.city = body.companyCity
    if (body.companyCountry) corporateUpdates.country = body.companyCountry
    if (companyClientId && corporateProfile && !corporateProfile.companyClientId) {
      corporateUpdates.companyClientId = new mongoose.Types.ObjectId(companyClientId)
    }
    if (Object.keys(corporateUpdates).length > 0) {
      await CorporateProfile.findOneAndUpdate(
        { userId: new mongoose.Types.ObjectId(userId) },
        { $set: corporateUpdates },
        { new: true, upsert: true }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[/api/client-enterprise/me] PUT', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
