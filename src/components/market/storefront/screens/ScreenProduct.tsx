'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { formatFcfa } from '../formatFcfa';
import { brandWhatsAppUrl } from '@/lib/branding';
import { Icon } from '../Icon';
import { Badge } from '../Badge';
import { Button } from '../Button';
import { Card } from '../Card';
import { ProductCard } from '../ProductCard';
import { ProgressBar } from '../ProgressBar';
import { LiveDot } from '../LiveDot';
import { Section } from '../Section';
import ProductImageGallery from '../ProductImageGallery';
import ProductDescription from '../ProductDescription';
import { VariantPicker } from '../VariantPicker';
import { GroupNotifyCard } from '../GroupNotifyCard';
import { ReviewForm } from '../ReviewForm';
import RetryNotice from '../RetryNotice';
import { useWishlist } from '../useWishlist';
import { useSourcingModal } from '../SourcingModalContext';
import { addToCart, loadCart, mapProductDetail, productSelection } from '../data-mappers';
import type { CartItem, Product, PriceTier, ShippingMode } from '../types';
import type { CartQuote } from '@/lib/pricing/quote-cart';


export default function ScreenProduct() {
  const router = useRouter();
  const { open: openSourcing } = useSourcingModal();
  const { isFavorite, toggle: toggleFavorite } = useWishlist();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [reviewsUnavailable, setReviewsUnavailable] = useState(false);
  const [groupsUnavailable, setGroupsUnavailable] = useState(false);
  const [PRODUCT, setPRODUCT] = useState<Product | null>(null);
  const [SIMILAR, setSIMILAR] = useState<Product[]>([]);
  const [reviewCount, setReviewCount] = useState(0);
  const [verifiedCount, setVerifiedCount] = useState(0);
  const [REVIEWS, setREVIEWS] = useState<Array<{ id: string; userName: string; rating: number; title?: string | null; comment: string; verified?: boolean; createdAt: string }>>([]);

  const params = useParams();
  const id = params?.id as string;
  useEffect(() => {
    if (!id) return;
    if (typeof window === 'undefined') return;
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    setPRODUCT(null);
    setSIMILAR([]);
    setREVIEWS([]);
    setReviewCount(0);
    setVerifiedCount(0);
    Promise.all([
      fetch(`/api/catalog/products/${id}`, { signal: controller.signal }).then(response => {
        if (response.status === 404) return null;
        if (!response.ok) throw new Error('La fiche produit est temporairement indisponible.');
        return response.json().then(data => { if (!data.product) throw new Error('Les informations du produit sont incomplètes.'); return data; });
      }),
      fetch(`/api/group-orders?productId=${id}&limit=5&status=open`, { signal: controller.signal }).then(response => response.ok ? response.json() : null).catch(() => null),
      fetch(`/api/reviews?productId=${id}&limit=5`, { signal: controller.signal }).then(response => response.ok ? response.json() : null).catch(() => null),
    ])
      .then(([res, grpRes, revRes]) => {
        if (controller.signal.aborted) return;
        setReviewsUnavailable(!revRes?.success);
        setGroupsUnavailable(!Array.isArray(grpRes?.groups));
        if (res?.product) {
          const activeGroup = grpRes?.groups?.find((group: { status: string; deadline: string }) => group.status === 'open' && new Date(group.deadline).getTime() > Date.now());
          const mapped = mapProductDetail(res.product, activeGroup) as Product | null;
          // La note affichée est celle des avis publiés, pas une note fournisseur
          if (mapped) mapped.rating = revRes?.success ? revRes.stats?.avgRating || 0 : 0;
          setPRODUCT(mapped);
          if (Array.isArray(res?.similar)) {
            setSIMILAR(res.similar.map((s: any) => ({
              id: String(s.id || s._id),
              name: s.name || 'Produit',
              rating: s.sellerRating || s.rating || 0,
              reviews: s.reviewCount || 0,
              images: [s.image || '/placeholder.svg'],
              price: s.priceAmount || s.price || 0,
              basePrice: s.priceAmount || s.price || 0,
              minOrderQty: s.moq || 1,
              priceTiers: [],
              variants: [],
              specs: [],
              shipping: { origin: 'Guangzhou, Chine', modes: [] },
              cat: s.category || 'Catalogue',
              category: s.category,
              img: s.image || '/placeholder.svg',
              image: s.image,
              save: 0,
              hasGroup: false,
              verified: false,
            })) as Product[]);
          }
        }
        if (revRes?.success) {
          setReviewCount(revRes.stats?.total ?? 0);
          setVerifiedCount(revRes.stats?.verifiedCount ?? 0);
          setREVIEWS(Array.isArray(revRes.reviews) ? revRes.reviews : []);
        }
      })
      .catch(failure => { if (!controller.signal.aborted) setError(failure.message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [id, attempt]);

  const [activeImg, setActiveImg] = useState(0);
  const [variantIds, setVariantIds] = useState<string[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartNotice, setCartNotice] = useState('');
  const [cartError, setCartError] = useState('');
  const [qty, setQty] = useState(PRODUCT?.minOrderQty ?? 1);
  const [tab, setTab] = useState("desc");
  const [showMoqExplain, setShowMoqExplain] = useState(false);
  const [reviewsPage, setReviewsPage] = useState(1);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewsError, setReviewsError] = useState('');
  const reviewRequest = useRef<AbortController | null>(null);
  useEffect(() => () => reviewRequest.current?.abort(), [id, attempt]);

  useEffect(() => {
    const update = () => setCart(loadCart());
    update();
    window.addEventListener('cart:updated', update);
    window.addEventListener('storage', update);
    return () => { window.removeEventListener('cart:updated', update); window.removeEventListener('storage', update); };
  }, []);

  useEffect(() => {
    if (PRODUCT) {
      setVariantIds([]);
      setQty(PRODUCT.minOrderQty ?? 1);
      setActiveImg(0);
      setCartNotice('');
      setCartError('');
      setReviewsPage(1);
      setReviewsError('');
      setReviewsLoading(false);
    }
  }, [PRODUCT]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center text-slate-500 dark:text-slate-400">
        Chargement…
      </div>
    );
  }

  if (!PRODUCT) {
    if (error) return <section className="mx-auto max-w-5xl px-4 py-8"><h1 className="text-2xl font-bold">Fiche produit</h1><RetryNotice message={error} onRetry={() => setAttempt(value => value + 1)}/><Link href="/produits" className="inline-flex min-h-11 items-center text-sm font-semibold">Retour au catalogue</Link></section>;
    return (
      <div className="mx-auto max-w-5xl px-4 py-12 text-slate-700 dark:text-slate-300">
        <h1 className="text-2xl font-bold">Produit introuvable</h1>
        <Link href="/produits" className="mt-4 inline-flex min-h-11 items-center font-semibold text-emerald-700 dark:text-emerald-400">Retour au catalogue</Link>
      </div>
    );
  }

  const p = PRODUCT;
  const selection = productSelection(p, variantIds, cart);
  const selectedLabels = selection.selected.map(option => `${option.groupName} : ${option.label}`);
  const variantImage = selection.selected.find(option => option.image)?.image;
  const images = variantImage ? [variantImage, ...p.images.filter(image => image !== variantImage)] : p.images;
  const unavailable = p.availabilityStatus === 'out_of_stock';
  const purchaseBlocked = unavailable || p.requiresQuote || !selection.complete || selection.unit <= 0 || qty > selection.maxQuantity;
  const purchaseReason = unavailable ? 'Produit actuellement indisponible.'
    : p.requiresQuote || selection.unit <= 0 ? 'Ce produit nécessite un devis.'
    : !selection.complete ? 'Choisissez une option dans chaque groupe.'
    : qty > selection.maxQuantity ? `Stock restant pour cet ajout : ${selection.maxQuantity} unité(s), panier déjà pris en compte.` : '';
  // Prix unitaire de base : celui de la variante si elle en porte un, sinon produit.
  const baseUnit = selection.unit;
  // Les paliers sont définis sur le prix produit — mis à l'échelle de la variante
  // (même ratio de remise, comme le devis serveur).
  const tierScale = baseUnit !== p.price && p.price > 0 ? baseUnit / p.price : 1;
  const effectiveTiers = tierScale !== 1
    ? p.priceTiers.map((t: PriceTier) => ({ ...t, unit: Math.round(t.unit * tierScale) }))
    : p.priceTiers;
  const tier =
    effectiveTiers.slice().reverse().find((t: PriceTier) => qty >= t.from && t.unit < baseUnit) || null;
  const currentUnit = tier?.unit ?? baseUnit;
  const nextTier = effectiveTiers.find((t: PriceTier) => qty < t.from) || null;
  const savingsVsBase = (baseUnit - currentUnit) * qty;
  const distanceToNext = nextTier ? nextTier.from - qty : 0;

  const inc = () => setQty((q: number) => Math.min(selection.maxQuantity, q + 1));
  const dec = () => setQty((q: number) => Math.max(p.minOrderQty, q - 1));

  const buildCartItem = () => ({
    id: p.id,
    name: p.name,
    variant: selectedLabels.join(' · ') || undefined,
    variantId: variantIds.length === 1 ? variantIds[0] : undefined,
    variantIds: [...variantIds].sort(),
    variantLabels: selectedLabels,
    image: variantImage || images[activeImg] || images[0] || '/placeholder.svg',
    unit: baseUnit,
    qty,
    minOrderQty: p.minOrderQty,
    priceTiers: effectiveTiers,
    tierUnit: currentUnit,
    nextTier: nextTier ? { at: nextTier.from, save: nextTier.save } : null,
    hasActiveGroup: !!p.groupBuy?.active,
    groupUnit: p.groupBuy?.unitPrice,
    groupId: p.groupBuy?.id,
  });

  const handleAddToCart = () => {
    setCartError('');
    setCartNotice('');
    const latest = productSelection(p, variantIds, loadCart());
    if (purchaseBlocked || qty > latest.maxQuantity || !Number.isSafeInteger(qty) || qty < p.minOrderQty) {
      setCartError(purchaseReason || 'Cette quantité dépasse le stock disponible.');
      return false;
    }
    try {
      addToCart(buildCartItem());
      setCartNotice(`${qty} unité(s) ajoutée(s) au panier.`);
      return true;
    } catch {
      setCartError('Impossible de conserver votre panier sur cet appareil.');
      return false;
    }
  };

  const handleBuyNow = () => {
    if (handleAddToCart()) router.push('/checkout/adresse');
  };

  const loadMoreReviews = async () => {
    if (reviewsLoading) return;
    const controller = new AbortController();
    reviewRequest.current?.abort();
    reviewRequest.current = controller;
    setReviewsLoading(true);
    setReviewsError('');
    try {
      const response = await fetch(`/api/reviews?productId=${id}&limit=5&page=${reviewsPage + 1}`, { signal: controller.signal });
      const data = await response.json();
      if (!response.ok || !data.success || !Array.isArray(data.reviews)) throw new Error('Impossible de charger les avis suivants.');
      if (controller.signal.aborted) return;
      setREVIEWS(current => [...current, ...data.reviews.filter((review: { id: string }) => !current.some(existing => existing.id === review.id))]);
      setReviewsPage(value => value + 1);
      if (typeof data.stats?.total === 'number') setReviewCount(data.stats.total);
    } catch {
      if (!controller.signal.aborted) setReviewsError('Impossible de charger les avis suivants.');
    } finally {
      if (!controller.signal.aborted) setReviewsLoading(false);
    }
  };


  // Badge remise galerie : uniquement si une référence réelle existe
  // (meilleur palier sous le prix courant) — jamais de % négatif.
  const galleryDiscount = p.basePrice > 0 && p.basePrice < p.price
    ? Math.round((1 - p.basePrice / p.price) * 100)
    : 0;

  const galleryBadges = (
    <>
      <div className="absolute left-3 top-3 flex flex-col gap-1.5">
        {p.verified && <Badge tone="emerald"><Icon name="checkCircle" size={11} /> Fournisseur vérifié</Badge>}
        {p.minOrderQty > 1 && <Badge tone="amber"><Icon name="package" size={11} /> Lot min. {p.minOrderQty}</Badge>}
      </div>
      {galleryDiscount > 0 && (
        <div className="absolute right-3 top-3">
          <Badge tone="emerald">Jusqu'à -{galleryDiscount}% par lot</Badge>
        </div>
      )}
    </>
  );

  const ratingLine = (
    <div className="mt-2 flex items-center gap-2 text-[12px] text-slate-500 dark:text-slate-400">
      {reviewCount > 0 && p.rating > 0 ? (
        <>
          <span className="flex items-center gap-0.5 text-amber-500">
            {Array.from({ length: 5 }).map((_, i) => <Icon key={i} name="star" size={13} strokeWidth={0} className={i < Math.round(p.rating) ? "fill-amber-500" : "fill-slate-200 dark:fill-slate-700"} />)}
          </span>
          <span className="font-semibold text-slate-900 dark:text-white">{p.rating.toFixed(1)}</span>
          <span>·</span>
          <span>{reviewCount} avis</span>
        </>
      ) : (
        <span>{reviewsUnavailable ? 'Avis temporairement indisponibles' : 'Aucun avis pour le moment'}</span>
      )}
    </div>
  );

  const tiersBlock = effectiveTiers.length > 0 && (
    <div className="mt-4">
      <p className="mb-2 text-[11px] md:text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Prix par palier</p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {effectiveTiers.map((t: PriceTier, i) => {
          const active = qty >= t.from && (!t.to || qty <= t.to);
          return (
            <button
              key={i}
              onClick={() => setQty(Math.max(p.minOrderQty, t.from))}
              disabled={Math.max(p.minOrderQty, t.from) > selection.maxQuantity}
              aria-pressed={active}
              className={cn(
                "min-w-0 rounded-lg border p-2.5 text-left transition-all disabled:opacity-40 [overflow-wrap:anywhere]",
                active
                  ? "border-emerald-600 bg-emerald-50 shadow-sm dark:border-emerald-500 dark:bg-emerald-950/40"
                  : "border-slate-200 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700"
              )}
            >
              <p className={cn(
                "text-[11px] font-bold uppercase tracking-wider",
                active ? "text-emerald-700 dark:text-emerald-400" : "text-slate-500 dark:text-slate-400"
              )}>
                {t.to ? `${t.from}–${t.to} pcs` : `${t.from}+ pcs`}
              </p>
              <p className="mt-0.5 text-[15px] font-extrabold tracking-tight text-slate-900 dark:text-white tabular-nums">
                {formatFcfa(t.unit)}
              </p>
              {t.save > 0 && (
                <p className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">-{t.save}%</p>
              )}
            </button>
          );
        })}
      </div>
      {nextTier && distanceToNext > 0 && (
        <p className="mt-2 flex flex-wrap items-center gap-1.5 rounded-lg bg-emerald-50 px-2.5 py-2 text-xs font-semibold text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
          <Icon name="sparkles" size={13} />
          Ajoutez <b className="tabular-nums mx-0.5">{distanceToNext}</b> unités pour débloquer −{nextTier.save}%
        </p>
      )}
    </div>
  );

  const groupBuyCard = p.groupBuy?.active && (
    <Card className="overflow-hidden border-violet-200 dark:border-violet-900 rounded-none md:rounded-2xl border-x-0 md:border-x">
      <div className="bg-gradient-to-br from-violet-50 via-white to-emerald-50 p-4 dark:from-violet-950/40 dark:via-slate-900 dark:to-emerald-950/40">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-violet-600 text-white"><Icon name="users" size={14}/></span>
            <div>
              <p className="text-[13px] md:text-sm font-extrabold text-slate-900 dark:text-white leading-tight">Achat groupé actif</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
                {p.groupBuy?.participants ?? p.groupBuy?.currentQty} {p.groupBuy?.participants === 1 ? 'personne a' : 'personnes ont'} déjà rejoint
              </p>
            </div>
          </div>
          <LiveDot />
        </div>
        <div className="mb-1 flex items-baseline justify-between">
          <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
            <b className="tabular-nums text-slate-900 dark:text-white">{p.groupBuy?.currentQty}</b> / {p.groupBuy?.targetQty} unités
          </span>
          <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
            {p.groupBuy?.targetQty ? Math.round((p.groupBuy?.currentQty / p.groupBuy?.targetQty) * 100) : 0}%
          </span>
        </div>
        <ProgressBar value={p.groupBuy?.currentQty} max={p.groupBuy?.targetQty} tone="mixed" />
        <div className="mt-3 grid grid-cols-3 gap-2 rounded-xl bg-white/60 p-2.5 dark:bg-slate-900/60">
          <div>
            <p className="text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400">Prix groupe</p>
            <p className="text-[15px] font-extrabold text-violet-700 dark:text-violet-300 tabular-nums">{formatFcfa(p.groupBuy?.unitPrice)}</p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400">Économie</p>
            <p className="text-[15px] font-extrabold text-emerald-600 dark:text-emerald-400">-{p.groupBuy?.savePct}%</p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400">Deadline</p>
            <p className="text-[13px] font-extrabold text-red-600 dark:text-red-400 tabular-nums leading-tight">{p.groupBuy?.deadline}</p>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Button variant="violet" size="sm" onClick={() => p.groupBuy?.id ? router.push(`/achats-groupes/${p.groupBuy.id}`) : router.push('/achats-groupes')}>
            Rejoindre
          </Button>
          <Button variant="secondary" size="sm" onClick={() => router.push(`/achats-groupes/nouveau?productId=${p.id}`)}>
            Créer un groupe
          </Button>
        </div>
      </div>
    </Card>
  );

  return (
    <>
      <div className="min-h-full bg-white pb-36 dark:bg-slate-950 md:pb-0">
        <div className="mx-auto max-w-6xl md:px-6 md:py-6">
          {/* Fil d'ariane — desktop uniquement */}
          <div className="mb-4 hidden items-center gap-1.5 text-[12px] text-slate-500 dark:text-slate-400 md:flex">
            <Link href="/market" className="hover:text-slate-700 dark:hover:text-slate-300">Accueil</Link><Icon name="chevronRight" size={12}/>
            <Link href="/produits" className="hover:text-slate-700 dark:hover:text-slate-300">Catalogue</Link><Icon name="chevronRight" size={12}/>
            <Link href={`/produits?category=${encodeURIComponent(p.category || '')}`} className="hover:text-slate-700 dark:hover:text-slate-300">{p.category || p.cat || 'Catégorie'}</Link><Icon name="chevronRight" size={12}/>
            <span className="text-slate-700 dark:text-slate-300 line-clamp-1 max-w-[220px]">{p.name}</span>
          </div>

          <header className="px-4 pb-4 pt-3 md:px-0">
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">{p.brand}</p>
            <h1 className="mt-1 text-xl font-bold leading-snug text-slate-900 dark:text-white [overflow-wrap:anywhere]">{p.name}</h1>
            {ratingLine}
          </header>
          <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_400px] lg:gap-8">
            {/* Galerie : pleine largeur mobile, colonne gauche desktop */}
            <div className="min-w-0">
              <Card className="overflow-hidden rounded-none md:rounded-2xl">
                <ProductImageGallery
                  images={images}
                  name={p.name}
                  activeIndex={activeImg}
                  onActiveChange={setActiveImg}
                  badges={galleryBadges}
                />
              </Card>
            </div>

            {/* Panneau d'achat : sous la galerie sur mobile, colonne droite sticky sur desktop */}
            <aside className="min-w-0 lg:col-start-2 lg:row-start-1 lg:row-span-3">
              <div>
                <section aria-label="Configuration et achat" className="border-b border-slate-200 p-4 dark:border-slate-800 lg:px-0 lg:pt-0">

                  <div className="flex flex-wrap items-baseline gap-2 [overflow-wrap:anywhere]">
                    <span className="max-w-full text-2xl font-extrabold text-emerald-700 dark:text-emerald-400 tabular-nums">{p.requiresQuote || currentUnit <= 0 ? 'Sur devis' : formatFcfa(currentUnit)}</span>
                    {currentUnit < baseUnit && (
                      <>
                        <span className="text-[13px] md:text-sm font-semibold text-slate-400 line-through tabular-nums">{formatFcfa(baseUnit)}</span>
                        <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">-{Math.round((1 - currentUnit / baseUnit) * 100)}%</span>
                      </>
                    )}
                  </div>
                  <p className="mt-1 text-[12px] md:text-xs text-slate-500 dark:text-slate-400">
                    Prix unitaire{selectedLabels.length ? ` · ${selectedLabels.join(' · ')}` : ''}
                    {p.includedFees ? ` · ${p.includedFees} inclus` : ''}
                  </p>
                  {(() => {
                    // Le coût du transport doit être visible avant le panier : pas de frais « surprise ».
                    if (p.availabilityStatus === 'in_stock') {
                      return <p className="mt-1 text-sm font-semibold text-emerald-700 dark:text-emerald-400">Stock Dakar : {p.stockQuantity ?? 0} unité(s)</p>
                    }
                    const cheapest = (p.shipping.modes || []).filter((m: ShippingMode) => m.from > 0).sort((a: ShippingMode, b: ShippingMode) => a.from - b.from)[0]
                    return (
                      <button type="button" onClick={() => setTab('ship')} className="mt-1 text-left text-[12px] font-semibold text-slate-600 underline decoration-dotted underline-offset-2 dark:text-slate-300">
                        {cheapest ? `+ transport dès ${formatFcfa(cheapest.from)}/pc (${cheapest.label}, ${cheapest.days})` : 'Transport calculé au panier selon le poids et le mode choisi'}
                      </button>
                    )
                  })()}

                  {p.minOrderQty > 1 && (
                    <>
                      <button onClick={()=>setShowMoqExplain(s=>!s)} className="mt-3 flex w-full items-center justify-between gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-left dark:border-amber-900 dark:bg-amber-950/40">
                        <div className="flex items-start gap-2">
                          <Icon name="package" size={16} className="mt-0.5 text-amber-700 dark:text-amber-300"/>
                          <div>
                            <p className="text-[12px] font-bold text-amber-900 dark:text-amber-200">Lot minimum {p.minOrderQty} unités</p>
                            <p className="text-[11px] text-amber-800 dark:text-amber-300/80">Condition de commande de ce produit</p>
                          </div>
                        </div>
                        <Icon name={showMoqExplain?"chevronDown":"chevronRight"} size={14} className="text-amber-700 dark:text-amber-300"/>
                      </button>
                      {showMoqExplain && (
                        <div className="mt-2 rounded-xl bg-slate-50 p-3 text-[12px] text-slate-600 dark:bg-slate-800 dark:text-slate-300 leading-relaxed">
                          La quantité minimale configurée pour ce produit s'applique à chaque combinaison de variantes commandée.
                        </div>
                      )}
                    </>
                  )}

                  {tiersBlock}

                  {(p.variantGroups || []).map((group, groupIndex) => (
                    <fieldset key={groupIndex} className="mt-4">
                      <legend className="mb-2 text-sm font-bold text-slate-900 dark:text-white">{group.name}</legend>
                      <VariantPicker variants={group.variants} value={variantIds.find(optionId => group.variants.some(option => option.id === optionId)) || ''}
                        onChange={optionId => { setVariantIds(current => [...current.filter(value => !group.variants.some(option => option.id === value)), optionId]); setActiveImg(0); setCartNotice(''); setCartError(''); }}
                        productPrice={p.price} size="md" trackStock={p.availabilityStatus === 'in_stock'} minQuantity={p.minOrderQty} />
                    </fieldset>
                  ))}

                  <div className="mt-4">
                    <p className="mb-2 text-[13px] md:text-xs font-bold text-slate-900 dark:text-white">Quantité</p>
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1 dark:border-slate-800 dark:bg-slate-900">
                        <button aria-label="Diminuer la quantité" onClick={dec} disabled={qty<=p.minOrderQty} className="grid h-11 w-11 place-items-center rounded-lg text-slate-700 hover:bg-slate-100 disabled:opacity-30 dark:text-slate-300 dark:hover:bg-slate-800"><Icon name="minus" size={16}/></button>
                        <input aria-label="Quantité" inputMode="numeric" value={qty} onChange={event => { if (/^\d*$/.test(event.target.value)) setQty(Math.min(10000, Number(event.target.value))); }} onBlur={() => setQty(value => Math.max(p.minOrderQty, value))} className="h-11 w-14 bg-transparent text-center text-base font-extrabold text-slate-900 dark:text-white tabular-nums"/>
                        <button aria-label="Augmenter la quantité" onClick={inc} disabled={qty >= selection.maxQuantity || !selection.complete} className="grid h-11 w-11 place-items-center rounded-lg text-slate-700 hover:bg-slate-100 disabled:opacity-30 dark:text-slate-300 dark:hover:bg-slate-800"><Icon name="plus" size={16}/></button>
                      </div>
                      <div>
                        <p className="text-[11px] md:text-xs text-slate-500 dark:text-slate-400">Total ({qty} pcs) hors transport</p>
                        <p className="text-[17px] md:text-lg font-extrabold tracking-tight text-slate-900 dark:text-white tabular-nums">{formatFcfa(currentUnit * qty)}</p>
                      </div>
                    </div>
                    {savingsVsBase > 0 && (
                      <p className="mt-2 flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
                        <Icon name="sparkles" size={13} />
                        Vous économisez <b className="tabular-nums">{formatFcfa(savingsVsBase)}</b> vs prix de base
                      </p>
                    )}
                  </div>

                  {purchaseReason && <p className="mt-3 text-sm text-amber-800 dark:text-amber-300">{purchaseReason}</p>}
                  {cartError && <p role="alert" className="mt-3 text-sm text-red-700 dark:text-red-300">{cartError}</p>}
                  {cartNotice && <p role="status" className="mt-3 text-sm text-emerald-700 dark:text-emerald-300">{cartNotice} <Link href="/panier" className="font-bold underline">Voir le panier</Link></p>}
                  {p.requiresQuote && <Button className="mt-3 w-full" onClick={() => openSourcing({ source: 'text', title: p.name })}>Demander un devis</Button>}

                  <div className="fixed inset-x-0 bottom-[calc(var(--mkt-bottom-nav-h,64px)+8px)] z-40 border-y border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-950 md:static md:mt-4 md:border-0 md:p-0">
                    <p className="mb-2 text-xs text-slate-600 dark:text-slate-300 md:hidden">{p.requiresQuote ? 'Sur devis' : `Total hors transport : ${formatFcfa(currentUnit * qty)}`} · {qty} pcs</p>
                    <div className="grid grid-cols-2 gap-2 md:grid-cols-1">
                      <Button variant="primary" size="md" className="min-w-0 w-full !rounded-lg" disabled={purchaseBlocked || qty < p.minOrderQty} onClick={handleAddToCart}><Icon name="cart" size={16}/><span className="md:hidden">Ajouter</span><span className="hidden md:inline">Ajouter au panier</span></Button>
                      <Button variant="outline" size="md" className="min-w-0 w-full !rounded-lg" disabled={purchaseBlocked || qty < p.minOrderQty} onClick={handleBuyNow}><span className="md:hidden">Acheter</span><span className="hidden md:inline">Acheter maintenant</span></Button>
                    </div>
                    {cartNotice && <p className="mt-1 text-xs text-emerald-700 dark:text-emerald-300 md:hidden">Ajout confirmé · <Link href="/panier" className="underline">Voir le panier</Link></p>}
                  </div>
                  <div className="mt-3">
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        variant="ghost"
                        size="md"
                        className={cn('min-w-0 !h-auto min-h-11 !whitespace-normal', isFavorite(p.id) && '!text-red-600 dark:!text-red-400')}
                        onClick={() => toggleFavorite(p.id)}
                      >
                        <Icon name="heart" size={16} className={isFavorite(p.id) ? 'fill-current' : undefined} />
                        {isFavorite(p.id) ? 'En favoris' : 'Ajouter aux favoris'}
                      </Button>
                      <Button variant="ghost" size="md" className="min-w-0 !h-auto min-h-11 !whitespace-normal" onClick={() => window.open(brandWhatsAppUrl(undefined, `Bonjour, j'ai une question sur ${p.name} (ref: ${p.id})`), '_blank')}><Icon name="whatsapp" size={16}/>Question</Button>
                    </div>
                  </div>
                  <ProductShippingEstimate key={`${p.id}:${qty}:${[...variantIds].sort().join(',')}`} productId={p.id} qty={qty} variantIds={variantIds} disabled={!!purchaseBlocked || qty < p.minOrderQty} />
                  {p.availabilityNote && <p className="mt-3 text-xs text-slate-600 dark:text-slate-400">{p.availabilityNote}</p>}
                  <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 border-t border-slate-200 pt-3 text-sm dark:border-slate-800">
                    <Link href="/cgv" className="inline-flex min-h-11 items-center underline">Retours et conditions de vente</Link>
                    <Link href="/contact" className="inline-flex min-h-11 items-center underline">Service client</Link>
                  </div>
                </section>
              </div>
            </aside>

            {/* Onglets + confiance + similaires : colonne gauche desktop, sous le panneau mobile */}
            <div className="min-w-0 lg:col-start-1">
              <div className="mt-2 bg-white dark:bg-slate-900 md:mt-4 md:overflow-hidden md:rounded-2xl md:border md:border-slate-200 md:dark:border-slate-800">
                <div className="flex gap-1 border-b border-slate-200 px-4 dark:border-slate-800">
                  {[
                    ["desc", "Description"],
                    ["ship", "Expédition"],
                    ["rev", `Avis (${reviewCount})`],
                  ].map(([k, l]) => (
                    <button
                      key={k}
                      onClick={() => setTab(k)}
                      className={cn(
                        "border-b-2 px-2 md:px-3 py-3 text-[13px] md:text-sm font-semibold",
                        tab === k
                          ? "border-emerald-600 text-emerald-700 dark:text-emerald-400"
                          : "border-transparent text-slate-500 dark:text-slate-400"
                      )}
                    >
                      {l}
                    </button>
                  ))}
                </div>
                <div className="px-4 py-4 md:p-6">
                  {tab === "desc" && (
                    <ProductDescription
                      description={p.description}
                      specs={p.specs}
                      descriptionImages={p.descriptionImages}
                    />
                  )}
                  {tab === "ship" && (
                    <div className="space-y-2 md:space-y-3 text-[13px] text-slate-700 dark:text-slate-300">
                      <p className="text-sm text-slate-600 dark:text-slate-400">{p.availabilityStatus === 'in_stock' ? 'Expédition depuis le stock local.' : `Origine indiquée : ${p.shipping.origin}`}</p>
                      <p className="text-sm">Les délais sont indicatifs. Le transport dépend du poids et du volume du lot ; son montant final est confirmé au panier et peut être ajusté après pesée.</p>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {p.shipping.modes.map((m: ShippingMode) => (
                          <div key={m.key} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-800">
                            <div>
                              <p className="text-[12px] md:text-sm font-bold text-slate-900 dark:text-white">{m.label}</p>
                              <p className="text-[11px] md:text-xs text-slate-500 dark:text-slate-400">{m.days}</p>
                            </div>
                            <p className="text-[12px] md:text-sm font-bold text-slate-900 dark:text-white tabular-nums md:mt-2">{m.from > 0 ? `dès ${formatFcfa(m.from)}/pc` : 'Selon poids/volume'}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {tab === 'rev' && reviewsUnavailable && <RetryNotice message="Impossible de charger les avis." onRetry={() => setAttempt(value => value + 1)}/>}
                  {tab === "rev" && !reviewsUnavailable && (
                    <div className="space-y-4">
                      <div className="mb-3 flex items-center gap-3 md:mb-0 md:block md:rounded-xl md:border md:border-slate-200 md:p-4 md:dark:border-slate-800">
                        <div className="text-3xl md:text-4xl font-extrabold text-slate-900 dark:text-white tabular-nums">{p.rating > 0 ? p.rating : '—'}<span className="hidden md:inline text-lg text-slate-400">/5</span></div>
                        <div>
                          <div className="flex text-amber-500">
                            {Array.from({ length: 5 }).map((_, i) => <Icon key={i} name="star" size={14} strokeWidth={0} className={i < Math.round(p.rating) ? "fill-amber-500" : "fill-slate-200 dark:fill-slate-700"} />)}
                          </div>
                          <p className="mt-0.5 md:mt-1 text-[11px] md:text-xs text-slate-500 dark:text-slate-400">{reviewCount} avis{verifiedCount > 0 ? ` · ${verifiedCount} achat${verifiedCount > 1 ? 's' : ''} vérifié${verifiedCount > 1 ? 's' : ''}` : ''}</p>
                        </div>
                      </div>
                      <div className="space-y-3">
                        {REVIEWS.length === 0 ? (
                          <p className="text-[12px] md:text-sm text-slate-500 dark:text-slate-400">Aucun avis pour le moment.</p>
                        ) : (
                          REVIEWS.map((r) => (
                            <div key={r.id} className="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
                              <div className="mb-1 flex items-center justify-between gap-2">
                                <div className="min-w-0">
                                  <p className="truncate text-[12px] md:text-sm font-bold text-slate-900 dark:text-white">{r.userName}</p>
                                  <p className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                                    {r.verified && <span className="inline-flex items-center gap-0.5 font-semibold text-emerald-700 dark:text-emerald-400"><Icon name="checkCircle" size={11} /> Achat vérifié</span>}
                                    {r.createdAt && <span>{new Date(r.createdAt).toLocaleDateString('fr-FR')}</span>}
                                  </p>
                                </div>
                                <div className="flex shrink-0 text-amber-500">
                                  {Array.from({ length: 5 }).map((_, i) => <Icon key={i} name="star" size={11} strokeWidth={0} className={i < Math.round(r.rating) ? "fill-amber-500" : "fill-slate-200 dark:fill-slate-700"} />)}
                                </div>
                              </div>
                              {r.title && <p className="text-[12px] md:text-sm font-semibold text-slate-900 dark:text-white">{r.title}</p>}
                              <p className="text-[12px] md:text-sm text-slate-600 dark:text-slate-300">{r.comment}</p>
                            </div>
                          ))
                        )}
                        {reviewsError && <RetryNotice message={reviewsError} onRetry={() => { void loadMoreReviews(); }}/>}
                        {REVIEWS.length < reviewCount && <Button variant="outline" disabled={reviewsLoading} onClick={() => { void loadMoreReviews(); }}>{reviewsLoading ? 'Chargement…' : 'Voir plus d’avis'}</Button>}
                        <ReviewForm
                          productId={id}
                          onPosted={() => setAttempt(value => value + 1)}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-2 px-4 py-4 md:mt-4 md:px-0 md:py-0">
                {groupBuyCard}
                {groupsUnavailable ? <RetryNotice message="Disponibilité des achats groupés temporairement indisponible." onRetry={() => setAttempt(value => value + 1)}/> : !p.groupBuy?.active && <GroupNotifyCard productId={p.id}/>}
                <Button variant="ghost" className="mt-3 !h-auto min-h-11 w-full !whitespace-normal" onClick={() => openSourcing({ source: 'text', title: p.name, description: `Comme « ${p.name} », mais : ` })}><Icon name="camera" size={18}/>Rechercher une autre configuration</Button>
              </div>

              {SIMILAR.length > 0 && (
                <div className="mt-2 md:mt-6">
                  <Section title="Produits similaires" className="py-4 bg-white dark:bg-slate-900 md:bg-transparent md:dark:bg-transparent md:py-0">
                    <div className="grid grid-cols-2 gap-3 xl:grid-cols-3">
                      {SIMILAR.slice(0, 4).map((r) => (
                        <ProductCard key={r.id} product={r} size="lg" onClick={() => router.push(`/produits/${r.id}`)} />
                      ))}
                    </div>
                  </Section>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

    </>
  );
}

function ProductShippingEstimate({ productId, qty, variantIds, disabled }: { productId: string; qty: number; variantIds: string[]; disabled: boolean }) {
  const [attempt, setAttempt] = useState(0);
  const [method, setMethod] = useState('air_15j');
  const [quote, setQuote] = useState<CartQuote | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const selectionKey = JSON.stringify([...variantIds].sort());

  useEffect(() => {
    if (!attempt || disabled) { setQuote(null); setPending(false); return; }
    const controller = new AbortController();
    setPending(true);
    setError('');
    setQuote(null);
    fetch('/api/pricing/quote', {
      method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, signal: controller.signal,
      body: JSON.stringify({ cart: [{ id: productId, qty, variantIds: JSON.parse(selectionKey) }], shippingMethod: method, allShipping: true }),
    }).then(async response => {
      const data = await response.json();
      if (!response.ok || !data.success || !Number.isFinite(data.quote?.total) || !Number.isFinite(data.quote?.pricing?.subtotal) || !Number.isFinite(data.quote?.shipping?.cost)) {
        throw new Error(data.error || 'Estimation du transport indisponible.');
      }
      if (!controller.signal.aborted) setQuote(data.quote);
    }).catch(failure => { if (!controller.signal.aborted) setError(failure.message || 'Estimation indisponible.'); })
      .finally(() => { if (!controller.signal.aborted) setPending(false); });
    return () => controller.abort();
  }, [attempt, disabled, method, productId, qty, selectionKey]);

  return (
    <section aria-label="Estimation du transport" className="mt-4 border-t border-slate-200 pt-4 dark:border-slate-800">
      <h2 className="text-sm font-bold">Produit et transport</h2>
      {pending && <p role="status" className="mt-2 text-sm">Calcul du devis…</p>}
      {error && <p role="alert" className="mt-2 text-sm text-red-700 dark:text-red-300">{error}</p>}
      {quote && <div className="mt-3 space-y-3 text-sm">
        {!!quote.shippingOptions?.length && <label className="block font-semibold">Mode de livraison
          <select className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-2 dark:border-slate-700 dark:bg-slate-900" value={quote.shipping?.methodId || method} onChange={event => setMethod(event.target.value)}>
            {quote.shippingOptions.map(option => <option key={option.methodId} value={option.methodId} disabled={option.eligible === false || option.cost === null}>{option.label}{option.cost === null || option.eligible === false ? ' · indisponible' : ''}</option>)}
          </select>
        </label>}
        <dl className="space-y-2 tabular-nums">
          <div className="flex flex-wrap justify-between gap-2"><dt>Articles et frais inclus</dt><dd>{formatFcfa(quote.pricing.subtotal)}</dd></div>
          <div className="flex flex-wrap justify-between gap-2"><dt>Transport · {quote.shipping?.label}</dt><dd>{formatFcfa(quote.shipping!.cost)}</dd></div>
          <div className="flex flex-wrap justify-between gap-2 border-t pt-2 font-bold"><dt>Total estimé du lot</dt><dd>{formatFcfa(quote.total)}</dd></div>
        </dl>
        <p className="text-xs text-slate-600 dark:text-slate-400">Estimation sur les données catalogue, hors autres articles et promotions du panier. Transport ajustable après pesée ; destination et conditions confirmées à la commande.</p>
      </div>}
      {!quote && !pending && <Button className="mt-2 w-full !rounded-lg" variant="outline" disabled={disabled} onClick={() => setAttempt(value => value + 1)}><Icon name="truck" size={16}/>{error ? 'Réessayer l’estimation' : 'Estimer le transport'}</Button>}
    </section>
  );
}
