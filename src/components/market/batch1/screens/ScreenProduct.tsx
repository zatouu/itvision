'use client';

import { useState, useEffect } from 'react';
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
import { TrustStrip } from '../TrustStrip';
import { ProgressBar } from '../ProgressBar';
import { LiveDot } from '../LiveDot';
import { Section } from '../Section';
import ProductImageGallery from '../ProductImageGallery';
import ProductDescription from '../ProductDescription';
import { VariantPicker } from '../VariantPicker';
import { GroupNotifyCard } from '../GroupNotifyCard';
import { useWishlist } from '../useWishlist';
import { addToCart, mapProductDetail } from '../data-mappers';
import type { Product, PriceTier, ProductVariant, ShippingMode } from '../types';


export default function ScreenProduct() {
  const router = useRouter();
  const { isFavorite, toggle: toggleFavorite } = useWishlist();
  const [loading, setLoading] = useState(true);
  const [PRODUCT, setPRODUCT] = useState<Product | null>(null);
  const [SIMILAR, setSIMILAR] = useState<Product[]>([]);
  const [reviewCount, setReviewCount] = useState(0);
  const [verifiedCount, setVerifiedCount] = useState(0);
  const [REVIEWS, setREVIEWS] = useState<Array<{ id: string; userName: string; rating: number; comment: string; createdAt: string }>>([]);

  const params = useParams();
  const id = params?.id as string;
  useEffect(() => {
    if (!id) return;
    if (typeof window === 'undefined') return;
    setLoading(true);
    Promise.all([
      fetch(`/api/catalog/products/${id}`).then(r => r.json()).catch(() => null),
      fetch(`/api/group-orders?productId=${id}&limit=5`).then(r => r.json()).catch(() => null),
      fetch(`/api/reviews?productId=${id}&limit=5`).then(r => r.json()).catch(() => null),
    ])
      .then(([res, grpRes, revRes]) => {
        if (res?.product) {
          const activeGroup = grpRes?.groups?.[0];
          setPRODUCT(mapProductDetail(res.product, activeGroup) as Product | null);
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
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  const [activeImg, setActiveImg] = useState(0);
  const [variant, setVariant] = useState(PRODUCT?.variants?.[0]?.id ?? '');
  const [qty, setQty] = useState(PRODUCT?.minOrderQty ?? 1);
  const [tab, setTab] = useState("desc");
  const [showMoqExplain, setShowMoqExplain] = useState(false);

  useEffect(() => {
    if (PRODUCT) {
      setVariant(PRODUCT.variants?.[0]?.id ?? '');
      setQty(PRODUCT.minOrderQty ?? 1);
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
    return (
      <div className="flex h-screen items-center justify-center text-slate-500 dark:text-slate-400">
        Produit introuvable
      </div>
    );
  }

  const p = PRODUCT;
  const selectedVariant = p.variants.find((v: ProductVariant) => v.id === variant);
  // Prix unitaire de base : celui de la variante si elle en porte un, sinon produit.
  const baseUnit = selectedVariant?.price && selectedVariant.price > 0 ? selectedVariant.price : p.price;
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

  const inc = () => setQty((q: number) => q + 1);
  const dec = () => setQty((q: number) => Math.max(p.minOrderQty, q - 1));

  const buildCartItem = () => ({
    id: p.id,
    name: selectedVariant ? `${p.name} — ${selectedVariant.label}` : p.name,
    variant: selectedVariant?.label,
    variantId: variant || undefined,
    variantIds: variant ? [variant] : undefined,
    variantLabels: selectedVariant ? [selectedVariant.label] : undefined,
    image: selectedVariant?.image || p.images[activeImg] || p.images[0] || '/placeholder.svg',
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
    addToCart(buildCartItem());
  };

  const handleBuyNow = () => {
    addToCart(buildCartItem());
    router.push('/checkout/adresse');
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
          <Badge tone="red"><Icon name="flame" size={11} /> -{galleryDiscount}%</Badge>
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
        <span>Aucun avis pour le moment</span>
      )}
    </div>
  );

  const tiersBlock = effectiveTiers.length > 0 && (
    <div className="mt-4">
      <p className="mb-2 text-[11px] md:text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Prix par palier</p>
      <div className="grid grid-cols-3 gap-2">
        {effectiveTiers.map((t: PriceTier, i) => {
          const active = qty >= t.from && (!t.to || qty <= t.to);
          return (
            <button
              key={i}
              onClick={() => setQty(t.from)}
              className={cn(
                "rounded-xl border p-2.5 text-left transition-all",
                active
                  ? "border-emerald-600 bg-emerald-50 shadow-sm dark:border-emerald-500 dark:bg-emerald-950/40"
                  : "border-slate-200 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700"
              )}
            >
              <p className={cn(
                "text-[10px] font-bold uppercase tracking-wider",
                active ? "text-emerald-700 dark:text-emerald-400" : "text-slate-500 dark:text-slate-400"
              )}>
                {t.to ? `${t.from}–${t.to} pcs` : `${t.from}+ pcs`}
              </p>
              <p className="mt-0.5 text-[15px] font-extrabold tracking-tight text-slate-900 dark:text-white tabular-nums">
                {formatFcfa(t.unit)}
              </p>
              {t.save > 0 && (
                <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">-{t.save}%</p>
              )}
            </button>
          );
        })}
      </div>
      {nextTier && distanceToNext > 0 && (
        <p className="mt-2 flex items-center gap-1.5 rounded-lg bg-emerald-50 px-2.5 py-2 text-[11px] md:text-xs font-semibold text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
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
            <p className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400">Prix groupe</p>
            <p className="text-[15px] font-extrabold text-violet-700 dark:text-violet-300 tabular-nums">{formatFcfa(p.groupBuy?.unitPrice)}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400">Économie</p>
            <p className="text-[15px] font-extrabold text-emerald-600 dark:text-emerald-400">-{p.groupBuy?.savePct}%</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400">Deadline</p>
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
      <div className="min-h-full bg-slate-50 pb-28 dark:bg-slate-950 md:pb-0">
        <div className="mx-auto max-w-6xl md:px-6 md:py-6">
          {/* Fil d'ariane — desktop uniquement */}
          <div className="mb-4 hidden items-center gap-1.5 text-[12px] text-slate-500 dark:text-slate-400 md:flex">
            <Link href="/market" className="hover:text-slate-700 dark:hover:text-slate-300">Accueil</Link><Icon name="chevronRight" size={12}/>
            <Link href="/produits" className="hover:text-slate-700 dark:hover:text-slate-300">Catalogue</Link><Icon name="chevronRight" size={12}/>
            <Link href={`/produits?category=${encodeURIComponent(p.category || '')}`} className="hover:text-slate-700 dark:hover:text-slate-300">{p.category || p.cat || 'Catégorie'}</Link><Icon name="chevronRight" size={12}/>
            <span className="text-slate-700 dark:text-slate-300 line-clamp-1 max-w-[220px]">{p.name}</span>
          </div>

          <div className="md:grid md:grid-cols-[1fr_400px] md:gap-8">
            {/* Galerie : pleine largeur mobile, colonne gauche desktop */}
            <div className="min-w-0">
              <Card className="overflow-hidden rounded-none md:rounded-2xl">
                <ProductImageGallery
                  images={p.images}
                  name={p.name}
                  activeIndex={activeImg}
                  onActiveChange={setActiveImg}
                  badges={galleryBadges}
                />
              </Card>
            </div>

            {/* Panneau d'achat : sous la galerie sur mobile, colonne droite sticky sur desktop */}
            <aside className="md:col-start-2 md:row-start-1 md:row-span-3">
              <div className="space-y-0 md:sticky md:top-[calc(var(--mkt-header-h,0px)+12px)] md:space-y-4">
                <Card className="rounded-none border-x-0 p-4 md:rounded-2xl md:border-x md:p-5">
                  <p className="text-[11px] md:text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">{p.brand}</p>
                  <h1 className="mt-1 text-[19px] md:text-xl font-extrabold leading-snug tracking-tight text-slate-900 dark:text-white break-words">{p.name}</h1>
                  {ratingLine}

                  <div className="mt-3 md:mt-4 flex items-baseline gap-2">
                    <span className="text-[28px] md:text-3xl font-extrabold tracking-tight text-emerald-600 dark:text-emerald-400 tabular-nums">{formatFcfa(currentUnit)}</span>
                    {currentUnit < baseUnit && (
                      <>
                        <span className="text-[13px] md:text-sm font-semibold text-slate-400 line-through tabular-nums">{formatFcfa(baseUnit)}</span>
                        <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">-{Math.round((1 - currentUnit / baseUnit) * 100)}%</span>
                      </>
                    )}
                  </div>
                  <p className="mt-1 text-[12px] md:text-xs text-slate-500 dark:text-slate-400">
                    Prix unitaire{selectedVariant ? ` · ${selectedVariant.label}` : ''}
                    {p.includedFees ? ` · ${p.includedFees} inclus` : ''}
                  </p>
                  <p className="mt-0.5 text-[11px] font-semibold text-slate-400 dark:text-slate-500">
                    Transport calculé au panier selon le mode de livraison
                  </p>

                  {p.minOrderQty > 1 && (
                    <>
                      <button onClick={()=>setShowMoqExplain(s=>!s)} className="mt-3 flex w-full items-center justify-between gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-left dark:border-amber-900 dark:bg-amber-950/40">
                        <div className="flex items-start gap-2">
                          <Icon name="package" size={16} className="mt-0.5 text-amber-700 dark:text-amber-300"/>
                          <div>
                            <p className="text-[12px] font-bold text-amber-900 dark:text-amber-200">Lot minimum {p.minOrderQty} unités</p>
                            <p className="text-[11px] text-amber-800 dark:text-amber-300/80">Pourquoi ? Faibles frais de service = prix usine</p>
                          </div>
                        </div>
                        <Icon name={showMoqExplain?"chevronDown":"chevronRight"} size={14} className="text-amber-700 dark:text-amber-300"/>
                      </button>
                      {showMoqExplain && (
                        <div className="mt-2 rounded-xl bg-slate-50 p-3 text-[12px] text-slate-600 dark:bg-slate-800 dark:text-slate-300 leading-relaxed">
                          Un lot minimum permet à notre équipe de sourcing en Chine de négocier directement avec l’usine. Sans ce minimum, les frais fixes de transport et d’inspection rendraient l’import plus cher qu’un achat local.
                        </div>
                      )}
                    </>
                  )}

                  {tiersBlock}

                  {p.variants.length > 0 && (
                    <div className="mt-4">
                      <p className="mb-2 text-[13px] md:text-xs font-bold md:uppercase md:tracking-wider text-slate-900 dark:text-white md:text-slate-500 md:dark:text-slate-400">Configuration</p>
                      <VariantPicker variants={p.variants} value={variant} onChange={setVariant} productPrice={p.price} size="md" />
                    </div>
                  )}

                  <div className="mt-4">
                    <p className="mb-2 text-[13px] md:text-xs font-bold text-slate-900 dark:text-white">Quantité</p>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1 dark:border-slate-800 dark:bg-slate-900">
                        <button onClick={dec} disabled={qty<=p.minOrderQty} className="grid h-9 w-9 md:h-10 md:w-10 place-items-center rounded-lg text-slate-700 hover:bg-slate-100 disabled:opacity-30 dark:text-slate-300 dark:hover:bg-slate-800"><Icon name="minus" size={16}/></button>
                        <input value={qty} readOnly className="w-12 md:w-14 bg-transparent text-center text-[15px] md:text-base font-extrabold text-slate-900 dark:text-white tabular-nums"/>
                        <button onClick={inc} className="grid h-9 w-9 md:h-10 md:w-10 place-items-center rounded-lg text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"><Icon name="plus" size={16}/></button>
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

                  {/* CTA complets — desktop ; le mobile a la barre fixe en bas */}
                  <div className="mt-4 hidden space-y-2 md:block">
                    <Button variant="primary" size="lg" className="w-full" onClick={handleAddToCart}><Icon name="cart" size={16}/>Ajouter au panier</Button>
                    <Button variant="outline" size="lg" className="w-full" onClick={handleBuyNow}>Acheter maintenant</Button>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="md"
                        className={cn('flex-1', isFavorite(p.id) && '!text-red-600 dark:!text-red-400')}
                        onClick={() => toggleFavorite(p.id)}
                      >
                        <Icon name="heart" size={16} className={isFavorite(p.id) ? 'fill-current' : undefined} />
                        {isFavorite(p.id) ? 'En favoris' : 'Ajouter aux favoris'}
                      </Button>
                      <Button variant="ghost" size="md" className="flex-1" onClick={() => window.open(brandWhatsAppUrl(undefined, `Bonjour, j'ai une question sur ${p.name} (ref: ${p.id})`), '_blank')}><Icon name="whatsapp" size={16}/>Question</Button>
                    </div>
                  </div>
                </Card>

                {groupBuyCard}
                {!p.groupBuy?.active && <GroupNotifyCard productId={p.id}/>}
              </div>
            </aside>

            {/* Onglets + confiance + similaires : colonne gauche desktop, sous le panneau mobile */}
            <div className="min-w-0 md:col-start-1">
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
                      <p className="text-[12px] md:text-xs text-slate-500 dark:text-slate-400">Depuis {p.shipping.origin} · inspection avant expédition incluse</p>
                      <div className="grid gap-2 md:grid-cols-3 md:gap-3">
                        {p.shipping.modes.map((m: ShippingMode) => (
                          <div key={m.key} className="flex items-center justify-between rounded-lg md:rounded-xl border border-slate-200 px-3 py-2 md:p-3 dark:border-slate-800">
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
                  {tab === "rev" && (
                    <div className="md:grid md:grid-cols-[240px_1fr] md:gap-6">
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
                              <div className="mb-1 flex items-center justify-between">
                                <p className="text-[12px] md:text-sm font-bold text-slate-900 dark:text-white">{r.userName}</p>
                                <div className="flex text-amber-500">
                                  {Array.from({ length: 5 }).map((_, i) => <Icon key={i} name="star" size={11} strokeWidth={0} className={i < Math.round(r.rating) ? "fill-amber-500" : "fill-slate-200 dark:fill-slate-700"} />)}
                                </div>
                              </div>
                              <p className="text-[12px] md:text-sm text-slate-600 dark:text-slate-300">{r.comment}</p>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-2 px-4 py-4 md:mt-4 md:px-0 md:py-0">
                <TrustStrip compact />
              </div>

              {SIMILAR.length > 0 && (
                <div className="mt-2 md:mt-6">
                  <Section title="Souvent achetés ensemble" className="py-4 bg-white dark:bg-slate-900 md:bg-transparent md:dark:bg-transparent md:py-0">
                    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
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

      {/* Barre d'action fixe — mobile uniquement */}
      <div className="fixed bottom-16 left-0 right-0 z-30 border-t border-slate-200 bg-white p-2.5 dark:border-slate-800 dark:bg-slate-950 md:hidden">
        <div className="mb-1.5 flex items-center justify-between text-[10px] whitespace-nowrap">
          <span className="text-slate-500 dark:text-slate-400">Total <b className="text-slate-900 dark:text-white tabular-nums">{formatFcfa(currentUnit * qty)}</b> · {qty} pcs · hors transport</span>
          {savingsVsBase > 0 && <span className="font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">Éco. {formatFcfa(savingsVsBase)}</span>}
        </div>
        {/* « Ajouter » est l'action principale, « Acheter » le raccourci ; les
            actions secondaires restent en icône. */}
        <div className="flex gap-1.5">
          <button onClick={() => window.open(brandWhatsAppUrl(undefined, `Bonjour, j'ai une question sur ${p.name} (ref: ${p.id})`), '_blank')} className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-xl border border-slate-200 text-emerald-700 dark:border-slate-700 dark:text-emerald-400" aria-label="Poser une question sur WhatsApp">
            <Icon name="whatsapp" size={16} />
          </button>
          <button
            onClick={() => toggleFavorite(p.id)}
            aria-label={isFavorite(p.id) ? 'Retirer des favoris' : 'Ajouter aux favoris'}
            aria-pressed={isFavorite(p.id)}
            className={cn(
              'grid h-10 w-10 flex-shrink-0 place-items-center rounded-xl border transition-colors',
              isFavorite(p.id)
                ? 'border-red-500 bg-red-500 text-white'
                : 'border-slate-200 text-slate-600 dark:border-slate-700 dark:text-slate-300'
            )}
          >
            <Icon name="heart" size={16} className={isFavorite(p.id) ? 'fill-current' : undefined} />
          </button>
          <Button variant="primary" size="sm" className="flex-1 whitespace-nowrap" onClick={handleAddToCart}><Icon name="cart" size={14}/>Ajouter</Button>
          <Button variant="outline" size="sm" className="flex-shrink-0 !text-[12px] whitespace-nowrap" onClick={handleBuyNow}>Acheter</Button>
        </div>
      </div>
    </>
  );
}
