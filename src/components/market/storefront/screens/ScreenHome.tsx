'use client';

import { useState, useEffect, useMemo } from 'react';
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
import { HomeSkeleton } from '../Skeleton';
import { useQuickAdd } from '../useQuickAdd';
import { mapCatalogItem, mapGroupOrder, mapCategory } from '../data-mappers';
import { QUANTITY_TIERS } from '@/lib/pricing/tiered-pricing';
import { SERVICE_FEE_TIERS } from '@/lib/pricing/tiered-service-fees';
import type { Product, Group, Category } from '../types';


export default function ScreenHome() {
  const router = useRouter();
  const { open: openSourcing } = useSourcingModal();
  const { quickAdd, toast: quickAddToast } = useQuickAdd();
  const [loading, setLoading] = useState(true);
  const [CATALOG, setCATALOG] = useState<Product[]>([]);
  const [GROUPS, setGROUPS] = useState<Group[]>([]);
  const [CATEGORIES, setCATEGORIES] = useState<Category[]>([]);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch('/api/catalog/products?limit=12&compact=1').then(r => r.json()).catch(() => null),
      fetch('/api/group-orders?limit=6').then(r => r.json()).catch(() => null),
      fetch('/api/catalog/category-highlights').then(r => r.json()).catch(() => null),
    ]).then(([prodRes, grpRes, catRes]) => {
      if (prodRes?.products?.length || prodRes?.items?.length) {
        const list = prodRes.products || prodRes.items;
        setCATALOG((list as unknown[]).map(mapCatalogItem) as Product[]);
      }
      if (grpRes?.groups?.length) setGROUPS(grpRes.groups.map(mapGroupOrder));
      const catList = catRes?.categories || catRes?.items;
      if (catList?.length) {
        setCATEGORIES(catList.map((c: any) => ({ ...mapCategory(c), image: c.image, count: c.count })));
      }
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const popular = CATALOG.filter((p) => p.img && !p.img.includes('placeholder')).slice(0, 6);

  // Catégories populaires : comptage + image calculés serveur (endpoint léger).
  const popularCategories = CATEGORIES
    .map((c: any) => ({ ...c, count: c.count ?? 0, image: c.image }))
    .sort((a, b) => b.count - a.count);
  const liveGroups = GROUPS.filter((g) => g.status === 'live' || g.status === 'almost');
  const avgSave = liveGroups.length
    ? Math.round(liveGroups.reduce((s, g) => s + (g.save || 0), 0) / liveGroups.length)
    : 0;

  // Paliers de remise quantité dérivés du moteur de prix : la vitrine annonçait
  // « 5-9 pcs → -13% / 25+ → -40% » alors que le moteur applique 20+ → -5%,
  // 50+ → -10%, 100+ → -15%. Les chiffres viennent désormais de la source.
  const quantityTierRows = useMemo(() => {
    const first = QUANTITY_TIERS[0];
    return [
      {
        qty: first ? `1-${first.minQuantity - 1} pcs` : '1+ pcs',
        price: 'Prix unitaire',
        muted: true,
        icon: 'x',
        highlight: false,
      },
      ...QUANTITY_TIERS.map((t, i) => ({
        qty: t.maxQuantity ? `${t.minQuantity}-${t.maxQuantity} pcs` : `${t.minQuantity}+ pcs`,
        price: `-${t.discountPercent}%`,
        muted: false,
        icon: i === QUANTITY_TIERS.length - 1 ? 'flame' : 'check',
        highlight: i === QUANTITY_TIERS.length - 1,
      })),
    ];
  }, []);

  const maxQuantityDiscount = useMemo(
    () => QUANTITY_TIERS.reduce((m, t) => Math.max(m, t.discountPercent), 0),
    []
  );
  const standardServiceFeeRate = SERVICE_FEE_TIERS[0]?.feeRate ?? 10;
  const bestServiceFeeRate = useMemo(
    () => SERVICE_FEE_TIERS.reduce((m, t) => Math.min(m, t.feeRate), standardServiceFeeRate),
    [standardServiceFeeRate]
  );

  if (loading) {
    return <HomeSkeleton />;
  }

  
  // Contenu partagé des cartes « 3 façons d'importer » — libellés honnêtes,
  // chaque CTA mène à la fonctionnalité réelle (modal sourcing, groupes, lot).
  const waysToImport = [
    { icon: "camera", tone: "violet", tag: "01 · Sourcing", ttl: "Trouvez-moi ce produit en 24h", sub: "Photo, lien ou description — devis garanti sous 24h ouvrées par notre équipe en Chine.", cta: "Envoyer une demande" },
    { icon: "users", tone: "emerald", tag: "02 · Groupes", ttl: "Achats groupés", sub: liveGroups.length > 0 && avgSave > 0 ? `${liveGroups.length} groupe${liveGroups.length > 1 ? 's' : ''} en cours, −${avgSave}% d'économie moyenne sur les groupes ouverts.` : "Rejoignez ou créez un groupe : plus on est nombreux, plus le prix baisse.", cta: "Voir les groupes actifs" },
    { icon: "package", tone: "amber", tag: "03 · Lot minimum", ttl: "Prix par palier", sub: `Remise quantité dès ${QUANTITY_TIERS[0]?.minQuantity ?? 20} unités, jusqu'à −${maxQuantityDiscount}%, et frais de service dégressifs de ${standardServiceFeeRate}% à ${bestServiceFeeRate}%.`, cta: "Voir les produits en lot" },
  ];
  const wayTone: Record<string, string> = {
    violet: "bg-violet-100 text-violet-700 dark:bg-violet-950/60 dark:text-violet-300",
    emerald: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300",
    amber: "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300",
  };
  const wayCtaTone: Record<string, string> = {
    violet: "text-violet-700 dark:text-violet-300",
    emerald: "text-emerald-700 dark:text-emerald-400",
    amber: "text-amber-700 dark:text-amber-300",
  };
  const wayHref = (icon: string) =>
    icon === 'camera' ? openSourcing : () => router.push(icon === 'users' ? '/achats-groupes' : '/produits?moq=lot');

  // Une seule carte de groupe — scroll horizontal mobile, ticker desktop.
  const groupDeal = (g: Group, key: string | number) => {
    const pct = g.targetQty > 0 ? Math.round((g.currentQty / g.targetQty) * 100) : 0;
    const almost = g.status === "almost";
    return (
      <Link key={key} href={`/achats-groupes/${g.id}`} className="flex-shrink-0 snap-start block rounded-xl bg-white border border-slate-200 p-3 w-[220px] md:w-[260px] hover:shadow-md transition-shadow md:bg-slate-800 md:border-white/10 md:hover:bg-slate-700">
        <div className="flex items-center gap-2.5">
          <span className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-full">
            <img src={g.image || '/placeholder.svg'} alt={g.name} onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/placeholder.svg'; }} className="h-full w-full object-cover" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-bold text-slate-900 dark:text-white md:text-white line-clamp-1">{g.name}</p>
            <div className="mt-0.5 flex items-baseline gap-1 whitespace-nowrap">
              <span className="text-[12px] md:text-[13px] font-extrabold text-violet-700 dark:text-violet-300 md:text-violet-300 tabular-nums">{formatFcfa(g.unit)}</span>
              <span className="text-[9px] font-semibold text-slate-400 line-through tabular-nums">{formatFcfa(g.base)}</span>
            </div>
          </div>
        </div>
        <ProgressBar value={g.currentQty} max={g.targetQty} tone="mixed" className="!h-1 mt-2"/>
        <div className="mt-1.5 flex items-center justify-between">
          <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 md:text-slate-400 tabular-nums whitespace-nowrap">{pct}% · <span className="text-red-600 dark:text-red-400 md:text-red-400 font-bold">⏱ {g.deadline.split(" ").slice(0,2).join(" ")}</span></span>
          <span className={cn("whitespace-nowrap rounded-md px-2 py-1 text-[10px] font-bold text-white", almost ? "bg-red-500" : "bg-violet-600")}>
            {almost ? "Presque plein" : "Rejoindre"}
          </span>
        </div>
      </Link>
    );
  };

  return (
    <>
      <div className="min-h-full overflow-x-hidden bg-slate-50 dark:bg-slate-950">

        {/* HERO — un seul bloc : le message est partagé, la mosaïque est desktop */}
        <div className="overflow-hidden md:w-[100vw] md:ml-[calc((100%-100vw)/2)] md:border md:border-slate-200 md:dark:border-slate-800 md:shadow-sm">
          <div className="relative overflow-hidden bg-gradient-to-br from-violet-600 via-violet-700 to-emerald-600 text-white">
            <div className="absolute inset-0 opacity-15">
              <svg viewBox="0 0 800 500" className="h-full w-full" preserveAspectRatio="xMidYMid slice">
                <defs><pattern id="dotshero" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse"><circle cx="1.5" cy="1.5" r="1" fill="white"/></pattern></defs>
                <rect width="800" height="500" fill="url(#dotshero)"/>
              </svg>
            </div>
            <div className="relative mx-auto grid max-w-6xl gap-6 px-5 py-6 md:grid-cols-[1.15fr_1fr] md:items-start md:gap-8 md:px-10 md:pb-10 md:pt-8">
              <div className="md:pt-2">
                <div className="mb-3 flex flex-wrap gap-1.5 md:mb-4 md:gap-2">
                  <span className="inline-flex items-center gap-1 md:gap-1.5 rounded-full bg-white/15 border border-white/25 px-2 md:px-3 py-1 md:py-1.5 text-[10px] md:text-[11px] font-bold whitespace-nowrap">
                    <span className="h-1 w-1 md:h-1.5 md:w-1.5 rounded-full bg-emerald-300 animate-ping-slow"/>
                    <b className="tabular-nums">{liveGroups.length}</b> groupe{liveGroups.length > 1 ? 's' : ''} en cours
                  </span>
                  {avgSave > 0 && (
                    <span className="inline-flex items-center gap-1 md:gap-1.5 rounded-full bg-white/15 border border-white/25 px-2 md:px-3 py-1 md:py-1.5 text-[10px] md:text-[11px] font-bold whitespace-nowrap"><b>−{avgSave}%</b> éco. moy.</span>
                  )}
                  <span className="inline-flex items-center gap-1 md:gap-1.5 rounded-full bg-white/15 border border-white/25 px-2 md:px-3 py-1 md:py-1.5 text-[10px] md:text-[11px] font-bold whitespace-nowrap">Devis sous <b className="tabular-nums">24h</b></span>
                </div>
                <h1 className="text-[28px] md:text-[52px] font-extrabold leading-[1] md:leading-[0.98] tracking-tight">Importez de Chine,<br/>à <span className="text-emerald-300">prix usine</span>.</h1>
                <p className="mt-2 md:mt-3 max-w-md text-[12px] md:text-[15px] leading-snug text-white/85">Sourcing dédié, achats groupés et lots avantageux — livrés au Sénégal en 4-45 jours selon votre choix.</p>
                <div className="mt-3 md:mt-4 flex flex-wrap gap-1.5 md:gap-2">
                  <span className="inline-flex items-center gap-1 md:gap-1.5 rounded-full border border-white/25 bg-white/10 px-2 md:px-3 py-1 md:py-1.5 text-[10px] md:text-[12px] font-semibold whitespace-nowrap"><Icon name="camera" size={11}/>Trouvez-moi 24h</span>
                  <span className="inline-flex items-center gap-1 md:gap-1.5 rounded-full border border-white/25 bg-white/10 px-2 md:px-3 py-1 md:py-1.5 text-[10px] md:text-[12px] font-semibold whitespace-nowrap"><Icon name="users" size={11}/>Achats groupés</span>
                  <span className="inline-flex items-center gap-1 md:gap-1.5 rounded-full border border-white/25 bg-white/10 px-2 md:px-3 py-1 md:py-1.5 text-[10px] md:text-[12px] font-semibold whitespace-nowrap"><Icon name="package" size={11}/>Prix par palier</span>
                </div>
                <div className="mt-4 md:mt-5 flex gap-2 md:gap-3">
                  <button onClick={() => router.push('/produits')} className="whitespace-nowrap inline-flex items-center gap-1 md:gap-2 rounded-xl bg-white px-3 md:px-5 py-2 md:py-3 text-[12px] md:text-[14px] font-bold text-slate-900 hover:bg-slate-100">Explorer le catalogue <Icon name="arrowRight" size={14}/></button>
                  <button onClick={openSourcing} className="whitespace-nowrap inline-flex items-center gap-1 md:gap-2 rounded-xl bg-white/10 border border-white/25 px-3 md:px-5 py-2 md:py-3 text-[12px] md:text-[14px] font-bold text-white hover:bg-white/20"><Icon name="camera" size={14}/>Trouvez-moi</button>
                </div>
              </div>

              {/* Mosaïque produits — desktop uniquement */}
              <div className="relative hidden md:block">
                <div className="mb-2 flex items-center justify-between">
                  <span className="inline-flex items-center gap-1 rounded-md bg-slate-900/40 backdrop-blur px-2 py-1 text-[10px] font-bold uppercase tracking-wider">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-300 animate-ping-slow"/>À la une
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
                        ) : (p.moq ?? 0) > 1 ? (
                          <span className="inline-flex items-center gap-0.5 rounded bg-amber-500 text-slate-900 px-1.5 py-0.5 text-[9px] font-extrabold">MIN {p.moq}</span>
                        ) : null}
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

          {/* Groupes en cours — scroll horizontal mobile, ticker desktop */}
          {liveGroups.length > 0 && (
            <div className="bg-slate-900 md:border-t md:border-white/10">
              {/* Mobile */}
              <div className="pt-4 md:hidden">
                <div className="flex items-center justify-between px-4 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 rounded-md bg-red-500/10 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-red-500">
                      <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-ping-slow"/>En direct
                    </span>
                    <p className="text-[13px] font-extrabold text-white">Groupes en cours</p>
                  </div>
                  <Link href="/achats-groupes" className="text-[11px] font-bold text-emerald-400 whitespace-nowrap">Voir tout</Link>
                </div>
                <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-4">
                  {liveGroups.slice(0, 4).map((g) => groupDeal(g, g.id))}
                </div>
              </div>
              {/* Desktop : ticker */}
              <div className="hidden md:flex items-center gap-6">
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
                    {[...liveGroups, ...liveGroups].map((g, i) => groupDeal(g, i))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="mx-auto max-w-6xl px-4 pb-6 md:px-6">
          {/* Sélection — scroll horizontal mobile, grille 6 desktop */}
          {popular.length > 0 && (
            <Section
              title="Sélection DDM+"
              className="mt-4 md:mt-10"
              right={<Link href="/produits" className="text-[11px] md:text-[13px] font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">Voir tout</Link>}
            >
              <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1 md:mx-0 md:grid md:grid-cols-6 md:overflow-visible md:px-0 md:pb-0">
                {popular.map((p) => (
                  <div key={p.id} className="w-[150px] flex-shrink-0 snap-start md:w-auto">
                    <ProductCard product={p} size="lg" onQuickAdd={quickAdd} onClick={() => router.push(`/produits/${p.id}`)}/>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* 3 façons d'importer — contenu partagé, rangée mobile / carte desktop */}
          <div className="mt-6 md:mt-10">
            <p className="mb-2.5 md:mb-3 text-[10px] md:text-[11px] font-bold uppercase tracking-wider md:tracking-widest text-slate-500 dark:text-slate-400">3 façons d'importer avec DDM+</p>
            <div className="space-y-2.5 md:grid md:grid-cols-3 md:gap-4 md:space-y-0">
              {waysToImport.map((b, i) => (
                <Card key={i} onClick={wayHref(b.icon)} className="cursor-pointer overflow-hidden p-3 md:p-5 hover:shadow-md transition-shadow group" tabIndex={0}>
                  <div className="flex items-center gap-3 md:block">
                    <div className="md:mb-3 md:flex md:items-center md:justify-between">
                      <span className={cn("grid h-12 w-12 flex-shrink-0 place-items-center rounded-xl", wayTone[b.tone])}>
                        <Icon name={b.icon} size={22}/>
                      </span>
                      <span className="hidden md:inline text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{b.tag}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="md:hidden text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{b.tag}</p>
                      <h3 className="mt-0.5 text-[13px] md:text-[18px] font-extrabold text-slate-900 dark:text-white leading-tight tracking-tight">{b.ttl}</h3>
                      <p className="mt-0.5 md:mt-1 text-[11px] md:text-[13px] text-slate-500 dark:text-slate-400 leading-tight md:leading-relaxed">{b.sub}</p>
                      <div className={cn("mt-4 hidden md:inline-flex items-center gap-1 text-[13px] font-bold group-hover:gap-2 transition-all", wayCtaTone[b.tone])}>
                        {b.cta} <Icon name="arrowRight" size={14}/>
                      </div>
                    </div>
                    <Icon name="chevronRight" size={16} className={cn("flex-shrink-0 md:hidden", wayCtaTone[b.tone])}/>
                  </div>
                </Card>
              ))}
            </div>
          </div>

          {/* Sourcing + MOQ — côte à côte desktop, empilés mobile */}
          <div className="mt-6 grid gap-4 md:mt-10 md:grid-cols-2">
            <div className="overflow-hidden rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-50 via-white to-violet-50 p-4 md:p-6 dark:border-violet-900 dark:from-violet-950/40 dark:via-slate-900 dark:to-violet-950/40">
              <div className="flex items-center gap-2 md:gap-3">
                <span className="grid h-8 w-8 md:h-11 md:w-11 place-items-center rounded-lg md:rounded-xl bg-violet-600 text-white"><Icon name="camera" size={16}/></span>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider md:tracking-widest text-violet-700 dark:text-violet-300">Sourcing sur demande</p>
                  <h3 className="text-[14px] md:text-[20px] font-extrabold text-slate-900 dark:text-white leading-tight tracking-tight">Trouvez-moi ce produit en 24h</h3>
                </div>
              </div>
              <p className="mt-2 md:mt-3 text-[12px] md:text-[13px] text-slate-600 dark:text-slate-400 leading-snug md:leading-relaxed">Vous ne trouvez pas votre produit ? Notre équipe le trouve pour vous. Envoyez une photo, un lien ou une description.</p>
              <div className="mt-3 md:mt-4 grid grid-cols-3 gap-2">
                {[
                  { n: 1, ttl: "Envoyez", sub: "Photo, lien ou texte" },
                  { n: 2, ttl: "Recevez", sub: "Devis en 24h" },
                  { n: 3, ttl: "Commandez", sub: "On gère l'import" },
                ].map((s) => (
                  <div key={s.n} className="rounded-xl bg-white/60 md:bg-white/70 p-2 md:p-3 text-center dark:bg-slate-900/60 md:dark:bg-slate-900/70">
                    <p className="text-[10px] md:text-[11px] font-extrabold text-violet-700 dark:text-violet-300">0{s.n}</p>
                    <p className="mt-0.5 md:mt-1 text-[11px] md:text-[13px] font-bold text-slate-900 dark:text-white leading-tight">{s.ttl}</p>
                    <p className="text-[9px] md:text-[11px] text-slate-500 dark:text-slate-400 leading-tight">{s.sub}</p>
                  </div>
                ))}
              </div>
              <button onClick={openSourcing} className="mt-3 md:mt-5 inline-flex w-full md:w-auto items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-[13px] font-bold text-white hover:bg-violet-700">
                <Icon name="camera" size={14}/>Photographier un produit
              </button>
            </div>

            <div className="overflow-hidden rounded-2xl border border-amber-200 bg-amber-50 p-4 md:p-6 dark:border-amber-900 dark:bg-amber-950/40">
              <div className="flex items-center gap-2 md:gap-3">
                <span className="grid h-8 w-8 md:h-11 md:w-11 place-items-center rounded-lg md:rounded-xl bg-amber-500 text-white"><Icon name="boxes" size={16}/></span>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider md:tracking-widest text-amber-700 dark:text-amber-300">Lot minimum</p>
                  <h3 className="text-[14px] md:text-[20px] font-extrabold text-slate-900 dark:text-white leading-tight tracking-tight">Pourquoi commander en quantité ?</h3>
                </div>
              </div>
              <p className="mt-2 md:mt-3 text-[12px] md:text-[13px] text-slate-600 dark:text-slate-400 leading-snug md:leading-relaxed">Le prix baisse par palier et les frais de service sont dégressifs : {standardServiceFeeRate}% en standard, jusqu&apos;à {bestServiceFeeRate}% sur les gros volumes.</p>
              <div className="mt-3 md:mt-4 space-y-1.5">
                {quantityTierRows.map((t, i) => (
                  <div key={i} className={cn("flex items-center justify-between rounded-lg px-3 py-1.5 md:py-2", t.highlight ? "bg-white shadow-sm dark:bg-slate-900" : "")}>
                    <span className="text-[11px] md:text-[12px] font-semibold text-slate-700 dark:text-slate-300 tabular-nums inline-flex items-center gap-1">
                      <Icon name={t.icon as string} size={11} className={cn(t.muted ? "text-slate-400" : "text-emerald-600")} />
                      {t.qty}
                    </span>
                    <span className={cn("text-[13px] md:text-[15px] font-extrabold tabular-nums", t.muted ? "text-slate-400" : "text-emerald-600 dark:text-emerald-400")}>{t.price}</span>
                  </div>
                ))}
              </div>
              <button onClick={() => router.push('/produits?moq=lot')} className="mt-3 md:mt-5 inline-flex w-full md:w-auto items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-[13px] font-bold text-white hover:bg-amber-600">
                <Icon name="boxes" size={14}/>Voir les produits éligibles
              </button>
            </div>
          </div>

          {/* Catégories — grille 2 mobile, 3 desktop, cartes partagées */}
          {popularCategories.length > 0 && (
            <Section title="Catégories populaires" className="mt-6 md:mt-10" right={<Link href="/produits" className="text-[11px] md:text-[13px] font-bold md:font-semibold text-emerald-600 md:text-slate-600 dark:text-emerald-400 md:dark:text-slate-400 whitespace-nowrap">Voir tout</Link>}>
              <div className="grid grid-cols-2 gap-2.5 md:grid-cols-3 md:gap-4">
                {popularCategories.slice(0, 6).map((c) => (
                  <button key={c.key} onClick={() => router.push(`/produits?cat=${encodeURIComponent(c.key)}`)} className="group relative h-28 md:h-44 overflow-hidden rounded-2xl border border-slate-200 text-left hover:shadow-md md:hover:shadow-lg dark:border-slate-800 md:transition-shadow">
                    {c.image && !String(c.image).includes('placeholder') ? (
                      <img src={c.image} alt={c.label} loading="lazy" className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"/>
                    ) : (
                      <span className="absolute inset-0 grid place-items-center bg-gradient-to-br from-slate-100 to-slate-200 text-slate-400 dark:from-slate-800 dark:to-slate-900 dark:text-slate-500"><Icon name={c.icon} size={28}/></span>
                    )}
                    <span className="absolute inset-0 bg-gradient-to-t from-slate-900/85 via-slate-900/25 to-transparent"/>
                    <span className="absolute right-2 top-2 grid h-6 w-6 place-items-center rounded-full bg-white/90 text-slate-900 group-hover:bg-emerald-500 group-hover:text-white transition-colors"><Icon name="arrowRight" size={12}/></span>
                    <span className="absolute inset-x-0 bottom-0 p-2.5 md:p-4">
                      <span className="block text-[12px] md:text-[15px] font-extrabold text-white leading-tight">{c.label}</span>
                      <span className="mt-0.5 block text-[10px] md:text-[11px] font-semibold text-white/75">{c.count > 0 ? `${c.count} produit${c.count > 1 ? 's' : ''}` : 'Explorer'}</span>
                    </span>
                  </button>
                ))}
              </div>
            </Section>
          )}

          {/* Trust */}
          <div className="mt-6 md:mt-10">
            <TrustStrip compact/>
          </div>
        </div>
      </div>
      {quickAddToast}
    </>
  );
}
