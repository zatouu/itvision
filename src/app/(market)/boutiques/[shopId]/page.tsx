import type { Metadata } from 'next'
import mongoose from 'mongoose'
import { notFound } from 'next/navigation'
import { connectMongoose } from '@/lib/mongoose'
import Shop from '@/lib/models/Shop'
import Product from '@/lib/models/Product'
import ShopFollower from '@/lib/models/ShopFollower'
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

  // Boutiques similaires : mêmes catégories en priorité, puis autres actives
  const [followers, sameCat] = await Promise.all([
    ShopFollower.countDocuments({ shopId: shop._id }),
    Shop.find({
      _id: { $ne: shop._id },
      status: 'active',
      ...(shop.categories?.length ? { categories: { $in: shop.categories } } : {}),
    }).sort({ isVerified: -1, createdAt: -1 }).limit(8).lean() as Promise<any[]>,
  ])
  const similar = sameCat.length >= 4
    ? sameCat
    : [
        ...sameCat,
        ...(await Shop.find({
          _id: { $nin: [shop._id, ...sameCat.map(s => s._id)] },
          status: 'active',
        }).sort({ isVerified: -1, createdAt: -1 }).limit(8 - sameCat.length).lean() as any[]),
      ]

  const similarShops = await Promise.all(
    similar.map(async s => ({
      slug: s.slug,
      name: s.name,
      logo: s.logo,
      coverImage: s.coverImage,
      city: s.city,
      country: s.country,
      categories: s.categories || [],
      isVerified: !!s.isVerified,
      productCount: await Product.countDocuments({ shopId: s._id, isPublished: true }),
    }))
  )

  return (
    <main>
      <ShopPageClient
        shopId={String(shop._id)}
        shopName={shop.name}
        shopSlug={shop.slug}
        shopLogo={shop.logo}
        shopDescription={shop.description}
        followers={followers}
        similarShops={similarShops}
        shop={{
          name: shop.name,
          description: shop.description,
          logo: shop.logo,
          coverImage: shop.coverImage,
          isVerified: !!shop.isVerified,
          country: shop.country,
          city: shop.city,
          categories: shop.categories,
          responseTimeHours: shop.responseTimeHours,
          createdAt: shop.createdAt ? new Date(shop.createdAt).toISOString() : undefined,
          socialWhatsApp: shop.socialLinks?.whatsapp,
          socialInstagram: shop.socialLinks?.instagram,
          socialFacebook: shop.socialLinks?.facebook,
          socialWebsite: shop.socialLinks?.website,
        }}
      />
    </main>
  )
}
