'use client'

import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  LayoutDashboard,
  BarChart3,
  BookOpen,
  FileText,
  Users,
  Building2,
  Package,
  Wrench,
  Calculator,
  Briefcase,
  AlertCircle,
  Settings,
  ChevronRight,
  ChevronDown,
  ChevronLeft,
  Menu,
  X,
  LogOut,
  PanelLeftClose,
  PanelLeft
} from 'lucide-react'
import { useState, useEffect, createContext, useContext } from 'react'

// Context pour partager l'état collapsed
interface SidebarContextType {
  isCollapsed: boolean
  setIsCollapsed: (value: boolean) => void
}

const SidebarContext = createContext<SidebarContextType>({
  isCollapsed: false,
  setIsCollapsed: () => {}
})

export const useSidebar = () => useContext(SidebarContext)

export interface MenuItem {
  id: string
  label: string
  icon: any
  href?: string
  children?: MenuItem[]
}

export const menuItems: MenuItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
    href: '/admin'
  },
  {
    id: 'analytics',
    label: 'Analytics',
    icon: BarChart3,
    href: '/admin/analytics'
  },
  {
    id: 'administration',
    label: 'Administration',
    icon: Settings,
    children: [
      {
        id: 'how-to',
        label: 'Guide d\'utilisation',
        icon: BookOpen,
        href: '/admin/administration/how-to'
      }
    ]
  },
  {
    id: 'devis',
    label: 'Devis',
    icon: FileText,
    href: '/admin/devis'
  },
  {
    id: 'clients',
    label: 'Clients',
    icon: Building2,
    href: '/admin/clients'
  },
  {
    id: 'produits',
    label: 'Produits',
    icon: Package,
    href: '/admin/produits'
  },
  {
    id: 'technicians',
    label: 'Techniciens',
    icon: Users,
    href: '/admin/technicians'
  },
  {
    id: 'maintenance',
    label: 'Maintenance',
    icon: Wrench,
    href: '/admin/maintenance'
  },
  {
    id: 'marketplace',
    label: 'Marketplace',
    icon: Briefcase,
    href: '/admin/marketplace'
  },
  {
    id: 'comptabilite',
    label: 'Comptabilité',
    icon: Calculator,
    href: '/admin/comptabilite'
  },
  {
    id: 'tickets',
    label: 'Support',
    icon: AlertCircle,
    href: '/admin/tickets'
  }
]

// Helper pour trouver le breadcrumb depuis le pathname
export function getBreadcrumbFromPath(pathname: string): { label: string; href: string; icon?: any }[] {
  const breadcrumbs: { label: string; href: string; icon?: any }[] = [
    { label: 'Admin', href: '/admin', icon: LayoutDashboard }
  ]

  if (pathname === '/admin') {
    return breadcrumbs
  }

  // Chercher dans les menuItems
  const findMenuItem = (items: MenuItem[], path: string): MenuItem | null => {
    for (const item of items) {
      if (item.href === path) return item
      if (item.children) {
        const found = findMenuItem(item.children, path)
        if (found) return found
      }
    }
    return null
  }

  // Chercher le parent si c'est un enfant
  const findParent = (items: MenuItem[], childId: string): MenuItem | null => {
    for (const item of items) {
      if (item.children?.some(child => child.id === childId)) {
        return item
      }
    }
    return null
  }

  const currentItem = findMenuItem(menuItems, pathname)
  
  if (currentItem) {
    // Vérifier s'il y a un parent
    const parent = findParent(menuItems, currentItem.id)
    if (parent) {
      breadcrumbs.push({ label: parent.label, href: '#', icon: parent.icon })
    }
    breadcrumbs.push({ label: currentItem.label, href: pathname, icon: currentItem.icon })
  } else {
    // Fallback: construire depuis le path
    const segments = pathname.split('/').filter(Boolean)
    let currentPath = ''
    for (let i = 1; i < segments.length; i++) {
      currentPath += '/' + segments[i]
      const label = segments[i].charAt(0).toUpperCase() + segments[i].slice(1).replace(/-/g, ' ')
      breadcrumbs.push({ label, href: '/admin' + currentPath })
    }
  }

  return breadcrumbs
}

