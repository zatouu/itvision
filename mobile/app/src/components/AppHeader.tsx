import { createThemedStyles } from '../theme'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTranslation } from 'react-i18next'
import { Bell } from 'lucide-react-native'
import { spacing, typography, touch, isIOS } from '../design'
import BackButton from './BackButton'

type Props = {
  title?: string
  subtitle?: string
  onBack?: () => void
  right?: React.ReactNode
  showBell?: boolean
  onBell?: () => void
  badge?: number
  transparent?: boolean
  left?: React.ReactNode
}

export default function AppHeader({ title, subtitle, onBack, right, showBell, onBell, badge, transparent, left }: Props) {
  const { colors, s } = useStyles()
  const insets = useSafeAreaInsets()
  const { t } = useTranslation()
  return (
    <View style={[s.header, { paddingTop: insets.top + spacing.sm }, transparent && s.transparent]}>
      <View style={s.side}>
        {onBack ? (
          <BackButton onPress={onBack} />
        ) : (
          left || (isIOS ? <View style={s.placeholder} /> : null)
        )}
      </View>
      {title ? (
        <View style={{ flex: 1, alignItems: isIOS ? 'center' : 'flex-start', paddingLeft: isIOS ? 0 : spacing.xs }}>
          <Text style={[s.title, !isIOS && s.titleAndroid]} numberOfLines={1} accessibilityRole="header">{title}</Text>
          {subtitle ? <Text style={[s.subtitle, !isIOS && { textAlign: 'left' }]} numberOfLines={1}>{subtitle}</Text> : null}
        </View>
      ) : null}
      <View style={[s.side, s.right]}>
        {right}
        {showBell ? (
          <TouchableOpacity onPress={onBell} style={s.iconBtn} activeOpacity={0.6} hitSlop={touch.hitSlop} accessibilityRole="button"
            accessibilityLabel={badge ? t('a11y.notificationsCount', { count: badge }) : t('a11y.notifications')}>
            <Bell size={22} color={colors.text} />
            {badge ? (
              <View style={s.badge}>
                <Text style={s.badgeText}>{badge > 9 ? '9+' : badge}</Text>
              </View>
            ) : null}
          </TouchableOpacity>
        ) : null}
        {!right && !showBell && isIOS ? <View style={s.placeholder} /> : null}
      </View>
    </View>
  )
}



const useStyles = createThemedStyles(colors => {
  const s = StyleSheet.create({
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.sm,
      paddingBottom: spacing.sm,
      backgroundColor: colors.bg,
    },
    transparent: { backgroundColor: 'transparent' },
    side: { flexDirection: 'row', alignItems: 'center', gap: 2, minWidth: isIOS ? 44 : 0 },
    right: { justifyContent: 'flex-end' },
    title: {
      fontSize: 17,
      fontWeight: typography.weight.bold as any,
      color: colors.ink,
      textAlign: 'center',
      letterSpacing: -0.2,
    },
    titleAndroid: { fontSize: 20, fontWeight: typography.weight.semibold as any, letterSpacing: 0, textAlign: 'left' },
    subtitle: {
      fontSize: 12,
      color: colors.textSecondary,
      fontWeight: typography.weight.medium as any,
      textAlign: 'center',
      marginTop: 1,
    },
    iconBtn: {
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: 'center',
      justifyContent: 'center',
    },
    icon: { fontSize: 18 },
    placeholder: { width: 44 },
    badge: {
      position: 'absolute',
      top: 6,
      right: 6,
      minWidth: 16,
      height: 16,
      borderRadius: 8,
      backgroundColor: colors.dangerStrong,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 4,
    },
    badgeText: { fontSize: 10, color: colors.onPrimary, fontWeight: typography.weight.bold as any },
  })
  return { colors, s }
})
