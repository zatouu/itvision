import { Text, View, TouchableOpacity, ScrollView, StyleSheet } from 'react-native'
import { useEffect, useState, useCallback } from 'react'
import * as Location from 'expo-location'
import { router } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { apiGet } from '../src/api'
import { fetchWithCache } from '../src/storage'
import TabBar from '../src/components/TabBar'
import { SkeletonCard } from '../src/components/Skeleton'
import OfflineQueueBadge from '../src/components/OfflineQueueBadge'
import EmptyState from '../src/components/EmptyState'
import { loadCategories, getCategoryLabel } from '../src/categories'
import { useTranslation } from 'react-i18next'

const STATUS_LABEL: Record<string, { label: string; color: string; dot: string }> = {
  created:        { label: 'Publiée',           color: '#2563EB', dot: '#2563EB' },
  pending_offers: { label: 'Offres reçues',     color: '#B45309', dot: '#D97706' },
  assigned:          { label: 'Prestataire assigné', color: '#065F46', dot: '#059669' },
  provider_arriving: { label: 'En route',            color: '#0369A1', dot: '#0EA5E9' },
  in_progress:       { label: 'En cours',            color: '#5B21B6', dot: '#7C3AED' },
  completed:      { label: 'Terminée',          color: '#475569', dot: '#94A3B8' },
  cancelled:      { label: 'Annulée',           color: '#991B1B', dot: '#DC2626' },
}

type CatItem = { id: string; label: string; abbr: string; color: string }

const FALLBACK_CATS: CatItem[] = [
  { id: 'electricite', label: 'Électricité', abbr: 'EL', color: '#1D4ED8' },
  { id: 'plomberie', label: 'Plomberie', abbr: 'PL', color: '#0369A1' },
  { id: 'menuiserie', label: 'Menuiserie', abbr: 'ME', color: '#92400E' },
  { id: 'peinture', label: 'Peinture', abbr: 'PE', color: '#6D28D9' },
  { id: 'climatisation', label: 'Climatisation', abbr: 'CL', color: '#0891B2' },
  { id: 'securite', label: 'Sécurité', abbr: 'SE', color: '#065F46' },
]

function greetingByHour(): string {
  const h = new Date().getHours()
  if (h < 5) return 'Bonne nuit'
  if (h < 12) return 'Bonjour'
  if (h < 18) return 'Bon après-midi'
  return 'Bonsoir'
}

