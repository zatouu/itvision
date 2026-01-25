'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { LogIn, LogOut } from 'lucide-react'

interface UnifiedLoginButtonProps {
  className?: string
  variant?: 'default' | 'header' | 'hero'
}

export default function UnifiedLoginButton({ 
  className = "", 
  variant = 'default' 
}: UnifiedLoginButtonProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [isLoading, setIsLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

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
        setIsAuthenticated(res.ok)
      } catch {
        if (cancelled) return
        setIsAuthenticated(false)
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
        return "px-4 py-2.5 text-base font-semibold transition-all duration-300 rounded-lg relative group inline-flex items-center bg-gradient-to-r from-emerald-400 to-emerald-500 text-white hover:from-emerald-500 hover:to-emerald-600 shadow-sm hover:shadow-md"
      case 'hero':
        return "bg-gradient-to-r from-emerald-600 to-purple-600 hover:from-emerald-700 hover:to-purple-700 text-white px-8 py-4 rounded-lg font-semibold transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
      default:
        return "bg-gradient-to-r from-emerald-400 to-emerald-500 hover:from-emerald-500 hover:to-emerald-600 text-white px-6 py-3 rounded-lg font-semibold transition-all duration-300 inline-flex items-center justify-center"
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
      router.refresh()
    }
  }

  if (variant === 'header') {
    if (!isLoading && isAuthenticated) {
      return (
        <button
          type="button"
          onClick={handleLogout}
          className={`${getButtonStyles()} ${className} inline-flex items-center bg-gradient-to-r from-slate-700 to-slate-900 hover:from-slate-800 hover:to-black`}
        >
          <LogOut className="h-5 w-5 mr-2" />
          Déconnexion
        </button>
      )
    }

    return (
      <Link
        href={loginHref}
        className={`${getButtonStyles()} ${className} inline-flex items-center`}
      >
        Connexion
      </Link>
    )
  }

  if (!isLoading && isAuthenticated) {
    return (
      <button
        type="button"
        onClick={handleLogout}
        className={`${getButtonStyles()} ${className} inline-flex items-center`}
      >
        <LogOut className="h-5 w-5 mr-2" />
        Déconnexion
      </button>
    )
  }

  return (
    <Link href={loginHref} className={`${getButtonStyles()} ${className} inline-flex items-center`}>
      <LogIn className="h-5 w-5 mr-2" />
      Connexion
    </Link>
  )
}