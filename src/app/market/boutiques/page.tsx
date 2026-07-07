import type { Metadata } from 'next'
export const dynamic = 'force-dynamic'
import Link from 'next/link'
import Image from 'next/image'
import { Store, BadgeCheck, Package, ArrowRight } from 'lucide-react'
import { connectMongoose } from '@/lib/mongoose'
import Shop from '@/lib/models/Shop'
import Product from '@/lib/models/Product'
import mongoose from 'mongoose'

export const metadata: Metadata = {
  title: 'Boutiques partenaires | DDM+ Marketplace',
  description: 'Découvrez les boutiques partenaires DDM+. Produits en stock, import Chine et revendeurs locaux vérifiés.'
}

export default async function MarketBoutiquesPage() {
  await connectMongoose()
  const shops = await Shop.find({ status: 'active' }).sort({ isVerified: -1, name: 1 }).lean()
  const shopIds = shops.map((s: any) => s._id.toString())
  const productCounts = await Product.aggregate([
    { $match: { shopId: { $in: shopIds.map((id: string) => new mongoose.Types.ObjectId(id)) }, isPublished: { $ne: false } } },
    { $group: { _id: '$shopId', count: { $sum: 1 } } }
  ])
  const countsByShop = Object.fromEntries(productCounts.map((c: any) => [String(c._id), c.count]))

  return (
    <main className="min-h-screen bg-gray-50 pb-16">
      <section className="mx-auto max-w-7xl px-4 py-12">
        <div className="mb-10">
          <h1 className="text-3xl font-bold text-gray-900">Boutiques partenaires</h1>
          <p className="mt-2 text-gray-600">
            Découvrez les vendeurs et revendeurs sélectionnés par DDM+.
          </p>
        </div>

        {shops.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            Aucune boutique disponible pour le moment.
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {shops.map((shop: any) => {
              const count = countsByShop[String(shop._id)] || 0
              return (
                <Link
                  key={String(shop._id)}
                  href={`/boutiques/${shop.slug}`}
                  className="group block rounded-2xl border border-gray-200 bg-white p-5 transition hover:shadow-lg hover:border-emerald-300"
                >
                  <div className="flex items-start gap-4">
                    <div className="h-16 w-16 rounded-xl bg-gray-100 flex items-center justify-center overflow-hidden shrink-0">
                      {shop.logo ? (
                        <Image src={shop.logo} alt={shop.name} width={64} height={64} className="object-cover w-full h-full" />
                      ) : (
                        <Store className="h-7 w-7 text-gray-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <h3 className="font-bold text-gray-900 truncate">{shop.name}</h3>
                        {shop.isVerified && <BadgeCheck className="h-4 w-4 text-emerald-600 shrink-0" />}
                      </div>
                      <p className="text-sm text-gray-500 mt-1 line-clamp-2">{shop.description || 'Boutique DDM+'}</p>
                      <div className="mt-3 flex items-center gap-1 text-xs text-gray-500">
                        <Package className="h-3.5 w-3.5" />
                        <span>{count} produit{count > 1 ? 's' : ''}</span>
                      </div>
                      <div className="mt-3 flex items-center text-sm font-medium text-emerald-600 group-hover:underline">
                        Visiter <ArrowRight className="h-3.5 w-3.5 ml-1" />
                      </div>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </section>
    </main>
  )
}
