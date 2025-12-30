'use client'

import { ReactNode } from 'react'
import AdminSidebar from './AdminSidebar'
import AdminBreadcrumb from './AdminBreadcrumb'

interface AdminPageWrapperProps {
  children: ReactNode
  title?: string
  description?: string
  showBreadcrumb?: boolean
  actions?: ReactNode
}

export default function AdminPageWrapper({
  children,
  title,
  description,
  showBreadcrumb = true,
  actions
}: AdminPageWrapperProps) {
  return (
    <div className="h-screen flex overflow-hidden bg-gray-50">
      <AdminSidebar />
      <main className="flex-1 overflow-y-auto overflow-x-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 pb-20">
          {/* Fil d'Ariane */}
          {showBreadcrumb && <AdminBreadcrumb className="mb-4" />}
          
          {/* En-tête de page */}
          {(title || actions) && (
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <div>
                {title && (
                  <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{title}</h1>
                )}
                {description && (
                  <p className="text-gray-600 mt-1 text-sm sm:text-base">{description}</p>
                )}
              </div>
              {actions && (
                <div className="flex items-center gap-3">
                  {actions}
                </div>
              )}
            </div>
          )}
          
          {children}
        </div>
      </main>
    </div>
  )
}
