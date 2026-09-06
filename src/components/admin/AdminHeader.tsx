'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Bell, LogOut, Search, Menu } from 'lucide-react'

const SHORTCUTS = [
  { label: 'Dashboard', href: '/admin' },
  { label: 'Devis', href: '/admin/devis' },
  { label: 'Projets', href: '/admin/projects' },
  { label: 'Clients', href: '/admin/clients' },
  { label: 'Techniciens', href: '/admin/technicians' },
  { label: 'Maintenance', href: '/admin/maintenance' },
  { label: 'Marketplace', href: '/admin/marketplace' },
  { label: 'Commandes', href: '/admin/commandes' },
  { label: 'Utilisateurs', href: '/admin/users' },
  { label: 'Tickets', href: '/admin/tickets' },
]

export default function AdminHeader() {
  const router = useRouter()
  const [kOpen, setKOpen] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)

  const handleLogout = async () => {
    if (loggingOut) return
    setLoggingOut(true)
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include'
      })
    } catch {
      // Ignorer les erreurs réseau
    }
    router.replace('/login')
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setKOpen(prev => !prev)
      }
      if (e.key === 'Escape') setKOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const go = (href: string) => {
    setKOpen(false)
    router.push(href)
  }

  return (
    <header className="sticky top-0 w-full h-16 bg-white/80 backdrop-blur border-b border-stone-200 z-40">
      <div className="h-full flex items-center justify-between px-4 lg:px-6 gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => window.dispatchEvent(new CustomEvent('admin:toggle-mobile'))}
            className="lg:hidden p-2 rounded-lg hover:bg-stone-100 text-stone-600"
            aria-label="Ouvrir le menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <Image src="/logo-it-vision.png" alt="IT Vision" width={28} height={28} className="h-7 w-7" />
          <div className="text-sm font-semibold text-stone-900">IT Vision Admin</div>
        </div>

        <div className="flex-1 max-w-xl hidden sm:block">
          <button
            onClick={() => setKOpen(true)}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg border border-stone-200 text-stone-500 hover:text-stone-700 hover:border-stone-300 text-sm bg-white"
            aria-label="Recherche globale (Ctrl+K)"
          >
            <Search className="h-4 w-4" />
            <span className="flex-1 text-left">Rechercher</span>
            <kbd className="text-xs bg-stone-100 px-1.5 py-0.5 rounded border">Ctrl K</kbd>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button className="p-2 rounded-lg border border-stone-200 hover:bg-stone-100 text-stone-600" aria-label="Notifications">
            <Bell className="h-4 w-4" />
          </button>
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-stone-200 text-stone-600 hover:bg-stone-100 text-sm disabled:opacity-50"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">{loggingOut ? 'Déconnexion...' : 'Déconnexion'}</span>
          </button>
        </div>
      </div>

      {kOpen && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center pt-24 bg-black/30"
          onClick={(e) => {
            if (e.target === e.currentTarget) setKOpen(false)
          }}
        >
          <div className="w-full max-w-2xl mx-4 bg-white rounded-2xl shadow-2xl border border-stone-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-stone-100 text-sm font-semibold text-stone-900">
              Recherche rapide
            </div>
            <div className="p-4">
              <div className="flex items-center gap-2 border border-stone-200 rounded-lg px-3 py-2">
                <Search className="h-4 w-4 text-stone-400" />
                <input
                  autoFocus
                  placeholder="Taper un raccourci ou naviguer..."
                  className="w-full outline-none text-sm text-stone-700 placeholder:text-stone-400"
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') setKOpen(false)
                  }}
                />
              </div>
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-64 overflow-y-auto">
                {SHORTCUTS.map((s) => (
                  <button
                    key={s.href}
                    onClick={() => go(s.href)}
                    className="text-left px-3 py-2 rounded-lg text-sm text-stone-700 hover:bg-stone-100 border border-transparent hover:border-stone-200 transition"
                  >
                    {s.label}
                    <span className="block text-xs text-stone-400">{s.href}</span>
                  </button>
                ))}
              </div>
              <div className="text-xs text-stone-400 mt-3 text-center">
                Astuce : utiliser Ctrl + K pour ouvrir depuis n&apos;importe où.
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  )
}
