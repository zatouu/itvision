'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { ChevronRight, Home } from 'lucide-react'
import { getBreadcrumbFromPath } from './AdminSidebar'

interface AdminBreadcrumbProps {
  className?: string
}

export default function AdminBreadcrumb({ className = '' }: AdminBreadcrumbProps) {
  const pathname = usePathname()
  const breadcrumbs = getBreadcrumbFromPath(pathname)

  if (breadcrumbs.length <= 1) {
    return null
  }

  return (
    <nav className={`flex items-center gap-1 text-sm ${className}`} aria-label="Fil d'Ariane">
      {breadcrumbs.map((crumb, index) => {
        const isLast = index === breadcrumbs.length - 1
        const isFirst = index === 0

        return (
          <div key={crumb.href + index} className="flex items-center gap-1">
            {index > 0 && (
              <ChevronRight className="h-4 w-4 text-gray-400 flex-shrink-0" />
            )}
            
            {isLast ? (
              <span className="flex items-center gap-1.5 text-gray-900 font-medium">
                {crumb.icon && <crumb.icon className="h-4 w-4" />}
                <span className="truncate max-w-[200px]">{crumb.label}</span>
              </span>
            ) : (
              <Link
                href={crumb.href}
                className="flex items-center gap-1.5 text-gray-500 hover:text-emerald-600 transition-colors"
              >
                {isFirst ? (
                  <Home className="h-4 w-4" />
                ) : (
                  crumb.icon && <crumb.icon className="h-4 w-4" />
                )}
                <span className="hidden sm:inline truncate max-w-[150px]">{crumb.label}</span>
              </Link>
            )}
          </div>
        )
      })}
    </nav>
  )
}
