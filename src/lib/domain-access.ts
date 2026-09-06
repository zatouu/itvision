/**
 * Accès par domaine — Étape 2 (cf. AUDIT_GLOBAL_SORTIE_MONOLITHE.md §5)
 *
 * Point d'entrée unique pour l'autorisation côté API :
 * - résout le token (JWT interne ou Keycloak) via verifyAuthToken
 * - résout les profils de l'utilisateur en DB UNE SEULE FOIS, avec
 *   fallback pour les anciens JWT sans companyClientId (logique
 *   auparavant dupliquée dans enterprise-auth.ts et client-enterprise/me)
 * - vérifie l'appartenance au domaine demandé
 * - fournit companyScope() pour les filtres de données à convention mixte
 *   (clientId reçoit parfois un userId, parfois un companyId en legacy)
 *
 * Objectif : verifyAuthServer / requireAuth restent les helpers de token ;
 * requireDomainAccess est le helper de DROITS par domaine.
 */
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { verifyAuthToken, type JwtUser } from '@/lib/jwt'
import { connectMongoose } from '@/lib/mongoose'
import User from '@/lib/models/User'
import Client from '@/lib/models/Client'

export type AccessDomain = 'corporate' | 'market' | 'xeuy' | 'admin' | 'shared'

const STAFF_ROLES = ['ADMIN', 'SUPER_ADMIN', 'PRODUCT_MANAGER', 'ACCOUNTANT']
const ADMIN_ROLES = ['ADMIN', 'SUPER_ADMIN']

export interface UserAccess {
  userId: string
  role: string
  email?: string
  /** Tous les identifiants de profil de domaine résolus en DB. */
  profiles: {
    companyClientId?: string
    corporateProfileId?: string
    marketplaceProfileId?: string
    providerProfileId?: string
    vendorProfileId?: string
  }
  /** Nom de la société cliente (corporate) si résolu. */
  companyName?: string
  isStaff: boolean
  isAdmin: boolean
}

export type DomainAccessResult =
  | { ok: true; user: JwtUser; access: UserAccess }
  | { ok: false; response: NextResponse }

/**
 * Résout l'accès complet d'un utilisateur : charge User + profils en une
 * requête, avec fallback companyClientId pour les anciens tokens.
 */
export async function resolveUserAccess(jwtUser: JwtUser): Promise<UserAccess | null> {
  await connectMongoose()
  const dbUser = await User.findById(jwtUser.userId)
    .select('companyClientId corporateProfileId marketplaceProfileId providerProfileId vendorProfileId')
    .lean() as any
  if (!dbUser) return null

  let companyClientId = jwtUser.companyClientId || (dbUser.companyClientId ? String(dbUser.companyClientId) : undefined)
  let companyName: string | undefined

  // Fallback legacy : tokens anciens sans companyClientId mais CLIENT lié à un Client
  if (!companyClientId && jwtUser.role === 'CLIENT') {
    const company = await Client.findOne({ userId: jwtUser.userId }).select('name company').lean() as any
    if (company) {
      companyClientId = String(company._id)
      companyName = company.company || company.name
    }
  } else if (companyClientId && !companyName) {
    const company = await Client.findById(companyClientId).select('name company').lean() as any
    companyName = company?.company || company?.name
  }

  const role = (jwtUser.role || '').toUpperCase()
  return {
    userId: jwtUser.userId,
    role,
    email: jwtUser.email,
    profiles: {
      companyClientId,
      corporateProfileId: dbUser.corporateProfileId ? String(dbUser.corporateProfileId) : undefined,
      marketplaceProfileId: dbUser.marketplaceProfileId ? String(dbUser.marketplaceProfileId) : undefined,
      providerProfileId: dbUser.providerProfileId ? String(dbUser.providerProfileId) : undefined,
      vendorProfileId: dbUser.vendorProfileId ? String(dbUser.vendorProfileId) : undefined,
    },
    companyName,
    isStaff: STAFF_ROLES.includes(role),
    isAdmin: ADMIN_ROLES.includes(role),
  }
}

const DOMAIN_LABELS: Record<AccessDomain, string> = {
  corporate: 'Portail entreprise',
  market: 'Marketplace',
  xeuy: 'Services',
  admin: 'Administration',
  shared: 'Compte',
}

/**
 * Vérifie l'auth + le droit d'accès au domaine.
 * Retourne { ok, user, access } ou { ok:false, response: NextResponse 401/403 }.
 */
export async function requireDomainAccess(
  request: NextRequest,
  domain: AccessDomain
): Promise<DomainAccessResult> {
  let jwtUser: JwtUser
  try {
    const token = request.cookies.get('auth-token')?.value ||
      request.cookies.get('admin-auth-token')?.value ||
      request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) throw new Error('no token')
    jwtUser = await verifyAuthToken(token)
  } catch {
    return { ok: false, response: NextResponse.json({ error: 'Non authentifié' }, { status: 401 }) }
  }

  const access = await resolveUserAccess(jwtUser)
  if (!access) {
    return { ok: false, response: NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 401 }) }
  }

  const allowed = checkDomain(access, domain)
  if (!allowed) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: `Accès ${DOMAIN_LABELS[domain]} non autorisé` },
        { status: 403 }
      ),
    }
  }
  return { ok: true, user: jwtUser, access }
}

function checkDomain(access: UserAccess, domain: AccessDomain): boolean {
  if (access.isAdmin) return true // admins = preview tous domaines
  switch (domain) {
    case 'corporate':
      return access.role === 'CLIENT' && !!access.profiles.companyClientId
    case 'admin':
      return access.isStaff
    case 'xeuy':
      // client ou provider selon les endpoints — vérifié finement ailleurs
      return ['CLIENT', 'PROVIDER'].includes(access.role) || !!access.profiles.providerProfileId
    case 'market':
    case 'shared':
      return true // tout utilisateur authentifié
    default:
      return false
  }
}

/**
 * Clause $or de scoping client : couvre les conventions legacy mixtes
 * (clientId = userId OU clientId = companyId OU clientCompanyId).
 * À utiliser sur les modèles dont clientId a une sémantique mixte
 * (Intervention, Ticket, MaintenanceContract — cf. audit Étape 2).
 *
 * Accepte UserAccess, ou { userId, companyId } (string|ObjectId).
 */
export function companyScope(
  access: UserAccess | { userId?: unknown; companyId?: unknown },
  field = 'clientId'
): Record<string, unknown> {
  const userId = 'profiles' in access ? access.userId : access.userId
  const companyId = 'profiles' in access ? access.profiles.companyClientId : access.companyId
  const ids = [userId, companyId]
    .filter(Boolean)
    .map(id => new mongoose.Types.ObjectId(String(id)))
  if (ids.length === 0) return {}
  const or: Record<string, unknown>[] = [
    ...ids.map(id => ({ [field]: id })),
    ...(companyId ? [{ clientCompanyId: new mongoose.Types.ObjectId(String(companyId)) }] : []),
  ]
  return or.length === 1 ? or[0] : { $or: or }
}
