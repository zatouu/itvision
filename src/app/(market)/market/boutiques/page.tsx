import type { Metadata } from 'next'
export const dynamic = 'force-dynamic'
import Link from 'next/link'
import Image from 'next/image'
import { Store, BadgeCheck, Package, ArrowRight, PlusCircle, LayoutDashboard, Clock } from 'lucide-react'
import { connectMongoose } from '@/lib/mongoose'
import { verifyAuthServer } from '@/lib/auth-server'
import Shop from '@/lib/models/Shop'
import Product from '@/lib/models/Product'
import mongoose from 'mongoose'

export const metadata: Metadata = {
  title: 'Boutiques partenaires | DDM+ Marketplace',
  description: 'Découvrez les boutiques partenaires DDM+. Produits en stock, import Chine et revendeurs locaux vérifiés.'
}

export default async function MarketBoutiquesPage() {
  await connectMongoose()

  // Boutique du visiteur connecté : épinglée en tête, tout statut confondu
  // (une boutique pending_review n'est pas dans la grille publique mais le
  // vendeur doit la voir ici quand même).
  const auth = await verifyAuthServer().catch(() => null)
  const myShop = auth?.isAuthenticated && auth.user?.id
    ? await Shop.findOne({ ownerId: auth.user.id }).lean() as any
    : null

  const shops = await Shop.find({ status: 'active' }).sort({ isVerified: -1, name: 1 }).lean()
  const shopIds = shops.map((s: any) => s._id.toString())
  const productCounts = await Product.aggregate([
    { $match: { shopId: { $in: shopIds.map((id: string) => new mongoose.Types.ObjectId(id)) }, isPublished: { $ne: false } } },
    { $group: { _id: '$shopId', count: { $sum: 1 } } }
  ])
  const countsByShop = Object.fromEntries(productCounts.map((c: any) => [String(c._id), c.count]))

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-slate-950 pb-16">
      <section className="mx-auto max-w-7xl px-4 py-12">
        <div className="mb-10 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-slate-200">Boutiques partenaires</h1>
            <p className="mt-2 text-gray-600 dark:text-slate-400">
              Découvrez les vendeurs et revendeurs sélectionnés par DDM+.
            </p>
          </div>
          {myShop ? (
            <Link
              href="/espace-vendeur"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold text-sm transition"
            >
              <LayoutDashboard className="w-4 h-4" />
              Gérer ma boutique
            </Link>
          ) : (
            <Link
              href="/devenir-vendeur"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold text-sm transition"
            >
              <PlusCircle className="w-4 h-4" />
              Créer ma boutique
            </Link>
          )}
        </div>

        {/* Ma boutique épinglée — accès direct à la vitrine + admin */}
        {myShop && (
          <div className="mb-8 rounded-2xl border-2 border-emerald-300 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20 p-5">
            <div className="flex items-start gap-4">
              <div className="h-16 w-16 rounded-xl bg-white dark:bg-slate-800 flex items-center justify-center overflow-hidden shrink-0 border border-emerald-200 dark:border-emerald-800">
                {myShop.logo ? (
                  <Image src={myShop.logo} alt={myShop.name} width={64} height={64} className="object-cover w-full h-full" />
                ) : (
                  <Store className="h-7 w-7 text-emerald-500" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-bold text-gray-900 dark:text-slate-200">{myShop.name}</h3>
                  <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-emerald-600 text-white">Ma boutique</span>
                  {myShop.status === 'pending_review' && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                      <Clock className="h-3 w-3" /> En vérification
                    </span>
                  )}
                  {myShop.isVerified && <BadgeCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />}
                </div>
                <p className="text-sm text-gray-500 dark:text-slate-400 mt-1 line-clamp-2">{myShop.description || 'Boutique DDM+'}</p>
                <div className="mt-3 flex flex-wrap items-center gap-4 text-sm font-medium">
                  <Link href={`/boutiques/${myShop.slug}`} className="text-emerald-600 dark:text-emerald-400 hover:underline inline-flex items-center gap-1">
                    Voir ma vitrine <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                  <Link href="/espace-vendeur" className="text-slate-600 dark:text-slate-300 hover:underline inline-flex items-center gap-1">
                    <LayoutDashboard className="h-3.5 w-3.5" /> Tableau de bord
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}

        {(() => {
          const gridShops = myShop ? shops.filter((s: any) => String(s._id) !== String(myShop._id)) : shops
          return gridShops.length === 0 ? (
            !myShop ? (
              <div className="text-center py-16 text-gray-500 dark:text-slate-400">
                Aucune boutique disponible pour le moment.
              </div>
            ) : null
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {gridShops.map((shop: any) => {
              const count = countsByShop[String(shop._id)] || 0
              return (
                <Link
                  key={String(shop._id)}
                  href={`/boutiques/${shop.slug}`}
                  className="group block rounded-2xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 transition hover:shadow-lg hover:border-emerald-300 dark:hover:border-emerald-700"
                >
                  <div className="flex items-start gap-4">
                    <div className="h-16 w-16 rounded-xl bg-gray-100 dark:bg-slate-700 flex items-center justify-center overflow-hidden shrink-0">
                      {shop.logo ? (
                        <Image src={shop.logo} alt={shop.name} width={64} height={64} className="object-cover w-full h-full" />
                      ) : (
                        <Store className="h-7 w-7 text-gray-400 dark:text-slate-500" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <h3 className="font-bold text-gray-900 dark:text-slate-200 truncate">{shop.name}</h3>
                        {shop.isVerified && <BadgeCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />}
                      </div>
                      <p className="text-sm text-gray-500 dark:text-slate-400 mt-1 line-clamp-2">{shop.description || 'Boutique DDM+'}</p>
                      <div className="mt-3 flex items-center gap-1 text-xs text-gray-500 dark:text-slate-400">
                        <Package className="h-3.5 w-3.5" />
                        <span>{count} produit{count > 1 ? 's' : ''}</span>
                      </div>
                      <div className="mt-3 flex items-center text-sm font-medium text-emerald-600 dark:text-emerald-400 group-hover:underline">
                        Visiter <ArrowRight className="h-3.5 w-3.5 ml-1" />
                      </div>
                    </div>
                  </div>
                </Link>
              )
            })}
            </div>
          )
        })()}
      </section>
    </main>
  )
}
