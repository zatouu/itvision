export const colors = {
  // Backgrounds
  bg: '#F4F6F9',
  backgroundPrimary: '#F4F6F9',
  backgroundSecondary: '#FFFFFF',
  surface: '#FFFFFF',
  bgDeep: '#E9EDF2',
  // Profil premium (provider)
  bgGlobal: '#F5F6FA',
  heroDark: '#091A2F',
  platinum: '#E5E4E2',
  // Primary / emerald
  primary: '#0F7B4F',
  brand: '#0F7B4F',
  brandGreen: '#0F7B4F',
  brandGreenDark: '#065F3A',
  brandDeep: '#065F3A',
  primaryDark: '#065F3A',
  primaryLight: '#E6F4EC',
  brandGreenLight: '#E6F4EC',
  brandSoft: '#E4F3EC',
  brandTint: '#F1F9F4',
  brandInk: '#065F3A',
  heroGreen: '#0F7A56',
  // Secondary / navy
  navy: '#0A1628',
  ink: '#0A1628',
  inkSoft: '#1B2432',
  brandNavy: '#0A1628',
  navyLight: '#1E293B',
  // Text
  text: '#0F172A',
  textPrimary: '#0F172A',
  textSecondary: '#64748B',
  textMuted: '#94A3B8',
  textDim: '#8892A2',
  textFaint: '#B0B7C3',
  // States
  success: '#16A34A',
  successLight: '#DCFCE7',
  successSoft: '#E6F5EC',
  successInk: '#0F7A38',
  warning: '#F59E0B',
  warn: '#F59E0B',
  warningLight: '#FFFBEB',
  warnSoft: '#FEF3DC',
  warnInk: '#B76E00',
  danger: '#EF4444',
  dangerLight: '#FEE2E2',
  dangerSoft: '#FEE7E7',
  dangerInk: '#B01C1C',
  info: '#3B82F6',
  infoInk: '#1E40AF',
  infoLight: '#EFF6FF',
  infoSoft: '#E6EEFE',
  // Category colors
  electricity: '#2563EB',
  plumbing: '#0891B2',
  carpentry: '#EA580C',
  painting: '#7C3AED',
  airConditioning: '#06B6D4',
  security: '#166534',
  // Mobile money
  wave: '#1BA8FF',
  waveSoft: '#E1F3FF',
  waveInk: '#0870B0',
  orangeMoney: '#FF7900',
  orangeSoft: '#FFECDA',
  orangeInk: '#B05300',
  freeMoney: '#F5D000',
  freeSoft: '#FDF5C6',
  freeInk: '#8A7100',
  // Misc
  border: '#E2E8F0',
  borderLight: '#E2E8F0',
  borderSoft: '#EEF1F6',
  divider: '#F1F4F8',
  shadow: '#000000',
  slate50: '#F8FAFC',
  slate100: '#F1F5F9',
  // Category aliases
  categoryElectricity: '#2563EB',
  categoryPlumbing: '#0891B2',
  categoryCarpentry: '#EA580C',
  categoryPainting: '#7C3AED',
  categoryCooling: '#06B6D4',
  categorySecurity: '#166534',
}

export const spacing = {
  // Echelle numerique (handoff) : 1..9 = 4..48
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  7: 32,
  8: 40,
  9: 48,
  // Aliases nommes (existant)
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
}

export const radius = {
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  '2xl': 28,
  '3xl': 32,
  full: 999,
  pill: 999,
}

export const typography = {
  xs: { fontSize: 10, lineHeight: 12 },
  sm: { fontSize: 12, lineHeight: 16 },
  caption: { fontSize: 12, lineHeight: 16 },
  base: { fontSize: 14, lineHeight: 20 },
  body: { fontSize: 14, lineHeight: 20 },
  bodySmall: { fontSize: 12, lineHeight: 16 },
  md: { fontSize: 16, lineHeight: 22 },
  lg: { fontSize: 18, lineHeight: 24 },
  xl: { fontSize: 20, lineHeight: 28 },
  h3: { fontSize: 20, lineHeight: 28 },
  xxl: { fontSize: 24, lineHeight: 32 },
  h2: { fontSize: 24, lineHeight: 32 },
  xxxl: { fontSize: 32, lineHeight: 40 },
  h1: { fontSize: 32, lineHeight: 40 },
  display: { fontSize: 36, lineHeight: 44 },
  button: { fontSize: 16, lineHeight: 22 },
  small: { fontSize: 12.5, lineHeight: 17 },
  caps: { fontSize: 11, lineHeight: 14, letterSpacing: 0.6, textTransform: 'uppercase' as const },
  weight: {
    normal: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
    extrabold: '800' as const,
  },
}

export const shadows = {
  xs: { shadowColor: colors.shadow, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 2, elevation: 1 },
  sm: { shadowColor: colors.shadow, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 2 },
  md: { shadowColor: colors.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 6, elevation: 4 },
  lg: { shadowColor: colors.shadow, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 8 },
  xl: { shadowColor: colors.shadow, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.12, shadowRadius: 24, elevation: 12 },
  hero: { shadowColor: '#0F7B4F', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.25, shadowRadius: 20, elevation: 10 },
  heroDark: { shadowColor: colors.shadow, shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 20, elevation: 10 },
}

