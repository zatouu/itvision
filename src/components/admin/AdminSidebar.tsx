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
  ChevronDown
} from 'lucide-react'
import { useState } from 'react'

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
  const router = useRouter()
  const [openMenus, setOpenMenus] = useState<string[]>(['administration'])

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
            onClick={() => toggleMenu(item.id)}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition-colors ${
              active
                ? 'bg-emerald-50 text-emerald-700'
                : 'text-gray-700 hover:bg-gray-50'
            }`}
          >
            <div className="flex items-center gap-3">
              <item.icon className="h-5 w-5" />
              <span className="font-medium">{item.label}</span>
            </div>
            {isOpen ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
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
        className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
          active
            ? 'bg-emerald-50 text-emerald-700 font-medium'
            : 'text-gray-700 hover:bg-gray-50'
        }`}
        style={{ paddingLeft: `${16 + level * 16}px` }}
      >
        <item.icon className="h-5 w-5" />
        <span>{item.label}</span>
      </Link>
    )
  }

  return (
    <aside className="w-64 bg-white border-r border-gray-200">
      <div className="p-6 border-b border-gray-200">
        <h2 className="text-xl font-bold text-gray-900">Admin Panel</h2>
        <p className="text-sm text-gray-500 mt-1">IT Vision Plus</p>
      </div>
      <nav className="p-4 space-y-1">
        {menuItems.map(item => renderMenuItem(item))}
      </nav>
    </aside>
  )
}
