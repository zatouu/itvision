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
      .select('name company city country logo')
      .lean() as any

    return NextResponse.json({
      isEnterprise: true,
      userId: auth.user.id,
      companyClientId,
      companyName: company?.company || company?.name || 'Votre entreprise',
      companyCity: company?.city || null,
      companyLogo: company?.logo || null,
      userName: auth.user.name || auth.user.email,
    })
  } catch (error) {
    console.error('[/api/client-enterprise/me]', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
