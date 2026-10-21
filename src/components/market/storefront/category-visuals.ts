import {
  Armchair, Baby, Car, Dumbbell, Gift, HeartPulse, House, Laptop, Package, Shirt, ShieldCheck, Smartphone, Utensils, Wrench,
  type LucideIcon,
} from 'lucide-react';

export interface CategoryVisual {
  Icon: LucideIcon;
  /** Dégradé de la tuile — la teinte de départ (en haut à gauche, sous le texte blanc) reste foncée pour le contraste */
  tile: string;
}

const RULES: { test: RegExp; visual: CategoryVisual }[] = [
  { test: /secur|surveil|camera|alarm|acces|incendie/, visual: { Icon: ShieldCheck, tile: 'from-rose-600 to-red-500' } },
  { test: /informat|bureau|ordinat|reseau|ecran|clavier|souris/, visual: { Icon: Laptop, tile: 'from-indigo-600 to-blue-500' } },
  { test: /electron|smartphone|telephon|audio|video|\btv\b/, visual: { Icon: Smartphone, tile: 'from-sky-700 to-cyan-500' } },
  { test: /domoti|smart|maison|eclairage|home/, visual: { Icon: House, tile: 'from-teal-700 to-emerald-500' } },
  { test: /mobilier|meuble|install|rack|baie/, visual: { Icon: Armchair, tile: 'from-orange-700 to-amber-500' } },
  { test: /pack|cadeau|gift/, visual: { Icon: Gift, tile: 'from-pink-600 to-fuchsia-500' } },
  { test: /\bmode\b|vetement|textile|chaussure/, visual: { Icon: Shirt, tile: 'from-fuchsia-700 to-purple-500' } },
  { test: /\bautos?\b|automobile|voiture|\bmotos?\b/, visual: { Icon: Car, tile: 'from-slate-700 to-zinc-500' } },
  { test: /beaute|sante|soin/, visual: { Icon: HeartPulse, tile: 'from-rose-600 to-pink-500' } },
  { test: /cuisine|electromenager/, visual: { Icon: Utensils, tile: 'from-red-600 to-orange-500' } },
  { test: /sport|fitness/, visual: { Icon: Dumbbell, tile: 'from-green-700 to-lime-500' } },
  { test: /bebe|enfant|jouet/, visual: { Icon: Baby, tile: 'from-orange-600 to-rose-500' } },
  { test: /outil|bricol|quincaill/, visual: { Icon: Wrench, tile: 'from-stone-700 to-amber-600' } },
];

const FALLBACK_TILES = [
  'from-emerald-700 to-teal-500',
  'from-violet-600 to-purple-500',
  'from-blue-700 to-indigo-500',
  'from-orange-700 to-rose-500',
  'from-cyan-700 to-sky-500',
  'from-fuchsia-700 to-pink-500',
];

const normalize = (value: string) => value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

export function categoryVisual(key: string, label: string, index = 0): CategoryVisual {
  const haystack = normalize(`${key} ${label}`);
  const rule = RULES.find(entry => entry.test.test(haystack));
  return rule?.visual ?? { Icon: Package, tile: FALLBACK_TILES[index % FALLBACK_TILES.length] };
}
