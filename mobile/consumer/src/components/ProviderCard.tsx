import { View, Text, Image, StyleSheet } from 'react-native'
import { colors, radius, shadows, spacing, typography } from '../design'
import { Check, Star } from 'lucide-react-native'

type ProviderCardProps = {
  name: string
  rating: number
  jobCount: number
  jobLabel: string
  specialty: string
  imageUrl?: string
  verified?: boolean
}

export default function ProviderCard({ name, rating, jobCount, jobLabel, specialty, imageUrl, verified }: ProviderCardProps) {
  const initials = name.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase()
  return (
    <View style={[s.card, shadows.md]}>
      <View style={s.avatar}>
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={s.image} />
        ) : (
          <Text style={s.initials}>{initials}</Text>
        )}
        {verified && (
          <View style={s.badge}>
            <Check size={10} color={colors.surface} />
          </View>
        )}
      </View>
      <Text style={s.name} numberOfLines={1}>{name}</Text>
      <Text style={s.specialty} numberOfLines={1}>{specialty}</Text>
      <View style={s.row}>
        <Star size={12} color={colors.warning} fill={colors.warning} />
        <Text style={s.rating}>{rating}</Text>
      </View>
      <Text style={s.meta}>{jobCount} {jobLabel}</Text>
    </View>
  )
}

const s = StyleSheet.create({
  card: {
    width: 140,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginRight: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  avatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.primaryLight, alignSelf: 'center', alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm, position: 'relative' },
  image: { width: 56, height: 56, borderRadius: 28 },
  initials: { fontSize: 18, fontWeight: typography.weight.extrabold as any, color: colors.primary },
  badge: { position: 'absolute', bottom: 0, right: 0, width: 20, height: 20, borderRadius: 10, backgroundColor: colors.success, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.surface },
  badgeText: { color: colors.surface },
  name: { fontSize: 14, fontWeight: typography.weight.extrabold as any, color: colors.text, textAlign: 'center' },
  specialty: { fontSize: 12, fontWeight: typography.weight.semibold as any, color: colors.primary, textAlign: 'center', marginTop: 2 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 2, gap: 2 },
  star: { color: colors.warning },
  rating: { fontSize: 12, color: colors.textSecondary, fontWeight: typography.weight.semibold as any },
  meta: { fontSize: 11, color: colors.textMuted, textAlign: 'center', marginTop: 1 },
})
