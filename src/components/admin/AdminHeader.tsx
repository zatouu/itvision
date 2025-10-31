'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { Bell, LogOut, Search, Sun, Moon } from 'lucide-react'

export default function AdminHeader() {
  const [dark, setDark] = useState(false)
  const [kOpen, setKOpen] = useState(false)

  useEffect(() => {
    // Forcer le mode clair sur l'admin
    const root = document.documentElement
    root.classList.remove('dark')
  }, [])
  
  useEffect(() => {
    // Désactiver le toggle dark pour l'admin (optionnel, on le laisse mais on force clair)
    if (dark) {
      // Ne rien faire - on garde le mode clair forcé
      setDark(false)
    }
  }, [dark])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setKOpen(true)
      }
      if (e.key === 'Escape') setKOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <header className="fixed top-0 left-64 right-0 h-16 bg-white/70 backdrop-blur border-b border-gray-200 z-40">
      <div className="h-full flex items-center justify-between px-6">
        <div className="flex items-center gap-3">
          <Image src="/logo-it-vision.png" alt="IT Vision" width={28} height={28} className="h-7 w-7" />
          <div className="text-sm font-semibold">IT Vision Admin</div>
        </div>
        <div className="flex-1 max-w-xl mx-6">
          <button
            onClick={() => setKOpen(true)}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 text-gray-500 hover:text-gray-700 hover:border-gray-300 text-sm"
            aria-label="Recherche globale (Ctrl+K)"
          >
            <Search className="h-4 w-4" />
            <span className="flex-1 text-left">Rechercher (Ctrl + K)</span>
            <kbd className="text-xs bg-gray-100 px-1.5 py-0.5 rounded border">Ctrl K</kbd>
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setDark((v) => !v)}
            className="p-2 rounded-lg border border-gray-200 hover:bg-gray-100 text-gray-600"
            aria-label="Basculer thème"
          >
            {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
          <button className="p-2 rounded-lg border border-gray-200 hover:bg-gray-100 text-gray-600" aria-label="Notifications">
            <Bell className="h-4 w-4" />
          </button>
          <form action="/api/auth/logout" method="post">
            <button className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100 text-sm">
              <LogOut className="h-4 w-4" />
              <span>Déconnexion</span>
            </button>
          </form>
        </div>
      </div>

      {kOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 bg-black/30">
          <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 border-b text-sm font-semibold">Recherche</div>
            <div className="p-4">
              <div className="flex items-center gap-2 border rounded-lg px-3 py-2">
                <Search className="h-4 w-4 text-gray-400" />
                <input
                  autoFocus
                  placeholder="Produit, technicien, projet… (bientôt)"
                  className="w-full outline-none text-sm"
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') setKOpen(false)
                  }}
                />
              </div>
              <div className="text-xs text-gray-500 mt-2">Indexation et résultats seront ajoutés ultérieurement.</div>
            </div>
          </div>
        </div>
      )}
    </header>
  )
}


