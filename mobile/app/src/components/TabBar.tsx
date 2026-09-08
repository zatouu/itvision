import { useEffect, useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { router } from 'expo-router'
import { loadNotifications, subscribeNotifications, unreadCount } from '../notifications'
import { colors, radius, spacing, typography } from '../design'
import { hapticSelect } from '../haptics'
import { Home, ClipboardList, Bell, UserCircle } from 'lucide-react-native'

export type TabKey = 'home' | 'requests' | 'notifications' | 'profile'

interface TabBarProps {
  active: TabKey
}

const TABS: { key: TabKey; label: string; icon: any; route: string }[] = [
  { key: 'home',          label: 'Accueil',       icon: Home,          route: '/' },
  { key: 'requests',      label: 'Demandes',      icon: ClipboardList, route: '/my-requests' },
  { key: 'notifications', label: 'Notifications', icon: Bell,          route: '/notifications' },
  { key: 'profile',       label: 'Profil',        icon: UserCircle,    route: '/profile' },
]

export default function TabBar({ active }: TabBarProps) {
  const [unread, setUnread] = useState(0)

  useEffect(() => {
    let mounted = true
    loadNotifications().then(() => { if (mounted) setUnread(unreadCount()) })
    const unsubscribe = subscribeNotifications(() => {
      if (mounted) setUnread(unreadCount())
    })
    return () => { mounted = false; unsubscribe() }
  }, [])

  const onPress = (tab: typeof TABS[number]) => {
    if (tab.key === active) return
    hapticSelect()
    if (tab.key === 'home') {
      router.replace('/')
    } else {
      router.push(tab.route as any)
    }
  }

  return (
    <View style={s.bar}>
      {TABS.map(tab => {
        const isActive = tab.key === active
        const showBadge = tab.key === 'notifications' && unread > 0
        return (
          <TouchableOpacity
            key={tab.key}
            style={s.item}
            onPress={() => onPress(tab)}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={tab.label}
            accessibilityState={{ selected: isActive }}
          >
            <View style={[s.iconWrap, isActive && s.iconWrapActive]}>
              <tab.icon size={20} color={isActive ? colors.primary : colors.textMuted} strokeWidth={isActive ? 2.5 : 2} />
              {showBadge && (
                <View style={s.badge}>
                  <Text style={s.badgeText}>{unread > 9 ? '9+' : String(unread)}</Text>
                </View>
              )}
            </View>
            <Text style={isActive ? s.labelActive : s.label}>{tab.label}</Text>
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
