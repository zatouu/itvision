import type { Metadata } from 'next'
import { connectDB } from '@/lib/db'
import ResellerPreorder from '@/lib/models/ResellerPreorder'
import PreorderClient from './PreorderClient'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ code: string }> }): Promise<Metadata> {
  const { code } = await params
  if (!/^[A-Z0-9]{6,12}$/.test(code)) return { title: 'Précommande' }
  try {
    await connectDB()
    const c = await ResellerPreorder.findOne({ code }).select('productName productImage ownerName resalePrice').lean() as any
    if (!c) return { title: 'Précommande' }
    const price = `${String(Math.round(c.resalePrice)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} FCFA`
    const title = `${c.productName} à ${price} | Précommande ${c.ownerName}`
    const description = `Réservez maintenant chez ${c.ownerName}, sans payer en ligne. Le vendeur vous recontacte pour confirmer.`
    return {
      title,
      description,
      robots: { index: false },
      openGraph: { title, description, images: c.productImage && /^https?:\/\//.test(c.productImage) ? [c.productImage] : undefined },
    }
  } catch {
    return { title: 'Précommande' }
  }
}

export default async function Page({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params
  return <PreorderClient code={code} />
}
