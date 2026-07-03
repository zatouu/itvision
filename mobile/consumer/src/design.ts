export const colors = {
  // Backgrounds
  bg: '#F4F6F9',
  surface: '#FFFFFF',
  // Primary / emerald
  primary: '#0F7B4F',
  primaryDark: '#065F3A',
  primaryLight: '#E6F4EC',
  // Secondary / navy
  navy: '#0A1628',
  navyLight: '#1E293B',
  // Text
  text: '#0F172A',
  textSecondary: '#64748B',
  textMuted: '#94A3B8',
  // States
  success: '#16A34A',
  successLight: '#DCFCE7',
  warning: '#F59E0B',
  warningLight: '#FFFBEB',
  danger: '#EF4444',
  dangerLight: '#FEE2E2',
  info: '#3B82F6',
  infoLight: '#EFF6FF',
  // Category colors
  electricity: '#2563EB',
  plumbing: '#0891B2',
  carpentry: '#EA580C',
  painting: '#7C3AED',
  airConditioning: '#06B6D4',
  security: '#166534',
  // Misc
  border: '#E2E8F0',
  shadow: '#000000',
}

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
}

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  pill: 999,
}

export const typography = {
  xs: { fontSize: 10, lineHeight: 12 },
  sm: { fontSize: 12, lineHeight: 16 },
  base: { fontSize: 14, lineHeight: 20 },
  md: { fontSize: 16, lineHeight: 22 },
  lg: { fontSize: 18, lineHeight: 24 },
  xl: { fontSize: 20, lineHeight: 28 },
  xxl: { fontSize: 24, lineHeight: 32 },
  xxxl: { fontSize: 32, lineHeight: 40 },
  weight: {
    normal: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
    extrabold: '800' as const,
  },
}

export const shadows = {
  sm: { shadowColor: colors.shadow, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 2 },
  md: { shadowColor: colors.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 6, elevation: 4 },
  lg: { shadowColor: colors.shadow, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 8 },
  xl: { shadowColor: colors.shadow, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.12, shadowRadius: 24, elevation: 12 },
}

export const categoryMeta: Record<string, { color: string; bg: string; label: string }> = {
  electricite: { color: colors.electricity, bg: '#EFF6FF', label: 'Électricité' },
  plomberie: { color: colors.plumbing, bg: '#E0F2FE', label: 'Plomberie' },
  menuiserie: { color: colors.carpentry, bg: '#FFF7ED', label: 'Menuiserie' },
  peinture: { color: colors.painting, bg: '#F5F3FF', label: 'Peinture' },
  climatisation: { color: colors.airConditioning, bg: '#ECFEFF', label: 'Climatisation' },
  securite: { color: colors.security, bg: '#F0FDF4', label: 'Sécurité' },
}

export const getCategoryMeta = (key?: string) => categoryMeta[(key || '').toLowerCase()] || { color: colors.navy, bg: '#F1F5F9', label: key || 'Service' }
