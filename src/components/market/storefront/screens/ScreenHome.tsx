'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowRight, Boxes, Camera, Flame, History, LayoutGrid, MessageCircle, PackageCheck, Route, ShieldCheck, Sparkles, Store, Truck,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { brandWhatsAppUrl } from '@/lib/branding';
import { SOURCING_LINK, resolveSlideTheme, sanitizeSlideImages, sanitizeSlideLink } from '@/lib/market/promo-slides';
import { formatFcfa } from '../formatFcfa';
import { useSourcingModal } from '../SourcingModalContext';
import { ProductCard } from '../ProductCard';
import { GroupCard } from '../GroupCard';
import { TrustStrip } from '../TrustStrip';
import { HomeHeroCarousel } from '../HomeHeroCarousel';
import type { HeroSlide } from '../PromoSlideView';
import { categoryVisual } from '../category-visuals';
import { clearRecentlyViewed, getRecentlyViewedIds } from '../recently-viewed';
import { useQuickAdd } from '../useQuickAdd';
import { mapCatalogItem, mapGroupOrder, mapCategory } from '../data-mappers';
import type { Product, Group, Category } from '../types';

type HomeCategory = Category & { image?: string; count?: number };
type GroupStats = { totalParticipants: number; totalSaved: number; totalFilled: number };
// En dessous, des chiffres trop faibles desserviraient la confiance : on n'affiche rien
const SOCIAL_PROOF_MIN_PARTICIPANTS = 10;

// Étapes alignées sur les engagements affichés dans la bande de confiance (paiement, inspection, livraison)
const HOW_STEPS: { icon: LucideIcon; title: string; text: string; tone: string }[] = [
  { icon: ShieldCheck, title: 'Commandez et payez en sécurité', text: 'Paiement Mobile Money sécurisé, prix affichés avant de commander.', tone: 'bg-emerald-600' },
  { icon: PackageCheck, title: 'Nous achetons et contrôlons', text: 'Achat auprès du fournisseur et inspection en Chine avant l’expédition.', tone: 'bg-amber-500' },
  { icon: Truck, title: 'Livraison suivie', text: 'Suivez votre colis jusqu’à Dakar ou en régions.', tone: 'bg-blue-600' },
];
const moreLink = 'inline-flex min-h-11 shrink-0 items-center gap-1 text-xs font-bold text-emerald-700 hover:underline dark:text-emerald-400 sm:text-sm';
const railClass = 'scrollbar-hide -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-px-4 px-4 pb-1 sm:-mx-6 sm:scroll-px-6 sm:px-6';
// Grille ordinateur ajustée au nombre de groupes (classes complètes pour Tailwind)
const GROUP_GRID: Record<number, string> = { 1: 'lg:grid-cols-3', 2: 'lg:grid-cols-3', 3: 'lg:grid-cols-3', 4: 'lg:grid-cols-4', 5: 'lg:grid-cols-5', 6: 'lg:grid-cols-6' };
const usableImage = (url?: string | null): url is string => typeof url === 'string' && url.length > 0 && !url.includes('placeholder');

function buildAutoSlides(products: Product[], groups: Group[]): HeroSlide[] {
  const bestSave = groups.reduce((max, group) => Math.max(max, Number(group.save) || 0), 0);
  return [
    {
      id: 'auto-sourcing', theme: 'emerald', badge: 'Trouvez-moi', art: 'camera', images: [],
      title: 'Une photo suffit, on le trouve en Chine',
      subtitle: 'Envoyez la photo ou le lien d’un produit, on vous envoie un devis.',
      ctaText: 'Envoyer une photo', ctaLink: SOURCING_LINK,
    },
    {
      id: 'auto-groups', theme: 'violet', art: 'users',
      badge: groups.length > 0 ? `${groups.length} groupe${groups.length > 1 ? 's' : ''} en cours` : 'Achats groupés',
      images: groups.map(group => group.image).filter(usableImage).slice(0, 3),
      title: 'Achetez à plusieurs, payez moins cher',
      subtitle: bestSave > 0 ? `Jusqu’à -${bestSave}% en rejoignant un groupe d’achat.` : 'Rejoignez un groupe d’achat et profitez du prix de gros.',
      ctaText: 'Voir les groupes', ctaLink: '/achats-groupes',
    },
    {
      id: 'auto-catalog', theme: 'sunset', badge: 'Import direct', art: 'truck',
      images: products.map(product => product.image).filter(usableImage).slice(0, 3),
      title: 'Importé de Chine, livré au Sénégal',
      subtitle: 'Électronique, sécurité, maison : livraison suivie jusqu’à Dakar et en régions.',
      ctaText: 'Explorer le catalogue', ctaLink: '/produits',
    },
  ];
}