export const categoryMeta: Record<string, { color: string; bg: string; label: string }> = {
  electricite: { color: colors.electricity, bg: '#EFF6FF', label: 'Électricité' },
  electricity: { color: colors.electricity, bg: '#EFF6FF', label: 'Électricité' },
  plomberie: { color: colors.plumbing, bg: '#E0F2FE', label: 'Plomberie' },
  plumbing: { color: colors.plumbing, bg: '#E0F2FE', label: 'Plomberie' },
  menuiserie: { color: colors.carpentry, bg: '#FFF7ED', label: 'Menuiserie' },
  carpentry: { color: colors.carpentry, bg: '#FFF7ED', label: 'Menuiserie' },
  peinture: { color: colors.painting, bg: '#F5F3FF', label: 'Peinture' },
  painting: { color: colors.painting, bg: '#F5F3FF', label: 'Peinture' },
  climatisation: { color: colors.airConditioning, bg: '#ECFEFF', label: 'Climatisation' },
  cooling: { color: colors.airConditioning, bg: '#ECFEFF', label: 'Climatisation' },
  securite: { color: colors.security, bg: '#F0FDF4', label: 'Sécurité' },
  security: { color: colors.security, bg: '#F0FDF4', label: 'Sécurité' },
  maconnerie: { color: '#8B5A2B', bg: '#F1E7DC', label: 'Maçonnerie' },
  masonry: { color: '#8B5A2B', bg: '#F1E7DC', label: 'Maçonnerie' },
  menage: { color: '#2DCAA4', bg: '#E1F7F0', label: 'Ménage' },
  nettoyage: { color: '#2DCAA4', bg: '#E1F7F0', label: 'Nettoyage' },
  cleaning: { color: '#2DCAA4', bg: '#E1F7F0', label: 'Nettoyage' },
  demenagement: { color: '#B85818', bg: '#FBEBDF', label: 'Déménagement' },
  moving: { color: '#B85818', bg: '#FBEBDF', label: 'Déménagement' },
}

// Triplet bg/soft/ink par categorie (structure handoff GenSpark, cles slugs app)
const mkCat = (bg: string, soft: string, ink: string) => ({ bg, soft, ink })
export const cat: Record<string, { bg: string; soft: string; ink: string }> = {
  electricite:   mkCat(colors.electricity,     '#E6EEFE', '#1E5FCF'),
  electricity:   mkCat(colors.electricity,     '#E6EEFE', '#1E5FCF'),
  elec:          mkCat(colors.electricity,     '#E6EEFE', '#1E5FCF'),
  plomberie:     mkCat(colors.plumbing,        '#E1F1F4', '#14606F'),
  plumbing:      mkCat(colors.plumbing,        '#E1F1F4', '#14606F'),
  plumb:         mkCat(colors.plumbing,        '#E1F1F4', '#14606F'),
  menuiserie:    mkCat(colors.carpentry,       '#FBEBDF', '#8A3F0F'),
  carpentry:     mkCat(colors.carpentry,       '#FBEBDF', '#8A3F0F'),
  carpen:        mkCat(colors.carpentry,       '#FBEBDF', '#8A3F0F'),
  peinture:      mkCat(colors.painting,        '#EEE9FC', '#5A3FC0'),
  painting:      mkCat(colors.painting,        '#EEE9FC', '#5A3FC0'),
  paint:         mkCat(colors.painting,        '#EEE9FC', '#5A3FC0'),
  climatisation: mkCat(colors.airConditioning, '#E1F5F6', '#1F8F94'),
  cooling:       mkCat(colors.airConditioning, '#E1F5F6', '#1F8F94'),
  aircon:        mkCat(colors.airConditioning, '#E1F5F6', '#1F8F94'),
  securite:      mkCat(colors.security,        '#E4F3EC', '#0B5C3B'),
  security:      mkCat(colors.security,        '#E4F3EC', '#0B5C3B'),
  maconnerie:    mkCat('#8B5A2B',              '#F1E7DC', '#5F3D1C'),
  masonry:       mkCat('#8B5A2B',              '#F1E7DC', '#5F3D1C'),
  menage:        mkCat('#2DCAA4',              '#E1F7F0', '#199677'),
  nettoyage:     mkCat('#2DCAA4',              '#E1F7F0', '#199677'),
  cleaning:      mkCat('#2DCAA4',              '#E1F7F0', '#199677'),
  demenagement:  mkCat('#B85818',              '#FBEBDF', '#8A3F0F'),
  moving:        mkCat('#B85818',              '#FBEBDF', '#8A3F0F'),
}

// Operateurs Mobile Money (bg/soft/ink)
export const momo = {
  wave:   mkCat('#1BA8FF', '#E1F3FF', '#0870B0'),
  orange: mkCat('#FF7900', '#FFECDA', '#B05300'),
  free:   mkCat('#F5D000', '#FDF5C6', '#8A7100'),
} as const

export const getCategoryMeta = (key?: string) => {
  const k = (key || '').toLowerCase()
  const base = categoryMeta[k] || { color: colors.navy, bg: '#F1F5F9', label: key || 'Service' }
  const c = cat[k]
  return { ...base, soft: c?.soft || base.bg, ink: c?.ink || base.color }
}
