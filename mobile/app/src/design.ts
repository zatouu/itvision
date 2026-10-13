import { Platform } from 'react-native'

export const colors = {
  // Backgrounds — neutres chauds (crème) façon ATD Connect
  bg: '#FAF8F3',
  backgroundPrimary: '#FAF8F3',
  backgroundSecondary: '#FFFFFF',
  surface: '#FFFFFF',
  bgDeep: '#F1ECE3',
  // Profil premium (provider)
  bgGlobal: '#F7F3EC',
  heroDark: '#091A2F',
  platinum: '#E5E4E2',
  // Primary / emerald
  primary: '#0F7B4F',
  primaryText: '#0C754B',
  onPrimary: '#FFFFFF',
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
  textSecondary: '#526276',
  textMuted: '#5B6778',
  textDim: '#5B6778',
  textFaint: '#606B7B',
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
  dangerStrong: '#B91C1C',
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
  border: '#E8E1D3',
  borderLight: '#E8E1D3',
  borderSoft: '#EEE7DA',
  divider: '#F0EBE1',
  // Hairlines et remplissages neutres (listes groupées, contrôles segmentés)
  separator: '#E4DED2',
  fill: 'rgba(120,110,90,0.10)',
  fillStrong: 'rgba(120,110,90,0.16)',
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

export type ThemeColors = typeof colors

export const darkColors: ThemeColors = {
  ...colors,
  bg: '#101317',
  backgroundPrimary: '#101317',
  backgroundSecondary: '#1B2026',
  surface: '#1B2026',
  bgDeep: '#252C34',
  bgGlobal: '#101317',
  primaryText: '#76DEAD',
  primaryLight: '#163D2C',
  brandGreenLight: '#163D2C',
  brandSoft: '#163D2C',
  brandTint: '#152B22',
  brandInk: '#76DEAD',
  ink: '#F2F5F7',
  inkSoft: '#D6DEE7',
  text: '#F2F5F7',
  textPrimary: '#F2F5F7',
  textSecondary: '#B6C2CF',
  textMuted: '#A5B3C2',
  textDim: '#A5B3C2',
  textFaint: '#95A6B8',
  success: '#65D99A',
  successLight: '#173A2B',
  successSoft: '#173A2B',
  successInk: '#8BE1B0',
  warning: '#F7BD55',
  warn: '#F7BD55',
  warningLight: '#3A2E18',
  warnSoft: '#3A2E18',
  warnInk: '#F8CC7D',
  danger: '#FF9292',
  dangerLight: '#412328',
  dangerSoft: '#412328',
  dangerInk: '#FFB3BA',
  info: '#8BBDFF',
  infoInk: '#ACCFFF',
  infoLight: '#1D304A',
  infoSoft: '#1D304A',
  waveSoft: '#17354A',
  waveInk: '#80CDFF',
  orangeSoft: '#3E2A1B',
  orangeInk: '#FFC38F',
  freeSoft: '#363016',
  freeInk: '#F5DC76',
  border: '#424D5B',
  borderLight: '#35404C',
  borderSoft: '#303A45',
  divider: '#35404C',
  separator: '#424D5B',
  fill: 'rgba(182,194,207,0.10)',
  fillStrong: 'rgba(182,194,207,0.18)',
  slate50: '#1B2026',
  slate100: '#252C34',
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

// Échelle de référence pour tout nouvel écran : HIG sur iOS, Material 3 sur Android.
export const isIOS = Platform.OS === 'ios'
// Roboto supporte mal l'interlettrage négatif de SF Pro.
const ls = (v: number) => (isIOS ? v : 0)
export const type = {
  largeTitle: { fontSize: isIOS ? 32 : 28, lineHeight: isIOS ? 38 : 36, fontWeight: (isIOS ? '800' : '700') as '800' | '700', letterSpacing: ls(-0.6) },
  title1: { fontSize: 26, lineHeight: 32, fontWeight: (isIOS ? '800' : '700') as '800' | '700', letterSpacing: ls(-0.4) },
  title2: { fontSize: 22, lineHeight: 28, fontWeight: '700' as const, letterSpacing: ls(-0.3) },
  title3: { fontSize: 19, lineHeight: 24, fontWeight: '700' as const, letterSpacing: ls(-0.2) },
  headline: { fontSize: 16, lineHeight: 21, fontWeight: '700' as const },
  body: { fontSize: 16, lineHeight: 22, fontWeight: '400' as const },
  callout: { fontSize: 15, lineHeight: 20, fontWeight: '500' as const },
  subhead: { fontSize: 14, lineHeight: 19, fontWeight: '400' as const },
  footnote: { fontSize: 13, lineHeight: 18, fontWeight: '400' as const },
  caption: { fontSize: 12, lineHeight: 16, fontWeight: '500' as const },
  overline: { fontSize: 12, lineHeight: 16, fontWeight: '700' as const, letterSpacing: 0.4, textTransform: 'uppercase' as const },
}

export const touch = {
  min: 44,
  hitSlop: { top: 8, bottom: 8, left: 8, right: 8 },
  ripple: { color: 'rgba(10,22,40,0.08)' },
  rippleRound: { color: 'rgba(10,22,40,0.10)', borderless: true, radius: 22 },
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

// Serif éditorial pour les titres — polices système, aucune font à bundler.
// iOS: Georgia · Android: serif · Web: stack Georgia.
export const fonts = {
  display: Platform.select({ ios: 'Georgia', android: 'serif', web: 'Georgia, "Times New Roman", serif', default: undefined }),
}

export const getCategoryMeta = (key?: string) => {
  const k = (key || '').toLowerCase()
  const base = categoryMeta[k] || { color: colors.navy, bg: '#F1F5F9', label: key || 'Service' }
  const c = cat[k]
  return { ...base, soft: c?.soft || base.bg, ink: c?.ink || base.color }
}
