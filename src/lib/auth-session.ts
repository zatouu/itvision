import type { JWTPayload } from 'jose'
import { connectMongoose } from '@/lib/mongoose'
import User from '@/lib/models/User'
import { isSessionCurrent } from '../../lib/auth-session'

export class SessionStoreUnavailableError extends Error {
  constructor() {
    super('Verification de session temporairement indisponible')
    this.name = 'SessionStoreUnavailableError'
  }
}

export async function assertCurrentSession(payload: JWTPayload): Promise<void> {
  const userId = String(payload.userId || payload.id || payload.sub || '')
  if (userId === 'cron-auto-import' && payload.role === 'ADMIN' && payload.tokenUse === 'service') return
  if (!/^[a-f\d]{24}$/i.test(userId)) throw new Error('Session invalide')
  let user
  try {
    await connectMongoose()
    user = await User.findById(userId).select('sessionVersion isActive deletedAt').lean()
  } catch {
    throw new SessionStoreUnavailableError()
  }
  if (!isSessionCurrent(payload, user)) throw new Error('Session revoquee')
}

export function disconnectWebSessions(userId: string): void {
  try {
    const io = (globalThis as typeof globalThis & { io?: import('socket.io').Server }).io
    io?.in(`web-session-${userId}`).disconnectSockets(true)
  } catch {
    console.warn('[auth] Deconnexion immediate indisponible ; controle periodique des sessions actif')
  }
}