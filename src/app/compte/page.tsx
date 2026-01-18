import Link from 'next/link'
import { redirect } from 'next/navigation'
import Image from 'next/image'
import { verifyAuthServer } from '@/lib/auth-server'
import mongoose from 'mongoose'
import { connectDB } from '@/lib/db'
import { Order } from '@/lib/models/Order'
import { GroupOrder } from '@/lib/models/GroupOrder'
import User from '@/lib/models/User'
import Client from '@/lib/models/Client'
import ProductValidated from '@/lib/models/Product.validated'
import WishlistCountBadge from '@/components/WishlistCountBadge'

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

export default async function ComptePage() {
  const auth = await verifyAuthServer()
  if (!auth.isAuthenticated || !auth.user) {
    redirect('/login?redirect=/compte')
  }

  await connectDB()
  const userObjectId = new mongoose.Types.ObjectId(auth.user.id)

  const recentOrders = (await Order.find({ clientId: userObjectId })
    .sort({ createdAt: -1 })
    .limit(5)
    .lean()) as any[]

  const recentGroups = (await GroupOrder.find({
    $or: [{ 'participants.userId': userObjectId }, { 'createdBy.userId': userObjectId }]
  })
    .sort({ updatedAt: -1 })
    .limit(5)
    .lean()) as any[]

  // Favoris (aperçu des 4 derniers)
  const userDoc = await User.findById(userObjectId).select('favoriteProductIds').lean()
  const clientDoc = userDoc ? null : await Client.findById(userObjectId).select('favoriteProductIds').lean()
  const favoriteProductIds: string[] = Array.isArray((userDoc as any)?.favoriteProductIds)
    ? (userDoc as any).favoriteProductIds
    : Array.isArray((clientDoc as any)?.favoriteProductIds)
      ? (clientDoc as any).favoriteProductIds
      : []

  const favoritePreviewIds = favoriteProductIds.slice(-4).reverse().filter(Boolean)
  const favoritePreviewObjectIds = favoritePreviewIds
    .filter((id) => mongoose.isValidObjectId(id))
    .map((id) => new mongoose.Types.ObjectId(id))

  const favoritePreviewDocs = favoritePreviewObjectIds.length
    ? ((await ProductValidated.find({ _id: { $in: favoritePreviewObjectIds } })
        .select('name image gallery price currency requiresQuote')
        .lean()) as any[])
    : ([] as any[])

  const favoritePreviewById = new Map<string, any>(favoritePreviewDocs.map((p) => [String(p._id), p]))
  const favoritePreviewProducts = favoritePreviewIds.map((id) => favoritePreviewById.get(String(id))).filter(Boolean)

  return (
    <div className="min-h-screen page-content bg-gradient-to-br from-slate-50 via-white to-emerald-50 dark:from-black dark:via-black dark:to-black">
      <div className="mx-auto max-w-5xl px-4 py-10">
        <div className="rounded-3xl border border-gray-200 bg-white/80 backdrop-blur p-8 shadow-xl dark:border-slate-800 dark:bg-slate-950/70">
          <div className="flex flex-col gap-2">
            <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Mon compte</div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">Bienvenue{auth.user.email ? `, ${auth.user.email}` : ''}</h1>
            <p className="text-gray-600 dark:text-gray-300">
              Gérez vos achats, vos achats groupés et vos informations.
            </p>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <Link
              href="/compte/commandes"
              className="group rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="text-lg font-semibold text-gray-900 dark:text-white">Mes commandes</div>
              <div className="mt-1 text-sm text-gray-600 dark:text-gray-300">Historique et accès rapide</div>
              <div className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                Voir mes commandes →
              </div>
            </Link>

            <Link
              href="/compte/achats-groupes"
              className="group rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="text-lg font-semibold text-gray-900 dark:text-white">Mes achats groupés</div>
              <div className="mt-1 text-sm text-gray-600 dark:text-gray-300">Groupes créés et rejoints</div>
              <div className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                Voir mes groupes →
              </div>
            </Link>

            <Link
              href="/compte/profil"
              className="group rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="text-lg font-semibold text-gray-900 dark:text-white">Profil</div>
              <div className="mt-1 text-sm text-gray-600 dark:text-gray-300">Nom, téléphone, mot de passe</div>
              <div className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                Modifier mon profil →
              </div>
            </Link>

            <Link
              href="/compte/reclamer-commande"
              className="group rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="text-lg font-semibold text-gray-900 dark:text-white">Réclamer une commande</div>
              <div className="mt-1 text-sm text-gray-600 dark:text-gray-300">Associer une commande “invité” à votre compte</div>
              <div className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                Associer une commande →
              </div>
            </Link>

            <Link
              href="/produits"
              className="group rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="text-lg font-semibold text-gray-900 dark:text-white">Catalogue</div>
              <div className="mt-1 text-sm text-gray-600 dark:text-gray-300">Continuer vos achats</div>
              <div className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                Voir les produits →
              </div>
            </Link>

            <Link
              href="/produits/favoris"
              className="group rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="text-lg font-semibold text-gray-900 dark:text-white">Mes favoris</div>
                <WishlistCountBadge />
              </div>
              <div className="mt-1 text-sm text-gray-600 dark:text-gray-300">Produits enregistrés (synchronisés)</div>
              <div className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                Voir mes favoris →
              </div>
            </Link>

            <Link
              href="/panier"
              className="group rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="text-lg font-semibold text-gray-900 dark:text-white">Panier</div>
              <div className="mt-1 text-sm text-gray-600 dark:text-gray-300">Finaliser votre commande</div>
              <div className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                Accéder au panier →
              </div>
            </Link>

            <Link
              href="/retrouver-ma-commande"
              className="group rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="text-lg font-semibold text-gray-900 dark:text-white">Suivi de commande</div>
              <div className="mt-1 text-sm text-gray-600 dark:text-gray-300">Retrouver un lien de suivi</div>
              <div className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                Retrouver ma commande →
              </div>
            </Link>
          </div>

          <div className="mt-10 grid gap-6 md:grid-cols-2">
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between">
                <div className="text-lg font-semibold text-gray-900 dark:text-white">Dernières commandes</div>
                <Link href="/compte/commandes" className="text-sm font-semibold text-emerald-700 hover:underline dark:text-emerald-300">
                  Tout voir
                </Link>
              </div>

              {recentOrders.length === 0 ? (
                <div className="mt-4 text-sm text-gray-600 dark:text-gray-300">
                  Aucune commande associée à votre compte pour l'instant.
                </div>
              ) : (
                <div className="mt-4 divide-y divide-gray-200 dark:divide-slate-800">
                  {recentOrders.map(o => (
                    <div key={o._id} className="py-3 flex items-center justify-between gap-4">
                      <div>
                        <div className="font-semibold text-gray-900 dark:text-white">{o.orderId}</div>
                        <div className="text-xs text-gray-600 dark:text-gray-300">{formatDate(o.createdAt)}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-bold text-gray-900 dark:text-white">{formatCurrency(Number(o.total || 0), String(o.currency || 'FCFA'))}</div>
                        <Link href={`/commandes/${encodeURIComponent(o.orderId)}`} className="text-sm font-semibold text-emerald-700 hover:underline dark:text-emerald-300">
                          Ouvrir
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between">
                <div className="text-lg font-semibold text-gray-900 dark:text-white">Derniers achats groupés</div>
                <Link href="/compte/achats-groupes" className="text-sm font-semibold text-emerald-700 hover:underline dark:text-emerald-300">
                  Tout voir
                </Link>
              </div>

              {recentGroups.length === 0 ? (
                <div className="mt-4 text-sm text-gray-600 dark:text-gray-300">
                  Aucun achat groupé pour l'instant.
                </div>
              ) : (
                <div className="mt-4 divide-y divide-gray-200 dark:divide-slate-800">
                  {recentGroups.map(g => (
                    <div key={g._id} className="py-3 flex items-center justify-between gap-4">
                      <div>
                        <div className="font-semibold text-gray-900 dark:text-white">{g.product?.name || g.groupId}</div>
                        <div className="text-xs text-gray-600 dark:text-gray-300">Deadline {formatDate(g.deadline)} • {Number(g.currentQty || 0)}/{Number(g.targetQty || 0)}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-bold text-gray-900 dark:text-white">{Math.round(Number(g.currentUnitPrice || 0)).toLocaleString('fr-FR')} {String(g.product?.currency || 'FCFA')}</div>
                        <Link href={`/achats-groupes/${encodeURIComponent(g.groupId)}`} className="text-sm font-semibold text-emerald-700 hover:underline dark:text-emerald-300">
                          Ouvrir
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 md:col-span-2">
              <div className="flex items-center justify-between">
                <div className="text-lg font-semibold text-gray-900 dark:text-white">Mes favoris</div>
                <Link href="/produits/favoris" className="text-sm font-semibold text-emerald-700 hover:underline dark:text-emerald-300">
                  Tout voir
                </Link>
              </div>

              {favoritePreviewProducts.length === 0 ? (
                <div className="mt-4 text-sm text-gray-600 dark:text-gray-300">
                  Vous n'avez pas encore de favoris.
                </div>
              ) : (
                <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {favoritePreviewProducts.map((p) => {
                    const productId = String(p._id)
                    const imageSrc = p.image || (Array.isArray(p.gallery) && p.gallery[0]) || '/file.svg'
                    const priceLabel = p.requiresQuote
                      ? 'Sur devis'
                      : typeof p.price === 'number'
                        ? formatCurrency(Number(p.price), String(p.currency || 'FCFA'))
                        : 'Sur devis'

                    return (
                      <Link
                        key={productId}
                        href={`/produits/${productId}`}
                        className="group rounded-xl border border-gray-200 bg-white p-3 shadow-sm transition hover:shadow-md dark:border-slate-800 dark:bg-slate-950"
                      >
                        <div className="relative aspect-square w-full overflow-hidden rounded-lg bg-gray-100 border border-gray-200 dark:border-slate-800">
                          <Image src={imageSrc} alt={String(p.name || 'Produit')} fill className="object-contain p-2" sizes="160px" />
                        </div>
                        <div className="mt-2">
                          <div className="text-sm font-semibold text-gray-900 line-clamp-2 dark:text-white">{String(p.name || '')}</div>
                          <div className="mt-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300">{priceLabel}</div>
                        </div>
                      </Link>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/api/auth/logout"
              className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 dark:border-slate-800 dark:bg-slate-900 dark:text-gray-200 dark:hover:bg-slate-800"
            >
              Se déconnecter
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
