import { Text, View, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator, Platform } from 'react-native'
import { useEffect, useState, useCallback, useRef } from 'react'
import * as Location from 'expo-location'
import MapView, { Marker, Circle, PROVIDER_DEFAULT } from 'react-native-maps'
import { router, useFocusEffect } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { apiGet } from '../src/api'
import { getAuthUser } from '../src/auth'
import { fetchWithCache } from '../src/storage'
import { connectSocket, requestOnlineProviders, onOnlineProvidersCount } from '../src/socket'
import OfflineQueueBadge from '../src/components/OfflineQueueBadge'
import { loadCategories, getCategoryLabel } from '../src/categories'
import { getCategoryIcon } from '../src/categoryIcons'
import { useTranslation } from 'react-i18next'
import { withScreenBoundary } from '../src/components/withScreenBoundary'
import Logo from '../src/components/Logo'
import ProviderCard from '../src/components/ProviderCard'
import { colors, radius, shadows, spacing, typography } from '../src/design'
import { BellRing, UserCircle, Plus, ChevronRight, MapPin, Crosshair, Zap, Wrench, Clock, ArrowRight, Menu } from 'lucide-react-native'
import SideMenu from '../src/components/SideMenu'

const STATUS_LABEL: Record<string, { label: string; color: string; dot: string }> = {
  created:           { label: 'Publiée',              color: '#2563EB', dot: '#2563EB' },
  pending_offers:    { label: 'Offres recues',        color: '#B45309', dot: '#D97706' },
  accepted:          { label: 'Prestataire assigne',  color: '#065F46', dot: '#059669' },
  assigned:          { label: 'Prestataire assigne',  color: '#065F46', dot: '#059669' },
  on_the_way:        { label: 'En route',             color: '#0369A1', dot: '#0EA5E9' },
  provider_arriving: { label: 'En route',             color: '#0369A1', dot: '#0EA5E9' },
  in_progress:       { label: 'En cours',             color: '#5B21B6', dot: '#7C3AED' },
  completed:         { label: 'Terminee',             color: '#475569', dot: colors.textMuted },
  cancelled:         { label: 'Annulee',              color: '#991B1B', dot: '#DC2626' },
}

type CatItem = { id: string; label: string; abbr: string; color: string }

const FALLBACK_CATS: CatItem[] = [
  { id: 'electricite', label: 'Electricite', abbr: 'EL', color: '#1D4ED8' },
  { id: 'plomberie', label: 'Plomberie', abbr: 'PL', color: '#0369A1' },
  { id: 'menuiserie', label: 'Menuiserie', abbr: 'ME', color: '#92400E' },
  { id: 'peinture', label: 'Peinture', abbr: 'PE', color: '#6D28D9' },
  { id: 'climatisation', label: 'Climatisation', abbr: 'CL', color: '#0891B2' },
  { id: 'securite', label: 'Securite', abbr: 'SE', color: '#065F46' },
  { id: 'maconnerie', label: 'Maçonnerie', abbr: 'MA', color: '#78350F' },
  { id: 'nettoyage', label: 'Nettoyage', abbr: 'NE', color: '#0D9488' },
]

function greetingByHour(t: any): string {
  const h = new Date().getHours()
  if (h < 5) return t('home.greeting_night')
  if (h < 12) return t('home.greeting_morning')
  if (h < 18) return t('home.greeting_afternoon')
  return t('home.greeting_evening')
}