export default function AdminSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [openMenus, setOpenMenus] = useState<string[]>(['administration'])
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(false)

  // Charger l'état collapsed depuis localStorage
  useEffect(() => {
    const saved = localStorage.getItem('admin-sidebar-collapsed')
    if (saved !== null) {
      setIsCollapsed(saved === 'true')
    }
  }, [])

  // Sauvegarder l'état collapsed
  useEffect(() => {
    localStorage.setItem('admin-sidebar-collapsed', String(isCollapsed))
  }, [isCollapsed])

  // Fermer le menu mobile lors du changement de page
  useEffect(() => {
    setIsMobileMenuOpen(false)
  }, [pathname])

  // Empêcher le scroll du body quand le menu mobile est ouvert
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isMobileMenuOpen])

  const toggleMenu = (menuId: string) => {
    setOpenMenus(prev =>
      prev.includes(menuId)
        ? prev.filter(id => id !== menuId)
        : [...prev, menuId]
    )
  }

  const isActive = (href?: string) => {
    if (!href) return false
    if (href === '/admin') {
      return pathname === '/admin'
    }
    return pathname.startsWith(href)
  }

  const hasActiveChild = (item: MenuItem): boolean => {
    if (item.href && isActive(item.href)) return true
    if (item.children) {
      return item.children.some(child => hasActiveChild(child))
    }
    return false
  }

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
      document.cookie = 'auth-token=; Max-Age=0; path=/'
      router.push('/login')
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error)
      router.push('/login')
    }
  }

  const renderMenuItem = (item: MenuItem, level: number = 0) => {
    const hasChildren = item.children && item.children.length > 0
    const isOpen = openMenus.includes(item.id)
    const active = isActive(item.href) || hasActiveChild(item)

    // Mode collapsed - afficher seulement les icônes
    if (isCollapsed && level === 0) {
      if (hasChildren) {
        return (
          <div key={item.id} className="relative group">
            <button
              onClick={() => toggleMenu(item.id)}
              className={`w-full flex items-center justify-center p-3 rounded-lg transition-colors ${
                active
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
              title={item.label}
            >
              <item.icon className="h-5 w-5" />
            </button>
            {/* Tooltip */}
            <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 z-50 hidden group-hover:block">
              <div className="bg-gray-900 text-white text-xs rounded-lg px-3 py-2 whitespace-nowrap shadow-lg">
                {item.label}
                <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-gray-900" />
              </div>
            </div>
          </div>
        )
      }

      return (
        <Link
          key={item.id}
          href={item.href || '#'}
          className={`relative group flex items-center justify-center p-3 rounded-lg transition-colors ${
            active
              ? 'bg-emerald-50 text-emerald-700'
              : 'text-gray-700 hover:bg-gray-50'
          }`}
          title={item.label}
        >
          <item.icon className="h-5 w-5" />
          {/* Tooltip */}
          <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 z-50 hidden group-hover:block">
            <div className="bg-gray-900 text-white text-xs rounded-lg px-3 py-2 whitespace-nowrap shadow-lg">
              {item.label}
              <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-gray-900" />
            </div>
          </div>
        </Link>
      )
    }

    // Mode expanded
    if (hasChildren) {
      return (
        <div key={item.id}>
          <button
            onClick={() => toggleMenu(item.id)}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-colors ${
              active
                ? 'bg-emerald-50 text-emerald-700'
                : 'text-gray-700 hover:bg-gray-50'
            }`}
          >
            <div className="flex items-center gap-3">
              <item.icon className="h-5 w-5 flex-shrink-0" />
              <span className="font-medium text-sm">{item.label}</span>
            </div>
            {isOpen ? (
              <ChevronDown className="h-4 w-4 flex-shrink-0" />
            ) : (
              <ChevronRight className="h-4 w-4 flex-shrink-0" />
            )}
          </button>
          {isOpen && (
            <div className="ml-4 mt-1 space-y-1 border-l-2 border-gray-200 pl-4">
              {item.children!.map(child => renderMenuItem(child, level + 1))}
            </div>
          )}
        </div>
      )
    }

    return (
      <Link
        key={item.id}
        href={item.href || '#'}
        onClick={() => setIsMobileMenuOpen(false)}
        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
          active
            ? 'bg-emerald-50 text-emerald-700 font-medium'
            : 'text-gray-700 hover:bg-gray-50'
        }`}
        style={{ paddingLeft: `${12 + level * 16}px` }}
      >
        <item.icon className="h-5 w-5 flex-shrink-0" />
        <span className="text-sm">{item.label}</span>
      </Link>
    )
  }

  // Contenu sidebar expanded
  const SidebarContentExpanded = () => (
    <>
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Admin Panel</h2>
          <p className="text-xs text-gray-500 mt-0.5">IT Vision Plus</p>
        </div>
        <button
          onClick={() => setIsCollapsed(true)}
          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors hidden lg:flex"
          title="Réduire le menu"
        >
          <PanelLeftClose className="h-5 w-5" />
        </button>
      </div>
      <nav className="p-3 space-y-1 flex-1 overflow-y-auto">
        {menuItems.map(item => renderMenuItem(item))}
      </nav>
      <div className="p-3 border-t border-gray-200">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-700 hover:bg-red-50 hover:text-red-600 transition-colors"
        >
          <LogOut className="h-5 w-5 flex-shrink-0" />
          <span className="text-sm font-medium">Déconnexion</span>
        </button>
      </div>
    </>
  )

  // Contenu sidebar collapsed
  const SidebarContentCollapsed = () => (
    <>
      <div className="p-3 border-b border-gray-200 flex items-center justify-center">
        <button
          onClick={() => setIsCollapsed(false)}
          className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
          title="Étendre le menu"
        >
          <PanelLeft className="h-5 w-5" />
        </button>
      </div>
      <nav className="p-2 space-y-1 flex-1 overflow-y-auto">
        {menuItems.map(item => renderMenuItem(item))}
      </nav>
      <div className="p-2 border-t border-gray-200">
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center p-3 rounded-lg text-gray-700 hover:bg-red-50 hover:text-red-600 transition-colors group relative"
          title="Déconnexion"
        >
          <LogOut className="h-5 w-5" />
          {/* Tooltip */}
          <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 z-50 hidden group-hover:block">
            <div className="bg-gray-900 text-white text-xs rounded-lg px-3 py-2 whitespace-nowrap shadow-lg">
              Déconnexion
              <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-gray-900" />
            </div>
          </div>
        </button>
      </div>
    </>
  )

  return (
    <SidebarContext.Provider value={{ isCollapsed, setIsCollapsed }}>
      {/* Bouton menu mobile - Fixed top bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className="p-2 -ml-2 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label="Ouvrir le menu"
          >
            <Menu className="h-6 w-6 text-gray-700" />
          </button>
          <div>
            <h2 className="text-base font-bold text-gray-900">Admin Panel</h2>
          </div>
        </div>
      </div>

      {/* Spacer pour le contenu sur mobile */}
      <div className="lg:hidden h-14" />

      {/* Overlay mobile */}
      {isMobileMenuOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/50 z-40 transition-opacity"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar mobile - Slide from left */}
      <aside 
        className={`lg:hidden fixed top-0 left-0 bottom-0 w-72 max-w-[85vw] bg-white z-50 transform transition-transform duration-300 ease-in-out flex flex-col ${
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <button
          onClick={() => setIsMobileMenuOpen(false)}
          className="absolute top-3 right-3 p-2 rounded-lg hover:bg-gray-100 transition-colors z-10"
          aria-label="Fermer le menu"
        >
          <X className="h-5 w-5 text-gray-500" />
        </button>
        <SidebarContentExpanded />
      </aside>

      {/* Sidebar desktop - Collapsible */}
      <aside 
        className={`hidden lg:flex lg:flex-col lg:flex-shrink-0 bg-white border-r border-gray-200 h-screen sticky top-0 transition-all duration-300 ease-in-out ${
          isCollapsed ? 'lg:w-16' : 'lg:w-64'
        }`}
      >
        {isCollapsed ? <SidebarContentCollapsed /> : <SidebarContentExpanded />}
      </aside>
    </SidebarContext.Provider>
  )
}
