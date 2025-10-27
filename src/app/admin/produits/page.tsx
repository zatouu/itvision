import Header from '@/components/Header'
import Footer from '@/components/Footer'
import AdminProductManager from '@/components/AdminProductManager'
import { cookies } from 'next/headers'
import jwt from 'jsonwebtoken'

export default function AdminProduitsPage() {
  const token = cookies().get('auth-token')?.value
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
      <main>
        <Header />
        <section className="page-content pt-28 pb-12">
          <div className="max-w-3xl mx-auto text-center bg-white p-8 rounded-xl border">
            <h2 className="text-xl font-bold mb-2">Accès refusé</h2>
            <p className="text-gray-600">Cette section est réservée aux administrateurs et gestionnaires produits.</p>
          </div>
        </section>
        <Footer />
      </main>
    )
  }
  return (
    <main>
      <Header />
      <section className="page-content pt-28 pb-12">
        <AdminProductManager />
      </section>
      <Footer />
    </main>
  )
}


