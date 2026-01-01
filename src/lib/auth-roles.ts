/**
 * Gestion des rôles et permissions
 * Centralise les définitions de rôles pour éviter les incohérences
 */

import { NextRequest } from 'next/server'
import jwt from 'jsonwebtoken'

// Secret JWT harmonisé
const JWT_SECRET = process.env.JWT_SECRET || 'your-jwt-secret-change-in-production-very-long-and-secure-key-123456789'

// Rôles qui peuvent accéder à l'interface admin
export const ADMIN_ROLES = ['ADMIN', 'PRODUCT_MANAGER', 'ACCOUNTANT', 'SUPER_ADMIN'] as const

// Rôles qui peuvent accéder à toutes les fonctionnalités admin
export const FULL_ADMIN_ROLES = ['ADMIN', 'SUPER_ADMIN'] as const

// Rôles pour l'interface client
export const CLIENT_ROLES = ['CLIENT', 'ADMIN', 'SUPER_ADMIN'] as const

// Rôles pour l'interface technicien
export const TECHNICIAN_ROLES = ['TECHNICIAN', 'ADMIN', 'SUPER_ADMIN'] as const

// Type pour les rôles d'utilisateur
export type UserRole = 'ADMIN' | 'SUPER_ADMIN' | 'PRODUCT_MANAGER' | 'ACCOUNTANT' | 'TECHNICIAN' | 'CLIENT'

// Vérifie si un rôle a accès admin
export function isAdminRole(role?: string | null): boolean {
  if (!role) return false
  const normalizedRole = String(role).toUpperCase()
  return ADMIN_ROLES.includes(normalizedRole as typeof ADMIN_ROLES[number])
}

// Vérifie si un rôle a accès complet admin (toutes les fonctionnalités)
export function isFullAdminRole(role?: string | null): boolean {
  if (!role) return false
  const normalizedRole = String(role).toUpperCase()
  return FULL_ADMIN_ROLES.includes(normalizedRole as typeof FULL_ADMIN_ROLES[number])
}

// Vérifie si un rôle peut accéder aux analytics
export function canAccessAnalytics(role?: string | null): boolean {
  return isAdminRole(role)
}

// Vérifie si un rôle peut gérer les produits
export function canManageProducts(role?: string | null): boolean {
  if (!role) return false
  const normalizedRole = String(role).toUpperCase()
  return ['ADMIN', 'SUPER_ADMIN', 'PRODUCT_MANAGER'].includes(normalizedRole)
}

// Vérifie si un rôle peut accéder à la comptabilité
export function canAccessAccounting(role?: string | null): boolean {
  if (!role) return false
  const normalizedRole = String(role).toUpperCase()
  return ['ADMIN', 'SUPER_ADMIN', 'ACCOUNTANT'].includes(normalizedRole)
}

// Vérifie si un rôle peut gérer les utilisateurs/techniciens/clients
export function canManageUsers(role?: string | null): boolean {
  return isFullAdminRole(role)
}

/**
 * Fonction utilitaire pour vérifier l'authentification admin dans les routes API
 * @throws Error si non authentifié ou non autorisé
 */
export function requireAdminAuth(request: NextRequest): { userId: string; email: string; role: string } {
  const token = request.cookies.get('auth-token')?.value || 
    request.headers.get('authorization')?.replace('Bearer ', '')
  
  if (!token) {
    throw new Error('Non authentifié')
  }
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any
    const role = String(decoded.role || '').toUpperCase()
    
    if (!isAdminRole(role)) {
      throw new Error('Accès non autorisé')
    }
    
    return {
      userId: decoded.userId,
      email: decoded.email,
      role
    }
  } catch (error: any) {
    if (error.message === 'Accès non autorisé') throw error
    throw new Error('Token invalide')
  }
}

/**
 * Fonction utilitaire pour vérifier l'authentification admin complet
 * @throws Error si non authentifié ou non autorisé
 */
export function requireFullAdminAuth(request: NextRequest): { userId: string; email: string; role: string } {
  const token = request.cookies.get('auth-token')?.value || 
    request.headers.get('authorization')?.replace('Bearer ', '')
  
  if (!token) {
    throw new Error('Non authentifié')
  }
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any
    const role = String(decoded.role || '').toUpperCase()
    
    if (!isFullAdminRole(role)) {
      throw new Error('Accès non autorisé')
    }
    
    return {
      userId: decoded.userId,
      email: decoded.email,
      role
    }
  } catch (error: any) {
    if (error.message === 'Accès non autorisé') throw error
    throw new Error('Token invalide')
  }
}
