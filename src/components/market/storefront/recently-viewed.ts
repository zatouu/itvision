/** Produits consultés récemment — stockés uniquement sur l'appareil (aucune donnée envoyée au serveur). */
const STORAGE_KEY = 'ddm:recently-viewed';
const MAX_ITEMS = 12;
const OBJECT_ID = /^[a-f\d]{24}$/i;

export function getRecentlyViewedIds(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw: unknown = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(raw)
      ? raw.filter((id): id is string => typeof id === 'string' && OBJECT_ID.test(id)).slice(0, MAX_ITEMS)
      : [];
  } catch {
    return [];
  }
}

export function recordProductView(id: string) {
  if (typeof window === 'undefined' || !OBJECT_ID.test(id)) return;
  try {
    const ids = [id, ...getRecentlyViewedIds().filter(existing => existing !== id)].slice(0, MAX_ITEMS);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  } catch {
    // Stockage indisponible (navigation privée, quota) : la fonctionnalité est simplement inactive
  }
}

export function clearRecentlyViewed() {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Stockage indisponible : rien à effacer
  }
}
