'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

type Tab = { label: string; href: string }

type Props = {
  context: 'services' | 'devis' | 'team' | 'admin'
}

const tabsByContext: Record<Props['context'], Tab[]> = {
  services: [
    { label: 'Catalogue', href: '/admin/catalog' },
    { label: 'Produits', href: '/admin/produits' },
    { label: 'Ingestion', href: '/admin/ingestion' },
    { label: 'Prix', href: '/admin/prices' },
    { label: 'Variantes', href: '/admin/prices' }
  ],
  devis: [
    { label: 'Générateur', href: '/admin/quotes' },
    { label: 'Projets', href: '/admin/planning' },
    { label: 'Historique', href: '/admin/admin-reports' }
  ],
  team: [
    { label: 'Planning', href: '/admin/planning' },
    { label: 'Techniciens', href: '/admin/technicians' },
    { label: 'Affectations', href: '/admin/planning/assignations' }
  ],
  admin: [
    { label: 'Utilisateurs', href: '/admin/users' },
    { label: 'Services', href: '/admin/catalog' },
    { label: 'Ingestion', href: '/admin/ingestion' },
    { label: 'Paramètres', href: '/admin/migration' }
  ]
}

export default function AdminTabs({ context }: Props) {
  const pathname = usePathname()
  const tabs = tabsByContext[context]

  if (!Array.isArray(tabs) || tabs.length === 0) {
    return null
  }

  return (
    <div className="border-b border-gray-200 mb-6">
      <div className="flex items-center gap-2">
        {tabs.map((tab, index) => {
          const active = pathname === tab.href || pathname.startsWith(tab.href)
          return (
            <Link
              key={`${tab.href}-${tab.label}-${index}`}
              href={tab.href}
              className={`px-3 py-2 rounded-t-lg text-sm font-medium border-b-2 -mb-px ${
                active ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              {tab.label}
            </Link>
          )
        })}
      </div>
    </div>
  )
}


