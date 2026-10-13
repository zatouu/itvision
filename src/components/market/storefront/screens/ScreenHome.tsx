'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, Camera, Package, Users } from 'lucide-react';
import { formatFcfa } from '../formatFcfa';
import { useSourcingModal } from '../SourcingModalContext';
import { Icon } from '../Icon';
import { ProgressBar } from '../ProgressBar';
import { ProductCard } from '../ProductCard';
import { useQuickAdd } from '../useQuickAdd';
import { mapCatalogItem, mapGroupOrder, mapCategory } from '../data-mappers';
import type { Product, Group, Category } from '../types';

type HomeCategory = Category & { image?: string; count?: number };
const moreLink = 'inline-flex min-h-11 shrink-0 items-center gap-1 text-xs font-bold text-emerald-700 hover:underline dark:text-emerald-400';

export default function ScreenHome() {
  const router = useRouter();
  const { open: openSourcing } = useSourcingModal();
  const { quickAdd, toast: quickAddToast } = useQuickAdd();
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [categories, setCategories] = useState<HomeCategory[]>([]);
  const [failures, setFailures] = useState<string[]>([]);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    const load = (url: string) => fetch(url, { signal: controller.signal })
      .then(response => response.ok ? response.json() : null).catch(() => null);
    setLoading(true);
    Promise.all([
      load('/api/catalog/products?limit=12&compact=1'),
      load('/api/group-orders?limit=6&status=open'),
      load('/api/catalog/category-highlights'),
    ]).then(([productData, groupData, categoryData]) => {
      if (controller.signal.aborted) return;
      const unavailable: string[] = [];
      const productItems = productData?.products ?? productData?.items;
      const categoryItems = categoryData?.categories ?? categoryData?.items;
      if (!Array.isArray(productItems)) unavailable.push('Produits');
      if (!Array.isArray(groupData?.groups)) unavailable.push('Groupes');
      if (!Array.isArray(categoryItems)) unavailable.push('Catégories');
      setProducts(Array.isArray(productItems) ? productItems.map(mapCatalogItem) : []);
      setGroups(Array.isArray(groupData?.groups) ? groupData.groups.map(mapGroupOrder) : []);
      setCategories(Array.isArray(categoryItems) ? categoryItems.map(item => ({
        ...mapCategory(item), image: item.image, count: item.count,
      })) : []);
      setFailures(unavailable);
    }).catch(() => {
      if (controller.signal.aborted) return;
      setProducts([]);
      setGroups([]);
      setCategories([]);
      setFailures(['Produits', 'Groupes', 'Catégories']);
    }).finally(() => {
      if (!controller.signal.aborted) setLoading(false);
    });
    return () => controller.abort();
  }, [attempt]);

  const liveGroups = groups.filter(group => group.status === 'live' || group.status === 'almost');
  const featuredCategories = [...categories].sort((first, second) => (second.count ?? 0) - (first.count ?? 0)).slice(0, 6);

  if (loading) return (
    <div role="status" aria-label="Chargement de l'accueil" className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6">
      <div className="h-20 animate-pulse rounded-lg bg-zinc-200 dark:bg-zinc-800" />
      <div className="grid grid-cols-2 gap-3 min-[360px]:grid-cols-3 lg:grid-cols-6">
        {Array.from({ length: 6 }, (_, index) => <div key={index} className="h-28 animate-pulse rounded-lg bg-zinc-200 dark:bg-zinc-800" />)}
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {Array.from({ length: 6 }, (_, index) => <div key={index} className="h-64 animate-pulse rounded-lg bg-zinc-200 dark:bg-zinc-800" />)}
      </div>
    </div>
  );

  return (
    <>
      <div className="bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
        <div className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-5 sm:px-6">
            <div>
              <h1 className="text-2xl font-extrabold">DDM+</h1>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">Le marché Chine-Sénégal</p>
            </div>
            <button type="button" onClick={openSourcing} className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-emerald-700 px-4 text-sm font-bold text-white hover:bg-emerald-800">
              <Camera size={18} />Trouvez-moi
            </button>
          </div>
        </div>

        <div className="mx-auto max-w-7xl space-y-7 px-4 pb-8 pt-4 sm:px-6 md:space-y-9">
          {failures.length > 0 && (
            <div role="alert" className="flex flex-wrap items-center justify-between gap-2 border-l-4 border-amber-500 bg-amber-50 p-3 text-sm text-amber-950 dark:bg-amber-950/40 dark:text-amber-200">
              <span>Indisponible pour le moment : {failures.join(', ')}.</span>
              <button type="button" onClick={() => setAttempt(value => value + 1)} className="min-h-11 px-3 font-bold underline">Réessayer</button>
            </div>
          )}

          <section aria-labelledby="home-categories">
            <div className="mb-2 flex items-center justify-between gap-3">
              <h2 id="home-categories" className="text-lg font-bold">Catégories</h2>
              <Link href="/produits" className={moreLink}>Tout le catalogue <ArrowRight size={14} /></Link>
            </div>
            {featuredCategories.length > 0 ? (
              <div className="grid grid-cols-3 gap-2 lg:grid-cols-6">
                {featuredCategories.map(category => (
                  <Link key={category.key} href={`/produits?cat=${encodeURIComponent(category.key)}`} className="group flex min-w-0 flex-col items-center gap-1 rounded-lg border border-zinc-200 bg-white p-2 text-center hover:border-emerald-500 dark:border-zinc-800 dark:bg-zinc-900 sm:gap-2 sm:py-3">
                    <span className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-lg bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 sm:h-14 sm:w-14">
                      {category.image ? <img src={category.image} alt="" className="h-full w-full object-contain" loading="lazy" onError={event => { event.currentTarget.onerror = null; event.currentTarget.src = '/placeholder.svg'; }} /> : <Icon name={category.icon} size={24} />}
                    </span>
                    <span className="min-h-8 text-xs font-bold leading-4 [overflow-wrap:anywhere]">{category.label}</span>
                    {typeof category.count === 'number' && <span className="hidden text-[11px] text-zinc-500 dark:text-zinc-400 sm:inline">{category.count} produit{category.count !== 1 ? 's' : ''}</span>}
                  </Link>
                ))}
              </div>
            ) : <p className="py-3 text-sm text-zinc-500 dark:text-zinc-400">{failures.includes('Catégories') ? 'Les catégories n’ont pas pu être chargées.' : 'Aucune catégorie disponible pour le moment.'}</p>}
          </section>

          <section aria-labelledby="home-products">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 id="home-products" className="text-lg font-bold">Sélection DDM+</h2>
              <Link href="/produits" className={moreLink}>Voir tout <ArrowRight size={14} /></Link>
            </div>
            {products.length > 0 ? (
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
                {products.slice(0, 6).map(product => <ProductCard key={product.id} product={product} size="lg" onQuickAdd={quickAdd} onClick={() => router.push(`/produits/${product.id}`)} />)}
              </div>
            ) : <p className="py-3 text-sm text-zinc-500 dark:text-zinc-400">{failures.includes('Produits') ? 'La sélection n’a pas pu être chargée.' : 'La sélection sera bientôt disponible.'}</p>}
          </section>

          <section aria-labelledby="home-groups" className="border-t border-zinc-200 pt-4 dark:border-zinc-800">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 id="home-groups" className="text-lg font-bold">Achats groupés</h2>
              <Link href="/achats-groupes" className={moreLink}>Voir les groupes <ArrowRight size={14} /></Link>
            </div>
            {liveGroups.length > 0 ? (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {liveGroups.slice(0, 3).map(group => (
                  <Link key={group.id} href={`/achats-groupes/${group.id}`} className="min-w-0 rounded-lg border border-zinc-200 bg-white p-4 hover:border-emerald-500 dark:border-zinc-800 dark:bg-zinc-900">
                    <div className="flex gap-3">
                      <img src={group.image || '/placeholder.svg'} alt="" loading="lazy" className="h-16 w-16 shrink-0 rounded-lg bg-zinc-100 object-contain" onError={event => { event.currentTarget.onerror = null; event.currentTarget.src = '/placeholder.svg'; }} />
                      <div className="min-w-0">
                        <h3 className="text-sm font-bold [overflow-wrap:anywhere]">{group.name}</h3>
                        <p className="mt-1 font-extrabold text-emerald-700 dark:text-emerald-400">{group.unit > 0 ? formatFcfa(group.unit) : 'Sur devis'}</p>
                      </div>
                    </div>
                    <ProgressBar value={group.currentQty} max={group.targetQty} className="mt-3" />
                    <div className="mt-2 flex flex-wrap justify-between gap-2 text-xs text-zinc-600 dark:text-zinc-400">
                      <span>{group.currentQty} / {group.targetQty} unités</span><span>{group.deadline}</span>
                    </div>
                  </Link>
                ))}
              </div>
            ) : <p className="py-3 text-sm text-zinc-500 dark:text-zinc-400">{failures.includes('Groupes') ? 'Les groupes n’ont pas pu être chargés.' : 'Aucun groupe ouvert pour le moment.'}</p>}
          </section>

          <nav aria-label="Autres façons d’acheter" className="grid gap-2 border-t border-zinc-200 pt-4 sm:grid-cols-2 dark:border-zinc-800">
            <Link href="/produits?moq=lot" className="flex min-h-12 items-center gap-3 px-1 text-sm font-semibold hover:text-emerald-700 dark:hover:text-emerald-400"><Package size={20} />Acheter par lots<ArrowRight size={16} className="ml-auto" /></Link>
            <Link href="/market/boutiques" className="flex min-h-12 items-center gap-3 px-1 text-sm font-semibold hover:text-emerald-700 dark:hover:text-emerald-400"><Users size={20} />Boutiques partenaires<ArrowRight size={16} className="ml-auto" /></Link>
          </nav>
        </div>
      </div>
      {quickAddToast}
    </>
  );
}