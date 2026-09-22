'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Factory,
  MapPin,
  CheckCircle,
  Star,
  Clock,
  Package,
  MessageCircle,
  LayoutGrid,
  RefreshCcw,
  Truck,
  Wallet,
  Shield,
  Loader2,
  AlertCircle,
  Instagram,
  Facebook,
  Globe,
  Share2,
  UserPlus,
  UserCheck,
  Lock,
  ChevronRight,
  Store,
  LayoutDashboard,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatFcfa } from '../formatFcfa';
import { brandWhatsAppUrl } from '@/lib/branding';

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
  yearsActive?: number;
  memberSince?: string;
  location: string;
  categories: string[];
  description?: string;
  logo?: string;
  coverImage?: string;
  socials?: { whatsapp?: string; instagram?: string; facebook?: string; website?: string };
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

export interface SimilarShop {
  slug: string;
  name: string;
  logo?: string;
  coverImage?: string;
  city?: string;
  country?: string;
  categories: string[];
  isVerified: boolean;
  productCount: number;
}

interface ScreenShopProps {
  shop: ShopData;
  products: Product[];
  reviews?: Review[];
  isLoading?: boolean;
  error?: string | null;
  contactWhatsApp?: string;
  shopSlug?: string;
  shopId?: string;
  followers?: number;
  similarShops?: SimilarShop[];
}

const CONDITIONS = [
  { icon: RefreshCcw, ttl: 'Politique de retour', txt: 'Retour possible sous 7 jours pour tout produit défectueux ou non conforme. Contact via WhatsApp ou centre d\'aide.' },
  { icon: Truck, ttl: 'Livraison', txt: 'Express aérien 4-7j, Standard aérien 8-12j, Maritime 35-45j. Suivi en temps réel via DDM+.' },
  { icon: Wallet, ttl: 'Paiement', txt: 'Wave, Orange Money, Free Money, virement. Escrow inclus : le vendeur est payé uniquement après réception validée.' },
  { icon: Shield, ttl: 'Garantie', txt: 'Garantie fabricant 12 mois sur l\'électronique. Support DDM+ pour toute réclamation.' },
]

