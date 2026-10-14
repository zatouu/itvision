import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { connectMongoose } from '@/lib/mongoose';
import { GroupOrder } from '@/lib/models/GroupOrder';
import Review from '@/lib/models/Review';
import { buildProductJsonLd } from '@/lib/structured-data';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://market.itvisionplus.sn';

interface LayoutProps {
  params: Promise<{ groupId: string }>;
  children: ReactNode;
}

function formatFcfa(value?: number | null): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '';
  return `${Math.round(value).toLocaleString('fr-FR')} F`;
}

export async function generateMetadata({ params }: LayoutProps): Promise<Metadata> {
  const { groupId } = await params;
  try {
    await connectMongoose();
    const group = await GroupOrder.findOne({ groupId })
      .select('product.name currentUnitPrice targetQty currentQty deadline status')
      .lean() as any;
    if (!group) return { title: 'Achat groupé introuvable | DDM+' };

    const remaining = Math.max(0, (group.targetQty || 0) - (group.currentQty || 0));
    const price = formatFcfa(group.currentUnitPrice);
    const title = `Achat groupé : ${group.product?.name || 'produit'} — ${price}`;
    const description = remaining > 0
      ? `Rejoignez l'achat groupé « ${group.product?.name} » : ${group.currentQty}/${group.targetQty} unités atteintes, prix actuel ${price}. Encore ${remaining} unité(s) pour valider le palier. Livraison Sénégal.`
      : `Achat groupé « ${group.product?.name} » : objectif atteint (${group.currentQty}/${group.targetQty}), prix ${price}.`;
    const canonical = `${SITE_URL}/achats-groupes/${groupId}`;
    // Visuel généré (prix, paliers, progression) : c'est lui qu'affiche l'aperçu WhatsApp / Facebook
    const image = `${SITE_URL}/api/og/group/${encodeURIComponent(groupId)}?format=card`;

    return {
      title,
      description,
      alternates: { canonical },
      openGraph: {
        title,
        description,
        url: canonical,
        type: 'website',
        images: [{ url: image, width: 1200, height: 630, alt: group.product?.name || 'Achat groupé' }],
      },
      twitter: { card: 'summary_large_image', title, description, images: [image] },
    };
  } catch {
    return { title: 'Achat groupé | DDM+' };
  }
}

export default async function GroupOrderLayout({ params, children }: LayoutProps) {
  const { groupId } = await params;
  let jsonLd: Record<string, any>[] | null = null;
  try {
    await connectMongoose();
    const group = await GroupOrder.findOne({ groupId })
      .select('product currentUnitPrice targetQty currentQty deadline status')
      .lean() as any;
    if (group && group.status !== 'draft') {
      const productId = String(group.product?.productId || '');
      const agg = productId
        ? await Review.aggregate([
            { $match: { productId, status: 'approved' } },
            { $group: { _id: null, count: { $sum: 1 }, avg: { $avg: '$rating' } } },
          ])
        : [];
      const url = `${SITE_URL}/achats-groupes/${groupId}`;
      const image = group.product?.image;
      jsonLd = buildProductJsonLd({
        id: groupId,
        name: `Achat groupé : ${group.product?.name || 'produit'}`,
        description: `Achat groupé DDM+ : ${group.currentQty || 0}/${group.targetQty || 0} unités réservées. Paiement du prix final à la clôture, transport au poids réel, livraison au Sénégal.`,
        image: image ? (/^https?:\/\//.test(image) ? image : `${SITE_URL}${image.startsWith('/') ? '' : '/'}${image}`) : null,
        currency: group.product?.currency || 'FCFA',
        price: Number(group.currentUnitPrice || group.product?.basePrice) || 0,
        availability: group.status === 'cancelled' ? 'OutOfStock' : 'PreOrder',
        priceValidUntil: group.deadline ? new Date(group.deadline).toISOString().slice(0, 10) : undefined,
        url,
        sku: groupId,
        reviewCount: agg[0]?.count,
        reviewRating: agg[0]?.avg,
        breadcrumbs: [
          { name: 'Accueil', url: SITE_URL },
          { name: 'Achats groupés', url: `${SITE_URL}/achats-groupes` },
          { name: group.product?.name || groupId, url },
        ],
      });
    }
  } catch {
    jsonLd = null;
  }

  return (
    <>
      {jsonLd && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />}
      {children}
    </>
  );
}