function mapAdminSlides(raw: unknown): HeroSlide[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(slide => slide && typeof slide.title === 'string' && slide.title.trim())
    .map(slide => ({
      id: String(slide._id),
      title: slide.title,
      subtitle: slide.subtitle || undefined,
      badge: slide.badge || undefined,
      ctaText: slide.ctaText || 'Découvrir',
      ctaLink: sanitizeSlideLink(slide.ctaLink) ?? '/produits',
      theme: resolveSlideTheme(slide.bgColor),
      images: sanitizeSlideImages(slide.images),
    }));
}

function SectionHeader({ id, title, subtitle, icon: Icon, tone, href, linkLabel }: {
  id: string; title: string; subtitle?: string; icon: LucideIcon; tone: string; href?: string; linkLabel?: string;
}) {
  return (
    <div className="mb-3 flex items-end justify-between gap-3">
      <div className="flex min-w-0 items-center gap-2.5">
        <span className={cn('grid h-10 w-10 shrink-0 place-items-center rounded-xl shadow-sm', tone)}><Icon size={20} aria-hidden /></span>
        <div className="min-w-0">
          <h2 id={id} className="text-lg font-extrabold leading-tight sm:text-xl">{title}</h2>
          {subtitle && <p className="text-xs text-zinc-600 dark:text-zinc-400 sm:text-sm">{subtitle}</p>}
        </div>
      </div>
      {href && <Link href={href} className={moreLink}>{linkLabel}<ArrowRight size={14} aria-hidden /></Link>}
    </div>
  );
}

function CategoryTile({ category, index }: { category: HomeCategory; index: number }) {
  const [imageError, setImageError] = useState(false);
  const { Icon, tile } = categoryVisual(category.key, category.label, index);
  const count = typeof category.count === 'number' ? category.count : 0;
  return (
    <Link
      href={`/produits?cat=${encodeURIComponent(category.key)}`}
      className={cn('group relative flex min-h-[128px] min-w-0 flex-col overflow-hidden rounded-2xl bg-gradient-to-br p-3.5 text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 sm:min-h-[156px] sm:p-4 lg:min-h-[180px]', tile)}
    >
      <span aria-hidden className="pointer-events-none absolute -left-6 -top-8 h-24 w-24 rounded-full bg-white/10" />
      <span className="relative z-10 line-clamp-2 text-sm font-extrabold leading-snug [overflow-wrap:anywhere] sm:text-base">{category.label}</span>
      {count > 0 && <span className="relative z-10 mt-0.5 text-xs font-semibold text-white/90">{count} produit{count > 1 ? 's' : ''}</span>}
      <span className="relative z-10 mt-auto inline-flex items-center gap-1 text-xs font-bold">Voir<ArrowRight size={12} aria-hidden className="transition-transform group-hover:translate-x-0.5" /></span>
      {category.image && !imageError ? (
        <img src={category.image} alt="" loading="lazy" decoding="async" onError={() => setImageError(true)}
          className="absolute -bottom-3 -right-3 h-20 w-20 rotate-6 rounded-2xl bg-white object-contain p-1.5 shadow-lg transition-transform group-hover:rotate-0 sm:h-24 sm:w-24" />
      ) : (
        <Icon aria-hidden strokeWidth={1.5} className="absolute -bottom-4 -right-3 h-20 w-20 rotate-12 text-white/30 transition-transform group-hover:rotate-0 sm:h-24 sm:w-24" />
      )}
    </Link>
  );
}

