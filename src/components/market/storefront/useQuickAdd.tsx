'use client';

import { useCallback, useState } from 'react';
import Link from 'next/link';
import { Icon } from './Icon';
import { quickAddToCart } from './data-mappers';
import type { Product } from './types';

/**
 * Ajout rapide au panier depuis une grille de cartes, avec confirmation.
 *
 * Sans retour visuel, l'utilisateur ne sait pas si son clic a produit un effet
 * (le panier est dans le header/la nav basse). Le toast confirme et propose
 * d'aller au panier — c'est le point de sortie attendu après un ajout.
 */
export function useQuickAdd() {
  const [added, setAdded] = useState<{ name: string; qty: number } | null>(null);

  const quickAdd = useCallback((product: Product) => {
    if (!quickAddToCart(product)) return;
    setAdded({ name: product.name, qty: Math.max(1, product.minOrderQty ?? product.moq ?? 1) });
    window.setTimeout(() => setAdded(null), 3200);
  }, []);

  const toast = added ? (
    <div
      role="status"
      className="fixed inset-x-3 bottom-20 z-[60] mx-auto max-w-md rounded-2xl border border-emerald-200 bg-white p-3 shadow-lg dark:border-emerald-900 dark:bg-slate-900 md:bottom-6"
    >
      <div className="flex items-center gap-2.5">
        <span className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-full bg-emerald-600 text-white">
          <Icon name="check" size={16} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[12px] font-bold text-slate-900 dark:text-white">Ajouté au panier</p>
          <p className="truncate text-[11px] text-slate-500 dark:text-slate-400">
            {added.qty > 1 ? `${added.qty} × ` : ''}{added.name}
          </p>
        </div>
        <Link
          href="/panier"
          className="flex-shrink-0 rounded-xl bg-emerald-600 px-3 py-2 text-[11px] font-bold text-white hover:bg-emerald-700"
        >
          Voir le panier
        </Link>
      </div>
    </div>
  ) : null;

  return { quickAdd, toast };
}
