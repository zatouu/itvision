'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { formatFcfa } from './formatFcfa';
import { Card } from './Card';
import { Badge } from './Badge';
import { Icon } from './Icon';
import { useWishlist, useCompare } from './useWishlist';
import type { Product } from './types';

export type ProductCardSize = 'sm' | 'lg';

export interface ProductCardProps {
  product: Product;
  size?: ProductCardSize;
  className?: string;
  onClick?: () => void;
  /** Ajout rapide au panier. Non proposé si le produit exige une variante. */
  onQuickAdd?: (product: Product) => void;
}

function getProductImage(product: Product): string {
  return product.img || product.image || product.images?.[0] || '';
}

const AVAILABILITY: Record<string, { label: string; tone: string }> = {
  in_stock: { label: 'En stock à Dakar', tone: 'text-emerald-700 dark:text-emerald-400' },
  preorder: { label: 'Sur commande', tone: 'text-amber-700 dark:text-amber-400' },
  out_of_stock: { label: 'Épuisé', tone: 'text-red-600 dark:text-red-400' },
};

export function ProductCard({
  product,
  size = 'sm',
  className,
  onClick,
  onQuickAdd,
}: ProductCardProps) {
  const [imageError, setImageError] = useState(false);
  const { isFavorite, toggle: toggleFavorite } = useWishlist();
  const { isCompared, toggle: toggleCompare, max: compareMax } = useCompare();
  const [compareFull, setCompareFull] = useState(false);

  const image = getProductImage(product);
  const category = product.cat || product.category || '';
  const moq = product.moq ?? product.minOrderQty ?? 1;
  // basePrice ne vaut que s'il s'agit d'une référence réellement inférieure
  // (meilleur palier / prix groupe) — sinon aucun prix barré.
  const bestPrice = product.basePrice > 0 && product.basePrice < product.price ? product.basePrice : 0;
  const savePct = product.save && product.save > 0 ? product.save : 0;
  const availability = product.availabilityStatus ? AVAILABILITY[product.availabilityStatus] : undefined;
  const favorite = isFavorite(product.id);
  const compared = isCompared(product.id);
  const isLg = size === 'lg';
  const quickAddable = !!onQuickAdd && !product.hasVariants && product.availabilityStatus !== 'out_of_stock';

  return (
    <Card
      onClick={onClick}
      className={cn(
        'group flex flex-col overflow-hidden transition-shadow hover:shadow-md',
        onClick ? 'cursor-pointer' : 'cursor-default',
        className
      )}
    >
      <div className="relative aspect-square bg-slate-100 dark:bg-slate-800">
        {image && !imageError ? (
          <img
            src={image}
            alt={product.name}
            onError={() => setImageError(true)}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="h-full w-full flex flex-col items-center justify-center text-slate-400 dark:text-slate-500">
            <Icon name="package" size={28} />
            <span className="text-[10px] mt-1">Image indisponible</span>
          </div>
        )}

        <div className="absolute left-2 top-2 flex flex-col gap-1">
          {/* Le MOQ n'est une information que s'il contraint réellement l'achat */}
          {moq > 1 && (
            <Badge tone="amber" className="text-[10px]">
              <Icon name="package" size={10} />
              Min. {moq}
            </Badge>
          )}
          {product.hasGroup && (
            <Badge tone="violet" className="text-[10px]">
              <Icon name="users" size={10} />
              Groupe
            </Badge>
          )}
        </div>

        <div className="absolute right-2 top-2 flex flex-col items-end gap-1">
          {savePct > 0 && (
            <span className="inline-flex items-center gap-0.5 whitespace-nowrap rounded-md bg-red-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
              -{savePct}%
            </span>
          )}
          {product.verified && (
            <span
              className="grid h-6 w-6 place-items-center rounded-full bg-emerald-500 text-white"
              title="Fournisseur vérifié"
            >
              <Icon name="checkCircle" size={11} />
            </span>
          )}
        </div>

        <div className="absolute bottom-2 right-2 flex items-center gap-1.5">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (!toggleCompare(product.id)) {
                setCompareFull(true);
                window.setTimeout(() => setCompareFull(false), 2400);
              }
            }}
            className={cn(
              'grid h-8 w-8 place-items-center rounded-full shadow-sm transition-colors',
              compared
                ? 'bg-violet-600 text-white'
                : 'bg-white/95 text-slate-700 hover:bg-white dark:bg-slate-900/95 dark:text-slate-300 dark:hover:bg-slate-900'
            )}
            aria-label={compared ? 'Retirer du comparateur' : 'Ajouter au comparateur'}
            aria-pressed={compared}
            title={compared ? 'Retirer du comparateur' : 'Comparer'}
          >
            <Icon name="barChart" size={14} />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              toggleFavorite(product.id);
            }}
            className={cn(
              'grid h-8 w-8 place-items-center rounded-full shadow-sm transition-colors',
              favorite
                ? 'bg-red-500 text-white'
                : 'bg-white/95 text-slate-700 hover:bg-white dark:bg-slate-900/95 dark:text-slate-300 dark:hover:bg-slate-900'
            )}
            aria-label={favorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
            aria-pressed={favorite}
          >
            <Icon name="heart" size={14} className={favorite ? 'fill-current' : undefined} />
          </button>
        </div>

        {compareFull && (
          <span className="absolute inset-x-2 bottom-11 rounded-lg bg-slate-900/90 px-2 py-1 text-center text-[10px] font-semibold text-white">
            Comparateur plein ({compareMax} max)
          </span>
        )}
      </div>

      <div className={cn('flex flex-1 flex-col p-2.5', isLg && 'md:p-3')}>
        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          {category}
        </p>
        <p
          className={cn(
            'mt-0.5 font-semibold text-slate-900 dark:text-white line-clamp-2 leading-tight',
            isLg ? 'min-h-[34px] text-[13px]' : 'min-h-[30px] text-[12px]'
          )}
        >
          {product.name}
        </p>

        {/* Étoiles uniquement si des avis existent réellement */}
        {product.rating > 0 && (product.reviewCount ?? 0) > 0 ? (
          <div className="mt-1 flex items-center gap-1 text-[10px] text-slate-500 dark:text-slate-400">
            <Icon
              name="star"
              size={10}
              strokeWidth={0}
              fill="currentColor"
              className="fill-amber-500 text-amber-500"
            />
            <span className="font-semibold tabular-nums text-slate-700 dark:text-slate-300">
              {product.rating.toFixed(1)}
            </span>
            <span className="tabular-nums">({product.reviewCount})</span>
          </div>
        ) : availability ? (
          <p className={cn('mt-1 text-[10px] font-semibold', availability.tone)}>{availability.label}</p>
        ) : null}

        <div className="mt-1.5 flex items-baseline gap-1.5 whitespace-nowrap">
          <span
            className={cn(
              'font-extrabold tabular-nums text-emerald-600 dark:text-emerald-400',
              isLg ? 'text-[15px]' : 'text-[14px]'
            )}
          >
            {formatFcfa(product.price)}
          </span>
          {bestPrice > 0 && (
            <span className="text-[10px] font-semibold text-slate-400 line-through tabular-nums">
              {formatFcfa(bestPrice)}
            </span>
          )}
        </div>
        {/* Le prix unitaire inclut les frais d'import mais pas le transport :
            l'annoncer ici évite la surprise au panier. */}
        <p className="mt-0.5 text-[9px] leading-tight text-slate-400 dark:text-slate-500">
          {product.includedFees ? 'Frais inclus' : 'Prix unitaire'} · transport en sus
        </p>

        {quickAddable && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onQuickAdd?.(product);
            }}
            className="mt-2 inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-emerald-600 py-2 text-[11px] font-bold text-white transition-colors hover:bg-emerald-700"
          >
            <Icon name="cart" size={13} />
            Ajouter{moq > 1 ? ` (${moq})` : ''}
          </button>
        )}
      </div>
    </Card>
  );
}
