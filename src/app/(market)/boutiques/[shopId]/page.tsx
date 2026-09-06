import type { Metadata } from 'next'
import mongoose from 'mongoose'
import { notFound } from 'next/navigation'
import { connectMongoose } from '@/lib/mongoose'
import Shop from '@/lib/models/Shop'
import MarketHeader from '@/components/MarketHeader'
import MarketFooter from '@/components/MarketFooter'
import MarketBottomNav from '@/components/MarketBottomNav'
import ShopPageClient from '@/components/ShopPageClient'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://market.itvisionplus.sn'

const fetchShop = async (shopId: string) => {
  await connectMongoose()
  const query = mongoose.Types.ObjectId.isValid(shopId)
    ? { _id: new mongoose.Types.ObjectId(shopId), status: 'active' }
    : { slug: shopId, status: 'active' }
  return Shop.findOne(query).lean() as any
}

export async function generateMetadata({ params }: { params: Promise<{ shopId: string }> }): Promise<Metadata> {
  const { shopId } = await params
  const shop = await fetchShop(shopId)
  if (!shop) {
    return { title: 'Boutique introuvable | IT Vision Plus' }
  }
  const title = `${shop.name} — Boutique sur IT Vision Plus`
  const description = shop.description || `Découvrez la boutique ${shop.name} sur IT Vision Plus Marketplace. Produits en stock, livraison Dakar.`
  return {
    title,
    description,
    alternates: { canonical: `${SITE_URL}/boutiques/${shop.slug}` },
    openGraph: { title, description, url: `${SITE_URL}/boutiques/${shop.slug}`, type: 'website' },
    twitter: { card: 'summary_large_image', title, description }
  }
}

export default async function ShopPage({ params }: { params: Promise<{ shopId: string }> }) {
  const { shopId } = await params
  const shop = await fetchShop(shopId)
  if (!shop) notFound()

  return (
    <div className="min-h-screen bg-gray-50 pb-20 md:pb-0">
      <MarketHeader />
      <main>
        <ShopPageClient shopId={String(shop._id)} shopName={shop.name} shopSlug={shop.slug} shopLogo={shop.logo} shopDescription={shop.description} />
      </main>
      <MarketFooter />
      <MarketBottomNav />
    </div>
  )
}
