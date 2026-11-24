import { Suspense } from 'react';
import type { Metadata } from 'next';
import ScreenCatalog from '@/components/market/storefront/screens/ScreenCatalog';
import { ProductGridSkeleton } from '@/components/market/storefront/Skeleton';
import { filtersFromParams } from '@/components/market/storefront/catalog-query';
import { loadCatalogCategories, loadCatalogInitialData } from '@/lib/market/storefront-ssr';
import { pageMetadata } from '@/lib/seo';

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const readParam = (sp: Record<string, string | string[] | undefined>) => (key: string) => {
  const value = sp[key];
  return Array.isArray(value) ? value[0] : value;
};

// Catalogue pré-rendu côté serveur (première page) ; chaque catégorie est une page indexable
export async function generateMetadata({ searchParams }: { searchParams: SearchParams }): Promise<Metadata> {
  const filters = filtersFromParams(readParam(await searchParams));
  if (filters.q) {
    // Résultats de recherche : utiles aux visiteurs, pas à l'index (contenu dupliqué)
    return { title: `Recherche « ${filters.q} » — DDM+`, robots: { index: false, follow: true }, alternates: { canonical: '/produits' } };
  }
  if (filters.cat !== 'Tous') {
    const categories = await loadCatalogCategories();
    const category = categories.find(c => c.key === filters.cat)
      ?? categories.flatMap(c => c.subs ?? []).find(s => s.key === filters.cat);
    if (category) {
      return pageMetadata({
        path: `/produits?cat=${encodeURIComponent(category.key)}`,
        title: `${category.label} — Import Chine, livraison au Sénégal | DDM+`,
        description: `${category.label} importés directement de Chine : prix usine, achats groupés, contrôle qualité et livraison suivie à Dakar et en régions.`,
        siteName: 'DDM+ Marketplace',
      });
    }
  }
  return {};
}

export default async function Page({ searchParams }: { searchParams: SearchParams }) {
  const filters = filtersFromParams(readParam(await searchParams));
  const initialData = await loadCatalogInitialData(filters);
  return (
    <Suspense fallback={<div className="mx-auto max-w-7xl px-4 py-6"><ProductGridSkeleton count={8} /></div>}>
      <ScreenCatalog initialData={initialData} />
    </Suspense>
  );
}
