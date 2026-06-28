import { NextRequest, NextResponse } from 'next/server'
import { connectMongoose } from '@/lib/mongoose'
import User from '@/lib/models/User'
import { signAuthTokenWithExpiry } from '@/lib/jwt'
import { applyRateLimit, RateLimiter } from '@/lib/rate-limiter'
import { createUniqueReferralCode } from '@/lib/referral'
import { creditPoints, getAppConfig } from '@/lib/wallet'
import { createUserProfiles } from '@/lib/user-profiles'

const oauthLimiter = new RateLimiter(15 * 60 * 1000, 10)

interface GoogleTokenInfo {
  sub: string
  email: string
  email_verified?: string
  name?: string
  picture?: string
  aud?: string
  iss?: string
  error?: string
  error_description?: string
}

async function verifyGoogleIdToken(idToken: string): Promise<GoogleTokenInfo | null> {
  try {
    const r = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`)
    if (!r.ok) return null
    const data = await r.json() as GoogleTokenInfo
    if (data.error || !data.sub || !data.email) return null

    const expectedClientId = process.env.GOOGLE_OAUTH_CLIENT_ID
    if (expectedClientId && data.aud !== expectedClientId) {
      console.error('[oauth] Google aud mismatch:', data.aud, 'expected:', expectedClientId)
      return null
    }

    return data
  } catch (err) {
    console.error('[oauth] Google token verification failed:', err)
    return null
  }
}

interface FacebookDebugInfo {
  data: {
    is_valid: boolean
    user_id: string
    email?: string
    name?: string
    picture?: { data: { url: string } }
    error?: { message: string }
  }
}

async function verifyFacebookAccessToken(accessToken: string): Promise<GoogleTokenInfo | null> {
  try {
    const appId = process.env.FACEBOOK_APP_ID
    const appSecret = process.env.FACEBOOK_APP_SECRET
    if (!appId || !appSecret) return null

    const debugUrl = `https://graph.facebook.com/debug_token?input_token=${encodeURIComponent(accessToken)}&access_token=${appId}|${appSecret}`
    const r = await fetch(debugUrl)
    if (!r.ok) return null
    const debug = await r.json() as FacebookDebugInfo
    if (!debug.data?.is_valid || !debug.data?.user_id) return null

    const profileUrl = `https://graph.facebook.com/me?fields=id,email,name,picture&access_token=${encodeURIComponent(accessToken)}`
    const pr = await fetch(profileUrl)
    if (!pr.ok) return null
    const profile = await pr.json() as any

    return {
      sub: profile.id,
      email: profile.email || `${profile.id}@facebook.com`,
      email_verified: 'true',
      name: profile.name,
      picture: profile.picture?.data?.url,
    }
  } catch (err) {
    console.error('[oauth] Facebook token verification failed:', err)
    return null
  }
}

export async function POST(request: NextRequest) {
  const rl = applyRateLimit(request, oauthLimiter)
  if (rl) return rl

  try {
    const body = await request.json().catch(() => null)
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Payload invalide' }, { status: 400 })
    }

    const { provider, idToken, accessToken, role: rawRole } = body as any

    if (!provider || typeof provider !== 'string') {
      return NextResponse.json({ error: 'Provider requis' }, { status: 400 })
    }

    const role = rawRole === 'PROVIDER' ? 'PROVIDER' : 'CLIENT'

    let profile: GoogleTokenInfo | null = null

    if (provider === 'google') {
      if (!idToken || typeof idToken !== 'string') {
        return NextResponse.json({ error: 'ID token requis pour Google' }, { status: 400 })
      }
      profile = await verifyGoogleIdToken(idToken)
    } else if (provider === 'facebook') {
      if (!accessToken || typeof accessToken !== 'string') {
        return NextResponse.json({ error: 'Access token requis pour Facebook' }, { status: 400 })
      }
      profile = await verifyFacebookAccessToken(accessToken)
    } else {
      return NextResponse.json({ error: `Provider "${provider}" non supporté` }, { status: 400 })
    }

    if (!profile) {
      return NextResponse.json({ error: 'Token OAuth invalide ou expiré' }, { status: 401 })
    }

    await connectMongoose()

    // Try to find user by OAuth ID first, then by email
    let user = await User.findOne({ oauthProvider: provider, oauthId: profile.sub }).lean() as any

    if (!user && profile.email) {
      user = await User.findOne({ email: profile.email.toLowerCase() }).lean() as any
      // Link existing account to OAuth
      if (user) {
        await User.updateOne({ _id: user._id }, { $set: { oauthProvider: provider, oauthId: profile.sub } })
      }
    }

    if (!user) {
      // Create new user from OAuth profile
      const displayName = profile.name || profile.email.split('@')[0]
      const referralCode = await createUniqueReferralCode()
      const newUser = await User.create({
        username: `${provider}_${profile.sub}`.slice(0, 50),
        email: profile.email,
        passwordHash: '___oauth_only___',
        name: displayName,
        avatarUrl: profile.picture || undefined,
        role: role === 'PROVIDER' ? 'TECHNICIAN' : 'CLIENT',
        isActive: true,
        loginAttempts: 0,
        referralCode,
        referralBalance: 0,
        referralCount: 0,
        oauthProvider: provider,
        oauthId: profile.sub,
      })
      user = newUser.toObject()

      // Create domain profiles
      const mappedRole = role === 'PROVIDER' ? 'TECHNICIAN' : 'CLIENT'
      await createUserProfiles(newUser._id, mappedRole, {
        referralCode,
        referralBalance: 0,
        referralCount: 0,
      }).catch(profileErr => {
        console.error('[oauth] Erreur création profils:', profileErr)
      })

      // Welcome points (best effort)
      try {
        const cfg = await getAppConfig()
        if (cfg.monetization.welcomePoints > 0) {
          await creditPoints(String(user._id), cfg.monetization.welcomePoints, 'welcome', {
            description: 'Crédit de bienvenue',
          })
        }
      } catch (welcomeErr) {
        console.error('[oauth] Erreur crédit bienvenue', welcomeErr)
      }
    }

    // Generate JWT (30 days)
    const token = await signAuthTokenWithExpiry(
      {
        userId: String(user._id),
        email: user.email,
        role: role === 'PROVIDER' ? 'PROVIDER' : 'CLIENT',
        username: user.username,
        phone: user.phone || '',
      },
      '30d'
    )

    return NextResponse.json({
      success: true,
      token,
      user: {
        _id: String(user._id),
        name: user.name,
        phone: user.phone || '',
        role,
        isNew: false,
        referralCode: user.referralCode,
        referralBalance: user.referralBalance || 0,
      },
    })
  } catch (err) {
    console.error('[POST /api/auth/mobile/oauth]', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
