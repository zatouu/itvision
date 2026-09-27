import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { connectMongoose } from '@/lib/mongoose';
import { GroupOrder } from '@/lib/models/GroupOrder';

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
    const image = group.product?.image;

    return {
      title,
      description,
      alternates: { canonical },
      openGraph: {
        title,
        description,
        url: canonical,
        type: 'website',
        images: image ? [{ url: image, alt: group.product?.name || 'Achat groupé' }] : undefined,
      },
    };
  } catch {
    return { title: 'Achat groupé | DDM+' };
  }
}

export default function GroupOrderLayout({ children }: LayoutProps) {
  return <>{children}</>;
}
