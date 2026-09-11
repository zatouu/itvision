'use client';

import { useState, useEffect, useMemo, Fragment } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { formatFcfa } from '../formatFcfa';
import { useSourcingModal } from '../SourcingModalContext';
import { Icon } from '../Icon';
import { Button } from '../Button';
import { ProductCard } from '../ProductCard';
import { mapCatalogItem, mapCategory } from '../data-mappers';
import type { Product, Category } from '../types';


export default function ScreenCatalog() {
  const { open: openSourcing } = useSourcingModal();
  const [loading, setLoading] = useState(true);
  const [CATEGORIES, setCATEGORIES] = useState<Category[]>([]);
  const [CATALOG, setCATALOG] = useState<Product[]>([]);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch('/api/catalog/products?limit=100&includeGroupStats=1').then(r => r.json()).catch(() => null),
      fetch('/api/catalog/categories').then(r => r.json()).catch(() => null),
    ]).then(([prodRes, catRes]) => {
      if (prodRes?.products?.length || prodRes?.items?.length) {
        setCATALOG(((prodRes.products || prodRes.items) as unknown[]).map(mapCatalogItem) as Product[]);
      }
      if (catRes?.categories?.length) setCATEGORIES(catRes.categories.map(mapCategory));
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);


  const [cat, setCat] = useState("Tous");
  const [priceRange, setPriceRange] = useState([0, 30000]);
  const [moqFilter, setMoqFilter] = useState("all");
  const [groupOnly, setGroupOnly] = useState(false);
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [minSave, setMinSave] = useState(0);
  const [sort, setSort] = useState("popular");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [query, setQuery] = useState("");

  const sortedAndFiltered = useMemo(() => {
    const arr = CATALOG.filter((p) => {
      if (cat !== "Tous" && p.cat !== cat) return false;
      if (p.price < priceRange[0] || p.price > priceRange[1]) return false;
      if (moqFilter === "1-4" && (p.moq ?? p.minOrderQty ?? 0) > 4) return false;
      if (moqFilter === "5-9" && ((p.moq ?? p.minOrderQty ?? 0) < 5 || (p.moq ?? p.minOrderQty ?? 0) > 9)) return false;
      if (moqFilter === "10-24" && ((p.moq ?? p.minOrderQty ?? 0) < 10 || (p.moq ?? p.minOrderQty ?? 0) > 24)) return false;
      if (moqFilter === "25+" && (p.moq ?? p.minOrderQty ?? 0) < 25) return false;
      if (groupOnly && !p.hasGroup) return false;
      if (verifiedOnly && !p.verified) return false;
      if ((p.save ?? 0) < minSave) return false;
      if (query && !p.name.toLowerCase().includes(query.toLowerCase())) return false;
      return true;
    });

    switch (sort) {
      case 'price_asc':
        return arr.sort((a, b) => a.price - b.price);
      case 'price_desc':
        return arr.sort((a, b) => b.price - a.price);
      case 'save':
        return arr.sort((a, b) => (b.save ?? 0) - (a.save ?? 0));
      case 'new':
        return arr; // no createdAt exposed by mapper; keep API order
      case 'popular':
      default:
        return arr.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
    }
  }, [CATALOG, cat, priceRange, moqFilter, groupOnly, verifiedOnly, minSave, query, sort]);

  const activeFilters = [
    cat !== "Tous" && cat,
    moqFilter !== "all" && `Lot ${moqFilter}`,
    groupOnly && "Groupe actif",
    verifiedOnly && "Vérifiés",
    minSave > 0 && `-${minSave}% min`,
    (priceRange[0] > 0 || priceRange[1] < 30000) && `${formatFcfa(priceRange[0])}—${formatFcfa(priceRange[1])}`,
  ].filter(Boolean);

  const filtered = sortedAndFiltered;

  const reset = () => {
    setCat("Tous"); setPriceRange([0, 30000]); setMoqFilter("all");
    setGroupOnly(false); setVerifiedOnly(false); setMinSave(0); setQuery("");
  };

  const FiltersPanel = ({ inSheet = false }: { inSheet?: boolean }) => (
    <div className={cn("space-y-5", inSheet ? "p-4" : "p-4")}>
      <div>
        <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Catégorie</p>
        <div className="space-y-1">
          <button onClick={() => setCat("Tous")} className={cn("flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-[12px] font-semibold", cat === "Tous" ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300" : "text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800")}>
            <span>Toutes</span><span className="text-[10px] tabular-nums text-slate-400">{CATALOG.length}</span>
          </button>
          {CATEGORIES.map((c) => (
            <button key={c.key} onClick={() => setCat(c.label)} className={cn("flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-[12px] font-semibold", cat === c.label ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300" : "text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800")}>
              <span className="flex items-center gap-1.5"><Icon name={c.icon} size={12}/>{c.label}</span>
              <span className="text-[10px] tabular-nums text-slate-400">{c.count}</span>
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Prix</p>
        <div className="flex items-center justify-between text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1 tabular-nums">
          <span>{formatFcfa(priceRange[0])}</span>
          <span>{formatFcfa(priceRange[1])}</span>
        </div>
        <input type="range" min="0" max="30000" step="1000" value={priceRange[1]} onChange={e => setPriceRange([priceRange[0], +e.target.value])} className="w-full accent-emerald-600"/>
      </div>

      <div>
        <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Lot minimum</p>
        <div className="grid grid-cols-2 gap-1.5">
          {[["all","Tous"],["1-4","1-4"],["5-9","5-9"],["10-24","10-24"],["25+","25+"]].map(([k,l]) => (
            <button key={k} onClick={() => setMoqFilter(k)} className={cn("rounded-lg py-1.5 text-[11px] font-semibold", moqFilter === k ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300")}>
              {l}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Options</p>
        <label className="flex items-center gap-2 py-1.5 cursor-pointer">
          <input type="checkbox" checked={groupOnly} onChange={e => setGroupOnly(e.target.checked)} className="h-4 w-4 rounded accent-violet-600"/>
          <span className="text-[12px] font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1"><Icon name="users" size={12} className="text-violet-600 dark:text-violet-400"/>Groupe actif</span>
        </label>
        <label className="flex items-center gap-2 py-1.5 cursor-pointer">
          <input type="checkbox" checked={verifiedOnly} onChange={e => setVerifiedOnly(e.target.checked)} className="h-4 w-4 rounded accent-emerald-600"/>
          <span className="text-[12px] font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1"><Icon name="shield" size={12} className="text-emerald-600 dark:text-emerald-400"/>Fournisseur vérifié</span>
        </label>
      </div>

      <div>
        <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Économie</p>
        <div className="grid grid-cols-4 gap-1.5">
          {[[0,"Tous"],[20,"-20%"],[30,"-30%"],[40,"-40%"]].map(([v,l]) => (
            <button key={v} onClick={() => setMinSave(Number(v))} className={cn("rounded-lg py-1.5 text-[11px] font-semibold", minSave === Number(v) ? "bg-red-600 text-white" : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300")}>
              {l}
            </button>
          ))}
        </div>
      </div>

      {activeFilters.length > 0 && (
        <Button variant="secondary" size="sm" onClick={reset} className="w-full">
          <Icon name="x" size={14}/>Réinitialiser {activeFilters.length} filtre{activeFilters.length > 1 ? "s" : ""}
        </Button>
      )}
    </div>
  );

  if (loading) {
    return <div className="flex h-screen items-center justify-center text-slate-500 dark:text-slate-400">Chargement…</div>;
  }

  if (CATALOG.length === 0 && !loading) {
    return <div className="flex h-screen items-center justify-center text-slate-500 dark:text-slate-400">Aucun produit dans le catalogue</div>;
  }

  return (
    <>
      <div className="md:hidden">
        <div className="flex h-full flex-col bg-slate-50 dark:bg-slate-950">


        {/* Search sticky */}
        <div className="sticky top-14 z-20 flex-shrink-0 border-b border-slate-200 bg-white px-4 py-2.5 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-2 rounded-xl bg-slate-100 px-3 py-2 dark:bg-slate-800">
            <Icon name="search" size={16} className="text-slate-500 dark:text-slate-400"/>
            <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Rechercher…" className="flex-1 bg-transparent text-[12px] outline-none text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400"/>
            <button onClick={openSourcing} className="grid h-7 w-7 place-items-center rounded-lg bg-violet-600 text-white"><Icon name="camera" size={13}/></button>
          </div>
          <div className="mt-2 flex items-center gap-2">
            <button onClick={() => setFiltersOpen(true)} className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-1.5 text-[11px] font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
              <Icon name="filter" size={12}/>Filtres
              {activeFilters.length > 0 && <span className="grid h-4 w-4 place-items-center rounded-full bg-emerald-600 text-[9px] text-white tabular-nums">{activeFilters.length}</span>}
            </button>
            <select value={sort} onChange={e => setSort(e.target.value)} className="flex-1 rounded-lg bg-slate-100 border-0 px-3 py-1.5 text-[11px] font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
              <option value="popular">Populaires</option>
              <option value="price_asc">Prix croissant</option>
              <option value="price_desc">Prix décroissant</option>
              <option value="save">+ d&apos;économies</option>
              <option value="new">Récents</option>
            </select>
          </div>
          {activeFilters.length > 0 && (
            <div className="mt-2 flex gap-1.5 overflow-x-auto pb-1 -mx-4 px-4">
              {activeFilters.map((f, i) => (
                <span key={i} className="flex-shrink-0 inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-950/40 dark:border-emerald-900 dark:text-emerald-300">
                  {f}<Icon name="x" size={10}/>
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto pb-20">
          {filtered.length === 0 ? (
            /* Empty state */
            <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
              <div className="grid h-20 w-20 place-items-center rounded-full bg-slate-100 dark:bg-slate-800 mb-4">
                <Icon name="search" size={32} className="text-slate-400"/>
              </div>
              <p className="text-[14px] font-extrabold text-slate-900 dark:text-white">Aucun produit trouvé</p>
              <p className="mt-1 text-[12px] text-slate-500 dark:text-slate-400 max-w-xs">Essayez d&apos;ajuster vos filtres ou envoyez une demande de sourcing.</p>
              <div className="mt-4 flex flex-col gap-2 w-full max-w-xs">
                <Button variant="secondary" size="md" onClick={reset}>Réinitialiser les filtres</Button>
                <Button variant="violet" size="md" onClick={openSourcing}><Icon name="camera" size={14}/>Demander un sourcing</Button>
              </div>
            </div>
          ) : (
            <div className="p-4">
              <p className="mb-3 text-[11px] font-semibold text-slate-500 dark:text-slate-400"><b className="text-slate-900 dark:text-white tabular-nums">{filtered.length}</b> produit{filtered.length > 1 ? "s" : ""}</p>
              <div className="grid grid-cols-2 gap-3">
                {filtered.map((p) => <ProductCard key={p.id} product={p}/>)}
              </div>
              <Button variant="secondary" size="md" className="w-full mt-6">Charger plus</Button>
            </div>
          )}
        </div>

        {/* Bottom sheet filtres */}
        {filtersOpen && (
          <div className="absolute inset-0 z-40 bg-slate-900/40" onClick={() => setFiltersOpen(false)}>
            <div className="absolute bottom-0 left-0 right-0 max-h-[85%] rounded-t-2xl bg-white dark:bg-slate-950 overflow-hidden" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 px-4 py-3">
                <p className="text-[14px] font-extrabold text-slate-900 dark:text-white">Filtres</p>
                <button onClick={() => setFiltersOpen(false)} className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"><Icon name="x" size={16}/></button>
              </div>
              <div className="overflow-y-auto max-h-[calc(85vh-56px-64px)]">
                <FiltersPanel inSheet/>
              </div>
              <div className="border-t border-slate-200 dark:border-slate-800 p-3 flex gap-2">
                <Button variant="secondary" size="md" onClick={reset} className="flex-1">Réinitialiser</Button>
                <Button variant="primary" size="md" onClick={() => setFiltersOpen(false)} className="flex-1">Voir {filtered.length}</Button>
              </div>
            </div>
          </div>
        )}


      </div>
    );

      </div>
      <div className="hidden md:block">
        <div className="min-h-full bg-slate-50 dark:bg-slate-950">


      {/* Sticky search + filters bar */}
      <div className="sticky top-16 z-20 border-b border-slate-200 bg-white/95 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95">
        <div className="mx-auto max-w-6xl px-6 py-3">
          <div className="flex items-center gap-3">
            <div className="flex-1 flex items-center gap-2 rounded-xl bg-slate-100 px-3 py-2 dark:bg-slate-800">
              <Icon name="search" size={16} className="text-slate-500 dark:text-slate-400"/>
              <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Rechercher un produit, une catégorie, une marque…" className="flex-1 bg-transparent text-[13px] outline-none text-slate-900 dark:text-white"/>
              <button onClick={openSourcing} className="grid h-8 w-8 place-items-center rounded-lg bg-violet-600 text-white"><Icon name="camera" size={14}/></button>
            </div>
            <select value={sort} onChange={e => setSort(e.target.value)} className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white">
              <option value="popular">Tri : Populaires</option>
              <option value="price_asc">Prix croissant</option>
              <option value="price_desc">Prix décroissant</option>
              <option value="save">+ d&apos;économies</option>
              <option value="new">Récents</option>
            </select>
          </div>
          {activeFilters.length > 0 && (
            <div className="mt-2 flex gap-2 flex-wrap">
              {activeFilters.map((f, i) => (
                <span key={i} className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[11px] font-bold text-emerald-700 dark:bg-emerald-950/40 dark:border-emerald-900 dark:text-emerald-300">
                  {f}<Icon name="x" size={11}/>
                </span>
              ))}
              <button onClick={reset} className="text-[11px] font-bold text-slate-500 dark:text-slate-400 underline">Tout effacer</button>
            </div>
          )}
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-6 py-6">
        <div className="mb-4 flex items-baseline justify-between">
          <div>
            <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mb-1">
              <Link href="/market" className="cursor-pointer">Accueil</Link><Icon name="chevronRight" size={12}/><span className="text-slate-700 dark:text-slate-300">Catalogue</span>
            </div>
            <h1 className="text-[24px] font-extrabold tracking-tight text-slate-900 dark:text-white">
              {cat === "Tous" ? "Tous les produits" : cat}
            </h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400"><b className="text-slate-900 dark:text-white tabular-nums">{filtered.length}</b> produit{filtered.length > 1 ? "s" : ""} trouvé{filtered.length > 1 ? "s" : ""}</p>
          </div>
        </div>

        <div className="grid grid-cols-[240px_1fr] gap-6">
          {/* Sidebar filtres */}
          <aside className="sticky top-36 self-start rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
            <FiltersPanel/>
          </aside>

          <div>
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-16 text-center dark:border-slate-800 dark:bg-slate-900">
                <div className="grid h-24 w-24 place-items-center rounded-full bg-slate-100 dark:bg-slate-800 mb-4">
                  <Icon name="search" size={40} className="text-slate-400"/>
                </div>
                <p className="text-[16px] font-extrabold text-slate-900 dark:text-white">Aucun produit ne correspond</p>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 max-w-md">Essayez d&apos;ajuster vos filtres ou demandez à notre équipe de sourcing en Chine de le trouver pour vous.</p>
                <div className="mt-6 flex gap-3">
                  <Button variant="secondary" size="md" onClick={reset}>Réinitialiser</Button>
                  <Button variant="violet" size="md" onClick={openSourcing}><Icon name="camera" size={14}/>Demander un sourcing</Button>
                </div>
              </div>
            ) : (
              <Fragment>
                <div className="grid grid-cols-4 gap-4">
                  {filtered.map((p) => <ProductCard key={p.id} product={p}/>)}
                </div>
                <div className="mt-8 flex items-center justify-center gap-3">
                  <Button variant="secondary" size="md">Charger plus</Button>
                  <span className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">Affichage {filtered.length} / {CATALOG.length}</span>
                </div>
              </Fragment>
            )}
          </div>
        </div>
      </div>
    </div>
  </div>
</>
  );

}
