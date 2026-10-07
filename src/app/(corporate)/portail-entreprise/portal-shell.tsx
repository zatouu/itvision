'use client'

import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useState, useEffect, useMemo, useCallback } from 'react'
import {
  LayoutDashboard, FileText, Wrench, FolderKanban,
  Receipt, LifeBuoy, ChevronLeft, Menu, X, LogOut,
  ChevronRight, Settings, BarChart2, Activity, ClipboardList,
  User, Search, PackageSearch, FileSignature, MoreHorizontal, Boxes, CalendarDays
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import NotificationBell from '@/components/portal/NotificationBell'
import { CommandPalette, type PaletteItem } from '@/components/portal-ui'
import { brandThemeStyle, PORTAL_BRANDING_EVENT, type PortalBranding } from '@/lib/company-rights'

const navItems = [
  { href: '/portail-entreprise', label: 'Tableau de bord', icon: LayoutDashboard, exact: true },
  { href: '/portail-entreprise/contrats', label: 'Contrats', icon: FileText },
  { href: '/portail-entreprise/interventions', label: 'Interventions', icon: Wrench },
  { href: '/portail-entreprise/agenda', label: 'Agenda', icon: CalendarDays },
  { href: '/portail-entreprise/projets', label: 'Projets', icon: FolderKanban },
  { href: '/portail-entreprise/parc', label: 'Mon parc', icon: Boxes },
  { href: '/portail-entreprise/documents', label: 'Devis & Factures', icon: Receipt },
  { href: '/portail-entreprise/finances', label: 'Finances', icon: BarChart2 },
  { href: '/portail-entreprise/rapports', label: 'Rapports', icon: ClipboardList },
  { href: '/portail-entreprise/sourcing', label: 'Trouvez-moi', icon: PackageSearch },
  { href: '/portail-entreprise/support', label: 'Support', icon: LifeBuoy },
  { href: '/portail-entreprise/activite', label: 'Activité', icon: Activity },
]

// Onglets de la barre mobile (le reste reste accessible via « Plus ») : projets d'abord, c'est le cœur de l'espace
const mobileTabs = ['/portail-entreprise', '/portail-entreprise/projets', '/portail-entreprise/interventions', '/portail-entreprise/documents']

const SEARCH_TYPE_META: Record<string, { icon: LucideIcon; hint: string }> = {
  quote: { icon: FileSignature, hint: 'Devis' },
  invoice: { icon: Receipt, hint: 'Facture' },
  intervention: { icon: Wrench, hint: 'Intervention' },
  ticket: { icon: LifeBuoy, hint: 'Ticket' },
  contract: { icon: FileText, hint: 'Contrat' },
  project: { icon: FolderKanban, hint: 'Projet' },
}

function NavBadge({ count, dot }: { count?: number; dot?: boolean }) {
  if (!count) return null
  if (dot) return <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-amber-400 ring-2 ring-emerald-950" />
  return (
    <span className="ml-auto min-w-[20px] rounded-full bg-amber-400 px-1.5 text-center text-[10px] font-bold leading-5 text-emerald-950 tabular-nums">
      {count > 99 ? '99+' : count}
    </span>
  )
}

function Wordmark({ compact, companyName, companyLogo }: { compact?: boolean; companyName?: string; companyLogo?: string }) {
  const known = companyName && companyName !== 'Portail Entreprise'
  const initials = known
    ? companyName!.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase()
    : 'IV'
  return (
    <div className={`flex items-center min-w-0 ${compact ? 'justify-center' : 'gap-2.5'}`}>
      {companyLogo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={companyLogo} alt={companyName || ''} className="flex-shrink-0 w-9 h-9 rounded-lg bg-white object-contain p-0.5" />
      ) : (
        <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-emerald-400 flex items-center justify-center">
          <span className="text-emerald-950 font-black text-sm tracking-tight">{initials}</span>
        </div>
      )}
      {!compact && (
        <div className="leading-tight min-w-0">
          <p className="text-[13px] font-brand font-bold text-white tracking-tight truncate">{known ? companyName : 'IT Vision'}</p>
          <p className="text-[10px] font-medium text-emerald-300/80 tracking-[0.14em] uppercase truncate">Espace client IT Vision</p>
        </div>
      )}
    </div>
  )
}

