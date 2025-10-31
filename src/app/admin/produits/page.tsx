import AdminProductManager from '@/components/AdminProductManager'
import AdminTabs from '@/components/admin/AdminTabs'
import { cookies } from 'next/headers'
import jwt from 'jsonwebtoken'

export default async function AdminProduitsPage() {
  const cookieStore = await cookies()
  const token = cookieStore.get('auth-token')?.value
  let allowed = false
  try {
    if (token) {
      const decoded: any = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key')
      const role = String(decoded.role || '').toUpperCase()
      allowed = role === 'ADMIN' || role === 'PRODUCT_MANAGER'
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
    <div>
      <div className="mb-4">
        <AdminTabs context="services" />
      </div>
      <section>
        <AdminProductManager />
      </section>
    </div>
  )
}


