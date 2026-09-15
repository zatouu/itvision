'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { formatFcfa } from '../formatFcfa';
import { Icon } from '../Icon';
import { Button } from '../Button';
import { GroupCard } from '../GroupCard';
import { QUANTITY_TIERS } from '@/lib/pricing/tiered-pricing';
import { Skeleton } from '../Skeleton';
import { mapProductDetail, mapGroupOrder } from '../data-mappers';
import type { Product, Group } from '../types';


export default function ScreenGroups() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [PRODUCT, setPRODUCT] = useState<Product | null>(null);
  const [GROUPS, setGROUPS] = useState<Group[]>([]);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch('/api/group-orders?limit=50').then(r => r.json()).catch(() => null),
      fetch('/api/catalog/products?limit=1&compact=1').then(r => r.json()).catch(() => null),
    ]).then(([res, prodRes]) => {
      if (res?.groups?.length) setGROUPS(res.groups.map(mapGroupOrder));
      if (prodRes?.products?.[0] || prodRes?.items?.[0]) {
        setPRODUCT(mapProductDetail(prodRes.products?.[0] || prodRes.items?.[0]) as Product | null);
      }
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);


  const [cat, setCat] = useState("Tous");
  const [sort, setSort] = useState("hot");
  // Catégories dérivées des groupes réels (plus de liste codée en dur)
  const cats = ["Tous", ...Array.from(new Set(GROUPS.map((g) => g.category).filter(Boolean)))];
  const sorts = [
    { k: "hot", l: "Populaires" },
    { k: "ending", l: "Bientôt fermés" },
    { k: "new", l: "Récents" },
    { k: "saving", l: "Plus d'éco." },
  ];

  const filtered = GROUPS
    .filter((g) => cat === "Tous" || g.category === cat)
    .sort((a, b) => {
      switch (sort) {
        case "ending": return (a.deadlineAt || Infinity) - (b.deadlineAt || Infinity);
        case "new": return (b.createdAt ?? 0) - (a.createdAt ?? 0);
        case "saving": return (b.save ?? 0) - (a.save ?? 0);
        default: return (b.participants ?? 0) - (a.participants ?? 0); // "hot"
      }
    });

  const [simQty, setSimQty] = useState(15);
  const simTiers = PRODUCT?.priceTiers ?? [];
  const simTier =
    simTiers.slice().reverse().find((t) => simQty >= t.from) ||
    simTiers[0] ||
    { unit: PRODUCT?.price ?? 0, from: 1, to: null, save: 0 };
  // Référence = prix produit réel (basePrice = meilleur palier, pas le prix plein)
  const simSavings = Math.max(0, ((PRODUCT?.price ?? 0) - simTier.unit) * simQty);

  // Courbe de prix — calculée sur les vrais paliers quantité du moteur.
  // x = quantité, y = indice de prix (100 = prix unitaire).
  // Hooks AVANT l'early return loading (règle react-hooks).
  const curvePoints = useMemo(() => {
    const pts = [{ qty: 1, idx: 100 }];
    for (const t of QUANTITY_TIERS) pts.push({ qty: t.minQuantity, idx: 100 - t.discountPercent });
    const last = QUANTITY_TIERS[QUANTITY_TIERS.length - 1];
    if (last) pts.push({ qty: last.minQuantity + 20, idx: 100 - last.discountPercent });
    return pts;
  }, []);
  const maxQty = curvePoints[curvePoints.length - 1]?.qty ?? 120;
  const cx = (q: number) => 24 + (q / maxQty) * 296;
  const cy = (idx: number) => 16 + ((100 - idx) / 20) * 128;
  const curvePath = curvePoints.map((p, i) => `${i === 0 ? 'M' : 'L'}${cx(p.qty).toFixed(1)} ${cy(p.idx).toFixed(1)}`).join(' ');

  if (loading) {
    return (
      <div className="min-h-full bg-slate-50 dark:bg-slate-950">
        <div className="mx-auto max-w-6xl md:px-6 md:py-6">
          <Skeleton className="h-44 w-full md:h-64 md:rounded-3xl" />
          <div className="grid grid-cols-2 gap-3 p-4 md:mt-4 md:grid-cols-3 md:gap-4 md:p-0">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-52 rounded-2xl" />)}
          </div>
        </div>
      </div>
    );
  }

  const hasGroups = GROUPS.length > 0;
  const totalParticipants = GROUPS.reduce((s, g) => s + (g.participants ?? 0), 0);
  const avgSave = GROUPS.length ? Math.round(GROUPS.reduce((s, g) => s + (g.save ?? 0), 0) / GROUPS.length) : 0;

  const steps = [
    { n: '01', icon: 'search', ttl: 'Choisissez', sub: 'un produit du catalogue ou un groupe existant' },
    { n: '02', icon: 'users', ttl: 'Invitez', sub: 'd\'autres acheteurs — chacun paie sa part' },
    { n: '03', icon: 'checkCircle', ttl: 'Économisez', sub: 'au prix du palier débloqué à la clôture' },
  ];

  return (
    <div className="min-h-full bg-[#faf9f5] pb-20 text-slate-900 dark:bg-slate-950 dark:text-white md:pb-0">
      <div className="mx-auto max-w-6xl md:px-6 md:py-8">

        {/* Hero éditorial : message + courbe de prix réelle */}
        <div className="overflow-hidden border-b border-slate-200 md:rounded-3xl md:border dark:border-slate-800">
          <div className="grid bg-white dark:bg-slate-900 md:grid-cols-[1.1fr_1fr]">
            <div className="relative px-5 py-8 md:p-10">
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-violet-700 dark:text-violet-300">
                Marketplace collective · DDM+
              </p>
              <h1 className="mt-3 font-[var(--font-brand)] text-[34px] font-black leading-[1.02] tracking-tight md:text-[52px]">
                Plus on est,<br/>
                <span className="text-emerald-600 dark:text-emerald-400">moins c'est cher.</span>
              </h1>
              <p className="mt-3 max-w-md text-[13px] leading-relaxed text-slate-600 dark:text-slate-400 md:text-[15px]">
                Rejoignez un achat groupé ou créez le vôtre. Le prix unitaire baisse
                à chaque participant — jusqu'à la deadline.
              </p>
              <div className="mt-5 flex flex-wrap items-center gap-2">
                <button onClick={() => router.push('/achats-groupes/nouveau')} className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-5 py-2.5 text-[13px] font-bold text-white transition-colors hover:bg-slate-700 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200">
                  <Icon name="plus" size={14}/>Créer un groupe
                </button>
                {hasGroups && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-300 px-3 py-1.5 text-[11px] font-bold text-slate-700 dark:border-slate-700 dark:text-slate-300">
                    <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-ping-slow"/>
                    {GROUPS.length} groupe{GROUPS.length > 1 ? 's' : ''} en cours
                  </span>
                )}
              </div>
              {hasGroups && (
                <div className="mt-6 grid max-w-sm grid-cols-3 gap-3">
                  <div>
                    <p className="font-[var(--font-brand)] text-[22px] font-black tabular-nums md:text-[28px]">{GROUPS.length}</p>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Groupes actifs</p>
                  </div>
                  <div>
                    <p className="font-[var(--font-brand)] text-[22px] font-black tabular-nums md:text-[28px]">{totalParticipants}</p>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Participants</p>
                  </div>
                  <div>
                    <p className="font-[var(--font-brand)] text-[22px] font-black tabular-nums text-emerald-600 dark:text-emerald-400 md:text-[28px]">{avgSave > 0 ? `-${avgSave}%` : '—'}</p>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Éco. moyenne</p>
                  </div>
                </div>
              )}
            </div>

            {/* Courbe prix × quantité — paliers réels du moteur */}
            <div className="relative border-t border-slate-100 bg-[#f6f4ee] px-5 py-6 dark:border-slate-800 dark:bg-slate-950/60 md:border-l md:border-t-0 md:p-8">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                Le prix baisse avec la quantité
              </p>
              <svg viewBox="0 0 320 170" className="mt-3 w-full" role="img" aria-label="Courbe du prix unitaire en fonction de la quantité commandée">
                <defs>
                  <linearGradient id="curveFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#059669" stopOpacity="0.22"/>
                    <stop offset="100%" stopColor="#059669" stopOpacity="0"/>
                  </linearGradient>
                </defs>
                <path d={`${curvePath} L${cx(maxQty).toFixed(1)} 152 L${cx(1).toFixed(1)} 152 Z`} fill="url(#curveFill)"/>
                <path d={curvePath} fill="none" stroke="#059669" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                {curvePoints.slice(0, -1).map((p) => (
                  <g key={p.qty}>
                    <circle cx={cx(p.qty)} cy={cy(p.idx)} r="4" fill="#fff" stroke="#059669" strokeWidth="2.5"/>
                    <text x={cx(p.qty)} y={cy(p.idx) - 9} textAnchor="middle" fontSize="10" fontWeight="700" fill="#0f172a" className="dark:fill-white">{p.qty === 1 ? '1 pc' : `${p.qty}+ pcs`}</text>
                    <text x={cx(p.qty)} y={cy(p.idx) + 16} textAnchor="middle" fontSize="10" fontWeight="800" fill="#059669">{p.idx === 100 ? 'prix plein' : `-${100 - p.idx}%`}</text>
                  </g>
                ))}
              </svg>
              <p className="mt-1 text-[10px] text-slate-500 dark:text-slate-500">
                Paliers de remise quantité appliqués par le moteur de prix DDM+.
              </p>
            </div>
          </div>
        </div>

        {/* Opportunités */}
        <div className="mt-8 md:mt-12">
          <div className="flex items-end justify-between px-4 md:px-0">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">En direct</p>
              <h2 className="mt-1 font-[var(--font-brand)] text-[24px] font-black tracking-tight md:text-[32px]">Les opportunités qui prennent de l'ampleur</h2>
            </div>
          </div>

          {hasGroups && (
            <div className="sticky top-[var(--mkt-header-h,0px)] z-10 mt-4 border-y border-slate-200 bg-[#faf9f5]/95 py-2 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95 md:static md:mt-5 md:flex md:items-center md:justify-between md:gap-4 md:border-0 md:bg-transparent md:p-0 md:backdrop-blur-0 md:dark:bg-transparent">
              <div className="flex gap-1.5 overflow-x-auto px-4 pb-1 md:gap-2 md:px-0 md:pb-0">
                {cats.map((c)=>(
                  <button key={c} onClick={()=>setCat(c)} className={cn("flex-shrink-0 rounded-full px-3.5 py-1.5 text-[12px] font-bold whitespace-nowrap border transition-colors md:px-4 md:py-2 md:text-sm", cat===c?"border-slate-900 bg-slate-900 text-white dark:border-white dark:bg-white dark:text-slate-900":"border-slate-300 bg-white text-slate-600 hover:border-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-slate-500")}>{c}</button>
                ))}
              </div>
              <div className="mt-1.5 flex items-center justify-between px-4 md:mt-0 md:justify-end md:gap-3 md:px-0">
                <p className="text-[12px] font-semibold text-slate-500 dark:text-slate-400 md:text-sm"><b className="text-slate-900 tabular-nums dark:text-white">{filtered.length}</b> groupe{filtered.length > 1 ? 's' : ''}</p>
                <select value={sort} onChange={e=>setSort(e.target.value)} className="rounded-lg border-0 bg-transparent pr-1 text-[12px] font-bold text-slate-700 outline-none dark:text-slate-300 md:h-10 md:rounded-xl md:border md:border-slate-300 md:bg-white md:px-3 md:text-sm md:font-semibold md:dark:border-slate-700 md:dark:bg-slate-900">
                  {sorts.map(s=><option key={s.k} value={s.k}>Tri : {s.l}</option>)}
                </select>
              </div>
            </div>
          )}

          {filtered.length > 0 ? (
            <div className="mt-4 grid grid-cols-2 gap-3 px-4 md:grid-cols-3 md:gap-5 md:px-0">
              {filtered.map((g) => <GroupCard key={g.id} group={g} onClick={() => router.push(`/achats-groupes/${g.id}`)}/>)}
            </div>
          ) : hasGroups ? (
            <div className="mx-4 mt-4 flex flex-col items-center rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center dark:border-slate-700 dark:bg-slate-900 md:mx-0">
              <p className="text-[14px] font-extrabold">Aucun groupe dans « {cat} »</p>
              <p className="mt-1 text-[12px] text-slate-500 dark:text-slate-400">Essayez une autre catégorie ou un autre tri.</p>
              <Button variant="secondary" size="md" className="mt-4" onClick={() => setCat('Tous')}>Voir tous les groupes</Button>
            </div>
          ) : (
            <div className="mx-4 mt-4 md:mx-0">
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center dark:border-slate-700 dark:bg-slate-900 md:p-10">
                <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300">
                  <Icon name="users" size={24}/>
                </span>
                <p className="mt-4 font-[var(--font-brand)] text-[20px] font-black tracking-tight md:text-[24px]">Aucun achat groupé en cours</p>
                <p className="mx-auto mt-2 max-w-md text-[13px] text-slate-500 dark:text-slate-400">
                  Lancez le premier : choisissez un produit, fixez l'objectif, invitez la communauté. Le prix baisse à chaque participant.
                </p>
                <div className="mt-5 flex flex-col items-center justify-center gap-2 sm:flex-row-reverse">
                  <button onClick={() => router.push('/achats-groupes/nouveau')} className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-6 py-2.5 text-[13px] font-bold text-white hover:bg-slate-700 dark:bg-white dark:text-slate-900">
                    <Icon name="plus" size={14}/>Créer le premier groupe
                  </button>
                  <button onClick={() => router.push('/produits')} className="text-[13px] font-bold text-slate-600 underline-offset-4 hover:underline dark:text-slate-300">Explorer le catalogue</button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Section sombre — comment ça marche + manifeste */}
        <div className="mt-10 bg-slate-900 px-5 py-8 text-white md:mt-14 md:rounded-3xl md:p-10">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-emerald-400">Le principe</p>
          <h2 className="mt-2 font-[var(--font-brand)] text-[24px] font-black leading-tight tracking-tight md:text-[34px]">
            Un prix qui se négocie à plusieurs.
          </h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-3 md:gap-6">
            {steps.map((s) => (
              <div key={s.n} className="rounded-2xl border border-white/10 bg-white/5 p-4 md:p-5">
                <div className="flex items-center justify-between">
                  <span className="grid h-9 w-9 place-items-center rounded-xl bg-emerald-500/15 text-emerald-400"><Icon name={s.icon} size={16}/></span>
                  <span className="font-[var(--font-brand)] text-[20px] font-black text-white/25">{s.n}</span>
                </div>
                <p className="mt-3 text-[14px] font-extrabold">{s.ttl}</p>
                <p className="mt-1 text-[12px] leading-relaxed text-white/60">{s.sub}</p>
              </div>
            ))}
          </div>
          <p className="mt-8 border-t border-white/10 pt-6 font-[var(--font-brand)] text-[17px] font-black italic leading-snug text-white/85 md:text-[21px]">
            « Chaque franc économisé sur le sourcing est un franc de marge pour votre business. »
          </p>
        </div>

        {/* Simulateur de paliers — vraies données produit */}
        <div className="mt-10 px-4 pb-8 md:mt-12 md:px-0">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 md:p-8">
            <div className="md:grid md:grid-cols-[1fr_auto] md:items-center md:gap-8">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Simulateur</p>
                <h3 className="mt-1 font-[var(--font-brand)] text-[20px] font-black tracking-tight md:text-[26px]">Quel prix pour votre lot ?</h3>
                <div className="mt-4 flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Quantité</span>
                  <span className="font-[var(--font-brand)] text-[22px] font-black tabular-nums md:text-[26px]">{simQty} pcs</span>
                </div>
                <input type="range" min={PRODUCT?.minOrderQty ?? 1} max={50} value={simQty} onChange={e=>setSimQty(+e.target.value)} className="mt-1 w-full accent-emerald-600"/>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2 md:mt-0 md:gap-3">
                <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800 md:w-32">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Prix/pc</p>
                  <p className="mt-1 font-[var(--font-brand)] text-[16px] font-black tabular-nums text-emerald-600 dark:text-emerald-400 md:text-lg">{formatFcfa(simTier.unit)}</p>
                </div>
                <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800 md:w-32">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Total</p>
                  <p className="mt-1 font-[var(--font-brand)] text-[16px] font-black tabular-nums md:text-lg">{formatFcfa(simTier.unit*simQty)}</p>
                </div>
                <div className="rounded-xl bg-emerald-600 p-3 text-white md:w-32">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-200">Éco.</p>
                  <p className="mt-1 font-[var(--font-brand)] text-[16px] font-black tabular-nums md:text-lg">{formatFcfa(simSavings)}</p>
                </div>
              </div>
            </div>
            <div className="mt-5 flex flex-col gap-2 border-t border-slate-100 pt-4 dark:border-slate-800 md:flex-row md:justify-end">
              <Button variant="secondary" size="md" onClick={() => router.push('/prix-transparent')}>Voir les paliers détaillés</Button>
              <button onClick={() => router.push('/achats-groupes/nouveau')} className="inline-flex items-center justify-center gap-2 rounded-full bg-slate-900 px-5 py-2.5 text-[13px] font-bold text-white hover:bg-slate-700 dark:bg-white dark:text-slate-900">
                <Icon name="plus" size={14}/>Créer un groupe à ce prix
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

}