function Sidebar({
  collapsed,
  onToggle,
  onLogout,
  companyName,
  companyCity,
  companyLogo,
  badges
}: {
  collapsed: boolean
  onToggle: () => void
  onLogout: () => void
  companyName: string
  companyCity?: string
  companyLogo?: string
  badges: Record<string, number>
}) {
  const pathname = usePathname()
  const isActive = (item: typeof navItems[0]) =>
    item.exact ? pathname === item.href : pathname.startsWith(item.href)

  return (
    <aside className={`flex flex-col h-full bg-emerald-950 text-emerald-50 transition-all duration-300 ${collapsed ? 'w-[68px]' : 'w-64'}`}>
      {/* Header */}
      <div className={`flex items-center ${collapsed ? 'justify-center' : 'justify-between'} px-4 py-5 border-b border-white/10 min-h-[72px]`}>
        <Wordmark compact={collapsed} companyName={companyName} companyLogo={companyLogo} />
        {!collapsed && (
          <button onClick={onToggle} aria-label="Réduire la navigation"
            className="p-1.5 rounded-lg text-emerald-300/60 hover:text-white hover:bg-white/10 transition-colors">
            <ChevronLeft className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Entreprise */}
      {!collapsed && companyCity && (
        <div className="px-4 py-2 border-b border-white/10">
          <p className="text-xs text-emerald-200/60 truncate">{companyCity}</p>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {navItems.map(item => {
          const active = isActive(item)
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={`relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all group ${
                active
                  ? 'bg-white/10 text-white'
                  : 'text-emerald-200/60 hover:text-white hover:bg-white/5'
              }`}
            >
              {active && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-emerald-400" />}
              <Icon className={`flex-shrink-0 w-[18px] h-[18px] ${active ? 'text-emerald-300' : 'text-emerald-300/50 group-hover:text-emerald-200'}`} />
              {!collapsed && <span className="truncate">{item.label}</span>}
              <NavBadge count={badges[item.href]} dot={collapsed} />
              {!collapsed && active && !badges[item.href] && <ChevronRight className="ml-auto w-3.5 h-3.5 text-emerald-400/60" />}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className={`border-t border-white/10 px-3 py-3 space-y-1 ${collapsed ? 'flex flex-col items-center' : ''}`}>
        {collapsed && (
          <button onClick={onToggle} title="Développer" className="p-2.5 rounded-lg text-emerald-300/60 hover:text-white hover:bg-white/10 transition-colors">
            <Menu className="w-4 h-4" />
          </button>
        )}
        <Link href="/portail-entreprise/profil" title={collapsed ? 'Paramètres' : undefined}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-emerald-200/60 hover:text-white hover:bg-white/5 transition-colors">
          <Settings className="flex-shrink-0 w-[18px] h-[18px] text-emerald-300/50" />
          {!collapsed && <span>Paramètres</span>}
        </Link>
        <button
          type="button"
          onClick={onLogout}
          title={collapsed ? 'Déconnexion' : undefined}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-300/70 hover:text-red-200 hover:bg-red-500/10 transition-colors"
        >
          <LogOut className="flex-shrink-0 w-[18px] h-[18px]" />
          {!collapsed && <span>Déconnexion</span>}
        </button>
        {!collapsed && <p className="px-3 pt-2 text-[10px] text-emerald-200/40">Propulsé par IT Vision</p>}
      </div>
    </aside>
  )
}

export default function PortalShell({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const [companyName, setCompanyName] = useState('Portail Entreprise')
  const [companyCity, setCompanyCity] = useState<string | undefined>(undefined)
  const [companyLogo, setCompanyLogo] = useState<string | undefined>(undefined)
  const [brandColor, setBrandColor] = useState<string | null>(null)
  const [capabilities, setCapabilities] = useState<string[] | undefined>(undefined)
  const [userId, setUserId] = useState<string | undefined>(undefined)
  const [userName, setUserName] = useState<string | undefined>(undefined)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [isMac, setIsMac] = useState(false)
  const [badges, setBadges] = useState<Record<string, number>>({})
  const pathname = usePathname()

  useEffect(() => { setMobileSidebarOpen(false) }, [pathname])
  // Rafraîchi à chaque navigation : une action traitée fait disparaître son compteur
  useEffect(() => {
    fetch('/api/client-enterprise/action-center')
      .then(r => (r.ok ? r.json() : null))
      .then(d => { if (d?.navBadges) setBadges(d.navBadges) })
      .catch(() => {})
  }, [pathname])
  useEffect(() => { setIsMac(/Mac|iPhone|iPad/i.test(navigator.platform)) }, [])
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setPaletteOpen(o => !o)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const paletteItems = useMemo<PaletteItem[]>(() => [
    ...navItems.map(n => ({ id: n.href, label: n.label, icon: n.icon, hint: 'Page', href: n.href })),
    { id: '/portail-entreprise/profil', label: 'Mon profil · Paramètres', icon: Settings, hint: 'Page', href: '/portail-entreprise/profil', keywords: ['parametres', 'compte', 'logo', 'entreprise', 'preferences'] },
    { id: 'new-ticket', label: 'Nouvelle demande de support', icon: LifeBuoy, hint: 'Action', href: '/portail-entreprise/support', keywords: ['ticket', 'incident', 'aide', 'nouveau'] },
    { id: 'new-maintenance', label: 'Demander une intervention', icon: Wrench, hint: 'Action', href: '/portail-entreprise/interventions', keywords: ['maintenance', 'intervention', 'technicien', 'demande'] },
  ], [])

  const searchPortal = useCallback(async (q: string): Promise<PaletteItem[]> => {
    const res = await fetch(`/api/client-enterprise/search?q=${encodeURIComponent(q)}`)
    if (!res.ok) return []
    const data = await res.json()
    return (data.results || []).map((r: { id: string; type: string; label: string; sub?: string; href: string }) => ({
      id: `${r.type}-${r.id}`,
      label: r.label,
      hint: [SEARCH_TYPE_META[r.type]?.hint, r.sub].filter(Boolean).join(' · '),
      icon: SEARCH_TYPE_META[r.type]?.icon,
      href: r.href,
    }))
  }, [])

  useEffect(() => {
    fetch('/api/client-enterprise/me')
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d?.companyName) setCompanyName(d.companyName)
        if (d?.companyCity) setCompanyCity(d.companyCity)
        if (d?.companyLogo) setCompanyLogo(d.companyLogo)
        if (d?.companyBrandColor) setBrandColor(d.companyBrandColor)
        if (Array.isArray(d?.capabilities)) setCapabilities(d.capabilities)
        if (d?.userId) setUserId(d.userId)
        if (d?.userName) setUserName(d.userName)
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    const onBranding = (e: Event) => {
      const b = (e as CustomEvent<PortalBranding>).detail || {}
      if (b.companyName) setCompanyName(b.companyName)
      if (b.companyLogo !== undefined) setCompanyLogo(b.companyLogo || undefined)
      if (b.brandColor !== undefined) setBrandColor(b.brandColor)
    }
    window.addEventListener(PORTAL_BRANDING_EVENT, onBranding)
    return () => window.removeEventListener(PORTAL_BRANDING_EVENT, onBranding)
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

  const currentLabel = navItems.find(n => n.exact ? pathname === n.href : pathname.startsWith(n.href))?.label

  return (
    <div className="flex h-screen bg-stone-50 overflow-hidden" style={brandThemeStyle(brandColor) as React.CSSProperties | undefined}>
      {/* Sidebar desktop */}
      <div className="hidden lg:flex flex-col flex-shrink-0">
        <Sidebar
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed(v => !v)}
          onLogout={handleLogout}
          companyName={companyName}
          companyCity={companyCity}
          companyLogo={companyLogo}
          badges={badges}
        />
      </div>

      {/* Mobile sidebar overlay */}
      {mobileSidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-emerald-950/60 backdrop-blur-sm" onClick={() => setMobileSidebarOpen(false)} />
          <div className="relative flex flex-col w-64 h-full z-10">
            <div className="absolute top-4 right-4 z-20">
              <button onClick={() => setMobileSidebarOpen(false)}
                className="p-1.5 rounded-lg bg-white/10 text-white hover:bg-white/20 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <Sidebar
              collapsed={false}
              onToggle={() => setMobileSidebarOpen(false)}
              onLogout={handleLogout}
              companyName={companyName}
              companyCity={companyCity}
              companyLogo={companyLogo}
              badges={badges}
            />
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar mobile */}
        <header className="lg:hidden flex items-center justify-between px-4 py-3 bg-emerald-950 flex-shrink-0">
          <button onClick={() => setMobileSidebarOpen(true)}
            className="p-2 -ml-2 rounded-lg text-emerald-100 hover:bg-white/10">
            <Menu className="w-5 h-5" />
          </button>
          <Wordmark compact companyName={companyName} companyLogo={companyLogo} />
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setPaletteOpen(true)}
              aria-label="Rechercher"
              className="p-2 rounded-lg text-emerald-200/70 hover:bg-white/10"
            >
              <Search className="w-5 h-5" />
            </button>
            <span className="text-emerald-100"><NotificationBell userId={userId} capabilities={capabilities} /></span>
            <button
              type="button"
              onClick={handleLogout}
              className="p-2 rounded-lg text-emerald-200/70 hover:bg-white/10"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Top bar desktop */}
        <header className="hidden lg:flex items-center justify-between px-8 py-4 bg-white border-b border-stone-200 flex-shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <p className="text-[11px] font-semibold tracking-[0.12em] uppercase text-emerald-700 truncate max-w-[220px]">{companyName !== 'Portail Entreprise' ? companyName : 'IT Vision'}</p>
            <span className="text-stone-300">/</span>
            <h1 className="text-sm font-semibold text-stone-800 truncate">
              {currentLabel || 'Portail Entreprise'}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setPaletteOpen(true)}
              className="hidden md:flex items-center gap-2 min-w-[190px] rounded-lg border border-stone-200 bg-stone-50 px-3 py-1.5 text-xs text-stone-400 transition-colors hover:border-emerald-300 hover:bg-emerald-50/50"
            >
              <Search className="h-3.5 w-3.5" />
              <span>Rechercher…</span>
              <kbd className="ml-auto rounded border border-stone-200 bg-white px-1.5 py-0.5 text-[10px] font-medium text-stone-400">
                {isMac ? '⌘K' : 'Ctrl K'}
              </kbd>
            </button>
            <button
              type="button"
              onClick={() => setPaletteOpen(true)}
              aria-label="Rechercher"
              className="md:hidden p-2 rounded-lg text-stone-500 hover:bg-stone-100"
            >
              <Search className="h-4 w-4" />
            </button>
            <span className="text-stone-500"><NotificationBell userId={userId} capabilities={capabilities} /></span>
            <Link
              href="/portail-entreprise/profil"
              className="flex items-center gap-2.5 pl-1.5 pr-3 py-1.5 rounded-full border border-stone-200 hover:border-emerald-300 hover:bg-emerald-50/50 transition-colors"
              title="Mon profil"
            >
              <div className="w-7 h-7 rounded-full bg-emerald-800 flex items-center justify-center text-emerald-50 text-[11px] font-bold">
                {userName ? userName.charAt(0).toUpperCase() : <User className="w-3.5 h-3.5" />}
              </div>
              <span className="text-sm font-medium text-stone-700 max-w-[140px] truncate">
                {userName || 'Mon compte'}
              </span>
            </Link>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto pb-20 lg:pb-0">
          {children}
        </main>

        {/* Barre d'onglets mobile */}
        <nav className="lg:hidden fixed inset-x-0 bottom-0 z-40 border-t border-stone-200 bg-white/95 backdrop-blur pb-[env(safe-area-inset-bottom)]">
          <div className="grid grid-cols-5">
            {navItems.filter(n => mobileTabs.includes(n.href)).map(item => {
              const active = item.exact ? pathname === item.href : pathname.startsWith(item.href)
              const Icon = item.icon
              const count = badges[item.href]
              return (
                <Link key={item.href} href={item.href}
                  className={`relative flex flex-col items-center gap-0.5 py-2 text-[10px] font-medium ${active ? 'text-emerald-800' : 'text-stone-400'}`}>
                  <Icon className="h-5 w-5" />
                  <span className="truncate max-w-full px-1">{item.label.split(' ')[0]}</span>
                  {!!count && (
                    <span className="absolute left-1/2 top-1 ml-1.5 min-w-[16px] rounded-full bg-amber-400 px-1 text-center text-[9px] font-bold leading-4 text-emerald-950">
                      {count > 9 ? '9+' : count}
                    </span>
                  )}
                </Link>
              )
            })}
            <button type="button" onClick={() => setMobileSidebarOpen(true)}
              className="flex flex-col items-center gap-0.5 py-2 text-[10px] font-medium text-stone-400">
              <MoreHorizontal className="h-5 w-5" />
              <span>Plus</span>
            </button>
          </div>
        </nav>
      </div>

      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        items={paletteItems}
        onSearch={searchPortal}
        placeholder="Rechercher un devis, une intervention, un ticket, une page…"
        onSelect={item => { if (item.href) router.push(item.href) }}
      />
    </div>
  )
}
