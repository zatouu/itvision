import { useEffect, useRef, useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, Pressable, ScrollView, BackHandler, Animated, Easing } from 'react-native'
import { router } from 'expo-router'
import {
  X, Home, MapPin, FileText, Wallet, BellRing, UserCircle, Settings,
  HelpCircle, Info, LogOut, ChevronRight, Shield, Star,
} from 'lucide-react-native'
import { colors, radius, shadows, spacing, typography } from '../design'
import { getAuthUser, clearAuth } from '../auth'
import { logoutApi } from '../api'
import { hapticSelect, hapticLight } from '../haptics'
import { useTranslation } from 'react-i18next'

const SCREEN_W = Dimensions.get('window').width
const DRAWER_W = Math.min(SCREEN_W * 0.82, 320)

interface MenuItem {
  icon: any
  label: string
  route?: string
  action?: () => void
  color?: string
  showChevron?: boolean
}

interface SideMenuProps {
  visible: boolean
  onClose: () => void
}

export default function SideMenu({ visible, onClose }: SideMenuProps) {
  const { t } = useTranslation()
  const authUser = getAuthUser()
  const userName = authUser?.name?.trim() || ''
  const initials = userName ? userName.slice(0, 2).toUpperCase() : '?'

  const slideAnim = useRef(new Animated.Value(-DRAWER_W)).current
  const fadeAnim = useRef(new Animated.Value(0)).current
  const [rendered, setRendered] = useState(visible)

  useEffect(() => {
    if (visible) {
      setRendered(true)
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 280,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start()
    } else if (rendered) {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: -DRAWER_W,
          duration: 220,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start(() => setRendered(false))
    }
  }, [visible])

  useEffect(() => {
    if (!visible) return
    const back = BackHandler.addEventListener('hardwareBackPress', () => {
      onClose()
      return true
    })
    return () => back.remove()
  }, [visible, onClose])

  if (!rendered) return null

  const navigateTo = (route: string) => {
    hapticSelect()
    onClose()
    setTimeout(() => router.push(route as any), 250)
  }

  const handleLogout = async () => {
    hapticLight()
    onClose()
    await logoutApi()
    await clearAuth()
    setTimeout(() => router.replace('/login'), 250)
  }

  const mainItems: MenuItem[] = [
    { icon: Home, label: t('menu.home'), route: '/', showChevron: false },
    { icon: MapPin, label: t('menu.nearbyRequests'), route: '/nearby-requests', showChevron: true },
    { icon: FileText, label: t('menu.myOffers'), route: '/my-offers', showChevron: true },
    { icon: Wallet, label: t('menu.wallet'), route: '/wallet', showChevron: true },
    { icon: BellRing, label: t('menu.notifications'), route: '/notifications', showChevron: true },
  ]

  const secondaryItems: MenuItem[] = [
    { icon: UserCircle, label: t('menu.profile'), route: '/profile', showChevron: true },
    { icon: Star, label: t('menu.rateApp'), action: () => {}, showChevron: true, color: colors.warning },
    { icon: HelpCircle, label: t('menu.help'), route: '/profile', showChevron: true },
    { icon: Info, label: t('menu.about'), route: '/profile', showChevron: true },
  ]

  const renderRow = (item: MenuItem, key: string) => {
    const Icon = item.icon
    const iconColor = item.color || colors.textSecondary
    const bg = item.color ? `${item.color}15` : colors.bg
    return (
      <TouchableOpacity
        key={key}
        style={s.row}
        activeOpacity={0.65}
        onPress={() => {
          if (item.action) item.action()
          else if (item.route) navigateTo(item.route)
        }}
      >
        <View style={[s.rowIcon, { backgroundColor: bg }]}>
          <Icon size={18} color={iconColor} />
        </View>
        <Text style={s.rowLabel}>{item.label}</Text>
        {item.showChevron && <ChevronRight size={18} color={colors.textMuted} />}
      </TouchableOpacity>
    )
  }

  return (
    <View style={s.overlay} pointerEvents={rendered ? 'auto' : 'none'}>
      {/* Backdrop */}
      <Animated.View style={[s.backdrop, { opacity: fadeAnim }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>

      {/* Drawer */}
      <Animated.View
        style={[s.drawer, { transform: [{ translateX: slideAnim }] }]}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: spacing.xxxl }}
        >
          {/* Close button */}
          <TouchableOpacity
            style={s.closeBtn}
            onPress={onClose}
            activeOpacity={0.6}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <X size={22} color={colors.textSecondary} />
          </TouchableOpacity>

          {/* User header */}
          <View style={s.userHeader}>
            <View style={s.avatar}>
              <Text style={s.avatarText}>{initials}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.userName} numberOfLines={1}>
                {userName || t('menu.guest')}
              </Text>
              <Text style={s.userPhone} numberOfLines={1}>
                {authUser?.phone || ''}
              </Text>
            </View>
          </View>

          {/* Quick stats card */}
          <View style={s.statsCard}>
            <View style={s.statItem}>
              <Shield size={16} color={colors.primary} />
              <Text style={s.statLabel}>{t('menu.verified')}</Text>
            </View>
            <View style={s.statDivider} />
            <TouchableOpacity
              style={s.statItem}
              onPress={() => navigateTo('/profile')}
              activeOpacity={0.6}
            >
              <Settings size={16} color={colors.info} />
              <Text style={s.statLabel}>{t('menu.settings')}</Text>
            </TouchableOpacity>
          </View>

          {/* Main navigation */}
          <Text style={s.sectionLabel}>{t('menu.navigation')}</Text>
          <View style={s.section}>
            {mainItems.map((item, i) => renderRow(item, `main-${i}`))}
          </View>

          {/* Secondary */}
          <Text style={s.sectionLabel}>{t('menu.account')}</Text>
          <View style={s.section}>
            {secondaryItems.map((item, i) => renderRow(item, `sec-${i}`))}
          </View>

          {/* Logout */}
          <TouchableOpacity
            style={s.logoutBtn}
            activeOpacity={0.65}
            onPress={handleLogout}
          >
            <View style={[s.rowIcon, { backgroundColor: colors.dangerLight }]}>
              <LogOut size={18} color={colors.danger} />
            </View>
            <Text style={s.logoutText}>{t('menu.logout')}</Text>
          </TouchableOpacity>

          {/* Version */}
          <Text style={s.versionText}>Xeuy Bi Pro v1.0.0</Text>
        </ScrollView>
      </Animated.View>
    </View>
  )
}