export default function Home() {
  const [recent, setRecent] = useState<any[]>([])
  const [stats, setStats] = useState({ active: 0, offers: 0 })
  const [userName, setUserName] = useState<string>('')
  const [loadingRecent, setLoadingRecent] = useState(true)
  const [cats, setCats] = useState<CatItem[]>(FALLBACK_CATS)
  const { i18n } = useTranslation()

  const applyItems = useCallback((items: any[]) => {
    setRecent(items.slice(0, 3))
    setStats({
      active: items.filter((it: any) => !['completed', 'cancelled'].includes(it.status)).length,
      offers: items.filter((it: any) => it.pendingOfferCount > 0).length,
    })
  }, [])

  const loadRecent = useCallback(async () => {
    setLoadingRecent(true)
    try {
      await fetchWithCache(
        'home-requests',
        () => apiGet('/api/services/requests?mine=1').then(r => r.items || []),
        (items) => applyItems(items)
      )
    } catch { /* silencieux */ }
    finally { setLoadingRecent(false) }
  }, [applyItems])

  useEffect(() => {
    Location.requestForegroundPermissionsAsync()
    loadRecent()
    // Charger les catégories dynamiques
    loadCategories().then(loaded => {
      setCats(loaded.map(c => ({ id: c.slug, label: getCategoryLabel(c, i18n.language), abbr: c.abbr, color: c.color })))
    }).catch(() => {})
    // Charger le prénom utilisateur
    apiGet('/api/client/profile')
      .then((res: any) => {
        const name = res?.profile?.name
        if (name) setUserName(name.split(' ')[0])
      })
      .catch(() => { /* silencieux */ })
  }, [loadRecent])

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>

        {/* Header */}
        <View style={s.header}>
          <View>
            <Text style={s.appName}>Ligey</Text>
          </View>
          <View style={s.headerRight}>
            <TouchableOpacity style={s.bellBtn} onPress={() => router.push('/notifications')} accessibilityLabel="Notifications">
              <Text style={s.bellIcon}>�</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.avatarChip} onPress={() => router.push('/profile')} accessibilityLabel="Profil">
              <Text style={s.avatarText}>{userName ? userName.slice(0, 2).toUpperCase() : '??'}</Text>
            </TouchableOpacity>
          </View>
        </View>

        <OfflineQueueBadge />

        {/* Greeting */}
        <View style={s.greeting}>
          <Text style={s.greetTitle}>{greetingByHour()}{userName ? `, ${userName}` : ''}</Text>
          <Text style={s.greetSub}>Que souhaitez-vous réparer aujourd'hui ?</Text>
        </View>

        {/* CTA Principal */}
        <TouchableOpacity style={s.ctaCard} onPress={() => router.push('/create-request')} activeOpacity={0.88}>
          <View style={s.ctaLeft}>
            <Text style={s.ctaTitle}>Publier une demande</Text>
            <Text style={s.ctaSub}>Recevez des offres en quelques minutes</Text>
          </View>
          <View style={s.ctaPlus}>
            <Text style={s.ctaPlusText}>+</Text>
          </View>
        </TouchableOpacity>

        {/* Stats chips */}
        <View style={s.statsRow}>
          <TouchableOpacity style={s.statChip} onPress={() => router.push('/my-requests')}>
            <Text style={s.statText}>{stats.active} demande{stats.active > 1 ? 's' : ''} active{stats.active > 1 ? 's' : ''}</Text>
            <View style={s.statDotBlue} />
          </TouchableOpacity>
          <TouchableOpacity style={s.statChip} onPress={() => router.push('/my-requests')}>
            <Text style={s.statText}>{stats.offers} offre{stats.offers > 1 ? 's' : ''} reçue{stats.offers > 1 ? 's' : ''}</Text>
            <View style={s.statDotAmber} />
          </TouchableOpacity>
        </View>

        {/* Activité récente */}
        <View style={s.sectionRow}>
          <Text style={s.sectionTitle}>Activité récente</Text>
        </View>

        {loadingRecent && recent.length === 0 ? (
          <View style={{ gap: 10 }}>
            <SkeletonCard />
            <SkeletonCard />
          </View>
        ) : recent.length === 0 ? (
          <EmptyState
            icon="📢"
            title="Aucune demande en cours"
            subtitle="Publiez votre première demande et recevez des offres de prestataires proches en quelques minutes."
            actionLabel="Créer une demande"
            onAction={() => router.push('/create-request')}
          />
        ) : (
          recent.map(it => {
            const st = STATUS_LABEL[it.status] || { label: it.status, color: '#64748B', dot: '#94A3B8' }
            const catMatch = cats.find(c => c.id === it.category)
            const abbr = catMatch?.abbr || it.category?.slice(0,2).toUpperCase()
            const color = catMatch?.color || '#475569'
            const catLabel = catMatch?.label || it.category
            const title = it.description
              ? `${catLabel} — ${it.description.slice(0, 28)}${it.description.length > 28 ? '…' : ''}`
              : catLabel
            return (
              <TouchableOpacity
                key={it._id}
                style={s.recentCard}
                activeOpacity={0.85}
                onPress={() => {
                  if (['assigned', 'provider_arriving', 'in_progress', 'completed'].includes(it.status)) {
                    router.push(`/mission/${it._id}`)
                  } else {
                    router.push({ pathname: '/request-offers', params: { id: it._id } })
                  }
                }}
              >
                <View style={[s.recentMonogram, { backgroundColor: color }]}>
                  <Text style={s.recentMonogramText}>{abbr}</Text>
                </View>
                <View style={s.recentInfo}>
                  <Text style={s.recentTitle} numberOfLines={1}>{title}</Text>
                  <View style={s.recentStatus}>
                    <View style={[s.recentDot, { backgroundColor: st.dot }]} />
                    <Text style={[s.recentStatusText, { color: st.color }]}>{st.label}</Text>
                  </View>
                </View>
                <Text style={s.recentArrow}>›</Text>
              </TouchableOpacity>
            )
          })
        )}

        {recent.length > 0 && (
          <TouchableOpacity style={s.seeAllBtn} onPress={() => router.push('/my-requests')}>
            <Text style={s.seeAllText}>Voir toutes mes demandes</Text>
          </TouchableOpacity>
        )}

        {/* Catégories */}
        <View style={s.sectionRow}>
          <Text style={s.sectionTitle}>Catégories</Text>
        </View>
        <View style={s.catGrid}>
          {cats.map(c => (
            <TouchableOpacity
              key={c.id}
              style={s.catCard}
              activeOpacity={0.75}
              onPress={() => router.push({ pathname: '/create-request', params: { category: c.id } })}
            >
              <View style={[s.catMonogram, { backgroundColor: c.color }]}>
                <Text style={s.catMonogramText}>{c.abbr}</Text>
              </View>
              <Text style={s.catLabel}>{c.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

      </ScrollView>

      <TabBar active="home" />
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F1F5F9' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 4 },
  appName: { fontSize: 22, fontWeight: '800', color: '#0F172A', letterSpacing: -0.5 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  bellBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#E2E8F0' },
  bellIcon: { fontSize: 16 },
  avatarChip: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#0F172A', alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 13, fontWeight: '700', color: '#fff' },
  greeting: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 20 },
  greetTitle: { fontSize: 26, fontWeight: '800', color: '#0F172A', letterSpacing: -0.5 },
  greetSub: { fontSize: 14, color: '#64748B', marginTop: 4 },
  ctaCard: { marginHorizontal: 20, marginBottom: 16, borderRadius: 16, backgroundColor: '#0F172A', padding: 22, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  ctaLeft: { flex: 1 },
  ctaTitle: { fontSize: 17, fontWeight: '700', color: '#F8FAFC', marginBottom: 4 },
  ctaSub: { fontSize: 13, color: '#94A3B8', lineHeight: 18 },
  ctaPlus: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center', marginLeft: 16, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.3)' },
  ctaPlusText: { fontSize: 22, color: '#fff', lineHeight: 26, fontWeight: '300' },
  statsRow: { flexDirection: 'row', paddingHorizontal: 20, gap: 10, marginBottom: 24 },
  statChip: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#fff', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1, borderColor: '#E2E8F0' },
  statText: { fontSize: 13, fontWeight: '600', color: '#0F172A' },
  statDotBlue: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#2563EB' },
  statDotAmber: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#D97706' },
  sectionRow: { paddingHorizontal: 20, marginBottom: 12, marginTop: 8 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#0F172A' },
  emptyRecent: { marginHorizontal: 20, backgroundColor: '#fff', borderRadius: 12, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 16, gap: 10 },
  emptyText: { color: '#94A3B8', fontSize: 14 },
  emptyLink: { color: '#2563EB', fontSize: 14, fontWeight: '600' },
  recentCard: { marginHorizontal: 20, backgroundColor: '#fff', borderRadius: 12, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 8 },
  recentMonogram: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  recentMonogramText: { fontSize: 12, fontWeight: '800', color: '#fff' },
  recentInfo: { flex: 1, gap: 4 },
  recentTitle: { fontSize: 14, fontWeight: '600', color: '#0F172A' },
  recentStatus: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  recentDot: { width: 6, height: 6, borderRadius: 3 },
  recentStatusText: { fontSize: 12, fontWeight: '600' },
  recentArrow: { fontSize: 20, color: '#CBD5E1' },
  seeAllBtn: { marginHorizontal: 20, marginBottom: 20, marginTop: 4 },
  seeAllText: { fontSize: 13, color: '#2563EB', fontWeight: '600', textAlign: 'right' },
  catGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, gap: 10 },
  catCard: { width: '30.5%', backgroundColor: '#fff', borderRadius: 14, paddingVertical: 18, paddingHorizontal: 8, alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0' },
  catMonogram: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  catMonogramText: { fontSize: 14, fontWeight: '800', color: '#fff' },
  catLabel: { fontSize: 11, fontWeight: '600', color: '#374151', textAlign: 'center' },
})
