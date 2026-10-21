/**
 * Helper d'authentification robuste pour le portail entreprise.
 * - Lit le JWT via verifyAuthServer()
 * - Si companyClientId absent du JWT (vieux token), le cherche en DB
 * - Retourne aussi le nom de l'entreprise pour l'affichage
 * - Expose les capacités effectives (companyRole ∩ Client.permissions) —
 *   cf. domain-access.ts : la même règle sert côté API (requireCompanyCapability)
 *   et côté pages (session.canXxx), jamais dupliquée.
 */
import { cache } from 'react'
import { redirect } from 'next/navigation'
import { verifyAuthServer } from '@/lib/auth-server'
import mongoose from 'mongoose'
import {
  resolveUserAccess,
  companyCapabilities,
  companyPermissionsOf,
  companyRoleOf,
  type CompanyCapability,
  type CompanyPermissions,
  type CompanyRole,
} from '@/lib/domain-access'
import { connectDB } from '@/lib/db'
import Client from '@/lib/models/Client'

export interface EnterpriseSession {
  userId: mongoose.Types.ObjectId
  companyId: mongoose.Types.ObjectId
  email?: string
  userName?: string
  companyName: string
  companyCity?: string
  companyRole: CompanyRole
  permissions: CompanyPermissions
  capabilities: CompanyCapability[]
  canAccessPortal: boolean
  canViewReports: boolean
  canRequestMaintenance: boolean
}

/** Capacités d'une session portail (même source de vérité que l'API). */
export function sessionCan(session: EnterpriseSession, capability: CompanyCapability): boolean {
  return session.capabilities.includes(capability)
}

const resolveEnterpriseSession = cache(async (redirectTo?: string): Promise<EnterpriseSession> => {
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
    .select('name company city country logo brandColor permissions')
    .lean() as any

  const companyName = company?.company || company?.name || 'Votre entreprise'
  const permissions = access ? companyPermissionsOf(access) : {
    canViewReports: company?.permissions?.canViewReports !== false,
    canRequestMaintenance: company?.permissions?.canRequestMaintenance !== false,
    canAccessPortal: company?.permissions?.canAccessPortal !== false,
  }
  const capabilities = access ? Array.from(companyCapabilities(access)) : []

  return {
    userId,
    companyId,
    email: auth.user!.email,
    userName: auth.user!.name,
    companyName,
    companyCity: company?.city,
    companyRole: access ? companyRoleOf(access) : 'owner',
    permissions,
    capabilities,
    canAccessPortal: isAdmin ? true : permissions.canAccessPortal,
    canViewReports: isAdmin ? true : permissions.canViewReports,
    canRequestMaintenance: isAdmin ? true : permissions.canRequestMaintenance,
  }
})

export async function getEnterpriseSession(redirectTo?: string): Promise<EnterpriseSession> {
  return resolveEnterpriseSession(redirectTo)
}