function Home() {
  const [recent, setRecent] = useState<any[]>([])
  const [userName, setUserName] = useState<string>(() => {
    const authUser = getAuthUser()
    const n = authUser?.name?.trim() || ''
    return n && !/^\d{7,}$/.test(n) ? n.split(' ')[0] : ''
  })
  const [loadingRecent, setLoadingRecent] = useState(true)
  const [cats, setCats] = useState<CatItem[]>(FALLBACK_CATS)
  const mapRef = useRef<MapView | null>(null)
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [mapLoading, setMapLoading] = useState(false)
  const [onlineProviders, setOnlineProviders] = useState(0)
  const [liveProviders, setLiveProviders] = useState<Array<{
    providerId: string
    name?: string
    status: string
    lat: number
    lng: number
    distanceKm?: number | null
    etaMinutes?: number | null
  }>>([])

  const focusOnUser = useCallback(() => {
    if (mapRef.current && userLocation) {
      mapRef.current.animateToRegion({
        latitude: userLocation.lat,
        longitude: userLocation.lng,
        latitudeDelta: 0.015,
        longitudeDelta: 0.015,
      }, 500)
    }
  }, [userLocation])
  const [recommended, setRecommended] = useState<any[]>([])
  const [loadingRecommended, setLoadingRecommended] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const { t, i18n } = useTranslation()

  const applyItems = useCallback((items: any[]) => {
    setRecent(items.slice(0, 10))
  }, [])

  const loadRecent = useCallback(async () => {
    setLoadingRecent(true)
    try {
      await fetchWithCache(
        'home-requests',
        () => apiGet('/api/services/requests?mine=1').then(r => r.items || []),
        (items) => applyItems(items)
      )
    } catch { /* silent */ }
    finally { setLoadingRecent(false) }
  }, [applyItems])

  useEffect(() => {
    const socket = connectSocket()
    const unsub = onOnlineProvidersCount((data) => setOnlineProviders(data.count))
    requestOnlineProviders()
    const interval = setInterval(() => requestOnlineProviders(), 15000)
    // Temps réel : offres et changements de statut
    const refresh = () => loadRecent()
    socket.on('user:offer-received', refresh)
    socket.on('user:request-assigned', refresh)
    socket.on('request:status-changed', refresh)
    return () => {
      unsub()
      clearInterval(interval)
      socket.off('user:offer-received', refresh)
      socket.off('user:request-assigned', refresh)
      socket.off('request:status-changed', refresh)
    }
  }, [loadRecent])

  useFocusEffect(
    useCallback(() => {
      loadRecent()
    }, [loadRecent])
  )

  useEffect(() => {
    Location.requestForegroundPermissionsAsync()
    loadRecent()
    loadCategories().then(loaded => {
      setCats(loaded.map(c => ({ id: c.slug, label: getCategoryLabel(c, i18n.language), abbr: c.abbr, color: c.color })))
    }).catch(() => {})
    apiGet('/api/client/profile')
      .then((res: any) => {
        const name = res?.profile?.name
        if (name && name.trim() && !/^\d{7,}$/.test(name.trim())) setUserName(name.split(' ')[0])
      })
      .catch(() => {})
    setMapLoading(true)
    Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })
      .then(pos => {
        setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude })
      })
      .catch(() => {})
      .finally(() => setMapLoading(false))
    setLoadingRecommended(true)
    apiGet('/api/services/providers/top?limit=10')
      .then((res: any) => { if (res?.providers) setRecommended(res.providers) })
      .catch(() => {})
      .finally(() => setLoadingRecommended(false))
  }, [loadRecent])

  useEffect(() => {
    let mounted = true
    const fetchLive = async () => {
      const merged = new Map<string, typeof liveProviders[0]>()

      // 1) Toujours récupérer les prestataires autour de l'utilisateur (live count)
      if (userLocation) {
        try {
          const r: any = await apiGet(`/api/services/nearby-providers?lat=${userLocation.lat}&lng=${userLocation.lng}&radiusKm=10`)
          ;(r.providers || []).forEach((p: any) => {
            if (Number.isFinite(Number(p.lat)) && Number.isFinite(Number(p.lng))) {
              merged.set(String(p.providerId), {
                providerId: String(p.providerId),
                name: p.name,
                status: p.status || 'available',
                lat: Number(p.lat),
                lng: Number(p.lng),
                distanceKm: p.distanceKm ?? null,
                etaMinutes: p.etaMinutes ?? null,
              })
            }
          })
        } catch {}
      }

      // 2) Ajouter viewers / offerors / assigned depuis les demandes actives
      //    (sans fusionner le "nearby" de chaque demande qui est basé sur la
      //    position de la demande, pas de l'utilisateur)
      const activeIds = recent
        .filter(it => it._id && !['completed', 'cancelled'].includes(it.status))
        .map(it => String(it._id))

      for (const id of activeIds) {
        try {
          const r: any = await apiGet(`/api/services/requests/${id}/live`)
          ;[...(r.viewers || []), ...(r.offerors || []), ...(r.assigned ? [r.assigned] : [])]
            .filter((p: any) => Number.isFinite(Number(p.lat)) && Number.isFinite(Number(p.lng)))
            .forEach((p: any) => {
              merged.set(String(p.providerId), {
                providerId: String(p.providerId),
                name: p.name,
                status: p.status || 'available',
                lat: Number(p.lat),
                lng: Number(p.lng),
                distanceKm: p.distanceKm ?? null,
                etaMinutes: p.etaMinutes ?? null,
              })
            })
        } catch {}
      }

      if (mounted) setLiveProviders(Array.from(merged.values()))
    }
    fetchLive()
    const interval = setInterval(fetchLive, 15000)
    return () => { mounted = false; clearInterval(interval) }
  }, [recent, userLocation])

  const offersPending = recent.filter(it => {
    const unseen = it.unseenOfferCount ?? it.pendingOfferCount
    return it.status === 'pending_offers' && unseen > 0
  })
  const activeMissions = recent.filter(it => ['accepted', 'assigned', 'on_the_way', 'provider_arriving', 'in_progress'].includes(it.status))
  const otherRecent = recent.filter(it => !['pending_offers', 'accepted', 'assigned', 'on_the_way', 'provider_arriving', 'in_progress'].includes(it.status))
  const hasNoActivity = recent.length === 0 && !loadingRecent

  const formatProviderName = (raw: string): string => {
    if (!raw) return t('home.newProvider')
    if (/^\d{7,}$/.test(raw.trim())) return t('home.newProvider')
    return raw.trim().split(/\s+/)[0]
  }

  const formatProviderSpecialty = (p: any): string => {
    const trade = p.specialty || p.trade || p.profession
    if (trade) {
      const catMatch = cats.find(c => c.id === trade || c.id === trade.toLowerCase())
      if (catMatch) return catMatch.label
      return trade
    }
    if (p.categories?.length > 0) {
      const catMatch = cats.find(c => c.id === p.categories[0])
      if (catMatch) return catMatch.label
    }
    return p.rating?.count ? `${p.rating.count} avis` : t('home.newProvider')
  }

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: spacing.xxl }}>

        {/* Header */}
        <View style={s.header}>
          <View style={s.logoRow}>
            <TouchableOpacity onPress={() => setMenuOpen(true)} activeOpacity={0.6} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Menu size={24} color={colors.text} />
            </TouchableOpacity>
            <Logo size={28} />
            <Text style={s.appName}>Xeuy Bi</Text>
          </View>
          <View style={s.headerRight}>
            <TouchableOpacity style={s.iconBtn} onPress={() => router.push('/notifications')} accessibilityLabel="Notifications">
              <BellRing size={18} color={colors.text} />
              <View style={s.notifDot} />
            </TouchableOpacity>
            <TouchableOpacity style={s.avatarBtn} onPress={() => router.push('/profile')} accessibilityLabel="Profil">
              {userName ? (
                <Text style={s.avatarText}>{userName.slice(0, 2).toUpperCase()}</Text>
              ) : (
                <UserCircle size={20} color={colors.surface} />
              )}
            </TouchableOpacity>
          </View>
        </View>

        <OfflineQueueBadge />

        {/* Greeting */}
        <View style={s.greeting}>
          <Text style={s.greetTitle}>{greetingByHour(t)}{userName ? `, ${userName}` : ''}</Text>
          <Text style={s.greetSub}>{t('home.greetSub')}</Text>
        </View>

        {/* 1. ACTIVITÉ EN COURS — Offres en attente + Missions actives (premier plan) */}
        {(offersPending.length > 0 || activeMissions.length > 0) && (
          <View style={s.activitySection}>
            {/* Offres en attente — cartes cliquables compactes */}
            {offersPending.map(it => {
              const catMatch = cats.find(c => c.id === it.category)
              const abbr = catMatch?.abbr || it.category?.slice(0, 2).toUpperCase()
              const color = catMatch?.color || '#475569'
              const catLabel = catMatch?.label || it.category
              const offerCount = it.unseenOfferCount ?? it.pendingOfferCount ?? 0
              const title = it.description
                ? `${catLabel} — ${it.description.slice(0, 28)}${it.description.length > 28 ? '…' : ''}`
                : catLabel
              return (
                <TouchableOpacity
                  key={`offer-${it._id}`}
                  style={s.offerCard}
                  activeOpacity={0.82}
                  onPress={() => router.push(`/offers/${it._id}`)}
                >
                  <View style={[s.offerMonogram, { backgroundColor: color }]}>
                    <Text style={s.offerMonogramText}>{abbr}</Text>
                  </View>
                  <View style={s.offerInfo}>
                    <Text style={s.offerTitle} numberOfLines={1}>{title}</Text>
                    <View style={s.offerMeta}>
                      <View style={s.offerBadge}>
                        <Zap size={10} color={colors.surface} />
                        <Text style={s.offerBadgeText}>{offerCount} {offerCount > 1 ? 'offres' : 'offre'}</Text>
                      </View>
                      {it.budget && <Text style={s.offerBudget}>{Number(it.budget).toLocaleString('fr-FR')} FCFA</Text>}
                    </View>
                  </View>
                  <View style={s.offerArrow}>
                    <ArrowRight size={16} color={colors.warning} />
                  </View>
                </TouchableOpacity>
              )
            })}

            {/* Missions actives — cartes compactes */}
            {activeMissions.map(it => {
              const st = STATUS_LABEL[it.status] || { label: it.status, color: colors.textSecondary, dot: colors.textMuted }
              const catMatch = cats.find(c => c.id === it.category)
              const abbr = catMatch?.abbr || it.category?.slice(0, 2).toUpperCase()
              const color = catMatch?.color || '#475569'
              const catLabel = catMatch?.label || it.category
              const liveP = liveProviders.find(p => p.status === 'arriving' || p.status === 'in_progress')
              const title = it.description
                ? `${catLabel} — ${it.description.slice(0, 28)}${it.description.length > 28 ? '…' : ''}`
                : catLabel
              return (
                <TouchableOpacity
                  key={`mission-${it._id}`}
                  style={s.missionCard}
                  activeOpacity={0.82}
                  onPress={() => router.push(`/mission/${it._id}`)}
                >
                  <View style={[s.missionMonogram, { backgroundColor: color }]}>
                    <Text style={s.missionMonogramText}>{abbr}</Text>
                  </View>
                  <View style={s.missionInfo}>
                    <Text style={s.missionTitle} numberOfLines={1}>{title}</Text>
                    <View style={s.missionStatusRow}>
                      <View style={[s.missionDot, { backgroundColor: st.dot }]} />
                      <Text style={[s.missionStatusText, { color: st.color }]}>{st.label}</Text>
                      {liveP?.etaMinutes != null && (
                        <View style={s.missionEta}>
                          <Clock size={10} color={st.color} />
                          <Text style={[s.missionEtaText, { color: st.color }]}>{liveP.etaMinutes} min</Text>
                        </View>
                      )}
                    </View>
                  </View>
                  <View style={s.missionArrow}>
                    <ChevronRight size={18} color={colors.textMuted} />
                  </View>
                </TouchableOpacity>
              )
            })}
          </View>
        )}

        {/* 3. CTA compact + actions rapides */}
        <View style={s.ctaRow}>
          <TouchableOpacity style={s.ctaMain} onPress={() => router.push('/create-request')} activeOpacity={0.88}>
            <Plus size={22} color={colors.surface} />
            <Text style={s.ctaMainText}>{t('home.publishRequest')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.ctaEmergency} onPress={() => router.push({ pathname: '/create-request', params: { category: 'electricite' } })} activeOpacity={0.85}>
            <Wrench size={18} color={colors.danger} />
            <Text style={s.ctaEmergencyText}>{t('home.emergencyRepair')}</Text>
          </TouchableOpacity>
        </View>

        {/* 4. Carte autour de vous */}
        <View style={s.sectionRow}>
          <Text style={s.sectionTitle}>{t('home.nearbyMap')}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            {liveProviders.length > 0 && (
              <View style={s.nearbyCountBadge}>
                <Text style={s.nearbyCountText}>{liveProviders.length}</Text>
              </View>
            )}
            <TouchableOpacity onPress={() => { focusOnUser(); loadRecent() }} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }} accessibilityRole="button" accessibilityLabel={t('home.centerMap', { defaultValue: 'Centrer la carte' })}>
              <Crosshair size={16} color={colors.primary} />
            </TouchableOpacity>
          </View>
        </View>
        <View style={s.mapCard}>
          {Platform.OS === 'web' ? (
            <View style={s.mapPlaceholder}>
              <MapPin size={32} color={colors.textMuted} />
              <Text style={s.mapPlaceholderText}>{t('home.mapWeb')}</Text>
            </View>
          ) : mapLoading || !userLocation ? (
            <View style={s.mapPlaceholder}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={s.mapPlaceholderText}>{mapLoading ? t('home.locating') : t('home.locationNeeded')}</Text>
            </View>
          ) : (
            <MapView
              ref={mapRef}
              provider={PROVIDER_DEFAULT}
              style={s.map}
              initialRegion={{
                latitude: userLocation.lat,
                longitude: userLocation.lng,
                latitudeDelta: 0.015,
                longitudeDelta: 0.015,
              }}
              showsUserLocation
              showsMyLocationButton={false}
              showsCompass={false}
            >
              <Circle
                center={{ latitude: userLocation.lat, longitude: userLocation.lng }}
                radius={10000}
                strokeColor="rgba(37,99,235,0.4)"
                fillColor="rgba(37,99,235,0.06)"
                strokeWidth={2}
              />
              {liveProviders.map(p => {
                if (!Number.isFinite(p.lat) || !Number.isFinite(p.lng)) return null
                const statusColor =
                  p.status === 'arriving' || p.status === 'in_progress' || p.status === 'selected' ? '#2563EB'
                  : p.status === 'offered' ? colors.primary
                  : p.status === 'viewing' ? '#10B981'
                  : colors.textSecondary
                const label = p.status === 'arriving' ? t('offers.statusArriving')
                  : p.status === 'in_progress' ? t('offers.statusInProgress')
                  : p.status === 'selected' ? t('offers.statusSelected')
                  : p.status === 'offered' ? t('offers.statusOffered')
                  : p.status === 'viewing' ? t('offers.statusViewing')
                  : t('offers.viewer')
                const sub = [p.distanceKm ? `${p.distanceKm} km` : null, p.etaMinutes ? `${p.etaMinutes} min` : null].filter(Boolean).join(' - ')
                return (
                  <Marker
                    key={p.providerId}
                    coordinate={{ latitude: p.lat, longitude: p.lng }}
                    anchor={{ x: 0.5, y: 1 }}
                  >
                    <View style={{ alignItems: 'center' }}>
                      <View style={[s.providerMarker, { borderColor: statusColor }]}>
                        <View style={[s.providerMarkerDot, { backgroundColor: statusColor }]} />
                      </View>
                      <View style={[s.providerMarkerTail, { borderTopColor: statusColor }]} />
                    </View>
                  </Marker>
                )
              })}
            </MapView>
          )}
          {onlineProviders > 0 && (
            <View style={s.onlineBadge}>
              <View style={s.onlineDot} />
              <Text style={s.onlineText}>{t('home.providersOnline', { count: onlineProviders })}</Text>
            </View>
          )}
          <TouchableOpacity
            style={s.mapFab}
            onPress={() => router.push('/create-request')}
            activeOpacity={0.88}
          >
            <Plus size={18} color={colors.surface} />
            <Text style={s.mapFabText}>{t('home.newRequest')}</Text>
          </TouchableOpacity>
        </View>

        {/* 5. Categories */}
        <View style={s.sectionRow}>
          <Text style={s.sectionTitle}>{t('home.categories')}</Text>
        </View>
        <View style={s.catGrid}>
          {cats.slice(0, 8).map(c => (
            <TouchableOpacity
              key={c.id}
              style={s.catCard}
              activeOpacity={0.75}
              onPress={() => router.push({ pathname: '/create-request', params: { category: c.id } })}
            >
              <View style={[s.catMonogram, { backgroundColor: c.color }]}>
                {(() => { const Icon = getCategoryIcon(c.id); return <Icon size={20} color={colors.surface} /> })()}
              </View>
              <Text style={s.catLabel}>{c.label}</Text>
            </TouchableOpacity>
          ))}
          {/* Bouton Voir toutes les catégories */}
          <TouchableOpacity
            style={s.catCard}
            activeOpacity={0.75}
            onPress={() => router.push('/all-categories')}
          >
            <View style={[s.catMonogram, { backgroundColor: colors.navy }]}>
              <Plus size={20} color={colors.surface} />
            </View>
            <Text style={s.catLabel}>{t('home.allCategories')}</Text>
          </TouchableOpacity>
        </View>

        {/* 6. Autre activite recente — scroll horizontal */}
        {otherRecent.length > 0 && (
          <View>
            <View style={s.sectionRow}>
              <Text style={s.sectionTitle}>{t('home.recentActivity')}</Text>
              <TouchableOpacity onPress={() => router.push('/my-requests')}>
                <Text style={s.seeAllText}>{t('home.seeAllRequests')}</Text>
              </TouchableOpacity>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: spacing.lg, gap: spacing.md, paddingBottom: spacing.sm }}
            >
              {otherRecent.map(it => {
                const st = STATUS_LABEL[it.status] || { label: it.status, color: colors.textSecondary, dot: colors.textMuted }
                const catMatch = cats.find(c => c.id === it.category)
                const abbr = catMatch?.abbr || it.category?.slice(0, 2).toUpperCase()
                const color = catMatch?.color || '#475569'
                const catLabel = catMatch?.label || it.category
                const title = it.description
                  ? `${catLabel} - ${it.description.slice(0, 20)}${it.description.length > 20 ? '...' : ''}`
                  : catLabel
                return (
                  <TouchableOpacity
                    key={it._id}
                    style={s.recentCardH}
                    activeOpacity={0.85}
                    onPress={() => {
                      if (['accepted', 'assigned', 'on_the_way', 'provider_arriving', 'in_progress', 'completed'].includes(it.status)) {
                        router.push(`/mission/${it._id}`)
                      } else {
                        router.push(`/offers/${it._id}`)
                      }
                    }}
                  >
                    <View style={[s.recentMonogram, { backgroundColor: color }]}>
                      <Text style={s.recentMonogramText}>{abbr}</Text>
                    </View>
                    <Text style={s.recentTitleH} numberOfLines={1}>{title}</Text>
                    <View style={s.recentStatus}>
                      <View style={[s.recentDot, { backgroundColor: st.dot }]} />
                      <Text style={[s.recentStatusText, { color: st.color }]}>{st.label}</Text>
                    </View>
                  </TouchableOpacity>
                )
              })}
            </ScrollView>
          </View>
        )}

        {/* 7. Onboarding: Comment ca marche */}
        {hasNoActivity && (
          <View style={s.howItWorksSection}>
            <Text style={s.sectionTitle}>{t('home.howItWorks')}</Text>
            <View style={s.stepCard}>
              <View style={[s.stepNum, { backgroundColor: colors.primary }]}>
                <Text style={s.stepNumText}>1</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.stepTitle}>{t('home.step1')}</Text>
                <Text style={s.stepSub}>{t('home.step1Sub')}</Text>
              </View>
            </View>
            <View style={s.stepCard}>
              <View style={[s.stepNum, { backgroundColor: colors.warning }]}>
                <Text style={s.stepNumText}>2</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.stepTitle}>{t('home.step2')}</Text>
                <Text style={s.stepSub}>{t('home.step2Sub')}</Text>
              </View>
            </View>
            <View style={s.stepCard}>
              <View style={[s.stepNum, { backgroundColor: colors.info }]}>
                <Text style={s.stepNumText}>3</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.stepTitle}>{t('home.step3')}</Text>
                <Text style={s.stepSub}>{t('home.step3Sub')}</Text>
              </View>
            </View>
          </View>
        )}

        {/* 8. Prestataires recommandés */}
        {recommended.length > 0 && (
          <View>
            <View style={s.sectionRow}>
              <Text style={s.sectionTitle}>{t('home.recommendedProviders')}</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.sm }}>
              {recommended.map((p, i) => (
                <ProviderCard
                  key={i}
                  name={formatProviderName(p.name)}
                  rating={p.rating?.avg ?? 0}
                  jobCount={p.completedMissions ?? 0}
                  jobLabel={t('home.missions')}
                  specialty={formatProviderSpecialty(p)}
                  verified={p.completedMissions > 0}
                />
              ))}
            </ScrollView>
          </View>
        )}

      </ScrollView>

      <SideMenu visible={menuOpen} onClose={() => setMenuOpen(false)} />
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.xs },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  appName: { fontSize: 20, fontWeight: typography.weight.extrabold as any, color: colors.text, letterSpacing: -0.3 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  iconBtn: { width: 44, height: 44, borderRadius: radius.pill, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border, position: 'relative' },
  notifDot: { position: 'absolute', top: 10, right: 12, width: 8, height: 8, borderRadius: 4, backgroundColor: colors.danger, borderWidth: 1.5, borderColor: colors.surface },
  avatarBtn: { width: 44, height: 44, borderRadius: radius.pill, backgroundColor: colors.navy, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 13, fontWeight: typography.weight.extrabold as any, color: colors.surface },
  greeting: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.xl },
  greetTitle: { fontSize: 26, fontWeight: typography.weight.extrabold as any, color: colors.text, letterSpacing: -0.5 },
  greetSub: { fontSize: 15, color: colors.textSecondary, marginTop: 4 },
  activitySection: { marginHorizontal: spacing.lg, marginBottom: spacing.lg, gap: spacing.sm },
  offerCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, borderWidth: 1.5, borderColor: colors.warning, ...shadows.sm },
  offerMonogram: { width: 44, height: 44, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  offerMonogramText: { fontSize: 13, fontWeight: typography.weight.extrabold as any, color: colors.surface },
  offerInfo: { flex: 1, gap: 4 },
  offerTitle: { fontSize: 14, fontWeight: typography.weight.extrabold as any, color: colors.text },
  offerMeta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  offerBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.warning, borderRadius: radius.sm, paddingHorizontal: 8, paddingVertical: 3 },
  offerBadgeText: { fontSize: 11, fontWeight: typography.weight.extrabold as any, color: colors.surface },
  offerBudget: { fontSize: 12, fontWeight: typography.weight.semibold as any, color: colors.textSecondary },
  offerArrow: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.warningLight, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  missionCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, borderWidth: 1, borderColor: colors.border, ...shadows.sm },
  missionInfo: { flex: 1, gap: 4 },
  missionArrow: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  missionCardH: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, width: 200, borderWidth: 1, borderColor: colors.border, ...shadows.sm, gap: spacing.sm },
  missionMonogram: { width: 40, height: 40, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  missionMonogramText: { fontSize: 12, fontWeight: typography.weight.extrabold as any, color: colors.surface },
  missionTitle: { fontSize: 14, fontWeight: typography.weight.bold as any, color: colors.text },
  missionStatusRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4 },
  missionDot: { width: 6, height: 6, borderRadius: 3 },
  missionStatusText: { fontSize: 12, fontWeight: typography.weight.semibold as any },
  missionEta: { flexDirection: 'row', alignItems: 'center', gap: 3, marginLeft: 6, backgroundColor: colors.bg, borderRadius: radius.sm, paddingHorizontal: 6, paddingVertical: 2 },
  missionEtaText: { fontSize: 11, fontWeight: typography.weight.semibold as any },
  ctaRow: { flexDirection: 'row', gap: spacing.sm, marginHorizontal: spacing.lg, marginBottom: spacing.lg },
  ctaMain: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.navy, borderRadius: radius.lg, paddingVertical: spacing.md, ...shadows.md },
  ctaMainText: { fontSize: 15, fontWeight: typography.weight.extrabold as any, color: colors.surface },
  ctaEmergency: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.dangerLight, borderRadius: radius.lg, paddingHorizontal: spacing.md, paddingVertical: spacing.md, borderWidth: 1.5, borderColor: colors.danger },
  ctaEmergencyText: { fontSize: 13, fontWeight: typography.weight.bold as any, color: colors.danger },
  howItWorksSection: { marginHorizontal: spacing.lg, marginBottom: spacing.lg, gap: spacing.sm },
  stepCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, borderWidth: 1, borderColor: colors.border, ...shadows.sm },
  stepNum: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  stepNumText: { fontSize: 16, fontWeight: typography.weight.extrabold as any, color: colors.surface },
  stepTitle: { fontSize: 14, fontWeight: typography.weight.bold as any, color: colors.text },
  stepSub: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.lg, marginBottom: spacing.md, marginTop: spacing.xl },
  sectionTitle: { fontSize: 18, fontWeight: typography.weight.extrabold as any, color: colors.text },
  seeAllText: { fontSize: 13, color: colors.primary, fontWeight: typography.weight.extrabold as any },
  recentCard: { marginHorizontal: spacing.lg, backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.sm, ...shadows.sm },
  recentCardH: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, width: 180, borderWidth: 1, borderColor: colors.border, ...shadows.sm, gap: spacing.sm },
  recentMonogram: { width: 40, height: 40, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  recentMonogramText: { fontSize: 13, fontWeight: typography.weight.extrabold as any, color: colors.surface },
  recentInfo: { flex: 1, gap: 4 },
  recentTitle: { fontSize: 15, fontWeight: typography.weight.extrabold as any, color: colors.text },
  recentTitleH: { fontSize: 14, fontWeight: typography.weight.extrabold as any, color: colors.text },
  recentStatus: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  recentDot: { width: 6, height: 6, borderRadius: 3 },
  recentStatusText: { fontSize: 12, fontWeight: typography.weight.semibold as any },
  mapCard: { marginHorizontal: spacing.lg, height: 220, borderRadius: radius.xl, overflow: 'hidden', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, ...shadows.sm },
  map: { ...StyleSheet.absoluteFillObject },
  mapPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.bg },
  mapPlaceholderText: { fontSize: 13, color: colors.textSecondary, textAlign: 'center', paddingHorizontal: spacing.lg },
  nearbyCountBadge: { backgroundColor: colors.primary, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4, minWidth: 28, alignItems: 'center' },
  nearbyCountText: { fontSize: 12, fontWeight: typography.weight.extrabold as any, color: colors.surface },
  providerMarker: { width: 16, height: 16, borderRadius: 8, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 2.5, ...shadows.sm },
  providerMarkerDot: { width: 7, height: 7, borderRadius: 4 },
  providerMarkerTail: { width: 0, height: 0, backgroundColor: 'transparent', borderStyle: 'solid', borderLeftWidth: 4, borderRightWidth: 4, borderTopWidth: 6, borderLeftColor: 'transparent', borderRightColor: 'transparent', alignSelf: 'center', marginTop: -2 },
  onlineBadge: { position: 'absolute', top: 12, left: 12, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: radius.lg, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, ...shadows.md },
  onlineDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.success },
  onlineText: { fontSize: 12, fontWeight: typography.weight.extrabold as any, color: colors.text },
  mapFab: { position: 'absolute', bottom: 12, right: 12, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.navy, paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.pill, ...shadows.md },
  mapFabText: { fontSize: 12, fontWeight: typography.weight.extrabold as any, color: colors.surface },
  catGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 14, gap: 10 },
  catCard: { width: '31%', backgroundColor: colors.surface, borderRadius: radius.lg, paddingVertical: spacing.lg, paddingHorizontal: spacing.sm, alignItems: 'center', borderWidth: 1, borderColor: colors.border, ...shadows.sm },
  catMonogram: { width: 48, height: 48, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm },
  catLabel: { fontSize: 12, fontWeight: typography.weight.semibold as any, color: colors.text, textAlign: 'center' },
})

export default withScreenBoundary(Home, 'Home')
