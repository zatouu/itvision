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
  const maxSave = GROUPS.length ? Math.max(...GROUPS.map((g) => g.save ?? 0)) : 0;
  const totalParticipants = GROUPS.reduce((s, g) => s + (g.participants ?? 0), 0);
  const avgSave = GROUPS.length ? Math.round(GROUPS.reduce((s, g) => s + (g.save ?? 0), 0) / GROUPS.length) : 0;

  return (
    <div className="min-h-full bg-slate-50 pb-20 dark:bg-slate-950 md:pb-0">
      <div className="mx-auto max-w-6xl md:px-6 md:py-6">
        {/* Hero */}
        <div className="relative overflow-hidden bg-gradient-to-br from-violet-600 via-violet-700 to-emerald-600 px-4 py-6 text-white md:rounded-3xl md:p-8">
          <div className="absolute inset-0 opacity-20">
            <svg viewBox="0 0 400 200" className="h-full w-full"><defs><pattern id="dots" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1" fill="white"/></pattern></defs><rect width="400" height="200" fill="url(#dots)"/></svg>
          </div>
          <div className="relative md:grid md:grid-cols-[1fr_auto] md:items-end md:gap-6">
            <div>
              <Badge tone="ink" className="!text-white !bg-white/15 !border-white/25"><Icon name="flame" size={11}/> {hasGroups ? 'En direct' : 'Lancez le premier groupe'}</Badge>
              <h1 className="mt-2 text-2xl font-extrabold leading-tight tracking-tight md:mt-3 md:text-4xl md:leading-[1.05]">
                Achats groupés<br/>
                <span className="text-emerald-300">{maxSave > 0 ? `Jusqu'à -${maxSave}%` : 'Plus on est, moins cher'}</span>
              </h1>
              <p className="mt-1.5 max-w-md text-[13px] text-white/85 md:mt-2 md:text-sm">Rejoignez un groupe existant ou créez le vôtre. Plus on est nombreux, plus le prix baisse — jusqu&apos;à la deadline.</p>
              <Button variant="secondary" size="lg" onClick={() => router.push('/achats-groupes/nouveau')} className="mt-4 !bg-white !text-slate-900 hover:!bg-slate-100 whitespace-nowrap"><Icon name="plus" size={16}/>Créer un groupe</Button>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2 md:mt-0 md:gap-3">
              <div className="rounded-xl bg-white/10 p-2 backdrop-blur md:rounded-2xl md:px-4 md:py-3 md:w-32">
                <p className="text-[10px] uppercase tracking-wider text-white/70 md:text-[11px]">Groupes actifs</p>
                <p className="text-[16px] font-extrabold tabular-nums md:mt-1 md:text-2xl">{GROUPS.length}</p>
              </div>
              <div className="rounded-xl bg-white/10 p-2 backdrop-blur md:rounded-2xl md:px-4 md:py-3 md:w-32">
                <p className="text-[10px] uppercase tracking-wider text-white/70 md:text-[11px]">Participants</p>
                <p className="text-[16px] font-extrabold tabular-nums md:mt-1 md:text-2xl">{totalParticipants}</p>
              </div>
              <div className="rounded-xl bg-white/10 p-2 backdrop-blur md:rounded-2xl md:px-4 md:py-3 md:w-32">
                <p className="text-[10px] uppercase tracking-wider text-white/70 md:text-[11px]">Éco. moyenne</p>
                <p className="text-[16px] font-extrabold md:mt-1 md:text-2xl">{avgSave > 0 ? `-${avgSave}%` : '—'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filtres — sticky sous le header sur mobile (masqués s'il n'y a aucun groupe) */}
        {hasGroups && (
        <div className="sticky top-[var(--mkt-header-h,0px)] z-10 border-b border-slate-200 bg-slate-50 pb-2 pt-3 dark:border-slate-800 dark:bg-slate-950 md:static md:mt-6 md:flex md:items-center md:justify-between md:gap-4 md:border-0 md:bg-transparent md:p-0 md:dark:bg-transparent">
          <div className="mb-2 flex gap-1.5 overflow-x-auto px-4 pb-1 md:mb-0 md:gap-2 md:px-0 md:pb-0">
            {cats.map((c)=>(
              <button key={c} onClick={()=>setCat(c)} className={cn("flex-shrink-0 rounded-full px-3 py-1.5 text-[12px] font-semibold whitespace-nowrap md:px-4 md:py-2 md:text-sm", cat===c?"bg-slate-900 text-white dark:bg-white dark:text-slate-900":"bg-white border border-slate-200 text-slate-700 hover:border-slate-300 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-300 dark:hover:border-slate-600")}>{c}</button>
            ))}
          </div>
          <div className="flex items-center justify-between px-4 md:justify-end md:gap-3 md:px-0">
            <p className="text-[12px] font-semibold text-slate-500 dark:text-slate-400 md:text-sm"><b className="text-slate-900 dark:text-white tabular-nums">{filtered.length}</b> groupes</p>
            <label className="relative inline-flex items-center gap-1 text-[12px] font-semibold text-slate-700 dark:text-slate-300 md:hidden">
              <Icon name="filter" size={13}/>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                className="appearance-none bg-transparent pr-4 text-[12px] font-semibold text-slate-700 focus:outline-none dark:text-slate-300 cursor-pointer"
              >
                {sorts.map((s) => <option key={s.k} value={s.k}>{s.l}</option>)}
              </select>
              <Icon name="chevronDown" size={12} className="pointer-events-none absolute right-0"/>
            </label>
            <select value={sort} onChange={e=>setSort(e.target.value)} className="hidden h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white md:block">
              {sorts.map(s=><option key={s.k} value={s.k}>Tri : {s.l}</option>)}
            </select>
          </div>
        </div>
        )}

        {/* Grille ou état vide */}
        {filtered.length > 0 ? (
          <div className="grid grid-cols-2 gap-3 p-4 md:mt-4 md:grid-cols-3 md:gap-4 md:p-0">
            {filtered.map((g) => <GroupCard key={g.id} group={g} onClick={() => router.push(`/achats-groupes/${g.id}`)}/>)}
          </div>
        ) : hasGroups ? (
          <div className="mx-4 my-6 flex flex-col items-center rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center dark:border-slate-700 dark:bg-slate-900 md:mx-0">
            <p className="text-[14px] font-extrabold text-slate-900 dark:text-white">Aucun groupe dans « {cat} »</p>
            <p className="mt-1 text-[12px] text-slate-500 dark:text-slate-400">Essayez une autre catégorie ou un autre tri.</p>
            <Button variant="secondary" size="md" className="mt-4" onClick={() => setCat('Tous')}>Voir tous les groupes</Button>
          </div>
        ) : (
          <div className="mx-4 my-6 md:mx-0 md:my-8">
            <Card className="p-6 text-center md:p-10">
              <span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300">
                <Icon name="users" size={28}/>
              </span>
              <h2 className="mt-4 text-[18px] font-extrabold tracking-tight text-slate-900 dark:text-white md:text-xl">Aucun achat groupé en cours</h2>
              <p className="mx-auto mt-2 max-w-md text-[13px] text-slate-500 dark:text-slate-400 md:text-sm">
                Un achat groupé permet à plusieurs acheteurs de commander ensemble pour atteindre le palier de prix usine — le prix baisse à mesure que le groupe grandit.
              </p>
              <div className="mx-auto mt-6 grid max-w-lg grid-cols-1 gap-2 text-left sm:grid-cols-3">
                {[
                  { icon: 'search', title: '1. Choisissez', sub: 'un produit du catalogue' },
                  { icon: 'users', title: '2. Invitez', sub: 'd\'autres acheteurs' },
                  { icon: 'checkCircle', title: '3. Économisez', sub: 'au palier débloqué' },
                ].map((s) => (
                  <div key={s.title} className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800">
                    <Icon name={s.icon} size={16} className="text-violet-600 dark:text-violet-400"/>
                    <p className="mt-1.5 text-[12px] font-bold text-slate-900 dark:text-white">{s.title}</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">{s.sub}</p>
                  </div>
                ))}
              </div>
              <div className="mt-6 flex flex-col items-center justify-center gap-2 sm:flex-row">
                <Button variant="violet" size="lg" onClick={() => router.push('/achats-groupes/nouveau')}><Icon name="plus" size={16}/>Créer le premier groupe</Button>
                <Button variant="secondary" size="lg" onClick={() => router.push('/produits')}>Explorer le catalogue</Button>
              </div>
            </Card>
          </div>
        )}

        {/* Simulateur de paliers */}
        <Section title="Simulateur — quel prix pour votre lot ?" subtitle="Ajustez la quantité pour voir le prix palier appliqué" className="mt-2 bg-white py-5 dark:bg-slate-900 md:mt-8 md:bg-transparent md:p-0 md:dark:bg-transparent">
          <Card className="p-4 md:p-6">
            <div className="md:grid md:grid-cols-[1fr_auto] md:items-center md:gap-6">
              <div>
                <div className="mb-2 flex items-center justify-between md:mb-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 md:text-xs">Quantité</span>
                  <span className="text-[20px] font-extrabold text-slate-900 tabular-nums dark:text-white md:text-2xl">{simQty} pcs</span>
                </div>
                <input type="range" min={PRODUCT?.minOrderQty ?? 1} max={50} value={simQty} onChange={e=>setSimQty(+e.target.value)} className="w-full accent-emerald-600"/>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 md:mt-0 md:gap-3">
                <div className="rounded-xl bg-slate-50 p-2 dark:bg-slate-800 md:rounded-2xl md:border md:border-slate-200 md:p-3 md:dark:border-slate-800 md:dark:bg-transparent md:w-32">
                  <p className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400">Prix/pc</p>
                  <p className="text-[15px] font-extrabold text-emerald-600 tabular-nums dark:text-emerald-400 md:mt-1 md:text-lg">{formatFcfa(simTier.unit)}</p>
                </div>
                <div className="rounded-xl bg-slate-50 p-2 dark:bg-slate-800 md:rounded-2xl md:border md:border-slate-200 md:p-3 md:dark:border-slate-800 md:dark:bg-transparent md:w-32">
                  <p className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400">Total</p>
                  <p className="text-[15px] font-extrabold text-slate-900 tabular-nums dark:text-white md:mt-1 md:text-lg">{formatFcfa(simTier.unit*simQty)}</p>
                </div>
                <div className="rounded-xl bg-emerald-50 p-2 dark:bg-emerald-950/40 md:rounded-2xl md:p-3 md:w-32">
                  <p className="text-[10px] uppercase tracking-wider text-emerald-700 dark:text-emerald-300">Éco.</p>
                  <p className="text-[15px] font-extrabold text-emerald-700 tabular-nums dark:text-emerald-300 md:mt-1 md:text-lg">{formatFcfa(simSavings)}</p>
                </div>
              </div>
            </div>
            <div className="mt-3 flex flex-col gap-2 md:mt-4 md:flex-row md:justify-end">
              <Button variant="secondary" size="md" onClick={() => router.push('/prix-transparent')}>Voir les paliers détaillés</Button>
              <Button variant="primary" size="md" onClick={() => router.push('/achats-groupes/nouveau')}><Icon name="plus" size={16}/>Créer un groupe à ce prix</Button>
            </div>
          </Card>
        </Section>
      </div>
    </div>
  );
}
