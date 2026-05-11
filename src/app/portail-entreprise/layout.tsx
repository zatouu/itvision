'use client'

import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import {
  LayoutDashboard, FileText, Wrench, FolderKanban,
  Receipt, LifeBuoy, ChevronLeft, Menu, X, LogOut,
  Building2, ChevronRight, Settings, BarChart2, Activity, ClipboardList,
  User
} from 'lucide-react'
import NotificationBell from '@/components/portal/NotificationBell'

const navItems = [
  { href: '/portail-entreprise', label: 'Tableau de bord', icon: LayoutDashboard, exact: true },
  { href: '/portail-entreprise/contrats', label: 'Contrats', icon: FileText },
  { href: '/portail-entreprise/interventions', label: 'Interventions', icon: Wrench },
  { href: '/portail-entreprise/projets', label: 'Projets', icon: FolderKanban },
  { href: '/portail-entreprise/documents', label: 'Devis & Factures', icon: Receipt },
  { href: '/portail-entreprise/finances', label: 'Finances', icon: BarChart2 },
  { href: '/portail-entreprise/rapports', label: 'Rapports', icon: ClipboardList },
  { href: '/portail-entreprise/support', label: 'Support', icon: LifeBuoy },
  { href: '/portail-entreprise/activite', label: 'Activité', icon: Activity },
]

