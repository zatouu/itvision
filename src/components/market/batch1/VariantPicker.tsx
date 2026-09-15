'use client';

import { cn } from '@/lib/utils';
import { formatFcfa } from './formatFcfa';
import type { ProductVariant } from './types';

export interface VariantPickerProps {
  variants: ProductVariant[];
  /** id de la variante sélectionnée */
  value: string;
  onChange: (variantId: string) => void;
  /** Prix unitaire produit, pour n'afficher le prix variante que s'il diffère */
  productPrice: number;
  className?: string;
  size?: 'sm' | 'md';
}

/**
 * Sélecteur de variante partagé mobile/desktop.
 *
 * La fiche produit maintenait deux arbres DOM et seul le mobile portait un
 * sélecteur : sur desktop la variante restait figée sur la première, alors que
 * le prix et le stock en dépendent. Un composant unique évite la divergence.
 */
export function VariantPicker({
  variants,
  value,
  onChange,
  productPrice,
  className,
  size = 'sm',
}: VariantPickerProps) {
  if (variants.length === 0) return null;
  const md = size === 'md';

  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      {variants.map((v) => {
        const soldOut = typeof v.stock === 'number' && v.stock <= 0;
        const showPrice = typeof v.price === 'number' && v.price > 0 && v.price !== productPrice;
        const selected = value === v.id;
        return (
          <button
            key={v.id}
            type="button"
            onClick={() => onChange(v.id)}
            aria-pressed={selected}
            className={cn(
              'flex items-center gap-2 rounded-xl border px-3 py-2 font-semibold transition-colors',
              md ? 'text-[13px]' : 'text-[12px]',
              selected
                ? 'border-emerald-600 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                : 'border-slate-200 text-slate-700 hover:border-slate-300 dark:border-slate-800 dark:text-slate-300',
              soldOut && 'opacity-50'
            )}
          >
            {v.image && (
              <img src={v.image} alt="" className="h-8 w-8 rounded-lg object-cover" loading="lazy" />
            )}
            <span className="text-left">
              {v.label}
              {(showPrice || typeof v.stock === 'number') && (
                <span className="block text-[10px] font-normal text-slate-500 dark:text-slate-400">
                  {showPrice ? formatFcfa(v.price!) : ''}
                  {showPrice && typeof v.stock === 'number' ? ' · ' : ''}
                  {typeof v.stock === 'number'
                    ? v.stock > 0
                      ? `${v.stock} en stock`
                      : 'épuisé'
                    : ''}
                </span>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}
