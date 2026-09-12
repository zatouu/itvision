'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { formatFcfa } from '../formatFcfa';
import { Icon } from '../Icon';
import { Badge } from '../Badge';
import { Button } from '../Button';
import { Card } from '../Card';
import { Section } from '../Section';
import { GroupCard } from '../GroupCard';
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
  const cats = ["Tous", "Sécurité", "Audio", "Éclairage", "Auto", "Mode", "Objets connectés"];
  const sorts = [
    { k: "hot", l: "Populaires" },
    { k: "ending", l: "Bientôt fermés" },
    { k: "new", l: "Récents" },
    { k: "saving", l: "Plus d'éco." },
  ];

  const filtered = GROUPS.filter((g) => cat === "Tous" || g.category === cat);

  const [simQty, setSimQty] = useState(15);
  const simTiers = PRODUCT?.priceTiers ?? [];
  const simTier =
    simTiers.slice().reverse().find((t) => simQty >= t.from) ||
    simTiers[0] ||
    { unit: 0, from: 1, to: null, save: 0 };
  const simSavings = ((PRODUCT?.basePrice ?? 0) - simTier.unit) * simQty;

  if (loading) {
    return <div className="flex h-screen items-center justify-center text-slate-500 dark:text-slate-400">Chargement…</div>;
  }

  if (GROUPS.length === 0 && !loading) {
    return <div className="flex h-screen items-center justify-center text-slate-500 dark:text-slate-400">Aucun groupe disponible</div>;
  }

  return (
    <>
      <div className="md:hidden">
        <div className="flex h-full flex-col bg-slate-50 dark:bg-slate-950">

        <div className="flex-1 overflow-y-auto pb-20">
          {/* Hero */}
          <div className="relative overflow-hidden bg-gradient-to-br from-violet-600 via-violet-700 to-emerald-600 px-4 py-6 text-white">
            <div className="absolute inset-0 opacity-20">
              <svg viewBox="0 0 400 200" className="h-full w-full"><defs><pattern id="dots" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1" fill="white"/></pattern></defs><rect width="400" height="200" fill="url(#dots)"/></svg>
            </div>
            <div className="relative">
              <Badge tone="ink" className="!text-white !bg-white/15 !border-white/25"><Icon name="flame" size={11}/> En direct</Badge>
              <h1 className="mt-2 text-2xl font-extrabold leading-tight tracking-tight">Achats groupés<br/><span className="text-emerald-300">Jusqu&apos;à -45%</span></h1>
              <p className="mt-1.5 text-[13px] text-white/85">Rejoignez un groupe existant ou créez le vôtre. Plus on est nombreux, moins c&apos;est cher.</p>
              <div className="mt-3 grid grid-cols-3 gap-2">
                <div className="rounded-xl bg-white/10 p-2 backdrop-blur">
                  <p className="text-[10px] uppercase tracking-wider text-white/70">Actifs</p>
                  <p className="text-[16px] font-extrabold tabular-nums">{GROUPS.length}</p>
                </div>
                <div className="rounded-xl bg-white/10 p-2 backdrop-blur">
                  <p className="text-[10px] uppercase tracking-wider text-white/70">Participants</p>
                  <p className="text-[16px] font-extrabold tabular-nums">{GROUPS.reduce((s,g)=>s+g.participants,0)}</p>
                </div>
                <div className="rounded-xl bg-white/10 p-2 backdrop-blur">
                  <p className="text-[10px] uppercase tracking-wider text-white/70">Éco. moyenne</p>
                  <p className="text-[16px] font-extrabold">-{Math.round(GROUPS.reduce((s,g)=>s+g.save,0)/GROUPS.length)}%</p>
                </div>
              </div>
              <Button variant="secondary" size="sm" onClick={() => router.push('/achats-groupes/nouveau')} className="mt-4 !bg-white !text-slate-900 hover:!bg-slate-100 whitespace-nowrap"><Icon name="plus" size={14}/> Créer un groupe</Button>
            </div>
          </div>

          {/* Filters */}
          <div className="sticky top-14 z-10 bg-slate-50 dark:bg-slate-950 pt-3 pb-2 border-b border-slate-200 dark:border-slate-800">
            <div className="mb-2 flex gap-1.5 overflow-x-auto px-4 pb-1">
              {cats.map((c)=>(
                <button key={c} onClick={()=>setCat(c)} className={cn("flex-shrink-0 rounded-full px-3 py-1.5 text-[12px] font-semibold whitespace-nowrap", cat===c?"bg-slate-900 text-white dark:bg-white dark:text-slate-900":"bg-white border border-slate-200 text-slate-700 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-300")}>{c}</button>
              ))}
            </div>
            <div className="flex items-center justify-between px-4">
              <p className="text-[12px] font-semibold text-slate-500 dark:text-slate-400"><b className="text-slate-900 dark:text-white">{filtered.length}</b> groupes</p>
              <button className="inline-flex items-center gap-1 text-[12px] font-semibold text-slate-700 dark:text-slate-300"><Icon name="filter" size={13}/>{sorts.find(s => s.k === sort)?.l ?? ''}<Icon name="chevronDown" size={12}/></button>
            </div>
          </div>

          {/* Grid */}
          <div className="grid grid-cols-2 gap-3 p-4">
            {filtered.map((g) => <GroupCard key={g.id} group={g} onClick={() => router.push(`/achats-groupes/${g.id}`)}/>)}
          </div>

          {/* Simulator */}
          <Section title="Simulateur — quel prix pour votre lot ?" subtitle="Ajustez la quantité pour voir le prix palier" className="mt-2 py-5 bg-white dark:bg-slate-900">
            <Card className="p-4">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Quantité</span>
                <span className="text-[20px] font-extrabold text-slate-900 dark:text-white tabular-nums">{simQty} pcs</span>
              </div>
              <input type="range" min={PRODUCT?.minOrderQty ?? 1} max={50} value={simQty} onChange={e=>setSimQty(+e.target.value)} className="w-full accent-emerald-600"/>
              <div className="mt-3 grid grid-cols-3 gap-2">
                <div className="rounded-xl bg-slate-50 p-2 dark:bg-slate-800">
                  <p className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400">Prix/pc</p>
                  <p className="text-[15px] font-extrabold text-emerald-600 dark:text-emerald-400 tabular-nums">{formatFcfa(simTier.unit)}</p>
                </div>
                <div className="rounded-xl bg-slate-50 p-2 dark:bg-slate-800">
                  <p className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400">Total</p>
                  <p className="text-[15px] font-extrabold text-slate-900 dark:text-white tabular-nums">{formatFcfa(simTier.unit*simQty)}</p>
                </div>
                <div className="rounded-xl bg-emerald-50 p-2 dark:bg-emerald-950/40">
                  <p className="text-[10px] uppercase tracking-wider text-emerald-700 dark:text-emerald-300">Éco.</p>
                  <p className="text-[15px] font-extrabold text-emerald-700 dark:text-emerald-300 tabular-nums">{formatFcfa(simSavings)}</p>
                </div>
              </div>
              <Button variant="primary" size="sm" onClick={() => router.push('/achats-groupes/nouveau')} className="mt-3 w-full">Créer un groupe à ce prix</Button>
            </Card>
          </Section>

        </div>
      </div>
      </div>
      <div className="hidden md:block">
        <div className="min-h-full bg-slate-50 dark:bg-slate-950">

      <div className="mx-auto max-w-6xl px-6 py-6">
        {/* Hero */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-violet-600 via-violet-700 to-emerald-600 p-8 text-white">
          <div className="absolute inset-0 opacity-15">
            <svg viewBox="0 0 800 300" className="h-full w-full"><defs><pattern id="dots2" x="0" y="0" width="24" height="24" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1.2" fill="white"/></pattern></defs><rect width="800" height="300" fill="url(#dots2)"/></svg>
          </div>
          <div className="relative grid grid-cols-[1fr_auto] items-end gap-6">
            <div>
              <Badge tone="ink" className="!text-white !bg-white/15 !border-white/25"><Icon name="flame" size={11}/> En direct</Badge>
              <h1 className="mt-3 text-4xl font-extrabold leading-[1.05] tracking-tight">Achats groupés<br/><span className="text-emerald-300">Jusqu&apos;à -45%</span></h1>
              <p className="mt-2 max-w-md text-sm text-white/85">Rejoignez un groupe existant ou créez le vôtre. Plus on est nombreux, plus le prix baisse — jusqu&apos;à la deadline.</p>
              <div className="mt-4 flex gap-3">
                <Button variant="secondary" size="lg" onClick={() => router.push('/achats-groupes/nouveau')} className="!bg-white !text-slate-900 hover:!bg-slate-100 whitespace-nowrap"><Icon name="plus" size={16}/>Créer un groupe</Button>
                <Button variant="ghost" size="lg" className="!text-white hover:!bg-white/10 whitespace-nowrap">Comment ça marche ?</Button>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-2xl bg-white/10 px-4 py-3 backdrop-blur w-32">
                <p className="text-[11px] uppercase tracking-wider text-white/70">Groupes actifs</p>
                <p className="mt-1 text-2xl font-extrabold tabular-nums">{GROUPS.length}</p>
              </div>
              <div className="rounded-2xl bg-white/10 px-4 py-3 backdrop-blur w-32">
                <p className="text-[11px] uppercase tracking-wider text-white/70">Participants</p>
                <p className="mt-1 text-2xl font-extrabold tabular-nums">{GROUPS.reduce((s,g)=>s+g.participants,0)}</p>
              </div>
              <div className="rounded-2xl bg-white/10 px-4 py-3 backdrop-blur w-32">
                <p className="text-[11px] uppercase tracking-wider text-white/70">Éco. moyenne</p>
                <p className="mt-1 text-2xl font-extrabold">-{Math.round(GROUPS.reduce((s,g)=>s+g.save,0)/GROUPS.length)}%</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="mt-6 flex items-center justify-between gap-4">
          <div className="flex gap-2 overflow-x-auto">
            {cats.map((c)=>(
              <button key={c} onClick={()=>setCat(c)} className={cn("flex-shrink-0 rounded-full px-4 py-2 text-sm font-semibold whitespace-nowrap", cat===c?"bg-slate-900 text-white dark:bg-white dark:text-slate-900":"bg-white border border-slate-200 text-slate-700 hover:border-slate-300 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-300 dark:hover:border-slate-600")}>{c}</button>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-500 dark:text-slate-400"><b className="text-slate-900 dark:text-white tabular-nums">{filtered.length}</b> groupes</span>
            <select value={sort} onChange={e=>setSort(e.target.value)} className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white">
              {sorts.map(s=><option key={s.k} value={s.k}>Tri : {s.l}</option>)}
            </select>
          </div>
        </div>

        {/* Grid */}
        <div className="mt-4 grid grid-cols-3 gap-4">
          {filtered.map((g) => <GroupCard key={g.id} group={g} onClick={() => router.push(`/achats-groupes/${g.id}`)}/>)}
        </div>

        {/* Simulator */}
        <Card className="mt-8 p-6">
          <div className="grid grid-cols-[1fr_auto] items-center gap-6">
            <div>
              <h3 className="text-lg font-extrabold tracking-tight text-slate-900 dark:text-white">Simulateur MOQ — quel prix pour votre lot ?</h3>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Ajustez la quantité pour voir le prix palier appliqué. Créez un groupe à ce prix pour partager avec la communauté.</p>
              <div className="mt-4 flex items-center gap-4">
                <div className="flex-1">
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Quantité</span>
                    <span className="text-2xl font-extrabold text-slate-900 dark:text-white tabular-nums">{simQty} pcs</span>
                  </div>
                  <input type="range" min={PRODUCT?.minOrderQty ?? 1} max={50} value={simQty} onChange={e=>setSimQty(+e.target.value)} className="w-full accent-emerald-600"/>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-2xl border border-slate-200 p-3 dark:border-slate-800 w-32">
                <p className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400">Prix / pc</p>
                <p className="mt-1 text-lg font-extrabold text-emerald-600 dark:text-emerald-400 tabular-nums">{formatFcfa(simTier.unit)}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 p-3 dark:border-slate-800 w-32">
                <p className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400">Total</p>
                <p className="mt-1 text-lg font-extrabold text-slate-900 dark:text-white tabular-nums">{formatFcfa(simTier.unit*simQty)}</p>
              </div>
              <div className="rounded-2xl bg-emerald-50 p-3 dark:bg-emerald-950/40 w-32">
                <p className="text-[10px] uppercase tracking-wider text-emerald-700 dark:text-emerald-300">Économie</p>
                <p className="mt-1 text-lg font-extrabold text-emerald-700 dark:text-emerald-300 tabular-nums">{formatFcfa(simSavings)}</p>
              </div>
            </div>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="secondary" size="md">Voir les paliers détaillés</Button>
            <Button variant="primary" size="md" onClick={() => router.push('/achats-groupes/nouveau')}><Icon name="plus" size={16}/>Créer un groupe à ce prix</Button>
          </div>
        </Card>
      </div>
    </div>
  </div>
</>
  );

}
