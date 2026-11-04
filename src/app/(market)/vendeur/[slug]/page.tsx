import { permanentRedirect } from 'next/navigation'
import { connectMongoose } from '@/lib/mongoose'
import Shop from '@/lib/models/Shop'
import VendorProfile from '@/lib/models/VendorProfile'

export const dynamic = 'force-dynamic'

/**
 * /vendeur/[slug] était une façade VendorProfile reconstruite depuis les
 * produits — description jamais remplie, bouton « Suivre » mort (shopId non
 * passé). La vraie vitrine est /boutiques/[slug] : redirect permanent.
 * Le slug peut être un VendorProfile.slug ou un Shop.slug — on résout les deux.
 */
export default async function VendorSlugPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  try {
    await connectMongoose()
    let shop = await Shop.findOne({ slug }).select('slug').lean() as any
    if (!shop) {
      const vendor = await VendorProfile.findOne({ slug }).select('userId').lean() as any
      if (vendor) {
        shop = await Shop.findOne({ ownerId: vendor.userId }).select('slug').lean() as any
      }
    }
    permanentRedirect(shop ? `/boutiques/${shop.slug}` : '/market/boutiques')
  } catch {
    permanentRedirect('/market/boutiques')
  }
}
