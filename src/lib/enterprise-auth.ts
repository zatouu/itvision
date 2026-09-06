/**
 * Helper d'authentification robuste pour le portail entreprise.
 * - Lit le JWT via verifyAuthServer()
 * - Si companyClientId absent du JWT (vieux token), le cherche en DB
 * - Retourne aussi le nom de l'entreprise pour l'affichage
 */
import { redirect } from 'next/navigation'
import { verifyAuthServer } from '@/lib/auth-server'
import mongoose from 'mongoose'
import { resolveUserAccess } from '@/lib/domain-access'
import { connectDB } from '@/lib/db'
import Client from '@/lib/models/Client'

export interface EnterpriseSession {
  userId: mongoose.Types.ObjectId
  companyId: mongoose.Types.ObjectId
  email?: string
  userName?: string
  companyName: string
  companyCity?: string
}

export async function getEnterpriseSession(redirectTo?: string): Promise<EnterpriseSession> {
  const auth = await verifyAuthServer()

  if (!auth.isAuthenticated || !auth.user) {
    redirect(redirectTo ? `/login?redirect=${redirectTo}` : '/login')
  }

  // SUPER_ADMIN et ADMIN peuvent accéder au portail entreprise (mode preview)
  const isAdmin = ['ADMIN', 'SUPER_ADMIN'].includes(auth.user!.role)
  if (!isAdmin && auth.user!.role !== 'CLIENT') {
    redirect('/login')
  }

  // Résolution centralisée : profils + fallback companyClientId (vieux tokens)
  const access = isAdmin ? null : await resolveUserAccess({
    userId: auth.user!.id,
    role: auth.user!.role,
    email: auth.user!.email,
    companyClientId: auth.user!.companyClientId,
  })
  const companyClientId = access?.profiles.companyClientId

  if (!companyClientId) {
    redirect('/compte')
  }

  await connectDB()
  const userId = new mongoose.Types.ObjectId(auth.user!.id)
  const companyId = new mongoose.Types.ObjectId(companyClientId)

  // Nom de l'entreprise depuis le document Client
  const company = await Client.findById(companyId)
    .select('name company city country')
    .lean() as any

  const companyName = company?.company || company?.name || 'Votre entreprise'

  return {
    userId,
    companyId,
    email: auth.user!.email,
    userName: auth.user!.name,
    companyName,
    companyCity: company?.city,
  }
}
