'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Factory,
  MapPin,
  CheckCircle,
  Star,
  Clock,
  Package,
  MessageCircle,
  Heart,
  LayoutGrid,
  RefreshCcw,
  Truck,
  Wallet,
  Shield,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatFcfa } from '../formatFcfa';

interface Product {
  id: string;
  name: string;
  img?: string;
  image?: string;
  cat?: string;
  category?: string;
  price: number;
  base?: number;
  basePrice?: number;
  moq?: number;
  minOrderQty?: number;
  hasGroup?: boolean;
  save?: number;
}

interface ShopData {
  name: string;
  initials: string;
  type: 'factory' | 'partner';
  verified: boolean;
  rating: number;
  reviewCount: number;
  yearsActive: number;
  location: string;
  categories: string[];
  description?: string;
  responseTime?: string;
  onTimeRate?: number;
  productCount: number;
}

interface Review {
  initials: string;
  handle: string;
  rating: number;
  date: string;
  text: string;
}

interface ScreenShopProps {
  shop: ShopData;
  products: Product[];
  reviews?: Review[];
  isLoading?: boolean;
  error?: string | null;
  contactWhatsApp?: string;
}

const CONDITIONS = [
  { icon: RefreshCcw, ttl: 'Politique de retour', txt: 'Retour possible sous 7 jours pour tout produit défectueux ou non conforme. Contact via WhatsApp ou centre d\'aide.' },
  { icon: Truck, ttl: 'Livraison', txt: 'Express aérien 4-7j, Standard aérien 8-12j, Maritime 35-45j. Suivi en temps réel via DDM+.' },
  { icon: Wallet, ttl: 'Paiement', txt: 'Wave, Orange Money, Free Money, virement. Escrow inclus : le vendeur est payé uniquement après réception validée.' },
  { icon: Shield, ttl: 'Garantie', txt: 'Garantie fabricant 12 mois sur l\'électronique. Support DDM+ pour toute réclamation.' },
]

