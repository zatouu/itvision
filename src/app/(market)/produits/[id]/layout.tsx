import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { connectMongoose } from '@/lib/mongoose';
import ProductModel from '@/lib/models/Product';
import Review from '@/lib/models/Review';
import { computeProductPricing } from '@/lib/logistics';
import { buildProductJsonLd } from '@/lib/structured-data';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://market.itvisionplus.sn';

interface LayoutProps {
  params: Promise<{ id: string }>;
  children: ReactNode;
}

function toAbsoluteUrl(url?: string | null): string | undefined {
  if (!url) return undefined;
  if (/^https?:\/\//i.test(url)) return url;
  return `${SITE_URL}${url.startsWith('/') ? '' : '/'}${url}`;
}

function availabilityOf(stockStatus?: string): 'InStock' | 'PreOrder' | 'OutOfStock' {
  if (stockStatus === 'in_stock') return 'InStock';
  if (stockStatus === 'out_of_stock') return 'OutOfStock';
  return 'PreOrder';
}

function conditionOf(condition?: string): 'New' | 'Used' | 'Refurbished' {
  if (condition === 'used') return 'Used';
  if (condition === 'refurbished') return 'Refurbished';
  return 'New';
}

export async function generateMetadata({ params }: LayoutProps): Promise<Metadata> {
  const { id } = await params;
  try {
    await connectMongoose();
    const product = await ProductModel.findById(id).lean() as any;
    if (!product) return { title: 'Produit introuvable | DDM+' };

    const description =
      product.tagline ||
      (typeof product.description === 'string'
        ? product.description.slice(0, 160)
        : 'Produit DDM+');
    const canonical = `${SITE_URL}/produits/${id}`;
    const image = toAbsoluteUrl(product.image || product.gallery?.[0]);

    return {
      title: `${product.name} — DDM+`,
      description,
      alternates: { canonical },
      openGraph: {
        title: product.name,
        description,
        url: canonical,
        type: 'website',
        images: image ? [{ url: image, alt: product.name }] : undefined,
      },
      twitter: {
        card: 'summary_large_image',
        title: product.name,
        description,
        images: image ? [image] : undefined,
      },
    };
  } catch {
    return { title: 'Produit | DDM+' };
  }
}

export default async function ProductLayout({ params, children }: LayoutProps) {
  const { id } = await params;
  let product: any = null;
  let reviewStats: { count: number; avg: number } | null = null;

  try {
    await connectMongoose();
    product = await ProductModel.findById(id).lean();
    if (product) {
      // Avis approuvés — alimente le rich snippet (étoiles) dans les résultats
      const agg = await Review.aggregate([
        { $match: { productId: String(id), status: 'approved' } },
        { $group: { _id: null, count: { $sum: 1 }, avg: { $avg: '$rating' } } },
      ]);
      if (agg[0]?.count > 0) {
        reviewStats = { count: agg[0].count, avg: agg[0].avg };
      }
    }
  } catch {
    // Laisse la page client tenter de charger via l'API
    return <>{children}</>;
  }

  if (!product) notFound();

  const pricing = computeProductPricing(product);
  const price = pricing.totalWithFees ?? pricing.salePrice ?? product.price ?? 0;

  const jsonLd = buildProductJsonLd({
    id: String(product._id),
    name: product.name,
    description: product.description ?? null,
    tagline: product.tagline ?? null,
    category: product.category ?? null,
    image: toAbsoluteUrl(product.image || product.gallery?.[0]) ?? null,
    currency: product.currency || 'FCFA',
    price: Number(price) || 0,
    availability: availabilityOf(product.stockStatus),
    url: `${SITE_URL}/produits/${id}`,
    sku: product.slug || String(product._id),
    brand: product.sellerName || 'DDM+',
    condition: conditionOf(product.condition),
    reviewCount: reviewStats?.count,
    reviewRating: reviewStats?.avg,
    breadcrumbs: [
      { name: 'Accueil', url: SITE_URL },
      { name: 'Catalogue', url: `${SITE_URL}/produits` },
      ...(product.category
        ? [{ name: String(product.category), url: `${SITE_URL}/produits?categorie=${encodeURIComponent(product.category)}` }]
        : []),
      { name: product.name, url: `${SITE_URL}/produits/${id}` },
    ],
  });

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {children}
    </>
  );
}
