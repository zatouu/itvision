import { NextRequest, NextResponse } from 'next/server'
import { connectMongoose } from '@/lib/mongoose'
import VendorProfile from '@/lib/models/VendorProfile'
import { verifyAuthServer } from '@/lib/auth-server'

/**
 * GET /api/market/vendors/me — boutique DDM+ du compte connecté.
 * Utilisé par l'app mobile Xeuy pour afficher « Ma boutique » dans le profil.
 * Domaine market : VendorProfile reste ici, l'app consomme via HTTP (pas d'import cross-domaine).
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuthServer(request)
    if (!auth.isAuthenticated || !auth.user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }
    await connectMongoose()
    const shop = await VendorProfile.findOne({ userId: auth.user.id })
      .select('name slug verified rating')
      .lean() as any
    return NextResponse.json({ success: true, shop: shop ? { name: shop.name, slug: shop.slug, verified: !!shop.verified, rating: shop.rating || 0 } : null })
  } catch (e) {
    console.error('[GET /api/market/vendors/me]', e)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