export default function ScreenShop({ shop, products, reviews = [], isLoading, error, contactWhatsApp = 'https://wa.me/221761234567' }: ScreenShopProps) {
  const [tab, setTab] = useState<'products' | 'reviews' | 'about' | 'conditions'>('products');
  const [catFilter, setCatFilter] = useState('Tous');

  const cats = useMemo(() => ['Tous', ...Array.from(new Set(products.map((p) => p.cat || p.category || 'Autre')))], [products]);
  const filtered = useMemo(() => catFilter === 'Tous' ? products : products.filter((p) => (p.cat || p.category || 'Autre') === catFilter), [products, catFilter]);

  const coverGradient = shop.type === 'factory'
    ? 'from-violet-700 via-violet-600 to-emerald-600'
    : 'from-emerald-600 via-emerald-500 to-amber-500';

  const HeaderShop = ({ compact = false }) => (
    <div className={cn(
      'relative overflow-hidden text-white bg-gradient-to-br',
      coverGradient,
      compact ? 'px-4 pt-4 pb-5' : 'px-4 md:px-10 pt-6 md:pt-8 pb-6 md:pb-8 rounded-3xl'
    )}>
      <div className="absolute inset-0 opacity-15">
        <svg viewBox="0 0 800 200" className="h-full w-full" preserveAspectRatio="none">
          <defs>
            <pattern id="dots-shop" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
              <circle cx="1.5" cy="1.5" r="1" fill="white" />
            </pattern>
          </defs>
          <rect width="800" height="200" fill="url(#dots-shop)" />
        </svg>
      </div>
      <div className="relative flex items-start gap-3 md:gap-5">
        <span className={cn(
          'grid flex-shrink-0 place-items-center rounded-2xl bg-white/15 backdrop-blur border border-white/20 text-white font-extrabold',
          compact ? 'h-14 w-14 text-[18px]' : 'h-20 w-20 text-[24px]'
        )}>
          {shop.initials}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap mb-1">
            {shop.type === 'factory' ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-white/20 border border-white/25 px-2 py-0.5 text-[10px] font-bold whitespace-nowrap">
                <Factory size={10} /> Inspecté par DDM+
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-white/20 border border-white/25 px-2 py-0.5 text-[10px] font-bold whitespace-nowrap">
                <MapPin size={10} /> Partenaire local
              </span>
            )}
            {shop.verified && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/25 border border-emerald-300/40 px-2 py-0.5 text-[10px] font-bold whitespace-nowrap">
                <CheckCircle size={10} /> Vérifié
              </span>
            )}
          </div>
          <h1 className={cn('font-extrabold tracking-tight leading-tight', compact ? 'text-[20px]' : 'text-[28px] md:text-[32px]')}>
            {shop.name}
          </h1>
          <div className="mt-1.5 flex items-center gap-2 text-[11px] text-white/85">
            <div className="flex items-center gap-0.5">
              <Star size={12} className="fill-amber-300 text-amber-300" />
              <span className="font-bold tabular-nums">{shop.rating.toFixed(1)}</span>
              <span className="text-white/70">({shop.reviewCount})</span>
            </div>
            <span className="text-white/50">·</span>
            <span>{shop.yearsActive} ans</span>
            <span className="text-white/50">·</span>
            <span className="truncate">{shop.location}</span>
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {shop.categories.map((c) => (
              <span key={c} className="inline-flex items-center rounded-full border border-white/25 bg-white/10 px-2 py-0.5 text-[10px] font-semibold whitespace-nowrap">
                {c}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const ProductCard = ({ product: p }: { product: Product }) => (
    <Link
      href={`/produits/${p.id}`}
      className="group rounded-2xl overflow-hidden border border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-800 hover:shadow-md transition-shadow cursor-pointer"
    >
      <div className="relative aspect-square bg-slate-100 dark:bg-slate-800 overflow-hidden">
        <img src={p.img || p.image || '/placeholder.svg'} alt={p.name} className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300" />
        <div className="absolute left-2 top-2 flex flex-col gap-1">
          <span className="inline-flex items-center gap-0.5 rounded-md bg-amber-500 text-white px-1.5 py-0.5 text-[10px] font-bold">
            <Package size={10} /> Min. {p.moq ?? p.minOrderQty ?? 1}
          </span>
          {p.hasGroup && (
            <span className="inline-flex items-center gap-0.5 rounded-md bg-violet-600 text-white px-1.5 py-0.5 text-[10px] font-bold">
              <LayoutGrid size={10} /> Groupe
            </span>
          )}
        </div>
        {(p.save ?? 0) > 0 && (
          <div className="absolute right-2 top-2">
            <span className="inline-flex items-center gap-0.5 whitespace-nowrap rounded-md bg-red-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
              -{p.save}%
            </span>
          </div>
        )}
      </div>
      <div className="p-2.5">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">{p.cat || p.category || 'Produit'}</p>
        <p className="mt-0.5 text-[12px] font-semibold text-slate-900 dark:text-white line-clamp-2 leading-tight min-h-[30px]">{p.name}</p>
        <div className="mt-1.5 flex items-baseline gap-1.5 whitespace-nowrap">
          <span className="text-[14px] font-extrabold text-emerald-600 dark:text-emerald-400 tabular-nums">{formatFcfa(p.price)}</span>
          {(p.base ?? p.basePrice) ? (
            <span className="text-[10px] font-semibold text-slate-400 line-through tabular-nums">{formatFcfa(p.base ?? p.basePrice ?? 0)}</span>
          ) : null}
        </div>
      </div>
    </Link>
  );

  const Reviews = () => (
    <div className="space-y-3">
      {reviews.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-800 p-8 text-center">
          <div className="grid h-16 w-16 mx-auto place-items-center rounded-full bg-slate-100 dark:bg-slate-800 mb-3">
            <Star size={24} className="text-slate-400" />
          </div>
          <p className="text-[14px] font-extrabold text-slate-900 dark:text-white">Aucun avis pour le moment</p>
          <p className="mt-1 text-[12px] text-slate-500 dark:text-slate-400">Soyez le premier à donner votre avis après votre achat.</p>
        </div>
      ) : (
        reviews.map((r, i) => (
          <div key={i} className="rounded-2xl border border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-800 p-4">
            <div className="flex items-center gap-3 mb-2">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-violet-500 to-emerald-500 text-[11px] font-extrabold text-white">
                {r.initials}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[12px] font-bold text-slate-900 dark:text-white">{r.handle}</p>
                <div className="flex items-center gap-1 text-[10px] text-slate-500 dark:text-slate-400">
                  <div className="flex">
                    {Array.from({ length: 5 }).map((_, ii) => (
                      <Star
                        key={ii}
                        size={10}
                        className={ii < r.rating ? 'fill-amber-500 text-amber-500' : 'fill-slate-200 text-slate-200 dark:fill-slate-700 dark:text-slate-700'}
                      />
                    ))}
                  </div>
                  <span>·</span><span>{r.date}</span>
                </div>
              </div>
            </div>
            <p className="text-[13px] text-slate-700 dark:text-slate-300 leading-relaxed">« {r.text} »</p>
          </div>
        ))
      )}
    </div>
  );

  const About = () => (
    <div className="space-y-4">
      {shop.description && (
        <div className="rounded-2xl border border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-800 p-4 md:p-6">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">À propos</p>
          <p className="text-[13px] text-slate-700 dark:text-slate-300 leading-relaxed">{shop.description}</p>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="rounded-xl border border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-800 p-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Produits</p>
          <p className="mt-1 text-[18px] font-extrabold tabular-nums text-slate-900 dark:text-white">{shop.productCount}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-800 p-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Note</p>
          <p className="mt-1 text-[18px] font-extrabold tabular-nums text-slate-900 dark:text-white">{shop.rating.toFixed(1)}<span className="text-[11px] text-slate-500 dark:text-slate-400">/5</span></p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-800 p-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Réponse</p>
          <p className="mt-1 text-[18px] font-extrabold text-emerald-600 dark:text-emerald-400">{shop.responseTime || '< 2h'}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-800 p-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">À l&apos;heure</p>
          <p className="mt-1 text-[18px] font-extrabold tabular-nums text-slate-900 dark:text-white">{shop.onTimeRate ?? 98}%</p>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-800 p-4 md:p-6">
        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">Certifications</p>
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-[12px] text-slate-700 dark:text-slate-300">
            <Shield size={14} className="text-emerald-600 dark:text-emerald-400" />
            {shop.type === 'factory' ? 'Inspection trimestrielle DDM+' : 'Adresse et pièces vérifiées par DDM+'}
          </div>
          <div className="flex items-center gap-2 text-[12px] text-slate-700 dark:text-slate-300">
            <CheckCircle size={14} className="text-emerald-600 dark:text-emerald-400" />
            Escrow paiement inclus
          </div>
          {shop.type === 'factory' && (
            <div className="flex items-center gap-2 text-[12px] text-slate-700 dark:text-slate-300">
              <Factory size={14} className="text-emerald-600 dark:text-emerald-400" />
              Contrôle qualité avant expédition
            </div>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-800 p-4 md:p-6">
        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">Localisation</p>
        <div className="flex items-center gap-2 text-[13px] font-semibold text-slate-900 dark:text-white">
          <MapPin size={16} className="text-slate-500 dark:text-slate-400" />
          {shop.location}
        </div>
      </div>
    </div>
  );

  const Conditions = () => (
    <div className="space-y-3">
      {CONDITIONS.map((c) => (
        <div key={c.ttl} className="rounded-2xl border border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-800 p-4">
          <div className="flex items-start gap-3">
            <span className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
              <c.icon size={16} />
            </span>
            <div>
              <p className="text-[13px] font-extrabold text-slate-900 dark:text-white">{c.ttl}</p>
              <p className="mt-1 text-[12px] text-slate-600 dark:text-slate-400 leading-relaxed">{c.txt}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  const tabs = [
    { k: 'products' as const, l: 'Produits', count: filtered.length },
    { k: 'reviews' as const, l: 'Avis', count: reviews.length },
    { k: 'about' as const, l: 'À propos' },
    { k: 'conditions' as const, l: 'Conditions' },
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 p-4">
        <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h1 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Erreur</h1>
        <p className="text-slate-600 dark:text-slate-400">{error}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-24 md:pb-12">
      <div className="mx-auto max-w-6xl px-4 md:px-6 py-4 md:py-6">
        <HeaderShop />

        <div className="mt-6 grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
          <div>
            <div className="flex gap-1 rounded-xl bg-slate-100 dark:bg-slate-800 p-1 w-fit mb-4 overflow-x-auto">
              {tabs.map((t) => (
                <button
                  key={t.k}
                  onClick={() => setTab(t.k)}
                  className={cn(
                    'rounded-lg px-3 md:px-4 py-2 text-[12px] md:text-[13px] font-bold transition-colors whitespace-nowrap',
                    tab === t.k ? 'bg-white shadow-sm text-slate-900 dark:bg-slate-950 dark:text-white' : 'text-slate-600 dark:text-slate-400'
                  )}
                >
                  {t.l}{t.count !== undefined && <span className="ml-1 tabular-nums text-[10px] md:text-[11px] opacity-70">({t.count})</span>}
                </button>
              ))}
            </div>

            {tab === 'products' && (
              <>
                <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-1">
                  {cats.map((c) => (
                    <button
                      key={c}
                      onClick={() => setCatFilter(c)}
                      className={cn(
                        'rounded-full px-3 md:px-3.5 py-1.5 text-[11px] md:text-[12px] font-semibold whitespace-nowrap',
                        catFilter === c
                          ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                          : 'bg-white border border-slate-200 text-slate-700 hover:border-slate-300 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-300'
                      )}
                    >
                      {c}
                    </button>
                  ))}
                  <span className="ml-auto text-[12px] text-slate-500 dark:text-slate-400 whitespace-nowrap">
                    <b className="text-slate-900 dark:text-white tabular-nums">{filtered.length}</b> produits
                  </span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
                  {filtered.map((p) => <ProductCard key={p.id} product={p} />)}
                </div>
              </>
            )}
            {tab === 'reviews' && <Reviews />}
            {tab === 'about' && <About />}
            {tab === 'conditions' && <Conditions />}
          </div>

          <aside className="hidden lg:block">
            <div className="rounded-2xl border border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-800 p-4 sticky top-24">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">Contact vendeur</p>
              <div className="space-y-1.5 text-[12px]">
                <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                  <Clock size={13} className="text-emerald-600" /> Répond en {shop.responseTime || '< 2h'}
                </div>
                <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                  <CheckCircle size={13} className="text-emerald-600" /> {shop.onTimeRate ?? 98}% livré à l&apos;heure
                </div>
                <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                  <Package size={13} className="text-slate-500" /> {shop.productCount} produits en catalogue
                </div>
              </div>
              <div className="mt-4 space-y-2">
                <a
                  href={contactWhatsApp}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full h-10 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-700 transition"
                >
                  <MessageCircle size={14} /> Contacter le vendeur
                </a>
                <button className="flex items-center justify-center gap-2 w-full h-10 rounded-xl border border-slate-200 bg-white text-slate-900 font-semibold hover:bg-slate-50 dark:bg-slate-900 dark:text-white dark:border-slate-700 dark:hover:bg-slate-800 transition">
                  <Heart size={14} /> Suivre la boutique
                </button>
              </div>
              <p className="mt-3 text-center text-[10px] text-slate-400 dark:text-slate-500 border-t border-slate-200 dark:border-slate-800 pt-3">
                Paiement Escrow protégé par DDM+
              </p>
            </div>
          </aside>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-20 border-t border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-950 lg:hidden">
        <div className="flex gap-2">
          <a
            href={contactWhatsApp}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 inline-flex items-center justify-center gap-2 h-10 rounded-xl border border-slate-200 bg-white text-slate-900 font-semibold dark:bg-slate-900 dark:text-white dark:border-slate-700"
          >
            <MessageCircle size={14} /> Contacter
          </a>
          <button
            onClick={() => setTab('products')}
            className="flex-1 inline-flex items-center justify-center gap-2 h-10 rounded-xl bg-emerald-600 text-white font-semibold"
          >
            <LayoutGrid size={14} /> Voir produits
          </button>
        </div>
      </div>
    </div>
  );
}
