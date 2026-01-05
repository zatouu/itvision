'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
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
  Menu
} from 'lucide-react'
import { useState, useEffect } from 'react'

interface MenuItem {
  id: string
  label: string
  icon: any
  href?: string
  children?: MenuItem[]
}

const menuItems: MenuItem[] = [
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

export default function AdminSidebar() {
  const pathname = usePathname()
  const [openMenus, setOpenMenus] = useState<string[]>(['administration'])
  const [isCollapsed, setIsCollapsed] = useState(false)

  // Charger l'état de collapse depuis localStorage
  useEffect(() => {
    const saved = localStorage.getItem('admin-sidebar-collapsed')
    if (saved !== null) {
      setIsCollapsed(saved === 'true')
    }
  }, [])

  // Sauvegarder l'état de collapse
  const toggleCollapse = () => {
    const newState = !isCollapsed
    setIsCollapsed(newState)
    localStorage.setItem('admin-sidebar-collapsed', String(newState))
  }

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

  const renderMenuItem = (item: MenuItem, level: number = 0) => {
    const hasChildren = item.children && item.children.length > 0
    const isOpen = openMenus.includes(item.id)
    const active = isActive(item.href) || hasActiveChild(item)

    if (hasChildren) {
      return (
        <div key={item.id}>
          <button
            onClick={() => !isCollapsed && toggleMenu(item.id)}
            title={isCollapsed ? item.label : undefined}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-colors ${
              active
                ? 'bg-emerald-50 text-emerald-700'
                : 'text-gray-700 hover:bg-gray-50'
            } ${isCollapsed ? 'justify-center' : ''}`}
          >
            <div className={`flex items-center ${isCollapsed ? '' : 'gap-3'}`}>
              <item.icon className="h-5 w-5 flex-shrink-0" />
              {!isCollapsed && <span className="font-medium text-sm">{item.label}</span>}
            </div>
            {!isCollapsed && (
              isOpen ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )
            )}
          </button>
          {isOpen && !isCollapsed && (
            <div className="ml-4 mt-1 space-y-1 border-l-2 border-gray-200 pl-3">
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
        title={isCollapsed ? item.label : undefined}
        className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} px-3 py-2.5 rounded-lg transition-colors ${
          active
            ? 'bg-emerald-50 text-emerald-700 font-medium'
            : 'text-gray-700 hover:bg-gray-50'
        }`}
        style={!isCollapsed ? { paddingLeft: `${12 + level * 12}px` } : undefined}
      >
        <item.icon className="h-5 w-5 flex-shrink-0" />
        {!isCollapsed && <span className="text-sm">{item.label}</span>}
      </Link>
    )
  }

  return (
    <aside 
      className={`${isCollapsed ? 'w-16' : 'w-64'} bg-white border-r border-gray-200 flex-shrink-0 transition-all duration-300 flex flex-col h-screen sticky top-0`}
    >
      {/* Header avec logo */}
      <div className={`p-4 border-b border-gray-200 flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
        {!isCollapsed ? (
          <>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
                <Image src="/Icone.png" alt="IT Vision" width={24} height={24} />
              </div>
              <div>
                <h2 className="text-sm font-bold text-gray-900">Admin Panel</h2>
                <p className="text-xs text-gray-500">IT Vision</p>
              </div>
            </div>
            <button
              onClick={toggleCollapse}
              className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
              title="Réduire le menu"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          </>
        ) : (
          <button
            onClick={toggleCollapse}
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
            title="Agrandir le menu"
          >
            <Menu className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
        {menuItems.map(item => renderMenuItem(item))}
      </nav>

      {/* Footer avec version */}
      {!isCollapsed && (
        <div className="p-3 border-t border-gray-200 text-xs text-gray-400 text-center">
          v1.0.0
        </div>
      )}
    </aside>
  )
}
