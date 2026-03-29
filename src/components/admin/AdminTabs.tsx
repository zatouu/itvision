'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'

type Tab = { label: string; href: string }

type Props = {
  context: 'services' | 'devis' | 'team' | 'admin'
}

const tabsByContext: Record<Props['context'], Tab[]> = {
  services: [
    { label: 'Produits', href: '/admin/produits' },
    { label: 'Prix', href: '/admin/prices' },
    { label: 'Pricing B2B', href: '/admin/produits/b2b-pricing' }
  ],
  devis: [
    { label: 'Devis', href: '/admin/devis' },
    { label: 'Projets', href: '/admin/planning' }
  ],
  team: [
    { label: 'Planning', href: '/admin/planning' },
    { label: 'Techniciens', href: '/admin/technicians' },
    { label: 'Affectations', href: '/admin/planning/assignations' }
  ],
  admin: [
    { label: 'Clients marketplace', href: '/admin/users?userCategory=MARKETPLACE_CLIENT' },
    { label: 'Clients entreprise', href: '/admin/users?userCategory=ENTERPRISE_CLIENT' },
    { label: 'Utilisateurs plateforme', href: '/admin/users?userCategory=PLATFORM_USER' },
    { label: 'Paramètres', href: '/admin/migration' }
  ]
}

export default function AdminTabs({ context }: Props) {
  const pathname = usePathname()
  const [search, setSearch] = useState('')
  const tabs = tabsByContext[context]

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setSearch(window.location.search)
    }
  }, [pathname])

  if (!Array.isArray(tabs) || tabs.length === 0) {
    return null
  }

  return (
    <div className="border-b border-gray-200 mb-6">
      <div className="flex items-center gap-2">
        {tabs.map((tab, index) => {
          const [tabPath, tabQuery = ''] = tab.href.split('?')
          let active = pathname === tabPath || pathname.startsWith(tabPath)

          if (active && tabQuery) {
            const expectedParams = new URLSearchParams(tabQuery)
            const currentParams = new URLSearchParams(search)
            active = Array.from(expectedParams.entries()).every(([key, value]) => currentParams.get(key) === value)
          }

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