const s = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 100,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10,22,40,0.45)',
  },
  drawer: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    width: DRAWER_W,
    backgroundColor: colors.bg,
    ...shadows.xl,
  },
  closeBtn: {
    position: 'absolute',
    top: spacing.lg,
    right: spacing.lg,
    zIndex: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  userHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxxl,
    paddingBottom: spacing.xl,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.navy,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.md,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: typography.weight.extrabold as any,
    color: colors.surface,
  },
  userName: {
    fontSize: 17,
    fontWeight: typography.weight.extrabold as any,
    color: colors.text,
  },
  userPhone: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  statsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.lg,
    marginBottom: spacing.xl,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  statItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: colors.border,
    marginHorizontal: spacing.md,
  },
  statLabel: {
    fontSize: 13,
    fontWeight: typography.weight.semibold as any,
    color: colors.text,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: typography.weight.extrabold as any,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.sm,
    marginTop: spacing.md,
  },
  section: {
    marginHorizontal: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    ...shadows.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  rowLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: typography.weight.semibold as any,
    color: colors.text,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginHorizontal: spacing.lg,
    marginTop: spacing.xl,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderWidth: 1.5,
    borderColor: colors.dangerLight,
    ...shadows.sm,
  },
  logoutText: {
    flex: 1,
    fontSize: 15,
    fontWeight: typography.weight.bold as any,
    color: colors.danger,
  },
  versionText: {
    fontSize: 11,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.xxl,
  },
})