export default function ScreenShop({ shop, products, reviews = [], isLoading, error, contactWhatsApp = brandWhatsAppUrl(), shopSlug, shopId, followers = 0, similarShops = [] }: ScreenShopProps) {
  const router = useRouter();
  const [tab, setTab] = useState<'products' | 'reviews' | 'about' | 'conditions'>('products');
  const [catFilter, setCatFilter] = useState('Tous');
  const [following, setFollowing] = useState(false);
  const [followerCount, setFollowerCount] = useState(followers);
  const [followBusy, setFollowBusy] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [shared, setShared] = useState(false);

  // État « suivi » du visiteur + détection propriétaire (silencieux si non connecté)
  useEffect(() => {
    if (!shopId) return;
    fetch(`/api/shops/${shopId}/follow`, { credentials: 'include' })
      .then(r => r.json())
      .then(d => {
        if (d?.success) {
          setFollowing(!!d.following);
          setFollowerCount(d.followers ?? 0);
          setIsOwner(!!d.isOwner);
        }
      })
      .catch(() => {});
  }, [shopId]);

  const toggleFollow = async () => {
    if (!shopId || followBusy || isOwner) return;
    try {
      setFollowBusy(true);
      const res = await fetch(`/api/shops/${shopId}/follow`, { method: 'POST', credentials: 'include' });
      if (res.status === 401) {
        router.push(`/login?role=client&next=${encodeURIComponent(`/boutiques/${shopSlug || shopId}`)}`);
        return;
      }
      const d = await res.json();
      if (d?.success) {
        setFollowing(!!d.following);
        setFollowerCount(d.followers ?? 0);
      }
    } finally {
      setFollowBusy(false);
    }
  };

  const shareShop = async () => {
    if (typeof window === 'undefined') return;
    const url = `${window.location.origin}/boutiques/${shopSlug || shopId || ''}`;
    const payload = { title: `${shop.name} — Boutique DDM+`, text: `Découvrez ${shop.name} sur DDM+`, url };
    try {
      if (navigator.share) {
        await navigator.share(payload);
      } else {
        await navigator.clipboard.writeText(url);
        setShared(true);
        setTimeout(() => setShared(false), 2000);
      }
    } catch {
      // annulation utilisateur — rien à faire
    }
  };

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
      {shop.coverImage && (
        <img src={shop.coverImage} alt="" className="absolute inset-0 h-full w-full object-cover opacity-40" />
      )}
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
          'grid flex-shrink-0 place-items-center rounded-2xl bg-white/15 backdrop-blur border border-white/20 text-white font-extrabold overflow-hidden',
          compact ? 'h-14 w-14 text-[18px]' : 'h-20 w-20 text-[24px]'
        )}>
          {shop.logo ? (
            <img src={shop.logo} alt={shop.name} className="h-full w-full object-cover" />
          ) : (
            shop.initials
          )}
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
            {shop.memberSince && (
              <>
                <span className="text-white/50">·</span>
                <span>Membre depuis {shop.memberSince}</span>
              </>
            )}
          </div>
          <div className="mt-1.5 flex items-center gap-2 text-[11px] text-white/75">
            <span className="inline-flex items-center gap-1 truncate"><MapPin size={11} /> {shop.location}</span>
            {shop.responseTime && (
              <>
                <span className="text-white/50">·</span>
                <span className="inline-flex items-center gap-1 whitespace-nowrap"><Clock size={11} /> Réponse moyenne : {shop.responseTime}</span>
              </>
            )}
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
        <img src={p.img || p.image || '/placeholder.svg'} alt={p.name} onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/placeholder.svg'; }} className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300" />
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
        {shop.responseTime && (
          <div className="rounded-xl border border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-800 p-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Réponse</p>
            <p className="mt-1 text-[18px] font-extrabold text-emerald-600 dark:text-emerald-400">{shop.responseTime}</p>
          </div>
        )}
        {shop.onTimeRate != null && (
          <div className="rounded-xl border border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-800 p-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">À l&apos;heure</p>
            <p className="mt-1 text-[18px] font-extrabold tabular-nums text-slate-900 dark:text-white">{shop.onTimeRate}%</p>
          </div>
        )}
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

  const trustBadges = [
    shop.verified
      ? { icon: CheckCircle, ttl: 'Vendeur vérifié', txt: 'Identité contrôlée' }
      : null,
    { icon: Shield, ttl: 'Paiement Escrow protégé', txt: 'Transactions sécurisées' },
    shop.responseTime
      ? { icon: Clock, ttl: 'Réponse rapide', txt: `Réponse moyenne ${shop.responseTime}` }
      : null,
    shop.type === 'factory'
      ? { icon: Factory, ttl: 'Usine inspectée', txt: 'Contrôle qualité DDM+' }
      : { icon: MapPin, ttl: 'Partenaire local', txt: 'Soutient l’économie locale' },
  ].filter(Boolean) as { icon: any; ttl: string; txt: string }[];

  const FollowButton = ({ className }: { className?: string }) => isOwner ? (
    // Le propriétaire ne se suit pas lui-même — accès direct à l'admin boutique
    <Link
      href="/espace-vendeur"
      className={cn(
        'inline-flex items-center justify-center gap-1.5 h-10 rounded-xl border border-emerald-300 bg-emerald-50 text-emerald-700 font-semibold text-[13px] transition hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300',
        className
      )}
    >
      <LayoutDashboard size={14} />
      Gérer ma boutique
    </Link>
  ) : (
    <button
      type="button"
      onClick={toggleFollow}
      disabled={followBusy}
      className={cn(
        'inline-flex items-center justify-center gap-1.5 h-10 rounded-xl border font-semibold text-[13px] transition disabled:opacity-60',
        following
          ? 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
          : 'border-slate-200 bg-white text-slate-700 hover:border-emerald-400 hover:text-emerald-600 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-300',
        className
      )}
    >
      {followBusy ? (
        <Loader2 size={14} className="animate-spin" />
      ) : following ? (
        <UserCheck size={14} />
      ) : (
        <UserPlus size={14} />
      )}
      {following ? 'Abonné' : 'Suivre la boutique'}
      {followerCount > 0 && <span className="tabular-nums text-[11px] opacity-70">· {followerCount}</span>}
    </button>
  );

  const ShareButton = ({ className }: { className?: string }) => (
    <button
      type="button"
      onClick={shareShop}
      className={cn(
        'inline-flex items-center justify-center gap-1.5 h-10 rounded-xl border border-slate-200 bg-white text-slate-700 font-semibold text-[13px] hover:border-emerald-400 hover:text-emerald-600 transition dark:bg-slate-900 dark:border-slate-700 dark:text-slate-300',
        className
      )}
    >
      <Share2 size={14} /> {shared ? 'Lien copié !' : 'Partager'}
    </button>
  );

  const EmptyCatalog = () => (
    <div className="rounded-2xl border border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-800 p-8 md:p-10 text-center">
      <div className="grid h-16 w-16 mx-auto place-items-center rounded-full bg-emerald-50 dark:bg-emerald-950/40 mb-4">
        <Package size={26} className="text-emerald-600 dark:text-emerald-400" />
      </div>
      <p className="text-[16px] font-extrabold text-slate-900 dark:text-white">Le catalogue arrive bientôt</p>
      <p className="mt-1.5 text-[13px] text-slate-500 dark:text-slate-400 max-w-sm mx-auto leading-relaxed">
        Nous préparons soigneusement notre sélection de produits de qualité.
        Revenez bientôt pour découvrir nos offres exclusives sur cette boutique.
      </p>
      <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
        <a
          href={contactWhatsApp}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-1.5 h-10 px-4 rounded-xl bg-emerald-600 text-white font-semibold text-[13px] hover:bg-emerald-700 transition"
        >
          <MessageCircle size={14} /> Contacter le vendeur
        </a>
        <FollowButton className="px-4" />
        <ShareButton className="px-4" />
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-24 md:pb-12">
      <div className="mx-auto max-w-6xl px-4 md:px-6 py-4 md:py-6">
        <HeaderShop />

        {/* Badges de confiance */}
        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-2.5 md:gap-3">
          {trustBadges.map((b) => (
            <div key={b.ttl} className="flex items-start gap-2.5 rounded-xl border border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-800 p-3">
              <span className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
                <b.icon size={15} />
              </span>
              <div className="min-w-0">
                <p className="text-[12px] font-bold text-slate-900 dark:text-white leading-tight">{b.ttl}</p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight mt-0.5">{b.txt}</p>
              </div>
            </div>
          ))}
        </div>

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
                {shop.categories.length > 0 && (
                  <div className="mb-4">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">Catégories spécialisées</p>
                    <div className="flex flex-wrap gap-1.5">
                      {shop.categories.map((c) => (
                        <span key={c} className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-700 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-300">
                          {c}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {products.length > 0 && (
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
                )}
                {products.length === 0 ? (
                  <EmptyCatalog />
                ) : filtered.length === 0 ? (
                  <div className="rounded-2xl border border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-800 p-8 text-center">
                    <p className="text-[13px] font-semibold text-slate-500 dark:text-slate-400">Aucun produit dans cette catégorie.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
                    {filtered.map((p) => <ProductCard key={p.id} product={p} />)}
                  </div>
                )}
              </>
            )}
            {tab === 'reviews' && <Reviews />}
            {tab === 'about' && <About />}
            {tab === 'conditions' && <Conditions />}
          </div>

          <aside className="hidden lg:block">
            <div className="space-y-4 sticky top-[calc(var(--mkt-header-h,0px)+12px)]">
              {/* Contact vendeur */}
              <div className="rounded-2xl border border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-800 p-4">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">Contact vendeur</p>
                <div className="flex items-center gap-2 text-[12px] text-slate-700 dark:text-slate-300 mb-3">
                  <Package size={13} className="text-slate-500" /> {shop.productCount} produits au catalogue
                </div>
                <div className="space-y-2">
                  <a
                    href={contactWhatsApp}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w-full h-10 rounded-xl bg-emerald-600 text-white font-semibold text-[13px] hover:bg-emerald-700 transition"
                  >
                    <MessageCircle size={14} /> Contacter le vendeur
                  </a>
                  <FollowButton className="w-full" />
                </div>

                <div className="mt-4 space-y-2 border-t border-slate-100 dark:border-slate-800 pt-3">
                  {shop.responseTime && (
                    <div className="flex items-center justify-between text-[12px]">
                      <span className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400"><Clock size={12} /> Réponse moyenne</span>
                      <span className="font-bold text-slate-900 dark:text-white">{shop.responseTime}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between text-[12px]">
                    <span className="text-slate-500 dark:text-slate-400">Statut</span>
                    <span className="inline-flex items-center gap-1 font-bold text-emerald-600 dark:text-emerald-400">
                      {shop.verified ? <><CheckCircle size={12} /> Vendeur vérifié</> : 'Boutique partenaire'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[12px]">
                    <span className="text-slate-500 dark:text-slate-400">Localisation</span>
                    <span className="font-bold text-slate-900 dark:text-white truncate ml-2">{shop.location}</span>
                  </div>
                  {shop.onTimeRate != null && (
                    <div className="flex items-center justify-between text-[12px]">
                      <span className="text-slate-500 dark:text-slate-400">Livré à l&apos;heure</span>
                      <span className="font-bold text-slate-900 dark:text-white tabular-nums">{shop.onTimeRate}%</span>
                    </div>
                  )}
                </div>

                {(shop.socials?.instagram || shop.socials?.facebook || shop.socials?.website) && (
                  <div className="flex items-center justify-center gap-2 pt-3 mt-3 border-t border-slate-100 dark:border-slate-800">
                    {shop.socials?.instagram && (
                      <a href={shop.socials.instagram.startsWith('http') ? shop.socials.instagram : `https://instagram.com/${shop.socials.instagram.replace(/^@/, '')}`} target="_blank" rel="noopener noreferrer" className="grid h-9 w-9 place-items-center rounded-xl border border-slate-200 text-slate-600 hover:border-pink-400 hover:text-pink-600 transition dark:border-slate-700 dark:text-slate-300" title="Instagram">
                        <Instagram size={15} />
                      </a>
                    )}
                    {shop.socials?.facebook && (
                      <a href={shop.socials.facebook.startsWith('http') ? shop.socials.facebook : `https://facebook.com/${shop.socials.facebook.replace(/^@/, '')}`} target="_blank" rel="noopener noreferrer" className="grid h-9 w-9 place-items-center rounded-xl border border-slate-200 text-slate-600 hover:border-blue-500 hover:text-blue-600 transition dark:border-slate-700 dark:text-slate-300" title="Facebook">
                        <Facebook size={15} />
                      </a>
                    )}
                    {shop.socials?.website && (
                      <a href={shop.socials.website} target="_blank" rel="noopener noreferrer" className="grid h-9 w-9 place-items-center rounded-xl border border-slate-200 text-slate-600 hover:border-emerald-500 hover:text-emerald-600 transition dark:border-slate-700 dark:text-slate-300" title="Site web">
                        <Globe size={15} />
                      </a>
                    )}
                  </div>
                )}
              </div>

              {/* Escrow */}
              <div className="rounded-2xl border border-emerald-200/60 bg-emerald-50/60 dark:bg-emerald-950/20 dark:border-emerald-900/40 p-4">
                <div className="flex items-center gap-2 mb-1.5">
                  <Shield size={14} className="text-emerald-600 dark:text-emerald-400" />
                  <p className="text-[12px] font-bold text-emerald-900 dark:text-emerald-300">Paiement Escrow protégé par DDM+</p>
                </div>
                <p className="text-[11px] text-emerald-800/80 dark:text-emerald-400/80 leading-relaxed">
                  Vos transactions sont sécurisées. Les fonds ne sont débloqués qu&apos;après confirmation de réception.
                </p>
                <p className="mt-3 pt-3 border-t border-emerald-200/60 dark:border-emerald-900/40 flex items-center gap-1.5 text-[10px] text-emerald-700/80 dark:text-emerald-500/80">
                  <Lock size={11} /> Vos données sont protégées
                </p>
              </div>
            </div>
          </aside>
        </div>

        {/* Boutiques similaires */}
        {similarShops.length > 0 && (
          <section className="mt-8">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-[15px] md:text-[17px] font-extrabold text-slate-900 dark:text-white">Boutiques similaires</h2>
              <Link href="/market/boutiques" className="inline-flex items-center gap-1 text-[12px] font-bold text-emerald-600 hover:text-emerald-700">
                Voir tout <ChevronRight size={14} />
              </Link>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory md:grid md:grid-cols-4 md:overflow-visible">
              {similarShops.map((s) => (
                <Link
                  key={s.slug}
                  href={`/boutiques/${s.slug}`}
                  className="w-44 md:w-auto flex-shrink-0 snap-start rounded-2xl overflow-hidden border border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-800 hover:shadow-md transition-shadow"
                >
                  <div className="relative h-24 bg-gradient-to-br from-emerald-600 to-teal-700 overflow-hidden">
                    {s.coverImage ? (
                      <img src={s.coverImage} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <span className="absolute inset-0 grid place-items-center text-white/60"><Store size={26} /></span>
                    )}
                  </div>
                  <div className="p-3">
                    <div className="flex items-center gap-1">
                      {s.logo ? (
                        <img src={s.logo} alt="" className="h-5 w-5 rounded-md object-cover flex-shrink-0" />
                      ) : null}
                      <p className="text-[12px] font-bold text-slate-900 dark:text-white truncate">{s.name}</p>
                      {s.isVerified && <CheckCircle size={11} className="text-emerald-500 flex-shrink-0" />}
                    </div>
                    <p className="mt-1 text-[10px] text-slate-500 dark:text-slate-400 truncate">
                      <b className="tabular-nums text-slate-700 dark:text-slate-300">{s.productCount}</b> produits
                      {s.categories[0] ? ` · ${s.categories[0]}` : ''}
                    </p>
                    {s.city && (
                      <p className="mt-0.5 text-[10px] text-slate-400 flex items-center gap-0.5 truncate">
                        <MapPin size={9} /> {s.city}{s.country ? `, ${s.country}` : ''}
                      </p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
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
            onClick={toggleFollow}
            disabled={followBusy}
            aria-label={following ? 'Ne plus suivre' : 'Suivre la boutique'}
            className={cn(
              'inline-flex items-center justify-center gap-1.5 h-10 px-3 rounded-xl border font-semibold text-[13px] transition disabled:opacity-60',
              following
                ? 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                : 'border-slate-200 bg-white text-slate-700 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-300'
            )}
          >
            {followBusy ? <Loader2 size={14} className="animate-spin" /> : following ? <UserCheck size={14} /> : <UserPlus size={14} />}
          </button>
          <button
            onClick={shareShop}
            aria-label="Partager la boutique"
            className="inline-flex items-center justify-center h-10 px-3 rounded-xl border border-slate-200 bg-white text-slate-700 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-300"
          >
            <Share2 size={14} />
          </button>
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