function Sidebar({
  collapsed,
  onToggle,
  onLogout,
  companyName,
  companyCity
}: {
  collapsed: boolean
  onToggle: () => void
  onLogout: () => void
  companyName: string
  companyCity?: string
}) {
  const pathname = usePathname()
  const isActive = (item: typeof navItems[0]) =>
    item.exact ? pathname === item.href : pathname.startsWith(item.href)

  return (
    <aside className={`flex flex-col h-full bg-white dark:bg-slate-900 border-r border-gray-200 dark:border-slate-800 transition-all duration-300 ${collapsed ? 'w-16' : 'w-60'}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-4 border-b border-gray-100 dark:border-slate-800 min-h-[64px]">
        {!collapsed && (
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-gradient-to-br from-green-500 to-violet-600 flex items-center justify-center">
              <Building2 className="w-4 h-4 text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-gray-900 dark:text-white truncate">{companyName}</p>
              <p className="text-[10px] text-gray-400 truncate">{companyCity ? `${companyCity} · ` : ''}IT Vision</p>
            </div>
          </div>
        )}
        {collapsed && (
          <div className="mx-auto w-8 h-8 rounded-lg bg-gradient-to-br from-green-500 to-violet-600 flex items-center justify-center">
            <Building2 className="w-4 h-4 text-white" />
          </div>
        )}
        {!collapsed && (
          <button onClick={onToggle} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors">
            <ChevronLeft className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5">
        {navItems.map(item => {
          const active = isActive(item)
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={`flex items-center gap-3 px-2.5 py-2 rounded-lg transition-all text-sm font-medium group ${
                active
                  ? 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                  : 'text-gray-600 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-slate-800'
              }`}
            >
              <Icon className={`flex-shrink-0 w-4 h-4 ${active ? 'text-green-600 dark:text-green-400' : ''}`} />
              {!collapsed && <span className="truncate">{item.label}</span>}
              {!collapsed && active && <ChevronRight className="ml-auto w-3 h-3 opacity-60" />}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className={`border-t border-gray-100 dark:border-slate-800 px-2 py-3 space-y-0.5 ${collapsed ? 'flex flex-col items-center' : ''}`}>
        {collapsed && (
          <button onClick={onToggle} title="Développer" className="p-2.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors">
            <Menu className="w-4 h-4" />
          </button>
        )}
        <Link href="/portail-entreprise/profil" title={collapsed ? 'Paramètres' : undefined}
          className="flex items-center gap-3 px-2.5 py-2 rounded-lg text-sm text-gray-500 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors">
          <Settings className="flex-shrink-0 w-4 h-4" />
          {!collapsed && <span>Paramètres</span>}
        </Link>
        <button
          type="button"
          onClick={onLogout}
          title={collapsed ? 'Déconnexion' : undefined}
          className="w-full flex items-center gap-3 px-2.5 py-2 rounded-lg text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
        >
          <LogOut className="flex-shrink-0 w-4 h-4" />
          {!collapsed && <span>Déconnexion</span>}
        </button>
      </div>
    </aside>
  )
}

export default function EnterprisePortalLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const [companyName, setCompanyName] = useState('Portail Entreprise')
  const [companyCity, setCompanyCity] = useState<string | undefined>(undefined)
  const [userId, setUserId] = useState<string | undefined>(undefined)
  const [userName, setUserName] = useState<string | undefined>(undefined)
  const pathname = usePathname()

  useEffect(() => { setMobileSidebarOpen(false) }, [pathname])

  useEffect(() => {
    fetch('/api/client-enterprise/me')
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d?.companyName) setCompanyName(d.companyName)
        if (d?.companyCity) setCompanyCity(d.companyCity)
        if (d?.userId) setUserId(d.userId)
        if (d?.userName) setUserName(d.userName)
      })
      .catch(() => {})
  }, [])

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: { accept: 'application/json' },
        credentials: 'include'
      })
    } catch {
      // ignore network errors and force redirect anyway
    } finally {
      router.replace('/login')
    }
  }

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-slate-950 overflow-hidden">
      {/* Sidebar desktop */}
      <div className="hidden lg:flex flex-col flex-shrink-0">
        <Sidebar
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed(v => !v)}
          onLogout={handleLogout}
          companyName={companyName}
          companyCity={companyCity}
        />
      </div>

      {/* Mobile sidebar overlay */}
      {mobileSidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-black/50" onClick={() => setMobileSidebarOpen(false)} />
          <div className="relative flex flex-col w-60 h-full z-10">
            <div className="absolute top-3 right-3">
              <button onClick={() => setMobileSidebarOpen(false)}
                className="p-1.5 rounded-lg bg-white dark:bg-slate-900 text-gray-500 shadow-lg">
                <X className="w-4 h-4" />
              </button>
            </div>
            <Sidebar
              collapsed={false}
              onToggle={() => setMobileSidebarOpen(false)}
              onLogout={handleLogout}
              companyName={companyName}
              companyCity={companyCity}
            />
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar mobile */}
        <header className="lg:hidden flex items-center justify-between px-4 py-3 bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 shadow-sm flex-shrink-0">
          <button onClick={() => setMobileSidebarOpen(true)}
            className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-800">
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-green-500 to-violet-600 flex items-center justify-center">
              <Building2 className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-sm font-semibold text-gray-900 dark:text-white truncate max-w-[140px]">{companyName}</span>
          </div>
          <div className="flex items-center gap-1">
            <NotificationBell userId={userId} />
            <button
              type="button"
              onClick={handleLogout}
              className="p-2 rounded-lg text-gray-500 hover:bg-gray-100"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Top bar desktop */}
        <header className="hidden lg:flex items-center justify-between px-6 py-3 bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 shadow-sm flex-shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <h1 className="text-sm font-semibold text-gray-800 dark:text-white truncate">
              {navItems.find(n => n.exact ? pathname === n.href : pathname.startsWith(n.href))?.label || 'Portail Entreprise'}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <NotificationBell userId={userId} />
            <Link
              href="/portail-entreprise/profil"
              className="flex items-center gap-2 pl-1 pr-3 py-1.5 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
              title="Mon profil"
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-500 to-violet-600 flex items-center justify-center text-white text-xs font-bold">
                {userName ? userName.charAt(0).toUpperCase() : <User className="w-4 h-4" />}
              </div>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-200 max-w-[140px] truncate">
                {userName || 'Mon compte'}
              </span>
            </Link>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
