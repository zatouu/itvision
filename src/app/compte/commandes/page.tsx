import Link from 'next/link'
import { redirect } from 'next/navigation'
import mongoose from 'mongoose'
import { verifyAuthServer } from '@/lib/auth-server'
import { connectDB } from '@/lib/db'
import { Order } from '@/lib/models/Order'

function formatCurrency(v: number, currency = 'FCFA') {
  return `${Math.round(v).toLocaleString('fr-FR')} ${currency}`
}

function formatDate(value: any) {
  try {
    const d = value instanceof Date ? value : new Date(value)
    return d.toLocaleDateString('fr-FR', { year: 'numeric', month: 'short', day: '2-digit' })
  } catch {
    return ''
  }
}

function statusLabel(status: string) {
  switch (status) {
    case 'pending':
      return 'En attente'
    case 'confirmed':
      return 'Confirmée'
    case 'processing':
      return 'Traitement'
    case 'shipped':
      return 'Expédiée'
    case 'delivered':
      return 'Livrée'
    case 'cancelled':
      return 'Annulée'
    default:
      return status
  }
}

export default async function CompteCommandesPage() {
  const auth = await verifyAuthServer()
  if (!auth.isAuthenticated || !auth.user?.id) {
    redirect('/login?redirect=/compte/commandes')
  }

  await connectDB()

  const clientId = new mongoose.Types.ObjectId(auth.user.id)

  const orders = (await Order.find({ clientId })
    .sort({ createdAt: -1 })
    .limit(50)
    .lean()) as any[]

  return (
    <div className="min-h-screen page-content bg-gradient-to-br from-slate-50 via-white to-emerald-50 dark:from-black dark:via-black dark:to-black">
      <div className="mx-auto max-w-5xl px-4 py-10">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Mon compte</div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">Mes commandes</h1>
            <p className="mt-1 text-gray-600 dark:text-gray-300">
              Vos commandes associées à votre compte.
            </p>
          </div>
          <Link
            href="/compte"
            className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 dark:border-slate-800 dark:bg-slate-900 dark:text-gray-200 dark:hover:bg-slate-800"
          >
            Retour
          </Link>
        </div>

        <div className="mt-8 rounded-3xl border border-gray-200 bg-white/80 backdrop-blur p-6 shadow-xl dark:border-slate-800 dark:bg-slate-950/70">
          {orders.length === 0 ? (
            <div className="py-10 text-center">
              <div className="text-lg font-semibold text-gray-900 dark:text-white">Aucune commande</div>
              <div className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                Vos commandes “invitées” apparaîtront ici après connexion depuis votre lien de suivi.
              </div>
              <div className="mt-6 flex justify-center gap-3">
                <Link
                  href="/compte/reclamer-commande"
                  className="rounded-xl border border-gray-200 bg-white px-5 py-3 text-sm font-bold text-gray-900 transition hover:bg-gray-50 dark:border-slate-800 dark:bg-slate-900 dark:text-gray-200 dark:hover:bg-slate-800"
                >
                  Réclamer une commande
                </Link>
                <Link
                  href="/produits"
                  className="rounded-xl bg-gradient-to-r from-emerald-600 to-blue-600 px-5 py-3 text-sm font-bold text-white transition hover:from-emerald-700 hover:to-blue-700"
                >
                  Voir le catalogue
                </Link>
                <Link
                  href="/retrouver-ma-commande"
                  className="rounded-xl border border-gray-200 bg-white px-5 py-3 text-sm font-bold text-gray-900 transition hover:bg-gray-50 dark:border-slate-800 dark:bg-slate-900 dark:text-gray-200 dark:hover:bg-slate-800"
                >
                  Retrouver un lien
                </Link>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-slate-800">
              {orders.map(o => (
                <div key={o._id} className="py-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="flex items-center gap-3">
                      <Link
                        href={`/commandes/${encodeURIComponent(o.orderId)}`}
                        className="font-semibold text-gray-900 hover:underline dark:text-white"
                      >
                        {o.orderId}
                      </Link>
                      <span className="text-xs rounded-full bg-gray-100 px-2 py-1 text-gray-700 dark:bg-slate-900 dark:text-gray-200">
                        {statusLabel(String(o.status || ''))}
                      </span>
                    </div>
                    <div className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                      {formatDate(o.createdAt)} • {o.items?.length || 0} article(s)
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-gray-900 dark:text-white">
                      {formatCurrency(Number(o.total || 0), String(o.currency || 'FCFA'))}
                    </div>
                    <div className="mt-1">
                      <Link
                        href={`/commandes/${encodeURIComponent(o.orderId)}`}
                        className="text-sm font-semibold text-emerald-700 hover:underline dark:text-emerald-300"
                      >
                        Ouvrir →
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
