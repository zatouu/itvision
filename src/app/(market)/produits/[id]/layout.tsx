import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { connectMongoose } from '@/lib/mongoose';
import ProductModel from '@/lib/models/Product.validated';

interface LayoutProps {
  params: Promise<{ id: string }>;
  children: ReactNode;
}

export async function generateMetadata({ params }: LayoutProps): Promise<Metadata> {
  const { id } = await params;
  try {
    await connectMongoose();
    const product = await ProductModel.findById(id).lean() as { name: string; tagline?: string; description?: string } | null;
    if (!product) return { title: 'Produit introuvable | DDM+' };
    return {
      title: `${product.name} — DDM+`,
      description:
        product.tagline ||
        (typeof product.description === 'string'
          ? product.description.slice(0, 160)
          : 'Produit DDM+'),
    };
  } catch {
    return { title: 'Produit | DDM+' };
  }
}

export default async function ProductLayout({ params, children }: LayoutProps) {
  const { id } = await params;
  let product: unknown = null;
  try {
    await connectMongoose();
    product = await ProductModel.findById(id).lean();
  } catch {
    // Laisse la page client tenter de charger via l'API
    return <>{children}</>;
  }
  if (!product) notFound();
  return <>{children}</>;
}
