import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import User from '@/lib/models/User'
import { connectMongoose } from '@/lib/mongoose'

/**
 * GET /api/auth/me
 * Retourne l'utilisateur connecté basé sur le cookie auth-token ou le header Authorization
 */
export async function GET(request: NextRequest) {
  try {
    // Support cookie ET header Bearer pour compatibilité
    const authHeader = request.headers.get('authorization')
    const cookieToken = request.cookies.get('auth-token')?.value
    
    const token = authHeader?.startsWith('Bearer ') 
      ? authHeader.slice(7) 
      : cookieToken

    if (!token) {
      return NextResponse.json({ user: null }, { status: 200 })
    }

    const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'default-secret-key')
    
    try {
      const { payload } = await jwtVerify(token, secret)
      
      await connectMongoose()
      
      // Récupérer les infos utilisateur fraîches de la base
      const user = await User.findById(payload.userId)
        .select('_id email username name role phone avatar')
        .lean() as { _id: string; email: string; username: string; name?: string; role: string; phone?: string; avatar?: string } | null

      if (!user) {
        return NextResponse.json({ user: null }, { status: 200 })
      }

      return NextResponse.json({
        user: {
          id: String(user._id),
          email: user.email,
          username: user.username,
          name: user.name || user.username,
          role: user.role,
          phone: user.phone,
          avatar: user.avatar
        }
      })
    } catch (jwtError) {
      // Token invalide ou expiré
      return NextResponse.json({ user: null }, { status: 200 })
    }
  } catch (error) {
    console.error('Erreur /api/auth/me:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
