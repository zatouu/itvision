import { useEffect, useRef, useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, Pressable, ScrollView, BackHandler, Animated, Easing } from 'react-native'
import { router } from 'expo-router'
import {
  X, Home, ClipboardList, MapPin, FileText, Wallet, BellRing, UserCircle,
  HelpCircle, Info, LogOut, ChevronRight, Heart, Globe, Pencil, Shield, RefreshCw,
  ArrowLeftRight,
} from 'lucide-react-native'
import { colors, radius, shadows, spacing, typography, cat } from '../design'
import { getAuthUser, clearAuth } from '../auth'
import { logoutApi } from '../api'
import { clearAllUserData } from '../clear-user-data'
import { hapticSelect, hapticLight } from '../haptics'
import { subscribeNotifications, unreadCount } from '../notifications'
import { getMode, setMode, isProviderCapable, homeRouteForMode, subscribeMode, AppMode } from '../mode'
import { useTranslation } from 'react-i18next'

const SCREEN_W = Dimensions.get('window').width
const DRAWER_W = Math.min(SCREEN_W * 0.82, 320)

interface MenuItem {
  icon: any
  label: string
  route?: string
  color: string
  badge?: number
  active?: boolean
}

interface SideMenuProps {
  visible: boolean
  onClose: () => void
}

