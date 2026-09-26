import { useEffect, useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { router } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { Home, ClipboardList, FileText, MessageCircle, UserCircle } from 'lucide-react-native'
import { loadNotifications, subscribeNotifications, unreadCount } from '../notifications'
import { loadInbox, subscribeInbox, getInboxState, bindInboxSocket } from '../chat-inbox'
import { colors, radius, spacing, typography } from '../design'
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

  const onPress = (tab: typeof tabs[number]) => {
    if (tab.key === active) return
    hapticSelect()
    if (tab.key === 'home') {
      router.replace(tab.route as any)
    } else {
      router.push(tab.route as any)
    }
  }

  return (
    <View style={s.bar}>
      {tabs.map(tab => {
        const isActive = tab.key === active
        const badgeCount = tab.key === 'notifications' ? unread : tab.key === 'messages' ? unreadChat : 0
        const showBadge = badgeCount > 0 && tab.key !== active
        const Icon = tab.icon
        return (
          <TouchableOpacity
            key={tab.key}
            style={s.item}
            onPress={() => onPress(tab)}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={t(tab.labelKey)}
            accessibilityState={{ selected: isActive }}
          >
            <View style={[s.iconWrap, isActive && s.iconWrapActive]}>
              <Icon size={20} color={isActive ? colors.primary : colors.textMuted} strokeWidth={isActive ? 2.5 : 2} />
              {showBadge && (
                <View style={s.badge}>
                  <Text style={s.badgeText}>{badgeCount > 9 ? '9+' : String(badgeCount)}</Text>
                </View>
              )}
            </View>
            <Text style={isActive ? s.labelActive : s.label}>{t(tab.labelKey)}</Text>
            {isActive && <View style={s.activeDot} />}
          </TouchableOpacity>
        )
      })}
    </View>
  )
}

const s = StyleSheet.create({
  bar: { flexDirection: 'row', backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border, paddingBottom: spacing.sm, paddingTop: spacing.sm },
  item: { flex: 1, alignItems: 'center', paddingTop: spacing.xs, paddingBottom: spacing.xs },
  iconWrap: { position: 'relative', width: 34, height: 34, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  iconWrapActive: { backgroundColor: colors.primaryLight },
  label: { fontSize: 10, color: colors.textMuted, marginTop: 2, fontWeight: typography.weight.medium as any },
  labelActive: { fontSize: 10, color: colors.primary, marginTop: 2, fontWeight: typography.weight.extrabold as any },
  activeDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: colors.primary, marginTop: 2 },
  badge: { position: 'absolute', top: -2, right: -4, minWidth: 16, height: 16, borderRadius: 8, backgroundColor: colors.danger, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4, borderWidth: 1.5, borderColor: colors.surface },
  badgeText: { color: colors.surface, fontSize: 10, fontWeight: typography.weight.extrabold as any, lineHeight: 12 },
})
