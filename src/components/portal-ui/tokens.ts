// Design tokens du portail entreprise — source unique des classes récurrentes.
// Palette : encre stone + accent emerald, radius 2xl, ombres subtiles.

export const CARD = 'rounded-2xl border border-stone-200 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.03)]'

export const CARD_DASHED = 'rounded-2xl border border-dashed border-stone-300 bg-white'

export const INPUT = 'w-full rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-emerald-600/30 focus:border-emerald-500'

export const BTN_PRIMARY = 'inline-flex items-center justify-center gap-2 rounded-full bg-emerald-800 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-900 disabled:opacity-50 transition-colors'

export const BTN_GHOST = 'inline-flex items-center gap-1.5 self-start sm:self-auto rounded-full border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-600 hover:border-emerald-400 hover:text-emerald-800 transition-colors flex-shrink-0'

export const PILL = 'inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 ring-inset'

// Tons de badge (pastille ring-1 ring-inset)
export const TONE = {
  emerald: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  sky: 'bg-sky-50 text-sky-700 ring-sky-600/20',
  amber: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  orange: 'bg-orange-50 text-orange-700 ring-orange-600/20',
  red: 'bg-red-50 text-red-700 ring-red-600/20',
  redDeep: 'bg-red-50 text-red-800 ring-red-600/20',
  neutral: 'bg-stone-100 text-stone-500 ring-stone-400/20',
  stone: 'bg-stone-100 text-stone-600 ring-stone-500/20',
  teal: 'bg-teal-50 text-teal-700 ring-teal-600/20',
} as const

export type ToneKey = keyof typeof TONE

// Tons d'icône KPI (texte seul)
export const ICON_TONE = {
  emerald: 'text-emerald-700',
  sky: 'text-sky-600',
  amber: 'text-amber-600',
  orange: 'text-orange-600',
  red: 'text-red-600',
  teal: 'text-teal-600',
  stone: 'text-stone-400',
} as const

export type IconToneKey = keyof typeof ICON_TONE
