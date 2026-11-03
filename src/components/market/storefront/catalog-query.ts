// Paramètres de requête du catalogue DDM+ — partagés par le rendu serveur (SEO) et le client.
export const PAGE_SIZE = 24;

export const SORT_MAP: Record<string, string> = {
  popular: 'rating-desc',
  price_asc: 'price-asc',
  price_desc: 'price-desc',
  save: 'groupbuy-discount-desc',
  new: 'default',
};

// Filtre « lot minimum » : `lot` = vendu par lots (> 1) ; tranches affinées client
export const MOQ_BUCKETS = ['lot', '1-4', '5-9', '10-24', '25+'];
export const MOQ_LOWER_BOUND: Record<string, number> = { '5-9': 5, '10-24': 10, '25+': 25 };

export type CatalogFilters = { cat: string; q: string; moq: string; groupOnly: boolean; sort: string };

/** Filtres d'entrée lus dans l'URL : ?cat=<slug> (ou ?category=), ?q=, ?moq=<bucket>, ?groupe=1 */
export function filtersFromParams(get: (key: string) => string | null | undefined): CatalogFilters {
  const moq = get('moq');
  return {
    cat: get('cat') || get('category') || 'Tous',
    q: get('q') || '',
    moq: moq && MOQ_BUCKETS.includes(moq) ? moq : 'all',
    groupOnly: get('groupe') === '1',
    sort: 'popular',
  };
}

export function buildCatalogParams(page: number, f: CatalogFilters): URLSearchParams {
  const params = new URLSearchParams({
    limit: String(PAGE_SIZE),
    page: String(page),
    compact: '1',
    includeGroupStats: '1',
    sortBy: SORT_MAP[f.sort] || 'rating-desc',
  });
  if (f.q) params.set('q', f.q);
  if (f.cat !== 'Tous') params.set('category', f.cat);
  if (f.groupOnly) params.set('onlyGroupBuy', '1');
  // Lot minimum : borne basse appliquée côté serveur (pagination juste),
  // borne haute des tranches affinée côté client.
  if (f.moq === 'lot') params.set('moq', 'lot');
  else {
    const lower = MOQ_LOWER_BOUND[f.moq];
    if (lower && lower > 1) params.set('minMoq', String(lower));
  }
  return params;
}
