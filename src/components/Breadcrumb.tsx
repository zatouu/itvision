'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronRight, Home, ArrowLeft } from 'lucide-react'

interface BreadcrumbItem {
  label: string
  href?: string
  icon?: React.ComponentType<any>
}

interface BreadcrumbProps {
  items?: BreadcrumbItem[]
  showBackButton?: boolean
  backHref?: string
  backLabel?: string
}

const Breadcrumb = ({ 
  items, 
  showBackButton = true, 
  backHref,
  backLabel = "Retour"
}: BreadcrumbProps) => {
  const pathname = usePathname()
  
  // Génération automatique du breadcrumb basé sur l'URL si pas d'items fournis
  const generateBreadcrumb = (): BreadcrumbItem[] => {
    const pathSegments = pathname.split('/').filter(Boolean)
    const breadcrumbItems: BreadcrumbItem[] = [
      { label: 'Accueil', href: '/', icon: Home }
    ]

    let currentPath = ''
    pathSegments.forEach((segment, index) => {
      currentPath += `/${segment}`
      
      // Mapping des segments vers des labels lisibles
      const segmentLabels: Record<string, string> = {
        'admin': 'Administration',
        'admin-reports': 'Rapports Admin',
        'admin-prix': 'Gestion Prix',
        'admin-produits': 'Gestion Produits',
        'admin-factures': 'Gestion Factures',
        'tech-interface': 'Interface Technicien',
        'client-portal': 'Portail Client',
        'validation-rapports': 'Validation Rapports',
        'gestion-projets': 'Gestion Projets',
        'users': 'Utilisateurs',
        'prices': 'Prix',
        'quotes': 'Devis',
        'catalog': 'Catalogue',
        'migration': 'Migration',
        'services': 'Services',
        'products': 'Produits'
      }
      
      const label = segmentLabels[segment] || segment.charAt(0).toUpperCase() + segment.slice(1)
      
      breadcrumbItems.push({
        label,
        href: index === pathSegments.length - 1 ? undefined : currentPath
      })
    })

    return breadcrumbItems
  }

  const breadcrumbItems = items || generateBreadcrumb()
  
  // Déterminer l'URL de retour automatiquement
  const getBackHref = () => {
    if (backHref) return backHref
    
    const pathSegments = pathname.split('/').filter(Boolean)
    if (pathSegments.length <= 1) return '/'
    
    // Retour au niveau parent
    const parentPath = '/' + pathSegments.slice(0, -1).join('/')
    return parentPath === '/' ? '/' : parentPath
  }

  return (
    <div className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        {/* Breadcrumb */}
        <nav className="flex items-center space-x-2 text-sm">
          {breadcrumbItems.map((item, index) => {
            const Icon = item.icon
            const isLast = index === breadcrumbItems.length - 1
            
            return (
              <div key={index} className="flex items-center">
                {index > 0 && <ChevronRight className="h-4 w-4 text-gray-400 mx-2" />}
                
                {item.href ? (
                  <Link
                    href={item.href}
                    className="flex items-center gap-1 text-gray-600 hover:text-gray-900 transition-colors"
                  >
                    {Icon && <Icon className="h-4 w-4" />}
                    <span>{item.label}</span>
                  </Link>
                ) : (
                  <span className="flex items-center gap-1 text-gray-900 font-medium">
                    {Icon && <Icon className="h-4 w-4" />}
                    {item.label}
                  </span>
                )}
              </div>
            )
          })}
        </nav>

        {/* Bouton de retour */}
        {showBackButton && (
          <Link
            href={getBackHref()}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 px-3 py-2 rounded-lg hover:bg-gray-100 transition-all duration-200 text-sm font-medium"
          >
            <ArrowLeft className="h-4 w-4" />
            {backLabel}
          </Link>
        )}
      </div>
    </div>
  )
}

export default Breadcrumb
