import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native'
import { router } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { colors, radius, spacing, typography } from '../../design'

export type NearbyProvider = {
  providerId: string
  name?: string
  status: string
  distanceKm?: number | null
  etaMinutes?: number | null
}

const AVATAR_COLORS = ['#2E7EF5', '#2DCAA4', '#7B5CE6', '#B85818', '#1F8A9E']

function formatDistance(km?: number | null): string | null {
  if (km == null || !Number.isFinite(km)) return null
  return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`
}

function isPhoneLike(s: string): boolean {
  const digits = s.replace(/\D/g, '')
  return /^\+?[\d\s]{7,}$/.test(s.trim()) || digits.length >= 9
}

function formatPhone(phone: string, full = true): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.length >= 9) {
    const local = digits.slice(-9)
    const prefix = digits.slice(0, -9)
    const localFormatted = local.replace(/(\d{2})(\d{3})(\d{2})(\d{2})/, '$1 $2 $3 $4')
    return full ? `${prefix ? '+' + prefix + ' ' : ''}${localFormatted}` : localFormatted
  }
  return phone
}

function formatProviderName(raw: string): string {
  if (!raw) return ''
  const trimmed = raw.trim()
  if (isPhoneLike(trimmed)) return formatPhone(trimmed, false)
  return trimmed.split(/\s+/)[0]
}

function getInitials(raw: string): string {
  if (!raw) return '?'
  const trimmed = raw.trim()
  if (isPhoneLike(trimmed)) {
    const digits = trimmed.replace(/\D/g, '')
    return digits.slice(-2).toUpperCase() || '?'
  }
  return trimmed.split(/\s+/).map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()
}

// Compact "around you" strip — avatar pills of live nearby providers (variant B style).
export default function NearbyStrip({ providers, onlineCount }: { providers: NearbyProvider[]; onlineCount: number }) {
  const { t } = useTranslation()
  const shown = providers.slice(0, 8)
  const count = onlineCount || providers.length
  if (shown.length === 0 && count === 0) return null

  return (
    <View style={s.wrap}>
      <View style={s.header}>
        <Text style={s.title}>{t('home.nearbyMap')}</Text>
        {count > 0 && (
          <View style={s.countBadge}>
            <View style={s.countDot} />
            <Text style={s.countText}>{t('home.providersOnline', { count })}</Text>
          </View>
        )}
      </View>
      {shown.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.rail}
        >
          {shown.map((p, i) => {
            const rawName = p.name || t('home.newProvider')
            const name = formatProviderName(rawName) || t('home.newProvider')
            const initials = getInitials(rawName)
            const dist = formatDistance(p.distanceKm)
            const eta = p.etaMinutes != null ? `${p.etaMinutes} min` : null
            const sub = [dist, eta].filter(Boolean).join(' · ')
            return (
              <TouchableOpacity
                key={p.providerId}
                style={s.pill}
                activeOpacity={0.75}
                onPress={() => router.push({
                  pathname: '/offers/provider/[id]',
                  params: { id: p.providerId, name: p.name || '' },
                } as any)}
                accessibilityLabel={name}
              >
                <View style={[s.avatar, { backgroundColor: AVATAR_COLORS[i % AVATAR_COLORS.length] }]}>
                  <Text style={s.avatarText}>{initials}</Text>
                </View>
                <View>
                  <Text style={s.name} numberOfLines={1}>{name}</Text>
                  {!!sub && <Text style={s.sub} numberOfLines={1}>{sub}</Text>}
                </View>
              </TouchableOpacity>
            )
          })}
        </ScrollView>
      )}
    </View>
  )
}

const s = StyleSheet.create({
  wrap: { marginTop: spacing.xl },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.lg, marginBottom: spacing.sm,
  },
  title: { fontSize: 15, fontWeight: typography.weight.extrabold as any, color: colors.text },
  countBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: colors.successLight, borderRadius: radius.pill,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  countDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.success },
  countText: { fontSize: 11, fontWeight: typography.weight.bold as any, color: colors.primary },
  rail: { paddingHorizontal: spacing.lg, gap: 8, paddingBottom: 4 },
  pill: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: colors.surface, paddingRight: 12, paddingLeft: 6, paddingVertical: 6,
    borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border,
  },
  avatar: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontSize: 11, fontWeight: typography.weight.bold as any },
  name: { fontSize: 12, fontWeight: typography.weight.bold as any, color: colors.text },
  sub: { fontSize: 10, color: colors.textMuted, fontWeight: typography.weight.medium as any },
})
