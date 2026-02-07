'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { LogIn, LogOut, LayoutDashboard, Wrench, ShieldCheck } from 'lucide-react'

interface UnifiedLoginButtonProps {
  className?: string
  variant?: 'default' | 'header' | 'hero'
}

type UserRole = 'ADMIN' | 'PRODUCT_MANAGER' | 'TECHNICIAN' | 'CLIENT' | ''

function getRoleDashboard(role: UserRole): { href: string; label: string; icon: typeof LayoutDashboard } | null {
  switch (role) {
    case 'ADMIN':
      return { href: '/admin', label: 'Administration', icon: ShieldCheck }
    case 'PRODUCT_MANAGER':
      return { href: '/admin/produits', label: 'Gestion produits', icon: LayoutDashboard }
    case 'TECHNICIAN':
      return { href: '/tech-interface', label: 'Interface technicien', icon: Wrench }
    default:
      return null
  }
}

export default function UnifiedLoginButton({ 
  className = "", 
  variant = 'default' 
}: UnifiedLoginButtonProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [isLoading, setIsLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [userRole, setUserRole] = useState<UserRole>('')

  useEffect(() => {
    let cancelled = false

    async function loadAuthState() {
      setIsLoading(true)
      try {
        const res = await fetch('/api/auth/login', {
          method: 'GET',
          headers: { accept: 'application/json' },
          cache: 'no-store'
        })
        if (cancelled) return
        if (res.ok) {
          const data = await res.json()
          setIsAuthenticated(true)
          setUserRole((data.user?.role || '').toUpperCase() as UserRole)
        } else {
          setIsAuthenticated(false)
          setUserRole('')
        }
      } catch {
        if (cancelled) return
        setIsAuthenticated(false)
        setUserRole('')
      } finally {
        if (cancelled) return
        setIsLoading(false)
      }
    }

    loadAuthState()
    return () => {
      cancelled = true
    }
  }, [pathname])

  const getButtonStyles = () => {
    switch (variant) {
      case 'header':
        return "px-4 py-2.5 text-sm font-semibold transition-all duration-300 rounded-lg relative group inline-flex items-center shadow-sm hover:shadow-md"
      case 'hero':
        return "bg-gradient-to-r from-emerald-600 to-purple-600 hover:from-emerald-700 hover:to-purple-700 text-white px-8 py-4 rounded-lg font-semibold transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
      default:
        return "px-4 py-2 text-sm font-semibold transition-all duration-300 rounded-lg inline-flex items-center justify-center"
    }
  }

  const loginHref = `/login?redirect=${encodeURIComponent(pathname || '/')}`

  async function handleLogout() {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          accept: 'application/json',
          'content-type': 'application/json'
        }
      })
    } finally {
      setIsAuthenticated(false)
      setUserRole('')
      router.refresh()
    }
  }

  const dashboard = getRoleDashboard(userRole)

  if (variant === 'header') {
    if (!isLoading && isAuthenticated) {
      return (
        <div className="flex items-center gap-2">
          {dashboard && (
            <Link
              href={dashboard.href}
              className={`${getButtonStyles()} ${className} bg-gradient-to-r from-purple-500 to-indigo-600 text-white hover:from-purple-600 hover:to-indigo-700`}
            >
              <dashboard.icon className="h-4 w-4 mr-1.5" />
              <span className="hidden 2xl:inline">{dashboard.label}</span>
              <span className="2xl:hidden">Admin</span>
            </Link>
          )}
          <button
            type="button"
            onClick={handleLogout}
            className={`${getButtonStyles()} ${className} bg-gradient-to-r from-red-500 to-red-600 text-white hover:from-red-600 hover:to-red-700`}
          >
            <LogOut className="h-4 w-4 mr-1.5" />
            <span className="hidden xl:inline">Déconnexion</span>
          </button>
        </div>
      )
    }

    return (
      <Link
        href="/login"
        className={`${getButtonStyles()} ${className} bg-gradient-to-r from-emerald-400 to-emerald-500 text-white hover:from-emerald-500 hover:to-emerald-600`}
      >
        <LogIn className="h-4 w-4 mr-1.5" />
        Connexion
      </Link>
    )
  }

  if (!isLoading && isAuthenticated) {
    return (
      <div className="flex items-center gap-2">
        {dashboard && (
          <Link
            href={dashboard.href}
            className={`${getButtonStyles()} ${className} bg-gradient-to-r from-purple-500 to-indigo-600 text-white hover:from-purple-600 hover:to-indigo-700`}
          >
            <dashboard.icon className="h-4 w-4 mr-1.5" />
            {dashboard.label}
          </Link>
        )}
        <button
          type="button"
          onClick={handleLogout}
          className={`${getButtonStyles()} ${className} bg-gradient-to-r from-red-500 to-red-600 text-white hover:from-red-600 hover:to-red-700`}
        >
          <LogOut className="h-4 w-4 mr-1.5" />
          Déconnexion
        </button>
      </div>
    )
  }

  return (
    <Link href={loginHref} className={`${getButtonStyles()} ${className} bg-gradient-to-r from-emerald-400 to-emerald-500 text-white hover:from-emerald-500 hover:to-emerald-600 inline-flex items-center`}>
      <LogIn className="h-4 w-4 mr-1.5" />
      Connexion
    </Link>
  )
}