import AdminTabs from '@/components/admin/AdminTabs'
import ErrorBoundary from '@/components/ErrorBoundary'
import Link from 'next/link'
import { cookies } from 'next/headers'
import { verifyAuthToken } from '@/lib/jwt'
import AdminIngestionHub from '@/components/admin/AdminIngestionHub'

export default async function AdminIngestionPage() {
  const cookieStore = await cookies()
  const token = cookieStore.get('auth-token')?.value

  let allowed = false
  try {
    if (token) {
      const decoded = await verifyAuthToken(token)
      const role = String(decoded.role || '').toUpperCase()
      allowed = role === 'ADMIN' || role === 'SUPER_ADMIN' || role === 'PRODUCT_MANAGER'
    }
  } catch {}

  if (!allowed) {
    return (
      <div className="pt-2 pb-6">
        <div className="max-w-3xl mx-auto text-center bg-white p-8 rounded-xl border">
          <h2 className="text-xl font-bold mb-2">Accès refusé</h2>
          <p className="text-gray-600">Cette section est réservée aux administrateurs et gestionnaires produits.</p>
        </div>
      </div>
    )
  }

  return (
    <ErrorBoundary>
      <div>
        <div className="mb-4">
          <AdminTabs context="services" />
        </div>
        <div className="mb-4 rounded-2xl border border-gray-200 bg-white p-5">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-base font-semibold text-gray-900">Ingestion</h2>
              <p className="text-sm text-gray-600 mt-1">
                Idle Fish (occasion) + import AliExpress/1688 par URL (sans RapidAPI).
              </p>
            </div>
            <Link href="/admin/import-produits" className="text-sm font-semibold text-blue-700 hover:underline">
              Ouvrir l’import avancé (recherche + bulk)
            </Link>
          </div>
        </div>

        <section>
          <AdminIngestionHub />
        </section>
      </div>
    </ErrorBoundary>
  )
}
