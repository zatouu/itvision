import { useEffect, useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { router } from 'expo-router'
import { loadNotifications, subscribeNotifications, unreadCount } from '../notifications'

export type TabKey = 'home' | 'offers' | 'notifications' | 'profile'

interface TabBarProps {
  active: TabKey
}

const TABS: { key: TabKey; label: string; icon: string; route: string }[] = [
  { key: 'home',          label: 'Tableau',       icon: '⌂', route: '/' },
  { key: 'offers',        label: 'Mes offres',    icon: '☰', route: '/my-offers' },
  { key: 'notifications', label: 'Notifications', icon: '🔔', route: '/notifications' },
  { key: 'profile',       label: 'Profil',        icon: '○', route: '/profile' },
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
            <View style={s.iconWrap}>
              <Text style={isActive ? s.iconActive : s.icon}>{tab.icon}</Text>
              {showBadge && (
                <View style={s.badge}>
                  <Text style={s.badgeText}>{unread > 9 ? '9+' : String(unread)}</Text>
                </View>
              )}
            </View>
            <Text style={isActive ? s.labelActive : s.label}>{tab.label}</Text>
          </TouchableOpacity>
        )
      })}
    </View>
  )
}

const s = StyleSheet.create({
  bar: { flexDirection: 'row', backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#E2E8F0', paddingBottom: 6, paddingTop: 6 },
  item: { flex: 1, alignItems: 'center', paddingTop: 4, paddingBottom: 2 },
  iconWrap: { position: 'relative' },
  icon: { fontSize: 20, color: '#94A3B8' },
  iconActive: { fontSize: 20, color: '#0F172A' },
  label: { fontSize: 10, color: '#94A3B8', marginTop: 2, fontWeight: '500' },
  labelActive: { fontSize: 10, color: '#0F172A', marginTop: 2, fontWeight: '700' },
  badge: { position: 'absolute', top: -4, right: -10, minWidth: 16, height: 16, borderRadius: 8, backgroundColor: '#EF4444', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '700', lineHeight: 12 },
})