export default function SideMenu({ visible, onClose }: SideMenuProps) {
  const { t, i18n } = useTranslation()
  const authUser = getAuthUser()
  const userName = authUser?.name?.trim() || ''
  const userPhone = authUser?.phone || ''
  const hasName = !!userName && !/^\d{7,}$/.test(userName)
  const initials = hasName ? userName.slice(0, 2).toUpperCase() : '?'
  const [notifBadge, setNotifBadge] = useState(0)
  const [mode, setModeState] = useState<AppMode>(getMode())
  const canProvide = isProviderCapable()

  // Suivre le mode applicatif (client ⇄ prestataire)
  useEffect(() => subscribeMode(setModeState), [])

  const slideAnim = useRef(new Animated.Value(-DRAWER_W)).current
  const fadeAnim = useRef(new Animated.Value(0)).current
  const [rendered, setRendered] = useState(visible)

  // Badge notifications non lues
  useEffect(() => {
    setNotifBadge(unreadCount())
    return subscribeNotifications(() => setNotifBadge(unreadCount()))
  }, [])

  useEffect(() => {
    if (visible) {
      setRendered(true)
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: 0, duration: 280, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(fadeAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
      ]).start()
    } else if (rendered) {
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: -DRAWER_W, duration: 220, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
        Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
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
    await clearAllUserData()
    router.replace('/login')
  }

  const langLabel = i18n.language === 'wo' ? 'Wolof' : i18n.language === 'en' ? 'English' : 'Français'

  const isProvider = mode === 'provider'

  const mainItems: MenuItem[] = isProvider
    ? [
        { icon: Home, label: t('menu.home'), route: '/pro-home', color: colors.primary, active: true },
        { icon: MapPin, label: t('menu.nearbyRequests', { defaultValue: 'Demandes proches' }), route: '/nearby-requests', color: colors.info },
        { icon: FileText, label: t('menu.myOffers', { defaultValue: 'Mes offres' }), route: '/my-offers', color: colors.info },
        { icon: Wallet, label: t('menu.wallet'), route: '/pro-wallet', color: colors.ink },
        { icon: BellRing, label: t('menu.notifications'), route: '/notifications', color: colors.warning, badge: notifBadge },
        { icon: UserCircle, label: t('menu.profile'), route: '/pro-profile', color: colors.textMuted },
      ]
    : [
        { icon: Home, label: t('menu.home'), route: '/', color: colors.primary, active: true },
        { icon: ClipboardList, label: t('menu.myRequests'), route: '/my-requests', color: colors.info },
        { icon: Wallet, label: t('menu.wallet'), route: '/wallet', color: colors.ink },
        { icon: BellRing, label: t('menu.notifications'), route: '/notifications', color: colors.warning, badge: notifBadge },
        { icon: UserCircle, label: t('menu.profile'), route: '/profile', color: colors.textMuted },
      ]

  /** Bascule client ⇄ prestataire — visible uniquement si le user a un profil prestataire */
  const switchMode = async () => {
    const next: AppMode = isProvider ? 'client' : 'provider'
    await setMode(next)
    hapticSelect()
    onClose()
    setTimeout(() => router.replace(homeRouteForMode(next) as any), 250)
  }

  const settingItems: MenuItem[] = [
    { icon: Globe, label: `${t('menu.language', { defaultValue: 'Langue' })} · ${langLabel}`, route: '/profile', color: colors.textMuted },
    { icon: HelpCircle, label: t('menu.help'), route: '/profile', color: colors.textMuted },
    { icon: Info, label: t('menu.about'), route: '/profile', color: colors.textMuted },
  ]

  const renderRow = (item: MenuItem, key: string, compact = false) => {
    const Icon = item.icon
    return (
      <TouchableOpacity
        key={key}
        style={[s.row, compact && s.rowCompact, item.active && s.rowActive]}
        activeOpacity={0.65}
        onPress={() => item.route && navigateTo(item.route)}
      >
        <View style={[s.rowIcon, compact && s.rowIconSm, { backgroundColor: `${item.color}15` }]}>
          <Icon size={compact ? 15 : 17} color={item.color} />
        </View>
        <Text style={[s.rowLabel, compact && s.rowLabelSm, item.active && s.rowLabelActive]}>{item.label}</Text>
        {item.badge ? (
          <View style={s.badge}>
            <Text style={s.badgeText}>{item.badge > 9 ? '9+' : item.badge}</Text>
          </View>
        ) : (
          <ChevronRight size={compact ? 15 : 16} color={colors.textDim} />
        )}
      </TouchableOpacity>
    )
  }

  return (
    <View style={s.overlay} pointerEvents={rendered ? 'auto' : 'none'}>
      <Animated.View style={[s.backdrop, { opacity: fadeAnim }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>

      <Animated.View style={[s.drawer, { transform: [{ translateX: slideAnim }] }]}>
        {/* Hero identité */}
        <View style={s.hero}>
          <View style={s.heroCircle} />
          <View style={s.heroTop}>
            <Text style={s.heroLogo}>Xeuy Bi</Text>
            <TouchableOpacity style={s.heroClose} onPress={onClose} activeOpacity={0.8} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <X size={16} color={colors.ink} />
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            style={s.heroIdentity}
            activeOpacity={0.75}
            onPress={() => navigateTo(hasName ? (isProvider ? '/pro-profile' : '/profile') : '/setup-profile')}
          >
            {hasName ? (
              <View style={s.heroAvatar}>
                <Text style={s.heroAvatarText}>{initials}</Text>
              </View>
            ) : (
              <View style={s.heroAvatarEmpty}>
                <UserCircle size={24} color={colors.ink} />
              </View>
            )}
            <View style={{ flex: 1, minWidth: 0 }}>
              {hasName ? (
                <>
                  <Text style={s.heroName} numberOfLines={1}>{userName}</Text>
                  {userPhone ? <Text style={s.heroPhone}>{userPhone}</Text> : null}
                  <View style={s.heroModeRow}>
                    {canProvide ? (
                      <>
                        <View style={[s.modeChip, isProvider ? s.modeChipPro : s.modeChipClient]}>
                          <View style={[s.modeDot, isProvider ? s.modeDotPro : null]} />
                          <Text style={[s.modeChipText, isProvider ? s.modeChipTextPro : s.modeChipTextClient]}>
                            {isProvider
                              ? t('menu.modePro', { defaultValue: 'Mode Pro' })
                              : t('menu.modeClient', { defaultValue: 'Mode Client' })}
                          </Text>
                        </View>
                        <TouchableOpacity onPress={switchMode} style={s.swapBtn} activeOpacity={0.7} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                          <ArrowLeftRight size={18} color={colors.ink} />
                        </TouchableOpacity>
                      </>
                    ) : (
                      <TouchableOpacity onPress={() => navigateTo('/onboarding-provider')} activeOpacity={0.7} style={s.becomeProLink}>
                        <Text style={s.becomeProLinkText}>{t('menu.becomeProvider', { defaultValue: 'Devenir prestataire →' })}</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </>
              ) : (
                <>
                  <Text style={s.heroName}>{t('menu.addName', { defaultValue: 'Ajouter mon nom' })}</Text>
                  <Text style={s.heroPhone}>{t('menu.addNameHint', { defaultValue: 'Pour rassurer les prestataires' })}</Text>
                </>
              )}
            </View>
            <View style={s.heroEdit}>
              {hasName ? <ChevronRight size={15} color={colors.ink} /> : <Pencil size={14} color={colors.ink} />}
            </View>
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingVertical: 10, paddingHorizontal: 12, flexGrow: 1 }}>
          <Text style={s.sectionTitle}>{isProvider ? t('menu.proSpace', { defaultValue: 'Espace prestataire' }) : t('menu.mySpace', { defaultValue: 'Mon espace' })}</Text>
          {mainItems.map((item, i) => renderRow(item, `main-${i}`))}

          {/* Bascule client ⇄ prestataire (si profil prestataire) */}
          {canProvide && (
            <TouchableOpacity
              style={[s.row, s.switchRow]}
              activeOpacity={0.65}
              onPress={switchMode}
            >
              <View style={[s.rowIcon, { backgroundColor: `${colors.primary}15` }]}>
                <RefreshCw size={17} color={colors.primary} />
              </View>
              <Text style={[s.rowLabel, { color: colors.primary, fontWeight: typography.weight.extrabold as any }]}>
                {isProvider
                  ? t('menu.switchToClient', { defaultValue: 'Passer en mode client' })
                  : t('menu.switchToProvider', { defaultValue: 'Passer en mode prestataire' })}
              </Text>
            </TouchableOpacity>
          )}

          <View style={s.divider} />

          {/* Carte parrainage */}
          <View style={s.referralCard}>
            <View style={s.referralIcon}>
              <Heart size={18} color="#fff" />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={s.referralTitle}>{t('menu.referralTitle', { defaultValue: 'Parrainez un ami' })}</Text>
              <Text style={s.referralSub}>{t('menu.referralSub', { defaultValue: 'Gagnez 1 000 FCFA par ami inscrit' })}</Text>
            </View>
            <TouchableOpacity style={s.referralBtn} onPress={() => navigateTo('/profile')} activeOpacity={0.85}>
              <Text style={s.referralBtnText}>{t('menu.referralCta', { defaultValue: 'Inviter' })}</Text>
            </TouchableOpacity>
          </View>

          <View style={s.divider} />

          {settingItems.map((item, i) => renderRow(item, `sec-${i}`, true))}
        </ScrollView>

        {/* Footer déconnexion */}
        <View style={s.footer}>
          <TouchableOpacity style={s.logoutBtn} activeOpacity={0.75} onPress={handleLogout}>
            <LogOut size={16} color={colors.dangerInk} />
            <Text style={s.logoutText}>{t('menu.logout')}</Text>
          </TouchableOpacity>
          <Text style={s.versionText}>Xeuy Bi v1.0.0</Text>
        </View>
      </Animated.View>
    </View>
  )
}

const s = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFillObject, zIndex: 100 },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(10,22,40,0.55)' },
  drawer: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    width: DRAWER_W,
    backgroundColor: colors.surface,
    ...shadows.xl,
  },
  hero: {
    backgroundColor: colors.bg,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 22,
    overflow: 'hidden',
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSoft,
  },
  heroCircle: { position: 'absolute', top: -40, right: -30, width: 150, height: 150, borderRadius: 75, backgroundColor: 'rgba(10,22,40,0.03)' },
  heroTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  heroLogo: { fontSize: 20, fontWeight: '800', color: colors.ink, letterSpacing: -0.5 },
  heroClose: { width: 32, height: 32, borderRadius: 10, backgroundColor: colors.bgDeep, alignItems: 'center', justifyContent: 'center' },
  heroIdentity: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  heroAvatar: { width: 54, height: 54, borderRadius: 27, backgroundColor: colors.navy, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)' },
  heroAvatarText: { fontSize: 18, fontWeight: typography.weight.extrabold as any, color: '#fff' },
  heroAvatarEmpty: { width: 54, height: 54, borderRadius: 27, backgroundColor: colors.bgDeep, borderWidth: 2, borderStyle: 'dashed', borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  heroName: { fontSize: 16, fontWeight: typography.weight.extrabold as any, color: colors.ink, letterSpacing: -0.2 },
  heroPhone: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  heroModeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  modeChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill },
  modeChipClient: { backgroundColor: cat.electricite.soft },
  modeChipPro: { backgroundColor: colors.brandSoft },
  modeDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.info },
  modeDotPro: { backgroundColor: colors.primary },
  modeChipText: { fontSize: 11, fontWeight: typography.weight.extrabold as any, letterSpacing: 0.2 },
  modeChipTextClient: { color: cat.electricite.ink },
  modeChipTextPro: { color: colors.brandInk },
  swapBtn: { width: 32, height: 32, borderRadius: 10, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  becomeProLink: { marginTop: 2 },
  becomeProLinkText: { fontSize: 12, color: colors.brandInk, fontWeight: typography.weight.bold as any, textDecorationLine: 'underline' },
  heroEdit: { width: 32, height: 32, borderRadius: 10, backgroundColor: colors.bgDeep, alignItems: 'center', justifyContent: 'center' },
  sectionTitle: { fontSize: 10.5, fontWeight: typography.weight.extrabold as any, color: colors.textMuted, letterSpacing: 0.6, textTransform: 'uppercase', paddingHorizontal: 12, paddingTop: 4, paddingBottom: 8 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    minHeight: 44,
  },
  rowCompact: { minHeight: 40 },
  rowActive: { backgroundColor: colors.brandSoft },
  rowIcon: { width: 32, height: 32, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  rowIconSm: { width: 28, height: 28, borderRadius: 8, backgroundColor: colors.bg },
  rowLabel: { flex: 1, fontSize: 14, fontWeight: typography.weight.semibold as any, color: colors.text },
  rowLabelSm: { fontSize: 13 },
  rowLabelActive: { fontWeight: typography.weight.extrabold as any, color: colors.brandInk },
  switchRow: { backgroundColor: colors.brandTint, borderWidth: 1, borderColor: colors.brandSoft, marginTop: 4 },
  badge: { backgroundColor: colors.warning, borderRadius: 10, minWidth: 20, height: 20, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 },
  badgeText: { fontSize: 10, fontWeight: '800', color: '#fff' },
  divider: { height: 1, backgroundColor: colors.borderSoft, marginVertical: 12, marginHorizontal: 12 },
  referralCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.brandSoft,
    borderRadius: 14,
    padding: 14,
  },
  referralIcon: { width: 40, height: 40, borderRadius: 11, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  referralTitle: { fontSize: 12.5, fontWeight: typography.weight.extrabold as any, color: colors.brandInk },
  referralSub: { fontSize: 10.5, color: colors.brandInk, opacity: 0.85, marginTop: 1 },
  referralBtn: { backgroundColor: colors.primary, borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 8 },
  referralBtnText: { fontSize: 12, fontWeight: typography.weight.extrabold as any, color: '#fff' },
  footer: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 16, borderTopWidth: 1, borderTopColor: colors.borderSoft },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.dangerSoft,
    borderRadius: 12,
    paddingVertical: 12,
  },
  logoutText: { fontSize: 14, fontWeight: typography.weight.bold as any, color: colors.dangerInk },
  versionText: { fontSize: 11, color: colors.textDim, textAlign: 'center', marginTop: 10 },
})
