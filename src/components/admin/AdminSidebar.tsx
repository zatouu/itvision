'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import {
  Home,
  FolderKanban,
  Package,
  Tags,
  Calculator,
  Users,
  Calendar,
  Settings,
  MessageCircle,
  Building2,
  Download,
  FileText,
  Wrench,
  UserCog,
  ShieldCheck,
  ChevronDown,
  ChevronUp
} from 'lucide-react'

type NavChild = {
  label: string
  href: string
}

type NavEntry = {
  label: string
  href?: string
  icon: React.ComponentType<{ className?: string }>
  children?: NavChild[]
}

const navEntries: NavEntry[] = [
  { label: 'Dashboard', href: '/admin', icon: Home },
  { label: 'Clients', href: '/admin/clients', icon: Building2 },
  { label: 'Projets', href: '/admin/projects', icon: FolderKanban },
  {
    label: 'Maintenance',
    icon: ShieldCheck,
    children: [
      { label: 'Centre maintenance', href: '/admin/maintenance' },
      { label: 'Contrats', href: '/admin/maintenance?view=contracts' },
      { label: 'Visites générées', href: '/admin/planning?source=maintenance' }
    ]
  },
  { label: 'Techniciens', href: '/admin/technicians', icon: Wrench },
  {
    label: 'Planning',
    icon: Calendar,
    children: [
      { label: 'Planning global', href: '/admin/planning' },
      { label: 'Marketplace interventions', href: '/admin/planning?view=marketplace' },
      { label: 'Installations produits', href: '/admin/planning?view=installations' }
    ]
  },
  {
    label: 'Services & Produits',
    icon: Package,
    children: [
      { label: 'Catalogue', href: '/admin/catalog' },
      { label: 'Produits import', href: '/admin/import-produits' },
      { label: 'Tarifs & variantes', href: '/admin/prices' }
    ]
  },
  {
    label: 'Devis & ventes',
    icon: FileText,
    children: [
      { label: 'Générateur de devis', href: '/admin/devis' },
      { label: 'Commandes', href: '/admin/orders' },
      { label: 'Intelligence pricing', href: '/admin/pricing' }
    ]
  },
  { label: 'Tickets Support', href: '/admin/tickets', icon: MessageCircle },
  { label: 'Utilisateurs', href: '/admin/users', icon: UserCog },
  { label: 'Administration', href: '/admin/migration', icon: Settings }
]

export default function AdminSidebar() {
  const pathname = usePathname()
  const initialState = useMemo(() => {
    const state: Record<string, boolean> = {}
    navEntries.forEach((entry) => {
      if (entry.children) {
        state[entry.label] = entry.children.some((child) =>
          pathname === child.href || pathname.startsWith(child.href)
        )
      }
    })
    return state
  }, [pathname])
  const [openSections, setOpenSections] = useState<Record<string, boolean>>(initialState)

  useEffect(() => {
    setOpenSections((prev) => {
      const next = { ...prev }
      navEntries.forEach((entry) => {
        if (entry.children) {
          const shouldBeOpen = entry.children.some(
            (child) => pathname === child.href || pathname.startsWith(child.href)
          )
          if (shouldBeOpen) {
            next[entry.label] = true
          }
        }
      })
      return next
    })
  }, [pathname])

  const toggleSection = (label: string) => {
    setOpenSections((prev) => ({ ...prev, [label]: !prev[label] }))
  }

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-white border-r border-gray-200 z-50">
      <div className="h-16 flex items-center px-5 border-b border-gray-100">
        <div className="text-sm font-semibold text-gray-900">
          IT Vision Admin
        </div>
      </div>
      <nav className="py-4">
        <ul className="px-2 space-y-1">
          {navEntries.map((entry) => {
            const Icon = entry.icon
            const isActive =
              entry.href
                ? pathname === entry.href || (entry.href !== '/admin' && pathname.startsWith(entry.href))
                : entry.children?.some((child) => pathname.startsWith(child.href))

            if (!entry.children) {
              return (
                <li key={`${entry.label}-${entry.href}`}>
                  <Link
                    href={entry.href as string}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive ? 'bg-emerald-50 text-emerald-700' : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <Icon className={`h-4 w-4 ${isActive ? 'text-emerald-600' : 'text-gray-400'}`} />
                    <span>{entry.label}</span>
                  </Link>
                </li>
              )
            }

            const sectionOpen = openSections[entry.label]
            return (
              <li key={`${entry.label}-section`}>
                <button
                  type="button"
                  onClick={() => toggleSection(entry.label)}
                  className={`w-full flex items-center justify-between gap-3 px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
                    sectionOpen ? 'bg-emerald-50 text-emerald-700' : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <Icon className={`h-4 w-4 ${sectionOpen ? 'text-emerald-600' : 'text-gray-400'}`} />
                    {entry.label}
                  </span>
                  {sectionOpen ? (
                    <ChevronUp className="h-4 w-4 text-gray-400" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-gray-400" />
                  )}
                </button>
                {sectionOpen && (
                  <ul className="mt-1 ml-6 border-l border-gray-100 pl-3 space-y-1">
                    {entry.children.map((child) => {
                      const childActive = pathname === child.href || pathname.startsWith(child.href)
                      return (
                        <li key={`${entry.label}-${child.href}`}>
                          <Link
                            href={child.href}
                            className={`flex items-center gap-2 px-2 py-1.5 rounded-md text-xs font-medium transition-colors ${
                              childActive
                                ? 'text-emerald-700 bg-emerald-50'
                                : 'text-gray-600 hover:bg-gray-100'
                            }`}
                          >
                            <span className="inline-block h-1.5 w-1.5 rounded-full bg-gray-300" />
                            {child.label}
                          </Link>
                        </li>
                      )
                    })}
                  </ul>
                )}
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
            <li>
              <Link href="/admin/import-produits" className="flex items-center gap-2 text-xs px-3 py-2 rounded-md text-gray-600 hover:bg-gray-100">
                <Download className="h-3.5 w-3.5 text-gray-400" />
                Import AliExpress
              </Link>
            </li>
          </ul>
        </div>
      </nav>
    </aside>
  )
}


