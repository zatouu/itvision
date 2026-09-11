'use client';

import { useState, useEffect, useMemo, Fragment } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { formatFcfa } from '../formatFcfa';
import { Icon } from '../Icon';
import { Badge } from '../Badge';
import { Button } from '../Button';
import { Card } from '../Card';
import { Section } from '../Section';
import { CountdownChip } from '../CountdownChip';
import { mapCartItem, saveCart } from '../data-mappers';
import type { CartItem, Group } from '../types';


export default function ScreenCart() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<CartItem[]>([]);
  const [GROUPS, setGROUPS] = useState<Group[]>([]);
  const [shippingRate, setShippingRate] = useState<{ rate: number; minimumCharge: number; costPerUnit: number } | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setLoading(true);
    try {
      const raw = localStorage.getItem('cart:items');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          const mapped = parsed.map(mapCartItem) as CartItem[];
          setItems(mapped);
        }
      }
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    fetch('/api/group-orders?limit=2')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (Array.isArray(data?.groups)) setGROUPS(data.groups);
      })
      .catch(() => {});
    fetch('/api/shipping/rates-public')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.rates) {
          const rate = data.rates.find((r: any) => r.id === 'air_15') || data.rates[0];
          if (rate) setShippingRate(rate);
        }
      })
      .catch(() => {});
  }, []);

  const updateQty = (id: string, delta: number) => {
    setItems((cur) => {
      const next = cur.map((it) =>
        it.id === id
          ? { ...it, qty: Math.max(it.minOrderQty ?? 1, it.qty + delta) }
          : it
      );
      saveCart(next);
      return next;
    });
  };

  const removeItem = (id: string) => {
    setItems((cur) => {
      const next = cur.filter((it) => it.id !== id);
      saveCart(next);
      return next;
    });
  };

  const totalQty = items.reduce((s, it) => s + it.qty, 0);

  const totals = useMemo(() => {
    const sub = items.reduce((s, it) => s + it.tierUnit * it.qty, 0);
    const savings = items.reduce((s, it) => s + (it.unit - it.tierUnit) * it.qty, 0);
    const service = Math.round(sub * 0.04);
    const insurance = Math.round(sub * 0.015);
    const shipping = shippingRate ? Math.max(shippingRate.minimumCharge, Math.round(shippingRate.costPerUnit * totalQty)) : 12500;
    const total = sub + service + insurance + shipping;
    const groupSavingsPotential = items.reduce((s, it) => it.hasActiveGroup && it.groupUnit ? s + (it.tierUnit - it.groupUnit) * it.qty : s, 0);
    return { sub, savings, service, insurance, shipping, total, groupSavingsPotential };
  }, [items, shippingRate, totalQty]);

  const belowMOQ = items.filter((it) => it.qty < it.minOrderQty);
  const canCheckout = belowMOQ.length === 0;

  const CartItemCard = ({ it }: { it: CartItem }) => {
    const isBelow = it.qty < it.minOrderQty;
    const nextTierDelta = it.nextTier ? it.nextTier.at - it.qty : 0;
    return (
      <Card className={cn("overflow-hidden", isBelow && "border-amber-400 dark:border-amber-700")}>
        <div className="flex gap-3 p-3">
          <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-lg bg-slate-100 dark:bg-slate-800 md:h-24 md:w-24">
            <Image src={it.image} alt={it.name} fill sizes="96px" className="object-cover"/>
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[13px] font-bold text-slate-900 dark:text-white line-clamp-2 leading-tight">{it.name}</p>
                <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">{it.variant}</p>
              </div>
              <button onClick={() => removeItem(it.id)} className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-red-600 dark:hover:bg-slate-800" aria-label="Supprimer"><Icon name="trash" size={15}/></button>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <Badge tone={isBelow?"red":"amber"}><Icon name="package" size={10}/> Lot min. {it.minOrderQty}</Badge>
              {it.hasActiveGroup && <Badge tone="violet"><Icon name="users" size={10}/> Groupe actif</Badge>}
            </div>
            <div className="mt-3 flex items-end justify-between gap-2">
              <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-0.5 dark:border-slate-800 dark:bg-slate-900">
                <button onClick={() => updateQty(it.id, -1)} disabled={it.qty <= it.minOrderQty} className="grid h-8 w-8 place-items-center rounded-lg text-slate-700 hover:bg-slate-100 disabled:opacity-30 dark:text-slate-300 dark:hover:bg-slate-800"><Icon name="minus" size={14}/></button>
                <span className="w-8 text-center text-sm font-extrabold text-slate-900 dark:text-white tabular-nums">{it.qty}</span>
                <button onClick={() => updateQty(it.id, 1)} className="grid h-8 w-8 place-items-center rounded-lg text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"><Icon name="plus" size={14}/></button>
              </div>
              <div className="text-right">
                <p className="whitespace-nowrap text-[14px] font-extrabold text-slate-900 dark:text-white tabular-nums">{formatFcfa(it.tierUnit * it.qty)}</p>
                <p className="whitespace-nowrap text-[10px] font-semibold text-slate-500 dark:text-slate-400 tabular-nums">{formatFcfa(it.tierUnit)} × {it.qty}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Alert MOQ */}
        {isBelow && (
          <div className="border-t border-amber-200 bg-amber-50 px-3 py-2 dark:border-amber-900 dark:bg-amber-950/40">
            <div className="flex items-start gap-2">
              <Icon name="info" size={14} className="mt-0.5 flex-shrink-0 text-amber-700 dark:text-amber-300"/>
              <p className="text-[12px] font-semibold text-amber-900 dark:text-amber-200">
                Ajoutez <b className="tabular-nums">{it.minOrderQty - it.qty}</b> unités pour atteindre le lot minimum de {it.minOrderQty}
              </p>
              <button onClick={() => updateQty(it.id, it.minOrderQty - it.qty)} className="ml-auto rounded-md bg-amber-600 px-2 py-1 text-[11px] font-bold text-white hover:bg-amber-700 flex-shrink-0">
                Ajouter
              </button>
            </div>
          </div>
        )}

        {/* Suggestion palier */}
        {!isBelow && it.nextTier && nextTierDelta > 0 && nextTierDelta <= 5 && (
          <div className="border-t border-emerald-200 bg-emerald-50 px-3 py-2 dark:border-emerald-900 dark:bg-emerald-950/40">
            <div className="flex items-start gap-2">
              <Icon name="sparkles" size={14} className="mt-0.5 flex-shrink-0 text-emerald-700 dark:text-emerald-300"/>
              <p className="text-[12px] font-semibold text-emerald-900 dark:text-emerald-200">
                Ajoutez <b className="tabular-nums">{nextTierDelta}</b> unités pour débloquer <b>−{it.nextTier.save}%</b>
              </p>
              <button onClick={() => updateQty(it.id, nextTierDelta)} className="ml-auto rounded-md bg-emerald-600 px-2 py-1 text-[11px] font-bold text-white hover:bg-emerald-700 flex-shrink-0">
                Compléter
              </button>
            </div>
          </div>
        )}

        {/* Group buy opportunity */}
        {it.hasActiveGroup && it.groupUnit && !isBelow && (
          <div className="border-t border-violet-200 bg-gradient-to-r from-violet-50 to-emerald-50 px-3 py-2.5 dark:border-violet-900 dark:from-violet-950/40 dark:to-emerald-950/40">
            <div className="flex items-center gap-2.5">
              <span className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-lg bg-violet-600 text-white"><Icon name="users" size={14}/></span>
              <div className="min-w-0 flex-1">
                <p className="text-[12px] font-bold text-slate-900 dark:text-white leading-tight">Rejoindre le groupe : <span className="text-violet-700 dark:text-violet-300 tabular-nums">{formatFcfa(it.groupUnit)}/pc</span></p>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-tight">Économisez <b className="tabular-nums">{formatFcfa((it.tierUnit - it.groupUnit) * it.qty)}</b> sur ce lot</p>
              </div>
              <button className="whitespace-nowrap rounded-md bg-violet-600 px-2.5 py-1.5 text-[11px] font-bold text-white hover:bg-violet-700 flex-shrink-0">
                Voir
              </button>
            </div>
          </div>
        )}
      </Card>
    );
  };

  const Summary = ({ sticky = false }) => (
    <div className={cn("space-y-3", sticky && "sticky top-20")}>
      <Card className="p-4">
        <h3 className="mb-3 text-sm font-extrabold text-slate-900 dark:text-white">Récapitulatif</h3>
        <dl className="space-y-2 text-[13px]">
          <div className="flex justify-between">
            <dt className="text-slate-600 dark:text-slate-400">Sous-total ({items.reduce((s,i)=>s+i.qty,0)} pcs)</dt>
            <dd className="font-semibold text-slate-900 dark:text-white tabular-nums">{formatFcfa(totals.sub)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-slate-600 dark:text-slate-400">Frais de service (4%)</dt>
            <dd className="font-semibold text-slate-900 dark:text-white tabular-nums">{formatFcfa(totals.service)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-slate-600 dark:text-slate-400">Assurance import</dt>
            <dd className="font-semibold text-slate-900 dark:text-white tabular-nums">{formatFcfa(totals.insurance)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="flex items-center gap-1 text-slate-600 dark:text-slate-400"><Icon name="truck" size={13}/> Transport estimé</dt>
            <dd className="font-semibold text-slate-900 dark:text-white tabular-nums">{formatFcfa(totals.shipping)}</dd>
          </div>
          {totals.savings > 0 && (
            <div className="flex justify-between rounded-lg bg-emerald-50 px-2 py-1.5 -mx-1 dark:bg-emerald-950/40">
              <dt className="flex items-center gap-1 text-emerald-700 dark:text-emerald-300 font-semibold"><Icon name="sparkles" size={13}/> Économie paliers</dt>
              <dd className="font-bold text-emerald-700 dark:text-emerald-300 tabular-nums">-{formatFcfa(totals.savings)}</dd>
            </div>
          )}
        </dl>
        <div className="my-3 h-px bg-slate-200 dark:bg-slate-800"/>
        <div className="flex items-baseline justify-between">
          <span className="text-sm font-bold text-slate-900 dark:text-white">Total</span>
          <span className="text-2xl font-extrabold text-slate-900 dark:text-white tabular-nums">{formatFcfa(totals.total)}</span>
        </div>

        {totals.groupSavingsPotential > 0 && (
          <div className="mt-3 rounded-xl border border-violet-200 bg-violet-50 p-3 dark:border-violet-900 dark:bg-violet-950/40">
            <div className="flex items-start gap-2">
              <Icon name="users" size={16} className="mt-0.5 text-violet-700 dark:text-violet-300"/>
              <div>
                <p className="text-[12px] font-bold text-violet-900 dark:text-violet-200">Économisez jusqu&apos;à {formatFcfa(totals.groupSavingsPotential)} en achat groupé</p>
                <p className="text-[11px] text-violet-800 dark:text-violet-300/80 mt-0.5">2 articles ont un groupe actif compatible</p>
              </div>
            </div>
          </div>
        )}

        {!canCheckout && (
          <div className="mt-3 rounded-xl border border-amber-300 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-950/40">
            <div className="flex items-start gap-2">
              <Icon name="info" size={16} className="mt-0.5 text-amber-700 dark:text-amber-300"/>
              <p className="text-[12px] font-semibold text-amber-900 dark:text-amber-200">
                <b>{belowMOQ.length} article</b> est en dessous du lot minimum. Complétez pour passer à la caisse.
              </p>
            </div>
          </div>
        )}

        <Button variant="primary" size="lg" className="mt-4 w-full" disabled={!canCheckout} onClick={() => canCheckout && router.push('/checkout/adresse')}>
          Passer à la caisse
          <Icon name="arrowRight" size={16}/>
        </Button>
        <div className="mt-3 flex items-center justify-center gap-3 text-[11px] text-slate-500 dark:text-slate-400">
          <span className="inline-flex items-center gap-1"><Icon name="shield" size={12}/> Escrow</span>
          <span className="inline-flex items-center gap-1"><Icon name="wallet" size={12}/> Mobile Money</span>
          <span className="inline-flex items-center gap-1"><Icon name="whatsapp" size={12}/> Support 7j/7</span>
        </div>
      </Card>

      <div className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
        <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Code promo</p>
        <div className="flex gap-2">
          <input placeholder="Entrer un code" className="h-9 flex-1 rounded-lg border border-slate-200 bg-white px-3 text-[13px] outline-none focus:border-emerald-600 dark:border-slate-700 dark:bg-slate-800 dark:text-white"/>
          <Button variant="secondary" size="sm">Appliquer</Button>
        </div>
      </div>
    </div>
  );

  if (loading) {
    return <div className="flex h-screen items-center justify-center text-slate-500 dark:text-slate-400">Chargement…</div>;
  }

  if (items.length === 0 && !loading) {
    return <div className="flex h-screen items-center justify-center text-slate-500 dark:text-slate-400">Votre panier est vide</div>;
  }

  return (
    <>
      <div className="md:hidden">
        <div className="flex h-full flex-col bg-slate-50 dark:bg-slate-950">

        <div className="flex-1 overflow-y-auto pb-40">
          {!canCheckout && (
            <div className="px-4 pt-3">
              <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-950/40">
                <div className="flex items-start gap-2">
                  <Icon name="info" size={16} className="mt-0.5 text-amber-700 dark:text-amber-300"/>
                  <div>
                    <p className="text-[12px] font-bold text-amber-900 dark:text-amber-200">Lot minimum non atteint</p>
                    <p className="text-[11px] text-amber-800 dark:text-amber-300/80 mt-0.5">{belowMOQ.length} article à compléter avant le checkout</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="p-4 space-y-3">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{items.length} articles</p>
            {items.map((it)=><CartItemCard key={it.id} it={it}/>)}
          </div>

          <Section title="Complétez votre lot" subtitle="Suggestions basées sur vos articles" className="py-4">
            <div className="grid grid-cols-2 gap-3">
              {[
                { name: "Câble Ethernet 20m Cat6", price: 3200, base: 4800, moq: 10, img: "/assets/img/product-led.jpg" },
                { name: "Support mural universel", price: 1900, base: 3200, moq: 20, img: "/assets/img/product-bag.jpg" },
              ].map((r)=>(
                <Card key={r.name} className="overflow-hidden">
                  <div className="relative aspect-square bg-slate-100 dark:bg-slate-800">
                    <Image src={r.img} alt={r.name} fill sizes="(max-width: 768px) 50vw, 25vw" className="object-cover"/>
                    <span className="absolute left-1.5 top-1.5"><Badge tone="amber">Min. {r.moq}</Badge></span>
                  </div>
                  <div className="p-2.5">
                    <p className="text-[11px] font-semibold text-slate-900 dark:text-white line-clamp-2 leading-tight">{r.name}</p>
                    <p className="mt-1 text-[13px] font-extrabold text-emerald-600 dark:text-emerald-400 tabular-nums">{formatFcfa(r.price)}</p>
                  </div>
                </Card>
              ))}
            </div>
          </Section>

          <Section title="Groupes actifs pour vos produits" className="py-4">
            <div className="space-y-2">
              {GROUPS.slice(0,2).map((g)=>(
                <Card key={g.id} className="p-3">
                  <div className="flex items-center gap-3">
                    <span className="relative h-14 w-14 flex-shrink-0 overflow-hidden rounded-lg">
                      <Image src={g.image} alt={g.name} fill sizes="56px" className="object-cover" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[12px] font-bold text-slate-900 dark:text-white line-clamp-1">{g.name}</p>
                      <div className="mt-1 flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                        <span className="tabular-nums">{formatFcfa(g.unit)}</span>
                        <span className="text-emerald-600 dark:text-emerald-400 font-bold">-{g.save}%</span>
                        <CountdownChip time={g.deadline} urgent={g.status==="almost"} className="!text-[10px] !px-1.5 !py-0.5"/>
                      </div>
                    </div>
                    <Button variant="violet" size="sm">Rejoindre</Button>
                  </div>
                </Card>
              ))}
            </div>
          </Section>
        </div>

        {/* Sticky bottom */}
        <div className="absolute bottom-14 left-0 right-0 z-20 border-t border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-950">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0 flex-shrink">
              <p className="whitespace-nowrap text-[10px] leading-none text-slate-500 dark:text-slate-400">Total · {items.reduce((s,i)=>s+i.qty,0)} pcs</p>
              <p className="whitespace-nowrap mt-0.5 text-[15px] font-extrabold leading-tight text-slate-900 dark:text-white tabular-nums">{formatFcfa(totals.total)}</p>
              {totals.savings>0 && <p className="whitespace-nowrap text-[10px] font-bold text-emerald-600 dark:text-emerald-400 tabular-nums leading-none">Éco. {formatFcfa(totals.savings)}</p>}
            </div>
            <Button variant="primary" size="md" disabled={!canCheckout} className="whitespace-nowrap flex-shrink-0 !px-3 !text-[13px]" onClick={() => canCheckout && router.push('/checkout/adresse')}>
              Commander
              <Icon name="arrowRight" size={14}/>
            </Button>
          </div>
        </div>

      </div>
      </div>
      <div className="hidden md:block">
        <div className="min-h-full bg-slate-50 dark:bg-slate-950">

      <div className="mx-auto max-w-6xl px-6 py-6">
        <div className="mb-4 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
          <a>Accueil</a><Icon name="chevronRight" size={12}/><span className="text-slate-700 dark:text-slate-300">Mon panier</span>
        </div>
        <div className="mb-6 flex items-baseline justify-between">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">Mon panier</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{items.length} articles · {items.reduce((s,i)=>s+i.qty,0)} pièces au total</p>
          </div>
          <Link href="/produits" className="text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"><Icon name="arrowLeft" size={14} className="inline mr-1"/>Continuer mes achats</Link>
        </div>

        {!canCheckout && (
          <div className="mb-4 rounded-xl border border-amber-300 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/40">
            <div className="flex items-start gap-3">
              <Icon name="info" size={18} className="mt-0.5 text-amber-700 dark:text-amber-300"/>
              <div>
                <p className="text-sm font-bold text-amber-900 dark:text-amber-200">Lot minimum non atteint sur {belowMOQ.length} article(s)</p>
                <p className="text-xs text-amber-800 dark:text-amber-300/80 mt-0.5">Complétez le lot pour débloquer le passage en caisse — c&apos;est un import direct usine.</p>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-[1fr_400px] gap-6">
          <div className="space-y-3">
            {items.map((it)=><CartItemCard key={it.id} it={it}/>)}

            <Card className="p-4">
              <h3 className="mb-3 text-sm font-extrabold text-slate-900 dark:text-white">Complétez votre lot pour économiser</h3>
              <div className="grid grid-cols-4 gap-3">
                {[
                  { name: "Câble Ethernet 20m", price: 3200, base: 4800, moq: 10, img: "/assets/img/product-led.jpg" },
                  { name: "Support mural", price: 1900, base: 3200, moq: 20, img: "/assets/img/product-bag.jpg" },
                  { name: "Adaptateur PoE 8p.", price: 8900, base: 12500, moq: 3, img: "/assets/img/product-carmount.jpg" },
                  { name: "Disque HDD 4To", price: 32000, base: 42000, moq: 3, img: "/assets/img/product-watch.jpg" },
                ].map((r)=>(
                  <div key={r.name} className="rounded-xl border border-slate-200 p-2 dark:border-slate-800">
                    <div className="relative mb-2 aspect-square overflow-hidden rounded-lg bg-slate-100 dark:bg-slate-800">
                      <Image src={r.img} alt={r.name} fill sizes="(max-width: 768px) 50vw, 25vw" className="object-cover"/>
                      <span className="absolute left-1.5 top-1.5"><Badge tone="amber">Min. {r.moq}</Badge></span>
                    </div>
                    <p className="text-[11px] font-semibold text-slate-900 dark:text-white line-clamp-2 min-h-[28px] leading-tight">{r.name}</p>
                    <p className="mt-1 text-sm font-extrabold text-emerald-600 dark:text-emerald-400 tabular-nums">{formatFcfa(r.price)}</p>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-4">
              <h3 className="mb-3 text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <Icon name="users" size={16} className="text-violet-600 dark:text-violet-400"/>
                Groupes actifs pour vos produits
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {GROUPS.slice(0,2).map((g)=>(
                  <div key={g.id} className="flex items-center gap-3 rounded-xl border border-slate-200 p-3 dark:border-slate-800">
                    <span className="relative h-14 w-14 flex-shrink-0 overflow-hidden rounded-lg">
                      <Image src={g.image} alt={g.name} fill sizes="56px" className="object-cover" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-slate-900 dark:text-white line-clamp-1">{g.name}</p>
                      <div className="mt-1 flex items-center gap-1.5 text-[11px]">
                        <span className="font-bold text-violet-700 dark:text-violet-300 tabular-nums">{formatFcfa(g.unit)}</span>
                        <span className="text-emerald-600 dark:text-emerald-400 font-bold">-{g.save}%</span>
                        <CountdownChip time={g.deadline} urgent={g.status==="almost"} className="!text-[10px] !px-1.5 !py-0.5"/>
                      </div>
                    </div>
                    <Button variant="violet" size="sm">Rejoindre</Button>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          <div>
            <Summary sticky/>
          </div>
        </div>
      </div>
    </div>
  </div>
</>
  );

}
