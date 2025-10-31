'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Home,
  FolderKanban,
  Package,
  Tags,
  Calculator,
  Users,
  Calendar,
  Settings
} from 'lucide-react'

type NavItem = {
  label: string
  href: string
  icon: React.ComponentType<{ className?: string }>
}

const navItems: NavItem[] = [
  { label: 'Dashboard', href: '/admin', icon: Home },
  { label: 'Projets', href: '/admin/planning', icon: FolderKanban },
  { label: 'Services & Produits', href: '/admin/catalog', icon: Package },
  { label: 'Devis & Tarification', href: '/admin/quotes', icon: Calculator },
  { label: 'Équipe & Techniciens', href: '/admin/users', icon: Users },
  { label: 'Planning', href: '/admin/planning', icon: Calendar },
  { label: 'Administration', href: '/admin/migration', icon: Settings }
]

export default function AdminSidebar() {
  const pathname = usePathname()

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-white border-r border-gray-200 z-50">
      <div className="h-16 flex items-center px-5 border-b border-gray-100">
        <div className="text-sm font-semibold text-gray-900">
          IT Vision Admin
        </div>
      </div>
      <nav className="py-4">
        <ul className="px-2 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon
            const active = pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href))
            return (
              <li key={`${item.href}-${item.label}`}>
                <Link
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    active
                      ? 'bg-emerald-50 text-emerald-700'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <Icon className={`h-4 w-4 ${active ? 'text-emerald-600' : 'text-gray-400'}`} />
                  <span>{item.label}</span>
                </Link>
              </li>
            )
          })}
        </ul>
        <div className="mt-4 px-4">
          <div className="text-xs uppercase text-gray-400 font-semibold mb-2">
            Domaines
          </div>
          <ul className="space-y-1">
            <li>
              <Link href="/admin/catalog" className="flex items-center gap-2 text-xs px-3 py-2 rounded-md text-gray-600 hover:bg-gray-100">
                <Package className="h-3.5 w-3.5 text-gray-400" />
                Catalogue & Produits
              </Link>
            </li>
            <li>
              <Link href="/admin/prices" className="flex items-center gap-2 text-xs px-3 py-2 rounded-md text-gray-600 hover:bg-gray-100">
                <Tags className="h-3.5 w-3.5 text-gray-400" />
                Prix & Variantes
              </Link>
            </li>
          </ul>
        </div>
      </nav>
    </aside>
  )
}


