'use client';

import { useState, useEffect, Fragment } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { formatFcfa } from '../formatFcfa';
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
import { addToCart, mapProductDetail } from '../data-mappers';
import type { Product, PriceTier, ProductVariant, ShippingMode } from '../types';


export default function ScreenProduct() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [PRODUCT, setPRODUCT] = useState<Product | null>(null);
  const [SIMILAR, setSIMILAR] = useState<Product[]>([]);
  const [reviewCount, setReviewCount] = useState(0);
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
              rating: s.sellerRating || s.rating || 4.5,
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
  const tier =
    p.priceTiers.slice().reverse().find((t: PriceTier) => qty >= t.from) ||
    p.priceTiers[0] || { unit: p.price, from: 1, to: null, save: 0 };
  const currentUnit = tier?.unit ?? p.price;
  const nextTier = p.priceTiers.find((t: PriceTier) => qty < t.from) || null;
  const savingsVsBase = (p.basePrice - currentUnit) * qty;
  const distanceToNext = nextTier ? nextTier.from - qty : 0;

  const inc = () => setQty((q: number) => q + 1);
  const dec = () => setQty((q: number) => Math.max(p.minOrderQty, q - 1));

  const selectedVariant = p.variants.find((v: ProductVariant) => v.id === variant);

  const buildCartItem = () => ({
    id: p.id,
    name: selectedVariant ? `${p.name} — ${selectedVariant.label}` : p.name,
    variant: selectedVariant?.label,
    variantId: variant,
    image: p.images[activeImg] || p.images[0] || '/placeholder.svg',
    unit: p.basePrice,
    qty,
    minOrderQty: p.minOrderQty,
    priceTiers: p.priceTiers,
    tierUnit: currentUnit,
    nextTier: nextTier ? { at: nextTier.from, save: nextTier.save } : null,
    hasActiveGroup: !!p.groupBuy?.active,
    groupUnit: p.groupBuy?.unitPrice,
  });

  const handleAddToCart = () => {
    addToCart(buildCartItem());
  };

  const handleBuyNow = () => {
    addToCart(buildCartItem());
    router.push('/checkout/adresse');
  };


  return (
    <>
      <div className="md:hidden">
        <div className="flex h-full flex-col bg-slate-50 dark:bg-slate-950">

        <div className="flex-1 overflow-y-auto pb-32">
          {/* Gallery */}
          <ProductImageGallery
            images={p.images}
            name={p.name}
            activeIndex={activeImg}
            onActiveChange={setActiveImg}
            badges={
              <>
                <div className="absolute left-3 top-3 flex flex-col gap-1.5">
                  <Badge tone="emerald"><Icon name="checkCircle" size={11} /> Fournisseur vérifié</Badge>
                  <Badge tone="amber"><Icon name="package" size={11} /> Lot min. {p.minOrderQty}</Badge>
                </div>
                <div className="absolute right-3 top-3">
                  <Badge tone="red"><Icon name="flame" size={11} /> -{Math.round((1 - p.price / p.basePrice) * 100)}%</Badge>
                </div>
              </>
            }
          />

          {/* Title + rating */}
          <div className="bg-white px-4 py-4 dark:bg-slate-900">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">{p.brand}</p>
            <h1 className="mt-1 text-[19px] font-extrabold leading-snug tracking-tight text-slate-900 dark:text-white break-words">
              {p.name}
            </h1>
            <div className="mt-2 flex items-center gap-2 text-[12px] text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-0.5 text-amber-500">
                {Array.from({ length: 5 }).map((_, i) => <Icon key={i} name="star" size={13} strokeWidth={0} className={i < Math.round(p.rating) ? "fill-amber-500" : "fill-slate-200 dark:fill-slate-700"} />)}
              </span>
              <span className="font-semibold text-slate-900 dark:text-white">{p.rating}</span>
              <span>·</span>
              <span>{reviewCount} avis</span>
            </div>
          </div>

          {/* Price block */}
          <div className="mt-2 bg-white px-4 py-4 dark:bg-slate-900">
            <div className="flex items-baseline gap-2">
              <span className="text-[28px] font-extrabold tracking-tight text-emerald-600 dark:text-emerald-400 tabular-nums">
                {formatFcfa(currentUnit)}
              </span>
              <span className="text-[13px] font-semibold text-slate-400 line-through tabular-nums">
                {formatFcfa(p.basePrice)}
              </span>
              <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                -{Math.round((1 - currentUnit / p.basePrice) * 100)}%
              </span>
            </div>
            <p className="mt-1 text-[12px] text-slate-500 dark:text-slate-400">Prix unitaire · faibles frais de service inclus</p>

            <button
              onClick={() => setShowMoqExplain((s) => !s)}
              className="mt-3 flex w-full items-center justify-between gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-left dark:border-amber-900 dark:bg-amber-950/40"
            >
              <div className="flex items-start gap-2">
                <Icon name="package" size={16} className="mt-0.5 text-amber-700 dark:text-amber-300" />
                <div>
                  <p className="text-[12px] font-bold text-amber-900 dark:text-amber-200">Lot minimum {p.minOrderQty} unités</p>
                  <p className="text-[11px] text-amber-800 dark:text-amber-300/80">Pourquoi ? Faibles frais de service = prix usine</p>
                </div>
              </div>
              <Icon name={showMoqExplain ? "chevronDown" : "chevronRight"} size={14} className="text-amber-700 dark:text-amber-300" />
            </button>
            {showMoqExplain && (
              <div className="mt-2 rounded-xl bg-slate-50 p-3 text-[12px] text-slate-600 dark:bg-slate-800 dark:text-slate-300 leading-relaxed">
                Un lot minimum permet à notre équipe de sourcing en Chine de négocier directement avec l’usine. Sans ce minimum, les frais fixes de transport et d’inspection rendraient l’import plus cher qu’un achat local.
              </div>
            )}

            {/* Price tiers */}
            <div className="mt-4">
              <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Prix par palier</p>
              <div className="grid grid-cols-3 gap-2">
                {p.priceTiers.map((t: PriceTier, i) => {
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
                <p className="mt-2 flex items-center gap-1.5 rounded-lg bg-emerald-50 px-2.5 py-2 text-[11px] font-semibold text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
                  <Icon name="sparkles" size={13} />
                  Ajoutez <b className="tabular-nums mx-0.5">{distanceToNext}</b> unités pour débloquer −{nextTier.save}%
                </p>
              )}
            </div>
          </div>

          {/* Group buy card */}
          {p.groupBuy?.active && (
            <div className="mt-2 bg-white px-4 py-4 dark:bg-slate-900">
              <div className="rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-50 via-white to-emerald-50 p-4 dark:border-violet-900 dark:from-violet-950/40 dark:via-slate-900 dark:to-emerald-950/40">
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="grid h-8 w-8 place-items-center rounded-lg bg-violet-600 text-white">
                      <Icon name="users" size={16} />
                    </span>
                    <div>
                      <p className="text-[13px] font-extrabold text-slate-900 dark:text-white leading-tight">Achat groupé actif</p>
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
                    {Math.round((p.groupBuy?.currentQty / p.groupBuy?.targetQty) * 100)}%
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
            </div>
          )}

          {/* Variant */}
          <div className="mt-2 bg-white px-4 py-4 dark:bg-slate-900">
            <p className="mb-2 text-[13px] font-bold text-slate-900 dark:text-white">Configuration</p>
            <div className="flex flex-wrap gap-2">
              {p.variants.map((v: ProductVariant) => (
                <button
                  key={v.id}
                  onClick={() => setVariant(v.id)}
                  className={cn(
                    "rounded-xl border px-3 py-2 text-[12px] font-semibold",
                    variant === v.id
                      ? "border-emerald-600 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                      : "border-slate-200 text-slate-700 dark:border-slate-800 dark:text-slate-300"
                  )}
                >
                  {v.label}
                  <span className="ml-1 text-[10px] font-normal text-slate-500 dark:text-slate-400">· {v.stock} en stock</span>
                </button>
              ))}
            </div>

            <p className="mb-2 mt-4 text-[13px] font-bold text-slate-900 dark:text-white">Quantité</p>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1 dark:border-slate-800 dark:bg-slate-900">
                <button onClick={dec} disabled={qty <= p.minOrderQty} className="grid h-9 w-9 place-items-center rounded-lg text-slate-700 hover:bg-slate-100 disabled:opacity-30 dark:text-slate-300 dark:hover:bg-slate-800">
                  <Icon name="minus" size={16} />
                </button>
                <input value={qty} readOnly className="w-12 bg-transparent text-center text-[15px] font-extrabold text-slate-900 dark:text-white tabular-nums" />
                <button onClick={inc} className="grid h-9 w-9 place-items-center rounded-lg text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800">
                  <Icon name="plus" size={16} />
                </button>
              </div>
              <div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Total ({qty} pcs)</p>
                <p className="text-[17px] font-extrabold tracking-tight text-slate-900 dark:text-white tabular-nums">{formatFcfa(currentUnit * qty)}</p>
              </div>
            </div>
            {savingsVsBase > 0 && (
              <p className="mt-2 flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
                <Icon name="sparkles" size={13} />
                Vous économisez <b className="tabular-nums">{formatFcfa(savingsVsBase)}</b> vs prix de base
              </p>
            )}
          </div>

          {/* Tabs */}
          <div className="mt-2 bg-white dark:bg-slate-900">
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
                    "border-b-2 px-2 py-3 text-[13px] font-semibold",
                    tab === k
                      ? "border-emerald-600 text-emerald-700 dark:text-emerald-400"
                      : "border-transparent text-slate-500 dark:text-slate-400"
                  )}
                >
                  {l}
                </button>
              ))}
            </div>
            <div className="px-4 py-4">
              {tab === "desc" && (
                <div className="space-y-3 text-[13px] text-slate-700 dark:text-slate-300 leading-relaxed">
                  <p>{p.description || 'Produit importé directement depuis la Chine. Inspection qualité incluse avant expédition.'}</p>
                  <dl className="grid grid-cols-2 gap-x-4 gap-y-2 rounded-xl bg-slate-50 p-3 dark:bg-slate-800">
                    {p.specs.map(([k, v]: [string, string]) => (
                      <Fragment key={k}>
                        <dt className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">{k}</dt>
                        <dd className="text-[12px] font-semibold text-slate-900 dark:text-white text-right">{v}</dd>
                      </Fragment>
                    ))}
                  </dl>
                </div>
              )}
              {tab === "ship" && (
                <div className="space-y-2 text-[13px] text-slate-700 dark:text-slate-300">
                  <p className="text-[12px] text-slate-500 dark:text-slate-400">Depuis {p.shipping.origin}</p>
                  {p.shipping.modes.map((m: ShippingMode) => (
                    <div key={m.key} className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-800">
                      <div>
                        <p className="text-[12px] font-bold text-slate-900 dark:text-white">{m.label}</p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">{m.days}</p>
                      </div>
                      <p className="text-[12px] font-bold text-slate-900 dark:text-white tabular-nums">dès {formatFcfa(m.from)}/pc</p>
                    </div>
                  ))}
                </div>
              )}
              {tab === "rev" && (
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="text-3xl font-extrabold text-slate-900 dark:text-white tabular-nums">{p.rating}</div>
                    <div>
                      <div className="flex text-amber-500">
                        {Array.from({ length: 5 }).map((_, i) => <Icon key={i} name="star" size={14} strokeWidth={0} className={i < Math.round(p.rating) ? "fill-amber-500" : "fill-slate-200 dark:fill-slate-700"} />)}
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">{reviewCount} avis vérifiés</p>
                    </div>
                  </div>
                  {REVIEWS.length === 0 ? (
                    <p className="text-[12px] text-slate-500 dark:text-slate-400">Aucun avis pour le moment.</p>
                  ) : (
                    REVIEWS.map((r) => (
                      <div key={r.id} className="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
                        <div className="mb-1 flex items-center justify-between">
                          <p className="text-[12px] font-bold text-slate-900 dark:text-white">{r.userName}</p>
                          <div className="flex text-amber-500">
                            {Array.from({ length: 5 }).map((_, i) => <Icon key={i} name="star" size={11} strokeWidth={0} className={i < Math.round(r.rating) ? "fill-amber-500" : "fill-slate-200 dark:fill-slate-700"} />)}
                          </div>
                        </div>
                        <p className="text-[12px] text-slate-600 dark:text-slate-300">{r.comment}</p>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Trust */}
          <div className="mt-2 px-4 py-4">
            <TrustStrip compact />
          </div>

          {/* Related */}
          {SIMILAR.length > 0 && (
            <Section title="Souvent achetés ensemble" className="mt-2 py-4 bg-white dark:bg-slate-900">
              <div className="grid grid-cols-2 gap-3">
                {SIMILAR.slice(0, 4).map((r) => (
                  <ProductCard key={r.id} product={r} onClick={() => router.push(`/produits/${r.id}`)} />
                ))}
              </div>
            </Section>
          )}
        </div>

        {/* Sticky bottom bar */}
        <div className="absolute bottom-14 left-0 right-0 z-20 border-t border-slate-200 bg-white p-2.5 dark:border-slate-800 dark:bg-slate-950">
          <div className="mb-1.5 flex items-center justify-between text-[10px] whitespace-nowrap">
            <span className="text-slate-500 dark:text-slate-400">Total <b className="text-slate-900 dark:text-white tabular-nums">{formatFcfa(currentUnit * qty)}</b> · {qty} pcs</span>
            {savingsVsBase > 0 && <span className="font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">Éco. {formatFcfa(savingsVsBase)}</span>}
          </div>
          <div className="flex gap-1.5">
            <button onClick={() => window.open(`https://wa.me/221761234567?text=Bonjour, j'ai une question sur ${encodeURIComponent(p.name)} (ref: ${p.id})`, '_blank')} className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-xl border border-slate-200 text-emerald-700 dark:border-slate-700 dark:text-emerald-400">
              <Icon name="whatsapp" size={16} />
            </button>
            <Button variant="outline" size="sm" className="flex-1 !text-[12px] whitespace-nowrap" onClick={handleAddToCart}><Icon name="cart" size={14}/>Ajouter</Button>
            <Button variant="primary" size="sm" className="flex-1 whitespace-nowrap" onClick={handleBuyNow}>Acheter</Button>
          </div>
        </div>

      </div>
      </div>
      <div className="hidden md:block">
        <div className="min-h-full bg-slate-50 dark:bg-slate-950">

      <div className="mx-auto max-w-6xl px-6 py-6">
        <div className="mb-4 flex items-center gap-1.5 text-[12px] text-slate-500 dark:text-slate-400">
          <Link href="/" className="hover:text-slate-700 dark:hover:text-slate-300">Accueil</Link><Icon name="chevronRight" size={12}/>
          <Link href="/produits" className="hover:text-slate-700 dark:hover:text-slate-300">Catalogue</Link><Icon name="chevronRight" size={12}/>
          <Link href={`/produits?category=${encodeURIComponent(p.category || '')}`} className="hover:text-slate-700 dark:hover:text-slate-300">{p.category || p.cat || 'Catégorie'}</Link><Icon name="chevronRight" size={12}/>
          <span className="text-slate-700 dark:text-slate-300 line-clamp-1 max-w-[220px]">{p.name}</span>
        </div>

        <div className="grid grid-cols-[1fr_400px] gap-8">
          {/* Left : gallery + tabs */}
          <div>
            <Card className="overflow-hidden">
              <ProductImageGallery
                images={p.images}
                name={p.name}
                activeIndex={activeImg}
                onActiveChange={setActiveImg}
                badges={
                  <>
                    <div className="absolute left-4 top-4 flex flex-col gap-2">
                      <Badge tone="emerald"><Icon name="checkCircle" size={11}/> Fournisseur vérifié</Badge>
                      <Badge tone="amber"><Icon name="package" size={11}/> Lot min. {p.minOrderQty}</Badge>
                    </div>
                    <div className="absolute right-4 top-4"><Badge tone="red"><Icon name="flame" size={11}/> -{Math.round((1 - p.price / p.basePrice) * 100)}%</Badge></div>
                  </>
                }
              />
            </Card>

            <Card className="mt-4 overflow-hidden">
              <div className="flex gap-1 border-b border-slate-200 px-4 dark:border-slate-800">
                {[["desc","Description"],["ship","Expédition & délais"],["rev",`Avis (${reviewCount})`]].map(([k,l])=>(
                  <button key={k} onClick={()=>setTab(k)} className={cn("border-b-2 px-3 py-3 text-sm font-semibold", tab===k?"border-emerald-600 text-emerald-700 dark:text-emerald-400":"border-transparent text-slate-500 dark:text-slate-400")}>{l}</button>
                ))}
              </div>
              <div className="p-6">
                {tab==="desc" && (
                  <div className="grid grid-cols-2 gap-6 text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                    <div className="space-y-3">
                      <p>{p.description || 'Produit importé directement depuis la Chine. Inspection qualité incluse avant expédition.'}</p>
                    </div>
                    <dl className="grid grid-cols-2 gap-x-4 gap-y-2 rounded-xl bg-slate-50 p-4 dark:bg-slate-800">
                      {p.specs.map(([k, v]: [string, string])=>(
                        <Fragment key={k}>
                          <dt className="text-xs font-semibold text-slate-500 dark:text-slate-400">{k}</dt>
                          <dd className="text-sm font-semibold text-slate-900 dark:text-white text-right">{v}</dd>
                        </Fragment>
                      ))}
                    </dl>
                  </div>
                )}
                {tab==="ship" && (
                  <div className="space-y-3">
                    <p className="text-xs text-slate-500 dark:text-slate-400">Depuis {p.shipping.origin} · inspection avant expédition incluse</p>
                    <div className="grid grid-cols-3 gap-3">
                      {p.shipping.modes.map((m: ShippingMode)=>(
                        <div key={m.key} className="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
                          <div className="mb-2 flex h-9 w-9 place-items-center rounded-lg bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                            <Icon name={m.key==="maritime"?"ship":m.key==="express"?"plane":"truck"} size={16}/>
                          </div>
                          <p className="text-sm font-bold text-slate-900 dark:text-white">{m.label}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">{m.days}</p>
                          <p className="mt-2 text-sm font-bold text-slate-900 dark:text-white tabular-nums">dès {formatFcfa(m.from)}/pc</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {tab==="rev" && (
                  <div className="grid grid-cols-[240px_1fr] gap-6">
                    <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
                      <div className="text-4xl font-extrabold tabular-nums text-slate-900 dark:text-white">{p.rating}<span className="text-lg text-slate-400">/5</span></div>
                      <div className="mt-1 flex text-amber-500">
                        {Array.from({length:5}).map((_,i)=><Icon key={i} name="star" size={14} strokeWidth={0} className={i < Math.round(p.rating) ? "fill-amber-500" : "fill-slate-200 dark:fill-slate-700"}/>)}
                      </div>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{reviewCount} avis vérifiés</p>
                    </div>
                    <div className="space-y-3">
                      {REVIEWS.length === 0 ? (
                        <p className="text-sm text-slate-500 dark:text-slate-400">Aucun avis pour le moment.</p>
                      ) : (
                        REVIEWS.map((r)=> (
                          <div key={r.id} className="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
                            <div className="mb-1 flex justify-between"><p className="text-sm font-bold text-slate-900 dark:text-white">{r.userName}</p><div className="flex text-amber-500">{Array.from({length:5}).map((_,i)=><Icon key={i} name="star" size={11} strokeWidth={0} className={i < Math.round(r.rating) ? "fill-amber-500" : "fill-slate-200 dark:fill-slate-700"}/>)}</div></div>
                            <p className="text-sm text-slate-600 dark:text-slate-300">{r.comment}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            </Card>

            <div className="mt-4">
              <TrustStrip/>
            </div>

            {SIMILAR.length > 0 && (
              <div className="mt-6">
                <h3 className="mb-3 text-lg font-extrabold tracking-tight text-slate-900 dark:text-white">Souvent achetés ensemble</h3>
                <div className="grid grid-cols-4 gap-3">
                  {SIMILAR.slice(0, 4).map((r)=> (
                    <ProductCard key={r.id} product={r} size="lg" onClick={() => router.push(`/produits/${r.id}`)} />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right : sticky pricing */}
          <div>
            <div className="sticky top-20 space-y-4">
              <Card className="p-5">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">{p.brand}</p>
                <h1 className="mt-1 text-xl font-extrabold leading-snug tracking-tight text-slate-900 dark:text-white break-words">{p.name}</h1>
                <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                  <span className="flex text-amber-500">{Array.from({length:5}).map((_,i)=><Icon key={i} name="star" size={12} strokeWidth={0} className={i < Math.round(p.rating) ? "fill-amber-500" : "fill-slate-200 dark:fill-slate-700"}/>)}</span>
                  <span className="font-semibold text-slate-900 dark:text-white">{p.rating}</span> · <span>{reviewCount} avis</span>
                </div>

                <div className="mt-4 flex items-baseline gap-2">
                  <span className="text-3xl font-extrabold tracking-tight text-emerald-600 dark:text-emerald-400 tabular-nums">{formatFcfa(currentUnit)}</span>
                  <span className="text-sm font-semibold text-slate-400 line-through tabular-nums">{formatFcfa(p.basePrice)}</span>
                </div>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Prix unitaire · faibles frais de service inclus</p>

                <button onClick={()=>setShowMoqExplain(s=>!s)} className="mt-3 flex w-full items-center justify-between gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-left dark:border-amber-900 dark:bg-amber-950/40">
                  <div className="flex items-center gap-2">
                    <Icon name="package" size={16} className="text-amber-700 dark:text-amber-300"/>
                    <div>
                      <p className="text-xs font-bold text-amber-900 dark:text-amber-200">Lot minimum {p.minOrderQty} unités</p>
                      <p className="text-[11px] text-amber-800 dark:text-amber-300/80">Pourquoi ce minimum ?</p>
                    </div>
                  </div>
                  <Icon name={showMoqExplain?"chevronDown":"chevronRight"} size={14} className="text-amber-700 dark:text-amber-300"/>
                </button>
                {showMoqExplain && (
                  <div className="mt-2 rounded-xl bg-slate-50 p-3 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300 leading-relaxed">
                    Un lot minimum permet de négocier directement avec l’usine sans intermédiaire. Sans ce minimum, les frais fixes de transport et d’inspection rendraient l’import plus cher qu’un achat local.
                  </div>
                )}

                <div className="mt-4">
                  <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Prix par palier</p>
                  <div className="space-y-2">
                    {p.priceTiers.map((t: PriceTier, i)=>{
                      const active = qty >= t.from && (!t.to || qty <= t.to);
                      return (
                        <button key={i} onClick={()=>setQty(t.from)} className={cn("flex w-full items-center justify-between rounded-xl border p-3 text-left transition-all", active?"border-emerald-600 bg-emerald-50 dark:border-emerald-500 dark:bg-emerald-950/40":"border-slate-200 hover:border-slate-300 dark:border-slate-800 dark:hover:border-slate-700")}>
                          <div>
                            <p className={cn("text-xs font-bold", active?"text-emerald-700 dark:text-emerald-400":"text-slate-700 dark:text-slate-300")}>{t.to?`${t.from} à ${t.to} unités`:`${t.from}+ unités`}</p>
                            {t.save>0 && <p className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">Économisez {t.save}%</p>}
                          </div>
                          <p className="text-base font-extrabold tabular-nums text-slate-900 dark:text-white">{formatFcfa(t.unit)}</p>
                        </button>
                      );
                    })}
                  </div>
                  {nextTier && distanceToNext > 0 && (
                    <p className="mt-2 flex items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
                      <Icon name="sparkles" size={13}/>
                      Ajoutez <b className="tabular-nums mx-0.5">{distanceToNext}</b> unités pour débloquer −{nextTier.save}%
                    </p>
                  )}
                </div>

                <div className="mt-4">
                  <p className="mb-2 text-xs font-bold text-slate-900 dark:text-white">Quantité</p>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1 dark:border-slate-800 dark:bg-slate-900">
                      <button onClick={dec} disabled={qty<=p.minOrderQty} className="grid h-10 w-10 place-items-center rounded-lg text-slate-700 hover:bg-slate-100 disabled:opacity-30 dark:text-slate-300 dark:hover:bg-slate-800"><Icon name="minus" size={16}/></button>
                      <input value={qty} readOnly className="w-14 bg-transparent text-center text-base font-extrabold text-slate-900 dark:text-white tabular-nums"/>
                      <button onClick={inc} className="grid h-10 w-10 place-items-center rounded-lg text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"><Icon name="plus" size={16}/></button>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Total ({qty} pcs)</p>
                      <p className="text-lg font-extrabold text-slate-900 dark:text-white tabular-nums">{formatFcfa(currentUnit * qty)}</p>
                    </div>
                  </div>
                </div>

                <div className="mt-4 space-y-2">
                  <Button variant="primary" size="lg" className="w-full" onClick={handleAddToCart}><Icon name="cart" size={16}/>Ajouter au panier</Button>
                  <Button variant="outline" size="lg" className="w-full" onClick={handleBuyNow}>Acheter maintenant</Button>
                  <Button variant="ghost" size="md" className="w-full" onClick={() => window.open(`https://wa.me/221761234567?text=Bonjour, j'ai une question sur ${encodeURIComponent(p.name)} (ref: ${p.id})`, '_blank')}><Icon name="whatsapp" size={16}/>Poser une question par WhatsApp</Button>
                </div>
              </Card>

              {p.groupBuy?.active && (
                <Card className="overflow-hidden border-violet-200 dark:border-violet-900">
                  <div className="bg-gradient-to-br from-violet-50 via-white to-emerald-50 p-4 dark:from-violet-950/40 dark:via-slate-900 dark:to-emerald-950/40">
                    <div className="mb-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="grid h-8 w-8 place-items-center rounded-lg bg-violet-600 text-white"><Icon name="users" size={14}/></span>
                        <div>
                          <p className="text-sm font-extrabold text-slate-900 dark:text-white leading-tight">Achat groupé actif</p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">
                            {p.groupBuy?.participants ?? p.groupBuy?.currentQty} {p.groupBuy?.participants === 1 ? 'personne a' : 'personnes ont'} rejoint
                          </p>
                        </div>
                      </div>
                      <LiveDot/>
                    </div>
                    <div className="mb-1 flex items-baseline justify-between text-xs font-semibold text-slate-600 dark:text-slate-300">
                      <span><b className="tabular-nums text-slate-900 dark:text-white">{p.groupBuy?.currentQty}</b>/{p.groupBuy?.targetQty} unités</span>
                      <span className="text-emerald-600 dark:text-emerald-400 tabular-nums">{Math.round(p.groupBuy?.currentQty/p.groupBuy?.targetQty*100)}%</span>
                    </div>
                    <ProgressBar value={p.groupBuy?.currentQty} max={p.groupBuy?.targetQty} tone="mixed"/>
                    <div className="mt-3 grid grid-cols-3 gap-2 rounded-xl bg-white/60 p-2.5 dark:bg-slate-900/60">
                      <div><p className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400">Prix</p><p className="text-sm font-extrabold text-violet-700 dark:text-violet-300 tabular-nums">{formatFcfa(p.groupBuy?.unitPrice)}</p></div>
                      <div><p className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400">Éco.</p><p className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400">-{p.groupBuy?.savePct}%</p></div>
                      <div><p className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400">Fin</p><p className="text-xs font-extrabold text-red-600 dark:text-red-400 tabular-nums">{p.groupBuy?.deadline}</p></div>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <Button variant="violet" size="sm" onClick={() => p.groupBuy?.id ? router.push(`/achats-groupes/${p.groupBuy.id}`) : router.push('/achats-groupes')}>
                        Rejoindre
                      </Button>
                      <Button variant="secondary" size="sm" onClick={() => router.push(`/achats-groupes/nouveau?productId=${p.id}`)}>
                        Créer
                      </Button>
                    </div>
                  </div>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</>
  );

}