function ShopTile({ href, icon: Icon, title, text, tone }: { href: string; icon: LucideIcon; title: string; text: string; tone: string }) {
  return (
    <Link href={href} className={cn('group flex min-h-20 items-center gap-4 rounded-2xl bg-gradient-to-r p-4 text-white shadow-sm transition hover:shadow-md', tone)}>
      <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-white/20"><Icon size={24} aria-hidden /></span>
      <span className="min-w-0 flex-1">
        <span className="block font-extrabold">{title}</span>
        <span className="block text-sm text-white/90">{text}</span>
      </span>
      <ArrowRight size={20} aria-hidden className="shrink-0 transition-transform group-hover:translate-x-1" />
    </Link>
  );
}

function Rail({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn(railClass, className)}>{children}</div>;
}

export default function ScreenHome() {
  const router = useRouter();
  const { open: openSourcing } = useSourcingModal();
  const { quickAdd, toast: quickAddToast } = useQuickAdd();
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [deals, setDeals] = useState<Product[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [categories, setCategories] = useState<HomeCategory[]>([]);
  const [adminSlides, setAdminSlides] = useState<HeroSlide[]>([]);
  const [recent, setRecent] = useState<Product[]>([]);
  const [groupStats, setGroupStats] = useState<GroupStats | null>(null);
  const [failures, setFailures] = useState<string[]>([]);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    const load = (url: string) => fetch(url, { signal: controller.signal })
      .then(response => response.ok ? response.json() : null).catch(() => null);
    const recentIds = getRecentlyViewedIds();
    setLoading(true);
    Promise.all([
      load('/api/catalog/products?limit=12&compact=1'),
      load('/api/group-orders?limit=6&status=open'),
      load('/api/catalog/category-highlights'),
      load('/api/promo-slides'),
      load('/api/catalog/products?limit=12&compact=1&sortBy=groupbuy-discount-desc'),
      recentIds.length >= 2 ? load(`/api/catalog/products?compact=1&ids=${recentIds.join(',')}`) : Promise.resolve(null),
      load('/api/group-orders/stats'),
    ]).then(([productData, groupData, categoryData, slideData, dealData, recentData, statsData]) => {
      if (controller.signal.aborted) return;
      const unavailable: string[] = [];
      const productItems = productData?.products ?? productData?.items;
      const categoryItems = categoryData?.categories ?? categoryData?.items;
      const dealItems = dealData?.products ?? dealData?.items;
      const recentItems = recentData?.products ?? recentData?.items;
      if (!Array.isArray(productItems)) unavailable.push('Produits');
      if (!Array.isArray(groupData?.groups)) unavailable.push('Groupes');
      if (!Array.isArray(categoryItems)) unavailable.push('Catégories');
      setProducts(Array.isArray(productItems) ? productItems.map(mapCatalogItem) : []);
      setDeals(Array.isArray(dealItems) ? dealItems.map(mapCatalogItem).filter((product: Product) => (product.save ?? 0) > 0).slice(0, 10) : []);
      setRecent(Array.isArray(recentItems) ? recentItems.map(mapCatalogItem) : []);
      setGroups(Array.isArray(groupData?.groups) ? groupData.groups.map(mapGroupOrder) : []);
      setCategories(Array.isArray(categoryItems) ? categoryItems.map(item => ({
        ...mapCategory(item), image: item.image, count: item.count,
      })) : []);
      setAdminSlides(mapAdminSlides(slideData?.slides));
      const stats = statsData?.stats;
      setGroupStats(stats ? {
        totalParticipants: Number(stats.totalParticipants) || 0,
        totalSaved: Number(stats.totalSaved) || 0,
        totalFilled: Number(stats.totalFilled) || 0,
      } : null);
      setFailures(unavailable);
    }).catch(() => {
      if (controller.signal.aborted) return;
      setProducts([]);
      setDeals([]);
      setRecent([]);
      setGroups([]);
      setCategories([]);
      setFailures(['Produits', 'Groupes', 'Catégories']);
    }).finally(() => {
      if (!controller.signal.aborted) setLoading(false);
    });
    return () => controller.abort();
  }, [attempt]);

  const liveGroups = useMemo(() => groups.filter(group => group.status === 'live' || group.status === 'almost'), [groups]);
  const featuredCategories = [...categories].sort((first, second) => (second.count ?? 0) - (first.count ?? 0)).slice(0, 6);
  // Slides de l'admin s'il y en a, sinon trois slides générés à partir du catalogue réel
  const slides = useMemo(
    () => adminSlides.length > 0 ? adminSlides : buildAutoSlides(products, liveGroups),
    [adminSlides, products, liveGroups],
  );

  if (loading) return (
    <div role="status" aria-label="Chargement de l'accueil" className="mx-auto max-w-7xl space-y-6 px-4 py-4 sm:px-6">
      <div className="h-[196px] animate-pulse rounded-2xl bg-gradient-to-br from-emerald-200 to-teal-100 dark:from-emerald-950 dark:to-zinc-900 sm:h-[250px] lg:h-[300px]" />
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => <div key={index} className="h-14 animate-pulse rounded-xl bg-zinc-200 dark:bg-zinc-800" />)}
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {Array.from({ length: 6 }, (_, index) => <div key={index} className="h-32 animate-pulse rounded-2xl bg-zinc-200 dark:bg-zinc-800" />)}
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {Array.from({ length: 6 }, (_, index) => <div key={index} className="h-64 animate-pulse rounded-lg bg-zinc-200 dark:bg-zinc-800" />)}
      </div>
    </div>
  );

  return (
    <>
      <div className="bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
        <h1 className="sr-only">DDM+ — le marché Chine-Sénégal</h1>
        <div className="mx-auto max-w-7xl pt-3 sm:px-6 sm:pt-5">
          <HomeHeroCarousel slides={slides} onSourcing={() => openSourcing()} />
        </div>

        <div className="mx-auto max-w-7xl space-y-8 px-4 pb-10 pt-4 sm:px-6 md:space-y-10">
          <TrustStrip compact colorful />

          {failures.length > 0 && (
            <div role="alert" className="flex flex-wrap items-center justify-between gap-2 rounded-lg border-l-4 border-amber-500 bg-amber-50 p-3 text-sm text-amber-950 dark:bg-amber-950/40 dark:text-amber-200">
              <span>Indisponible pour le moment : {failures.join(', ')}.</span>
              <button type="button" onClick={() => setAttempt(value => value + 1)} className="min-h-11 px-3 font-bold underline">Réessayer</button>
            </div>
          )}

          {recent.length >= 2 && (
            <section aria-labelledby="home-recent">
              <div className="mb-3 flex items-end justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2.5">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-zinc-700 to-zinc-900 text-white shadow-sm"><History size={20} aria-hidden /></span>
                  <div className="min-w-0">
                    <h2 id="home-recent" className="text-lg font-extrabold leading-tight sm:text-xl">Reprendre où vous en étiez</h2>
                    <p className="text-xs text-zinc-600 dark:text-zinc-400 sm:text-sm">Les produits que vous avez consultés</p>
                  </div>
                </div>
                <button type="button" onClick={() => { clearRecentlyViewed(); setRecent([]); }}
                  className="min-h-11 shrink-0 px-1 text-xs font-semibold text-zinc-500 hover:text-zinc-800 hover:underline dark:text-zinc-400 dark:hover:text-zinc-200">
                  Effacer
                </button>
              </div>
              <Rail>
                {recent.map(product => (
                  <ProductCard key={product.id} product={product} onQuickAdd={quickAdd} onClick={() => router.push(`/produits/${product.id}`)}
                    className="w-[40%] min-w-[140px] max-w-[190px] shrink-0 snap-start" />
                ))}
              </Rail>
            </section>
          )}

          <section aria-labelledby="home-categories">
            <SectionHeader id="home-categories" title="Catégories" subtitle="Trouvez vite ce qu’il vous faut" icon={LayoutGrid}
              tone="bg-gradient-to-br from-emerald-600 to-teal-500 text-white" href="/produits" linkLabel="Tout le catalogue" />
            {featuredCategories.length > 0 ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                {featuredCategories.map((category, index) => <CategoryTile key={category.key} category={category} index={index} />)}
              </div>
            ) : <p className="py-3 text-sm text-zinc-500 dark:text-zinc-400">{failures.includes('Catégories') ? 'Les catégories n’ont pas pu être chargées.' : 'Aucune catégorie disponible pour le moment.'}</p>}
          </section>

          {deals.length > 0 && (
            <section aria-labelledby="home-deals">
              <SectionHeader id="home-deals" title="Bons plans" subtitle="Prix dégressifs et remises de groupe" icon={Flame}
                tone="bg-gradient-to-br from-orange-500 to-red-600 text-white" href="/produits" linkLabel="Voir tout" />
              <Rail className="lg:mx-0 lg:grid lg:grid-cols-5 lg:overflow-visible lg:px-0">
                {deals.map((product, index) => (
                  <ProductCard key={product.id} product={product} onQuickAdd={quickAdd} onClick={() => router.push(`/produits/${product.id}`)}
                    className={cn('w-[44%] min-w-[150px] max-w-[210px] shrink-0 snap-start lg:w-auto lg:min-w-0 lg:max-w-none', index >= 5 && 'lg:hidden')} />
                ))}
              </Rail>
            </section>
          )}

          <section aria-labelledby="home-groups" className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-violet-700 via-purple-600 to-fuchsia-600 p-4 text-white shadow-sm sm:p-6">
            <span aria-hidden className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-white/10 blur-2xl" />
            <div className="relative mb-3 flex flex-wrap items-end justify-between gap-2">
              <div className="min-w-0">
                <p className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-white/90">
                  <span aria-hidden className="h-2 w-2 animate-pulse rounded-full bg-red-400" />En direct
                </p>
                <h2 id="home-groups" className="text-xl font-extrabold leading-tight sm:text-2xl">Achats groupés</h2>
                <p className="text-sm text-white/90">Plus on est nombreux, plus le prix baisse.</p>
              </div>
              <Link href="/achats-groupes" className="inline-flex min-h-11 items-center gap-1 rounded-full bg-white/15 px-4 text-sm font-bold hover:bg-white/25">
                Voir les groupes<ArrowRight size={14} aria-hidden />
              </Link>
            </div>
            {/* Chiffres réels, affichés seulement quand ils sont parlants */}
            {groupStats && groupStats.totalParticipants >= SOCIAL_PROOF_MIN_PARTICIPANTS && (
              <dl className="relative mb-4 flex flex-wrap gap-2">
                <div className="rounded-xl bg-white/15 px-3 py-2">
                  <dt className="text-[11px] font-semibold uppercase tracking-wide text-white/85">Participants</dt>
                  <dd className="text-lg font-extrabold leading-tight">{groupStats.totalParticipants.toLocaleString('fr-FR')}</dd>
                </div>
                {groupStats.totalSaved >= 50000 && (
                  <div className="rounded-xl bg-white/15 px-3 py-2">
                    <dt className="text-[11px] font-semibold uppercase tracking-wide text-white/85">Économisés ensemble</dt>
                    <dd className="text-lg font-extrabold leading-tight">{formatFcfa(groupStats.totalSaved)}</dd>
                  </div>
                )}
                {groupStats.totalFilled >= 3 && (
                  <div className="rounded-xl bg-white/15 px-3 py-2">
                    <dt className="text-[11px] font-semibold uppercase tracking-wide text-white/85">Groupes complétés</dt>
                    <dd className="text-lg font-extrabold leading-tight">{groupStats.totalFilled.toLocaleString('fr-FR')}</dd>
                  </div>
                )}
              </dl>
            )}
            {liveGroups.length > 0 ? (
              <Rail className={cn('relative lg:mx-0 lg:grid lg:overflow-visible lg:px-0', GROUP_GRID[Math.min(liveGroups.length, 6)])}>
                {liveGroups.map(group => (
                  <GroupCard key={group.id} group={group} onClick={() => router.push(`/achats-groupes/${group.id}`)}
                    className="w-[46%] min-w-[156px] max-w-[220px] shrink-0 snap-start lg:w-auto lg:min-w-0 lg:max-w-none" />
                ))}
              </Rail>
            ) : (
              <p className="relative rounded-xl bg-white/10 p-4 text-sm text-white">
                {failures.includes('Groupes') ? 'Les groupes n’ont pas pu être chargés.' : 'Aucun groupe ouvert pour le moment : découvrez comment fonctionnent les achats groupés.'}
              </p>
            )}
          </section>

          <section aria-labelledby="home-products">
            <SectionHeader id="home-products" title="Sélection DDM+" subtitle="Nos produits mis en avant" icon={Sparkles}
              tone="bg-gradient-to-br from-blue-600 to-cyan-500 text-white" href="/produits" linkLabel="Voir tout" />
            {products.length > 0 ? (
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
                {products.slice(0, 12).map(product => <ProductCard key={product.id} product={product} size="lg" onQuickAdd={quickAdd} onClick={() => router.push(`/produits/${product.id}`)} />)}
              </div>
            ) : <p className="py-3 text-sm text-zinc-500 dark:text-zinc-400">{failures.includes('Produits') ? 'La sélection n’a pas pu être chargée.' : 'La sélection sera bientôt disponible.'}</p>}
          </section>

          <section aria-labelledby="home-how" className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:p-6">
            <SectionHeader id="home-how" title="Comment ça marche" subtitle="Acheter en Chine, sans prise de tête" icon={Route}
              tone="bg-gradient-to-br from-amber-500 to-orange-600 text-white" href="/comment-ca-marche" linkLabel="En savoir plus" />
            <ol className="grid gap-3 md:grid-cols-3">
              {HOW_STEPS.map((step, index) => (
                <li key={step.title} className="flex gap-3 rounded-xl bg-zinc-50 p-3 dark:bg-zinc-800/60 sm:p-4">
                  <span className={cn('grid h-11 w-11 shrink-0 place-items-center rounded-xl text-white shadow-sm', step.tone)}><step.icon size={20} aria-hidden /></span>
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Étape {index + 1}</p>
                    <p className="font-bold leading-snug">{step.title}</p>
                    <p className="mt-0.5 text-sm text-zinc-600 dark:text-zinc-400">{step.text}</p>
                  </div>
                </li>
              ))}
            </ol>
          </section>

          <section aria-labelledby="home-sourcing" className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-700 to-teal-600 p-5 text-white shadow-sm sm:p-7">
            <span aria-hidden className="pointer-events-none absolute -bottom-20 -right-10 h-56 w-56 rounded-full bg-white/10 blur-2xl" />
            <div className="relative grid gap-4 md:grid-cols-[1fr_auto] md:items-center">
              <div className="min-w-0">
                <h2 id="home-sourcing" className="text-xl font-extrabold leading-tight sm:text-2xl">Vous ne trouvez pas votre produit ?</h2>
                <p className="mt-1 text-sm text-white/90 sm:text-base">Envoyez une photo ou un lien : on le cherche pour vous chez les fournisseurs en Chine.</p>
                <ol className="mt-4 grid gap-2 text-sm sm:grid-cols-3">
                  {['Envoyez une photo', 'On trouve le fournisseur', 'Vous validez le devis'].map((step, index) => (
                    <li key={step} className="flex items-center gap-2">
                      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-white text-xs font-extrabold text-emerald-800">{index + 1}</span>
                      <span className="font-semibold">{step}</span>
                    </li>
                  ))}
                </ol>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row md:flex-col">
                <button type="button" onClick={() => openSourcing()} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-white px-6 text-sm font-bold text-emerald-800 shadow-lg hover:bg-emerald-50">
                  <Camera size={18} aria-hidden />Trouvez-moi
                </button>
                <a href={brandWhatsAppUrl(undefined, 'Bonjour DDM+, je cherche un produit et j’aimerais un conseil.')} target="_blank" rel="noopener noreferrer"
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border-2 border-white/70 px-6 text-sm font-bold text-white hover:bg-white/10">
                  <MessageCircle size={18} aria-hidden />Une question ? WhatsApp
                </a>
              </div>
            </div>
          </section>

          <nav aria-label="Autres façons d’acheter" className="grid gap-3 sm:grid-cols-2">
            <ShopTile href="/produits?moq=lot" icon={Boxes} title="Acheter par lots" text="Commandez en quantité, payez moins à l’unité" tone="from-orange-700 to-amber-600" />
            <ShopTile href="/market/boutiques" icon={Store} title="Boutiques partenaires" text="Les vendeurs de la marketplace DDM+" tone="from-blue-700 to-sky-600" />
          </nav>
        </div>
      </div>
      {quickAddToast}
    </>
  );
}
