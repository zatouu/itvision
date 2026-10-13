import { createThemedStyles } from '../theme'
import { useEffect, useState } from 'react'
import { View, Text, Pressable, StyleSheet } from 'react-native'
import { router, useNavigation } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTranslation } from 'react-i18next'
import { Home, ClipboardList, FileText, MessageCircle, UserCircle } from 'lucide-react-native'
import { loadNotifications, subscribeNotifications, unreadCount } from '../notifications'
import { loadInbox, subscribeInbox, getInboxState, bindInboxSocket } from '../chat-inbox'
import { radius, spacing, typography, isIOS } from '../design'
import { hapticSelect } from '../haptics'
import type { AppMode } from '../mode'

export type TabKey = 'home' | 'requests' | 'offers' | 'messages' | 'notifications' | 'profile'

interface TabBarProps {
  active: TabKey
  /** 'client' (défaut) = onglets client, 'provider' = onglets prestataire */
  mode?: AppMode
}

type IconProps = { size?: number; color?: string; strokeWidth?: number }

// 4 onglets (pattern type ATD) — les notifications restent dans la cloche du header.
const CLIENT_TABS: { key: TabKey; labelKey: string; icon: React.ComponentType<IconProps>; route: string }[] = [
  { key: 'home',          labelKey: 'tabs.home', icon: Home,          route: '/' },
  { key: 'requests',      labelKey: 'tabs.requests', icon: ClipboardList, route: '/my-requests' },
  { key: 'messages',      labelKey: 'tabs.messages', icon: MessageCircle, route: '/messages' },
  { key: 'profile',       labelKey: 'tabs.profile', icon: UserCircle,    route: '/profile' },
]

const PROVIDER_TABS: { key: TabKey; labelKey: string; icon: React.ComponentType<IconProps>; route: string }[] = [
  { key: 'home',          labelKey: 'tabs.home', icon: Home,          route: '/pro-home' },
  { key: 'requests',      labelKey: 'tabs.requests', icon: ClipboardList, route: '/nearby-requests' },
  { key: 'offers',        labelKey: 'tabs.offers', icon: FileText,      route: '/my-offers' },
  { key: 'messages',      labelKey: 'tabs.messages', icon: MessageCircle, route: '/messages' },
  { key: 'profile',       labelKey: 'tabs.profile', icon: UserCircle,    route: '/pro-profile' },
]

export default function TabBar({ active, mode = 'client' }: TabBarProps) {
  const { colors, s } = useStyles()
  const { t } = useTranslation()
  const [unread, setUnread] = useState(0)
  const [unreadChat, setUnreadChat] = useState(0)
  const tabs = mode === 'provider' ? PROVIDER_TABS : CLIENT_TABS

  useEffect(() => {
    let mounted = true
    loadNotifications().then(() => { if (mounted) setUnread(unreadCount()) })
    const unsubscribe = subscribeNotifications(() => {
      if (mounted) setUnread(unreadCount())
    })
    return () => { mounted = false; unsubscribe() }
  }, [])

  // Badge messages non lus (inbox chat)
  useEffect(() => {
    bindInboxSocket()
    setUnreadChat(getInboxState().totalUnread)
    loadInbox()
    return subscribeInbox(() => setUnreadChat(getInboxState().totalUnread))
  }, [])

  const navigation = useNavigation()
  const insets = useSafeAreaInsets()

  // Navigation entre onglets sans empiler : on garde au plus [accueil, onglet].
  // - vers l'accueil : retour arrière s'il est juste en dessous, sinon replace ;
  // - depuis l'accueil : push (le bouton retour Android ramène à l'accueil) ;
  // - d'un onglet à un autre : replace.
  const onPress = (tab: typeof tabs[number]) => {
    if (tab.key === active) return
    hapticSelect()
    if (tab.key === 'home') {
      const routes: any[] = (navigation as any)?.getState?.()?.routes || []
      const prev = routes.length > 1 ? routes[routes.length - 2]?.name : undefined
      const homeName = tab.route.replace(/^\//, '') || 'index'
      if (prev === homeName) router.back()
      else router.replace(tab.route as any)
    } else if (active === 'home') {
      router.push(tab.route as any)
    } else {
      router.replace(tab.route as any)
    }
  }

  return (
    <View style={[s.bar, { paddingBottom: Math.max(insets.bottom, spacing.sm) }]} accessibilityRole="tablist">
      {tabs.map(tab => {
        const isActive = tab.key === active
        const badgeCount = tab.key === 'notifications' ? unread : tab.key === 'messages' ? unreadChat : 0
        const showBadge = badgeCount > 0 && tab.key !== active
        const Icon = tab.icon
        return (
          <Pressable
            key={tab.key}
            style={s.item}
            onPress={() => onPress(tab)}
            android_ripple={isIOS ? undefined : { color: 'rgba(10,22,40,0.08)', borderless: true, radius: 36 }}
            accessibilityRole="tab"
            accessibilityLabel={badgeCount > 0 ? `${t(tab.labelKey)}, ${badgeCount}` : t(tab.labelKey)}
            accessibilityState={{ selected: isActive }}
            aria-selected={isActive}
          >
            <View style={[s.iconWrap, !isIOS && isActive && s.indicator]}>
              <Icon size={isIOS ? 23 : 22} color={isActive ? (isIOS ? colors.primaryText : colors.brandInk) : colors.textMuted} strokeWidth={isActive ? 2.4 : 1.9} />
              {showBadge && (
                <View style={s.badge}>
                  <Text style={s.badgeText}>{badgeCount > 9 ? '9+' : String(badgeCount)}</Text>
                </View>
              )}
            </View>
            <Text style={isActive ? s.labelActive : s.label} numberOfLines={1}>{t(tab.labelKey)}</Text>
          </Pressable>
        )
      })}
    </View>
  )
}



const useStyles = createThemedStyles(colors => {
  const s = StyleSheet.create({
    bar: isIOS
      ? { flexDirection: 'row', backgroundColor: colors.surface, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.separator, paddingTop: 6 }
      : { flexDirection: 'row', backgroundColor: colors.surface, paddingTop: 10, elevation: 8 },
    item: { flex: 1, alignItems: 'center', minHeight: isIOS ? 48 : 56, justifyContent: 'center' },
    iconWrap: { position: 'relative', width: isIOS ? 32 : 60, height: isIOS ? 28 : 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
    indicator: { backgroundColor: colors.brandSoft },
    label: { fontSize: isIOS ? 10.5 : 12, color: colors.textMuted, marginTop: isIOS ? 1 : 4, fontWeight: typography.weight.medium as any },
    labelActive: { fontSize: isIOS ? 10.5 : 12, color: isIOS ? colors.primaryText : colors.ink, marginTop: isIOS ? 1 : 4, fontWeight: typography.weight.bold as any },
    badge: { position: 'absolute', top: isIOS ? -3 : 0, right: isIOS ? -6 : 10, minWidth: 17, height: 17, borderRadius: 9, backgroundColor: colors.dangerStrong, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4, borderWidth: 1.5, borderColor: colors.surface },
    badgeText: { color: colors.onPrimary, fontSize: 10, fontWeight: typography.weight.extrabold as any, lineHeight: 12 },
  })
  return { colors, s }
})
