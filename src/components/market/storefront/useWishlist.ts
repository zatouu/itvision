'use client';

import { useCallback, useEffect, useState } from 'react';

/**
 * Favoris marketplace — source unique pour tous les points d'entrée.
 *
 * Le stockage local (`wishlist:items`) est la vérité d'affichage immédiate ;
 * l'API `/api/favorites` persiste côté compte quand l'utilisateur est connecté
 * (elle crédite aussi les grains de fidélité). Un 401 est silencieux : les
 * invités gardent leurs favoris localement jusqu'à connexion.
 *
 * Même clé et même contrat que la page /produits/favoris, qui resynchronise
 * le local depuis le serveur au chargement.
 */

const KEY = 'wishlist:items';
const EVENT = 'wishlist:updated';

function read(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

function write(ids: string[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(KEY, JSON.stringify(ids));
  } catch {
    /* quota / mode privé : l'état React reste correct pour la session */
  }
  window.dispatchEvent(new CustomEvent(EVENT));
}

export function useWishlist() {
  const [ids, setIds] = useState<string[]>([]);

  useEffect(() => {
    const sync = () => setIds(read());
    sync();
    window.addEventListener(EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  const isFavorite = useCallback((productId: string) => ids.includes(productId), [ids]);

  const toggle = useCallback((productId: string) => {
    if (!productId) return false;
    const current = read();
    const nowFavorite = !current.includes(productId);
    write(nowFavorite ? [...current, productId] : current.filter((x) => x !== productId));

    if (nowFavorite) {
      fetch('/api/favorites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ productId }),
      }).catch(() => null);
    } else {
      fetch(`/api/favorites?productId=${encodeURIComponent(productId)}`, {
        method: 'DELETE',
        credentials: 'include',
      }).catch(() => null);
    }

    return nowFavorite;
  }, []);

  return { ids, isFavorite, toggle };
}

/**
 * Comparateur — la page /produits/compare lit `?ids=`, le header lit
 * `compare:ids`. Rien n'écrivait cette clé : le comparateur était inatteignable.
 */
const COMPARE_KEY = 'compare:ids';
const COMPARE_MAX = 4;

function readCompare(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    return (localStorage.getItem(COMPARE_KEY) || '').split(',').filter(Boolean);
  } catch {
    return [];
  }
}

export function useCompare() {
  const [ids, setIds] = useState<string[]>([]);

  useEffect(() => {
    const sync = () => setIds(readCompare());
    sync();
    window.addEventListener('compare:updated', sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener('compare:updated', sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  const isCompared = useCallback((productId: string) => ids.includes(productId), [ids]);

  /** Retourne false si la limite est atteinte (l'appelant peut prévenir l'utilisateur). */
  const toggle = useCallback((productId: string): boolean => {
    if (!productId) return false;
    const current = readCompare();
    const next = current.includes(productId)
      ? current.filter((x) => x !== productId)
      : current.length >= COMPARE_MAX
        ? null
        : [...current, productId];
    if (next === null) return false;
    try {
      localStorage.setItem(COMPARE_KEY, next.join(','));
    } catch {
      /* ignore */
    }
    window.dispatchEvent(new CustomEvent('compare:updated'));
    return true;
  }, []);

  return { ids, isCompared, toggle, max: COMPARE_MAX };
}
