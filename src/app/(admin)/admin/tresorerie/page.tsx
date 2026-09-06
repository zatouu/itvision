import { cookies } from 'next/headers'
import { verifyAuthToken } from '@/lib/jwt'
import Breadcrumb from '@/components/Breadcrumb'
import TreasuryDashboard from '@/components/admin/TreasuryDashboard'

export const dynamic = 'force-dynamic'

export default async function AdminTresoreriePage() {
  const cookieStore = await cookies()
  const token = cookieStore.get('auth-token')?.value
  let allowed = false
  try {
    if (token) {
      const decoded = await verifyAuthToken(token)
      const role = String(decoded.role || '').toUpperCase()
      allowed = ['ADMIN', 'SUPER_ADMIN', 'ACCOUNTANT'].includes(role)
    }
  } catch {}

  if (!allowed) {
    return (
      <div className="pt-24 pb-6">
        <div className="max-w-3xl mx-auto text-center bg-white p-8 rounded-xl border">
          <h2 className="text-xl font-bold mb-2">Accès refusé</h2>
          <p className="text-gray-600">Cette section est réservée aux administrateurs et comptables.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="pt-16">
        <Breadcrumb backHref="/admin" backLabel="Retour au dashboard" />
      </div>
      <TreasuryDashboard />
    </div>
  )
}
