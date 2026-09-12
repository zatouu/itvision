'use client';

import { useState, useEffect, Fragment } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { formatFcfa } from '../formatFcfa';
import { useSourcingModal } from '../SourcingModalContext';
import { Icon } from '../Icon';
import { Card } from '../Card';
import { Section } from '../Section';
import { TrustStrip } from '../TrustStrip';
import { ProgressBar } from '../ProgressBar';
import { ProductCard } from '../ProductCard';
import { mapCatalogItem, mapGroupOrder, mapCategory } from '../data-mappers';
import type { Product, Group, Category, Testimonial } from '../types';


export default function ScreenHome() {
  const router = useRouter();
  const { open: openSourcing } = useSourcingModal();
  const [loading, setLoading] = useState(true);
  const [CATALOG, setCATALOG] = useState<Product[]>([]);
  const [GROUPS, setGROUPS] = useState<Group[]>([]);
  const [CATEGORIES, setCATEGORIES] = useState<Category[]>([]);
  const TESTIMONIALS: Testimonial[] = [];

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch('/api/catalog/products?limit=12').then(r => r.json()).catch(() => null),
      fetch('/api/group-orders?limit=6').then(r => r.json()).catch(() => null),
      fetch('/api/catalog/categories').then(r => r.json()).catch(() => null),
    ]).then(([prodRes, grpRes, catRes]) => {
      if (prodRes?.products?.length || prodRes?.items?.length) {
        const list = prodRes.products || prodRes.items;
        setCATALOG((list as unknown[]).map(mapCatalogItem) as Product[]);
      }
      if (grpRes?.groups?.length) setGROUPS(grpRes.groups.map(mapGroupOrder));
      if (catRes?.categories?.length) setCATEGORIES(catRes.categories.map(mapCategory));
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const popular = CATALOG.filter((p) => p.img && !p.img.includes('placeholder')).slice(0, 6);
  const liveGroups = GROUPS.filter((g) => g.status === 'live' || g.status === 'almost');
  const avgSave = liveGroups.length
    ? Math.round(liveGroups.reduce((s, g) => s + (g.save || 0), 0) / liveGroups.length)
    : 0;

  if (loading) {
    return <div className="flex h-screen items-center justify-center text-slate-500 dark:text-slate-400">Chargement…</div>;
  }

  
  return (
    <>
      <div className="md:hidden">
        <div className="flex h-full flex-col overflow-x-hidden bg-slate-50 dark:bg-slate-950">

        <div className="flex-shrink-0 border-b border-slate-200 bg-white px-4 py-2.5 dark:border-slate-800 dark:bg-slate-900">
          <button
            onClick={openSourcing}
            className="flex w-full items-center gap-2 rounded-xl bg-slate-100 px-3 py-2 dark:bg-slate-800 text-left"
          >
            <Icon name="search" size={16} className="text-slate-500 dark:text-slate-400"/>
            <span className="flex-1 text-[12px] text-slate-500 dark:text-slate-400">Rechercher un produit, une catégorie…</span>
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-violet-600 text-white">
              <Icon name="camera" size={13}/>
            </span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto pb-6">
          {/* HERO Variante D — mobile stacked */}
          <div className="relative overflow-hidden">
            <div className="relative mx-0 mt-0 overflow-hidden rounded-none bg-gradient-to-br from-violet-600 via-violet-700 to-emerald-600 p-5 text-white shadow-sm">
              <div className="absolute inset-0 opacity-15">
                <svg viewBox="0 0 400 240" className="h-full w-full">
                  <defs><pattern id="dotshm" x="0" y="0" width="16" height="16" patternUnits="userSpaceOnUse"><circle cx="1.5" cy="1.5" r="1" fill="white"/></pattern></defs>
                  <rect width="400" height="240" fill="url(#dotshm)"/>
                </svg>
              </div>
              <div className="relative">
                <div className="flex flex-wrap gap-1.5 mb-3">
                  <span className="inline-flex items-center gap-1 rounded-full bg-white/15 border border-white/25 px-2 py-1 text-[10px] font-bold whitespace-nowrap">
                    <span className="h-1 w-1 rounded-full bg-emerald-300 animate-ping-slow"/>
                    <b className="tabular-nums">{liveGroups.length}</b> groupe{liveGroups.length > 1 ? 's' : ''} en cours
                  </span>
                  {avgSave > 0 && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-white/15 border border-white/25 px-2 py-1 text-[10px] font-bold whitespace-nowrap"><b>−{avgSave}%</b> éco. moy.</span>
                  )}
                  <span className="inline-flex items-center gap-1 rounded-full bg-white/15 border border-white/25 px-2 py-1 text-[10px] font-bold whitespace-nowrap">Devis <b className="tabular-nums">24h</b></span>
                </div>
                <h1 className="text-[28px] font-extrabold leading-[1] tracking-tight">Importez de Chine,<br/>à <span className="text-emerald-300">prix usine</span>.</h1>
                <p className="mt-2 text-[12px] leading-snug text-white/85">Sourcing dédié, achats groupés et lots avantageux — livrés au Sénégal en 4-45 jours.</p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  <span className="inline-flex items-center gap-1 rounded-full border border-white/25 bg-white/10 px-2 py-1 text-[10px] font-semibold whitespace-nowrap"><Icon name="camera" size={11}/>Trouvez-moi 24h</span>
                  <span className="inline-flex items-center gap-1 rounded-full border border-white/25 bg-white/10 px-2 py-1 text-[10px] font-semibold whitespace-nowrap"><Icon name="users" size={11}/>Groupés −45%</span>
                  <span className="inline-flex items-center gap-1 rounded-full border border-white/25 bg-white/10 px-2 py-1 text-[10px] font-semibold whitespace-nowrap"><Icon name="package" size={11}/>Prix par palier</span>
                </div>
                <div className="mt-4 flex gap-2">
                  <button onClick={() => router.push('/produits')} className="whitespace-nowrap rounded-xl bg-white px-3 py-2 text-[12px] font-bold text-slate-900 hover:bg-slate-100 inline-flex items-center gap-1">Explorer <Icon name="arrowRight" size={13}/></button>
                  <button onClick={openSourcing} className="whitespace-nowrap rounded-xl bg-white/10 border border-white/25 px-3 py-2 text-[12px] font-bold text-white hover:bg-white/20 inline-flex items-center gap-1"><Icon name="camera" size={13}/>Trouvez-moi</button>
                </div>
              </div>
            </div>
          </div>

          {/* Bandeau EN DIRECT Groupes en cours mobile — prioritaire : deals limités dans le temps */}
          {liveGroups.length > 0 && (
            <div className="mt-4">
              <div className="flex items-center justify-between px-4 mb-2">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 rounded-md bg-red-500/10 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-red-600 dark:text-red-400">
                    <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-ping-slow"/>En direct
                  </span>
                  <p className="text-[13px] font-extrabold text-slate-900 dark:text-white">Groupes en cours</p>
                </div>
                <Link href="/achats-groupes" className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">Voir tout</Link>
              </div>
              <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1">
                {liveGroups.slice(0, 4).map((g) => {
                  const pct = g.targetQty > 0 ? Math.round((g.currentQty / g.targetQty) * 100) : 0;
                  const almost = g.status === "almost";
                  return (
                    <Card key={g.id} onClick={() => router.push(`/achats-groupes/${g.id}`)} className="flex-shrink-0 snap-start w-[220px] p-3 cursor-pointer hover:shadow-md transition-shadow">
                      <div className="flex items-center gap-2.5">
                        <span className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-full">
                          <img src={g.image || '/placeholder.svg'} alt={g.name} onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/placeholder.svg'; }} className="h-full w-full object-cover" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-[11px] font-bold text-slate-900 dark:text-white line-clamp-1">{g.name}</p>
                          <div className="mt-0.5 flex items-baseline gap-1 whitespace-nowrap">
                            <span className="text-[12px] font-extrabold text-violet-700 dark:text-violet-300 tabular-nums">{formatFcfa(g.unit)}</span>
                            <span className="text-[9px] font-semibold text-slate-400 line-through tabular-nums">{formatFcfa(g.base)}</span>
                          </div>
                        </div>
                      </div>
                      <ProgressBar value={g.currentQty} max={g.targetQty} tone="mixed" className="!h-1 mt-2"/>
                      <div className="mt-1.5 flex items-center justify-between">
                        <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 tabular-nums whitespace-nowrap">{pct}% · <span className="text-red-600 dark:text-red-400 font-bold">⏱ {g.deadline.split(" ").slice(0,2).join(" ")}</span></span>
                        <button onClick={(e) => { e.stopPropagation(); router.push(`/achats-groupes/${g.id}`); }} className={cn("whitespace-nowrap rounded-md px-2 py-1 text-[10px] font-bold text-white", almost ? "bg-red-500" : "bg-violet-600")}>
                          {almost ? "Presque plein" : "Rejoindre"}
                        </button>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {/* Best sellers mobile : horizontal scroll */}
          {popular.length > 0 && (
            <Section
              title="⭐ Best sellers"
              className="mt-4"
              right={<Link href="/produits" className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">Voir tout</Link>}
            >
              <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1">
                {popular.map((p) => (
                  <div key={p.id} className="flex-shrink-0 snap-start w-[150px]">
                    <ProductCard product={p} onClick={() => router.push(`/produits/${p.id}`)}/>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Categories */}
          {CATEGORIES.length > 0 && (
            <Section title="Catégories" className="mt-6" right={<Link href="/produits" className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">Voir tout</Link>}>
              <div className="grid grid-cols-4 gap-2">
                {CATEGORIES.map((c) => (
                  <button key={c.key} onClick={() => router.push(`/produits?category=${encodeURIComponent(c.key)}`)} className="flex flex-col items-center gap-1.5 rounded-xl border border-slate-200 bg-white p-2.5 hover:border-slate-300 hover:shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700">
                    <span className="grid h-9 w-9 place-items-center rounded-lg bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                      <Icon name={c.icon} size={16}/>
                    </span>
                    <span className="text-[10px] font-semibold text-slate-700 dark:text-slate-300 text-center leading-tight">{c.label}</span>
                  </button>
                ))}
              </div>
            </Section>
          )}

          {/* 3 façons d’importer */}
          <div className="mt-6 px-4 space-y-2.5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">3 façons d’importer</p>
            {[
              { icon: "camera", tone: "violet", tag: "01 · Sourcing", ttl: "Trouvez-moi ce produit en 24h", sub: "Photo, lien ou description → devis garanti sous 24h ouvrées." },
              { icon: "users", tone: "emerald", tag: "02 · Groupes", ttl: "Rejoignez un achat groupé", sub: "Plus on est nombreux, moins c’est cher — jusqu’à -45%." },
              { icon: "package", tone: "amber", tag: "03 · Lot minimum", ttl: "Débloquez le prix par palier", sub: "À partir de X unités, économisez jusqu’à -40%." },
            ].map((b, i) => {
              const toneMap: Record<string, string> = {
                violet: "bg-violet-50 text-violet-700 dark:bg-violet-950/60 dark:text-violet-300",
                emerald: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300",
                amber: "bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300",
              };
              const arrowTone: Record<string, string> = {
                violet: "text-violet-700 dark:text-violet-300",
                emerald: "text-emerald-700 dark:text-emerald-400",
                amber: "text-amber-700 dark:text-amber-300",
              };
              const routes: Record<string, string> = { camera: '/produits', users: '/achats-groupes', package: '/produits' };
              return (
                <Card key={i} onClick={() => router.push(routes[b.icon] || '/produits')} className="cursor-pointer overflow-hidden hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-3 p-3">
                    <span className={cn("grid h-12 w-12 flex-shrink-0 place-items-center rounded-xl", toneMap[b.tone])}>
                      <Icon name={b.icon} size={22}/>
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{b.tag}</p>
                      <p className="mt-0.5 text-[13px] font-extrabold text-slate-900 dark:text-white leading-tight">{b.ttl}</p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight mt-0.5">{b.sub}</p>
                    </div>
                    <Icon name="chevronRight" size={16} className={cn("flex-shrink-0", arrowTone[b.tone])}/>
                  </div>
                </Card>
              );
            })}
          </div>

          {/* Sourcing */}
          <div className="mt-6 mx-4">
            <div className="overflow-hidden rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-50 via-white to-violet-50 p-4 dark:border-violet-900 dark:from-violet-950/40 dark:via-slate-900 dark:to-violet-950/40">
              <div className="flex items-center gap-2">
                <span className="grid h-8 w-8 place-items-center rounded-lg bg-violet-600 text-white"><Icon name="camera" size={16}/></span>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-violet-700 dark:text-violet-300">Sourcing sur demande</p>
                  <p className="text-[14px] font-extrabold text-slate-900 dark:text-white leading-tight">Trouvez-moi ce produit en 24h</p>
                </div>
              </div>
              <p className="mt-2 text-[12px] text-slate-600 dark:text-slate-400 leading-snug">Vous ne trouvez pas votre produit ? Notre équipe le trouve pour vous.</p>
              <div className="mt-3 grid grid-cols-3 gap-2">
                {[
                  { n: 1, ttl: "Envoyez", sub: "Photo ou lien" },
                  { n: 2, ttl: "Recevez", sub: "Devis 24h" },
                  { n: 3, ttl: "Commandez", sub: "On gère tout" },
                ].map((s) => (
                  <div key={s.n} className="rounded-xl bg-white/60 p-2 text-center dark:bg-slate-900/60">
                    <p className="text-[10px] font-extrabold text-violet-700 dark:text-violet-300">0{s.n}</p>
                    <p className="mt-0.5 text-[11px] font-bold text-slate-900 dark:text-white leading-tight">{s.ttl}</p>
                    <p className="text-[9px] text-slate-500 dark:text-slate-400 leading-tight">{s.sub}</p>
                  </div>
                ))}
              </div>
              <button onClick={openSourcing} className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 py-2.5 text-[13px] font-bold text-white hover:bg-violet-700">
                <Icon name="camera" size={14}/>Photographier un produit
              </button>
            </div>
          </div>

          {/* MOQ */}
          <div className="mt-6 mx-4">
            <div className="overflow-hidden rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/40">
              <div className="flex items-center gap-2">
                <span className="grid h-8 w-8 place-items-center rounded-lg bg-amber-500 text-white"><Icon name="boxes" size={16}/></span>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300">Lot minimum</p>
                  <p className="text-[14px] font-extrabold text-slate-900 dark:text-white leading-tight">Pourquoi commander en quantité ?</p>
                </div>
              </div>
              <p className="mt-2 text-[12px] text-slate-600 dark:text-slate-400 leading-snug">Le prix baisse par palier. Plus vous commandez, plus vous économisez.</p>
              <div className="mt-3 space-y-1.5">
                {[
                  { qty: "1-4 pcs", price: "Prix local", icon: "x", muted: true },
                  { qty: "5-9 pcs", price: "-13%", icon: "check", muted: false },
                  { qty: "10-24 pcs", price: "-25%", icon: "check", muted: false, highlight: true },
                  { qty: "25+ pcs", price: "-40%", icon: "flame", muted: false },
                ].map((t, i) => (
                  <div key={i} className={cn("flex items-center justify-between rounded-lg px-3 py-1.5", t.highlight ? "bg-white dark:bg-slate-900 shadow-sm" : "")}>
                    <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 tabular-nums inline-flex items-center gap-1">
                      <Icon name={t.icon as string} size={11} className={cn(t.muted ? "text-slate-400" : "text-emerald-600")} />
                      {t.qty}
                    </span>
                    <span className={cn("text-[13px] font-extrabold tabular-nums", t.muted ? "text-slate-400" : "text-emerald-600 dark:text-emerald-400")}>{t.price}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Trust */}
          <div className="mt-6 px-4">
            <TrustStrip compact/>
          </div>

          {/* Testimonials */}
          {TESTIMONIALS.length > 0 && (
            <Section title="Ils nous font confiance" className="mt-6">
              <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-1">
                {TESTIMONIALS.map((t) => (
                  <Card key={t.initials} className="flex-shrink-0 w-[260px] p-4">
                    <div className="mb-2 flex text-amber-500">
                      {Array.from({ length: 5 }).map((_, i) => <Icon key={i} name="star" size={13} strokeWidth={0} className={i < t.rating ? "fill-amber-500" : "fill-slate-200 dark:fill-slate-700"}/>)}
                    </div>
                    <p className="text-[13px] leading-relaxed text-slate-700 dark:text-slate-300">« {t.quote} »</p>
                    <div className="mt-3 flex items-center gap-2">
                      <span className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-violet-500 to-emerald-500 text-[10px] font-extrabold text-white">{t.initials}</span>
                      <div>
                        <p className="text-[12px] font-bold text-slate-900 dark:text-white leading-tight">{t.handle}</p>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">{t.role}</p>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </Section>
          )}

          <div className="mt-6 px-4 py-6 text-center">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-600">DDM+ · Dieund Dal Ma</p>
            <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-500">Import direct Chine → Sénégal</p>
          </div>
        </div>


      </div>
      </div>
      <div className="hidden md:block">
        <div className="min-h-full overflow-x-hidden bg-slate-50 dark:bg-slate-950">


      <div className="mx-auto max-w-6xl px-6 py-6">
        {/* HERO Variante D */}
        <div className="w-[100vw] ml-[calc((100%-100vw)/2)] overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm">
          {/* Hero principal */}
          <div className="relative overflow-hidden bg-gradient-to-br from-violet-600 via-violet-700 to-emerald-600 text-white min-h-[500px]">
            <div className="absolute inset-0 opacity-15">
              <svg viewBox="0 0 800 500" className="h-full w-full">
                <defs><pattern id="dotshero" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse"><circle cx="1.5" cy="1.5" r="1" fill="white"/></pattern></defs>
                <rect width="800" height="500" fill="url(#dotshero)"/>
              </svg>
            </div>
            <div className="relative grid grid-cols-[1.15fr_1fr] gap-8 items-start px-10 pt-8 pb-10">
              {/* Left : Message remonté */}
              <div className="pt-2">
                <div className="flex flex-wrap gap-2 mb-4">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 border border-white/25 px-3 py-1.5 text-[11px] font-bold whitespace-nowrap">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-300 animate-ping-slow"/>
                    <b className="tabular-nums">{liveGroups.length}</b> groupe{liveGroups.length > 1 ? 's' : ''} en cours
                  </span>
                  {avgSave > 0 && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 border border-white/25 px-3 py-1.5 text-[11px] font-bold whitespace-nowrap"><b>−{avgSave}%</b> économie moyenne</span>
                  )}
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 border border-white/25 px-3 py-1.5 text-[11px] font-bold whitespace-nowrap">Devis sous <b className="tabular-nums">24h</b></span>
                </div>
                <h1 className="text-[52px] font-extrabold leading-[0.98] tracking-tight">Importez de Chine,<br/>à <span className="text-emerald-300">prix usine</span>.</h1>
                <p className="mt-3 max-w-md text-[15px] text-white/85 leading-snug">Sourcing dédié, achats groupés et lots avantageux — livrés au Sénégal en 4-45 jours selon votre choix.</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-white/10 px-3 py-1.5 text-[12px] font-semibold whitespace-nowrap"><Icon name="camera" size={13}/>Trouvez-moi 24h</span>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-white/10 px-3 py-1.5 text-[12px] font-semibold whitespace-nowrap"><Icon name="users" size={13}/>Achats groupés −45%</span>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-white/10 px-3 py-1.5 text-[12px] font-semibold whitespace-nowrap"><Icon name="package" size={13}/>Prix par palier</span>
                </div>
                <div className="mt-5 flex gap-3">
                  <button onClick={() => router.push('/produits')} className="whitespace-nowrap inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-[14px] font-bold text-slate-900 hover:bg-slate-100">Explorer le catalogue <Icon name="arrowRight" size={16}/></button>
                  <button onClick={openSourcing} className="whitespace-nowrap inline-flex items-center gap-2 rounded-xl bg-white/10 border border-white/25 px-5 py-3 text-[14px] font-bold text-white hover:bg-white/20"><Icon name="camera" size={16}/>Trouvez-moi</button>
                </div>
              </div>

              {/* Right : Mosaïque 3×2 avec fondus rotatifs */}
              <div className="relative">
                <div className="mb-2 flex items-center justify-between">
                  <span className="inline-flex items-center gap-1 rounded-md bg-slate-900/40 backdrop-blur px-2 py-1 text-[10px] font-bold uppercase tracking-wider">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-300 animate-ping-slow"/>Best sellers
                  </span>
                  <Link href="/produits" className="text-[11px] font-bold text-white/90 hover:text-white cursor-pointer">Voir tout →</Link>
                </div>
                <div className="grid grid-cols-3 grid-rows-2 gap-2.5 h-[360px]">
                  {popular.map((p, i) => (
                    <Link key={p.id} href={`/produits/${p.id}`} className="relative rounded-xl overflow-hidden bg-white/10 backdrop-blur border border-white/20 fade-rotate hover:scale-[1.02] transition-transform" style={{animationDelay: `${i * 1.5}s`}}>
                      <img
                        src={p.img || '/placeholder.svg'}
                        alt={p.name}
                        onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/placeholder.svg'; }}
                        className="h-full w-full object-cover opacity-90"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/30 to-transparent"/>
                      <div className="absolute top-1.5 left-1.5">
                        {p.hasGroup ? (
                          <span className="inline-flex items-center gap-0.5 rounded bg-violet-500 text-white px-1.5 py-0.5 text-[9px] font-extrabold">GROUPE</span>
                        ) : (
                          <span className="inline-flex items-center gap-0.5 rounded bg-amber-500 text-slate-900 px-1.5 py-0.5 text-[9px] font-extrabold">MIN {p.moq}</span>
                        )}
                      </div>
                      <div className="absolute bottom-1.5 left-1.5 right-1.5">
                        <p className="text-[9px] text-white/70 uppercase tracking-wider truncate">{p.cat}</p>
                        <p className="text-[11px] font-bold text-white truncate">{p.name.split(" ").slice(0, 3).join(" ")}</p>
                        <p className="text-[13px] font-extrabold text-emerald-300 tabular-nums">{formatFcfa(p.price)}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Ticker "En direct · Groupes en cours" */}
          {liveGroups.length > 0 && (
          <div className="bg-slate-900 border-t border-white/10">
            <div className="flex items-center gap-6">
              <div className="flex-shrink-0 pl-6 py-4 border-r border-white/10 pr-6">
                <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-400 whitespace-nowrap flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-ping-slow"/><Icon name="flame" size={10} className="text-red-500"/> En direct
                </p>
                <p className="text-[13px] font-extrabold text-white whitespace-nowrap">Groupes en cours</p>
              </div>
              <div className="relative flex-1 overflow-hidden ticker-container">
                <div className="pointer-events-none absolute left-0 top-0 bottom-0 z-10 w-16 bg-gradient-to-r from-slate-900 to-transparent"/>
                <div className="pointer-events-none absolute right-0 top-0 bottom-0 z-10 w-16 bg-gradient-to-l from-slate-900 to-transparent"/>
                <div className="ticker-left flex gap-3 py-3 pr-3 w-max">
                  {[...liveGroups, ...liveGroups].map((g, i) => {
                    const pct = g.targetQty > 0 ? Math.round((g.currentQty / g.targetQty) * 100) : 0;
                    const almost = g.status === "almost";
                    return (
                      <Link key={i} href={`/achats-groupes/${g.id}`} className="flex-shrink-0 flex items-center gap-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-white/10 p-2 w-[260px] transition-colors">
                        <span className="relative h-11 w-11 flex-shrink-0 overflow-hidden rounded-full">
                          <img src={g.image || '/placeholder.svg'} alt={g.name} onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/placeholder.svg'; }} className="h-full w-full object-cover" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[9px] font-bold text-red-400 tabular-nums whitespace-nowrap"><Icon name="clock" size={9} className="inline"/> {g.deadline.split(" ").slice(0,2).join(" ")}</span>
                            <span className="text-[9px] text-slate-500">·</span>
                            <span className="text-[9px] text-emerald-400 font-bold">{pct}%</span>
                          </div>
                          <p className="text-[11px] font-bold text-white truncate">{g.name}</p>
                          <div className="flex items-baseline gap-1 whitespace-nowrap">
                            <span className="text-[13px] font-extrabold text-violet-300 tabular-nums">{formatFcfa(g.unit)}</span>
                            <span className="text-[9px] text-slate-500 line-through tabular-nums">{formatFcfa(g.base)}</span>
                          </div>
                        </div>
                        <span className={cn("flex-shrink-0 rounded-md text-white text-[10px] font-bold px-2 py-1 whitespace-nowrap", almost ? "bg-red-500" : "bg-violet-600")}>
                          {almost ? "Presque plein" : "Rejoindre"}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
          )}
        </div>

        {/* Catégories */}
        {CATEGORIES.length > 0 && (
        <div className="mt-10">
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="text-[20px] font-extrabold tracking-tight text-slate-900 dark:text-white">Catégories</h2>
            <Link href="/produits" className="text-[13px] font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer">Toutes →</Link>
          </div>
          <div className="grid grid-cols-8 gap-3">
            {CATEGORIES.map((c) => (
              <button key={c.key} onClick={() => router.push(`/produits?category=${encodeURIComponent(c.key)}`)} className="flex flex-col items-center gap-2 rounded-2xl border border-slate-200 bg-white p-3 hover:border-slate-300 hover:shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700">
                <span className="grid h-10 w-10 place-items-center rounded-lg bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                  <Icon name={c.icon} size={18}/>
                </span>
                <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 text-center leading-tight">{c.label}</span>
                <span className="text-[9px] font-semibold text-slate-400 tabular-nums">{c.count}</span>
              </button>
            ))}
          </div>
        </div>
        )}

        {/* Populaires */}
        {CATALOG.length > 0 && (
        <div className="mt-10">
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="text-[20px] font-extrabold tracking-tight text-slate-900 dark:text-white inline-flex items-center gap-1.5">
              <Icon name="flame" size={18} className="text-red-500"/> Populaires cette semaine
            </h2>
            <Link href="/produits" className="text-[13px] font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap cursor-pointer">Voir tous →</Link>
          </div>
          <div className="grid grid-cols-6 gap-3">
            {CATALOG.slice(0, 6).map((p) => <ProductCard key={p.id} product={p} size="lg" onClick={() => router.push(`/produits/${p.id}`)}/>)}
          </div>
        </div>
        )}

        {/* 3 façons d’importer */}
        <div className="mt-10">
          <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-3">3 façons d’importer avec DDM+</p>
          <div className="grid grid-cols-3 gap-4">
            {[
              { icon: "camera", tone: "violet", tag: "01 · Sourcing", ttl: "Trouvez-moi 24h", sub: "Photo, lien ou description — devis garanti sous 24h ouvrées par notre équipe en Chine.", cta: "Envoyer une demande" },
              { icon: "users", tone: "emerald", tag: "02 · Groupes", ttl: "Achats groupés", sub: "Rejoignez ou créez un groupe. Plus on est nombreux, plus le prix baisse — jusqu’à -45%.", cta: "Voir les groupes actifs" },
              { icon: "package", tone: "amber", tag: "03 · Lot minimum", ttl: "Prix par palier", sub: "Le prix baisse par tranche. Simulez votre lot en un clic pour voir votre économie.", cta: "Calculer mon lot" },
            ].map((b, i) => {
              const toneMap: Record<string, string> = {
                violet: "bg-violet-100 text-violet-700 dark:bg-violet-950/60 dark:text-violet-300",
                emerald: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300",
                amber: "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300",
              };
              const ctaTone: Record<string, string> = {
                violet: "text-violet-700 dark:text-violet-300",
                emerald: "text-emerald-700 dark:text-emerald-400",
                amber: "text-amber-700 dark:text-amber-300",
              };
              const routes: Record<string, string> = { camera: '/produits', users: '/achats-groupes', package: '/produits' };
              return (
                <Card key={i} onClick={() => router.push(routes[b.icon] || '/produits')} className="cursor-pointer p-5 hover:shadow-md transition-shadow group" tabIndex={0}>
                  <div className="mb-3 flex items-center justify-between">
                    <span className={cn("grid h-12 w-12 place-items-center rounded-xl", toneMap[b.tone])}>
                      <Icon name={b.icon} size={22}/>
                    </span>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{b.tag}</span>
                  </div>
                  <h3 className="text-[18px] font-extrabold text-slate-900 dark:text-white tracking-tight">{b.ttl}</h3>
                  <p className="mt-1 text-[13px] text-slate-500 dark:text-slate-400 leading-relaxed">{b.sub}</p>
                  <div className={cn("mt-4 inline-flex items-center gap-1 text-[13px] font-bold group-hover:gap-2 transition-all", ctaTone[b.tone])}>
                    {b.cta} <Icon name="arrowRight" size={14}/>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Sourcing + MOQ side-by-side */}
        <div className="mt-10 grid grid-cols-2 gap-4">
          <div className="rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-50 via-white to-violet-50 p-6 dark:border-violet-900 dark:from-violet-950/40 dark:via-slate-900 dark:to-violet-950/40">
            <div className="flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-violet-600 text-white"><Icon name="camera" size={20}/></span>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-violet-700 dark:text-violet-300">Sourcing sur demande</p>
                <h3 className="text-[20px] font-extrabold text-slate-900 dark:text-white tracking-tight">Trouvez-moi ce produit en 24h</h3>
              </div>
            </div>
            <p className="mt-3 text-[13px] text-slate-600 dark:text-slate-400 leading-relaxed">Vous ne trouvez pas votre produit ? Notre équipe le trouve pour vous. Envoyez une photo, un lien ou une description.</p>
            <div className="mt-4 grid grid-cols-3 gap-2">
              {[
                { n: 1, ttl: "Envoyez", sub: "Photo, lien ou texte" },
                { n: 2, ttl: "Recevez", sub: "Devis en 24h" },
                { n: 3, ttl: "Commandez", sub: "On gère l’import" },
              ].map((s) => (
                <div key={s.n} className="rounded-xl bg-white/70 p-3 text-center dark:bg-slate-900/70">
                  <p className="text-[11px] font-extrabold text-violet-700 dark:text-violet-300">0{s.n}</p>
                  <p className="mt-1 text-[13px] font-bold text-slate-900 dark:text-white">{s.ttl}</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">{s.sub}</p>
                </div>
              ))}
            </div>
            <button onClick={openSourcing} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-[13px] font-bold text-white hover:bg-violet-700">
              <Icon name="camera" size={14}/>Photographier un produit
            </button>
          </div>

          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 dark:border-amber-900 dark:bg-amber-950/40">
            <div className="flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-amber-500 text-white"><Icon name="boxes" size={20}/></span>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-amber-700 dark:text-amber-300">Lot minimum</p>
                <h3 className="text-[20px] font-extrabold text-slate-900 dark:text-white tracking-tight">Pourquoi commander en quantité ?</h3>
              </div>
            </div>
            <p className="mt-3 text-[13px] text-slate-600 dark:text-slate-400 leading-relaxed">Le prix baisse par palier. Plus vous commandez, plus vous économisez — le fournisseur négocie mieux à volume.</p>
            <div className="mt-4 space-y-1.5">
              {[
                { qty: "1-4 pcs", price: "Prix local", icon: "x", muted: true, bg: "" },
                { qty: "5-9 pcs", price: "-13%", icon: "check", muted: false, bg: "" },
                { qty: "10-24 pcs", price: "-25%", icon: "check", muted: false, bg: "bg-white shadow-sm dark:bg-slate-900" },
                { qty: "25+ pcs", price: "-40%", icon: "flame", muted: false, bg: "" },
              ].map((t, i) => (
                <div key={i} className={cn("flex items-center justify-between rounded-lg px-3 py-2", t.bg)}>
                  <span className="text-[12px] font-semibold text-slate-700 dark:text-slate-300 tabular-nums inline-flex items-center gap-1">
                    <Icon name={t.icon as string} size={12} className={cn(t.muted ? "text-slate-400" : "text-emerald-600")} />
                    {t.qty}
                  </span>
                  <span className={cn("text-[15px] font-extrabold tabular-nums", t.muted ? "text-slate-400" : "text-emerald-600 dark:text-emerald-400")}>{t.price}</span>
                </div>
              ))}
            </div>
            <button onClick={() => router.push('/produits')} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-[13px] font-bold text-white hover:bg-amber-600">
              <Icon name="boxes" size={14}/>Voir les produits éligibles
            </button>
          </div>
        </div>

        {/* Trust */}
        <div className="mt-10">
          <TrustStrip/>
        </div>

        {/* Testimonials */}
        {TESTIMONIALS.length > 0 && (
        <div className="mt-10">
          <div className="mb-4 flex items-baseline justify-between">
            <h2 className="text-[20px] font-extrabold tracking-tight text-slate-900 dark:text-white">Ils nous font confiance</h2>
          </div>
          <div className="grid grid-cols-3 gap-4">
            {TESTIMONIALS.map((t) => (
              <Card key={t.initials} className="p-5">
                <div className="mb-3 flex text-amber-500">
                  {Array.from({ length: 5 }).map((_, i) => <Icon key={i} name="star" size={14} strokeWidth={0} className={i < t.rating ? "fill-amber-500" : "fill-slate-200 dark:fill-slate-700"}/>)}
                </div>
                <p className="text-[14px] leading-relaxed text-slate-700 dark:text-slate-300">« {t.quote} »</p>
                <div className="mt-4 flex items-center gap-3">
                  <span className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-violet-500 to-emerald-500 text-[12px] font-extrabold text-white">{t.initials}</span>
                  <div>
                    <p className="text-[13px] font-bold text-slate-900 dark:text-white">{t.handle}</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">{t.role}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
        )}

        {/* Footer */}
        <div className="mt-14 border-t border-slate-200 pt-6 pb-4 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[15px] font-extrabold tracking-tight text-slate-900 dark:text-white"><span className="text-emerald-600">DDM</span>+</p>
              <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">Import direct Chine → Sénégal · Escrow Mobile Money · Support 7j/7</p>
            </div>
            <div className="flex gap-4 text-[12px] text-slate-500 dark:text-slate-400">
              <Link href="/produits">À propos</Link><Link href="/contact">Contact</Link><Link href="/cgv">CGU</Link><Link href="/politique-confidentialite">Confidentialité</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</>
  );

}
