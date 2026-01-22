import AdminTabs from '@/components/admin/AdminTabs'
import ErrorBoundary from '@/components/ErrorBoundary'
import UsedProductIngestion from '@/components/admin/UsedProductIngestion'
import { cookies } from 'next/headers'
import { verifyAuthToken } from '@/lib/jwt'

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
        <section>
          <UsedProductIngestion />
        </section>
      </div>
    </ErrorBoundary>
  )
}
