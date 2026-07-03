import { useEffect, useState, useCallback, useRef } from 'react'
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, TextInput, ActivityIndicator, RefreshControl, Alert, Platform } from 'react-native'
import { Image } from 'expo-image'
import BottomSheet from '../src/components/BottomSheet'
import MapView, { Marker, Circle, PROVIDER_DEFAULT } from 'react-native-maps'
import * as Location from 'expo-location'
import { router } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { apiGet, apiPostQueued, getBaseUrl } from '../src/api'
import { fetchWithCache, cacheClear } from '../src/storage'
import { connectSocket } from '../src/socket'
import { confirm } from '../src/confirm'
import { getProviderName } from '../src/user-profile'
import { withScreenBoundary } from '../src/components/withScreenBoundary'
import { SkeletonCard } from '../src/components/Skeleton'
import VoicePlayer from '../src/components/VoicePlayer'
import { loadCategories, getCategoryLabel, ServiceCategory } from '../src/categories'
import { useTranslation } from 'react-i18next'
import EmptyState from '../src/components/EmptyState'
import { colors, radius, spacing, typography, shadows } from '../src/design'

const RADIUS_KM = 10

const QUICK_PRICES = [5000, 10000, 15000, 25000]
const VALIDITY_OPTIONS: { mins: number; label: string }[] = [
  { mins: 5,   label: '5 min' },
  { mins: 15,  label: '15 min' },
  { mins: 30,  label: '30 min' },
  { mins: 60,  label: '1 h' },
  { mins: 120, label: '2 h' },
  { mins: 240, label: '4 h' },
]

type ViewMode = 'map' | 'list'

function NearbyRequests() {
  const [items, setItems] = useState<any[]>([])
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [viewMode, setViewMode] = useState<ViewMode>('map')

  const [selected, setSelected] = useState<any | null>(null)
  const [price, setPrice] = useState('')
  const [eta, setEta] = useState('30')
  const [comment, setComment] = useState('')
  const [validityMinutes, setValidityMinutes] = useState<number>(30)
  const [travelIncluded, setTravelIncluded] = useState(true)
  const [materialIncluded, setMaterialIncluded] = useState(false)
  const [availableNow, setAvailableNow] = useState(true)
  const [sending, setSending] = useState(false)
  const [sentId, setSentId] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)

  const { t, i18n } = useTranslation()
  const [catMap, setCatMap] = useState<Record<string, { abbr: string; color: string; label: string }>>({})

  useEffect(() => {
    loadCategories().then(cats => {
      const m: Record<string, { abbr: string; color: string; label: string }> = {}
      cats.forEach(c => { m[c.slug] = { abbr: c.abbr, color: c.color, label: getCategoryLabel(c, i18n.language) } })
      setCatMap(m)
    }).catch(() => {})
  }, [])

  const mapRef = useRef<MapView>(null)
  const lastCoordsRef = useRef<{ lat: number; lng: number } | null>(null)

  const locate = async (): Promise<{ lat: number; lng: number } | null> => {
    const { status } = await Location.requestForegroundPermissionsAsync()
    if (status !== 'granted') {
      Alert.alert(t('nearby.permissionRequired'), t('nearby.permissionMsg'))
      return lastCoordsRef.current
    }

    // 1) Essayer instantanément la dernière position connue par l'OS (rapide, parfois imprécise)
    let first: { lat: number; lng: number } | null = null
    try {
      const last = await Location.getLastKnownPositionAsync({ maxAge: 5 * 60_000, requiredAccuracy: 1000 })
      if (last) {
        first = { lat: last.coords.latitude, lng: last.coords.longitude }
        setCoords(first)
        lastCoordsRef.current = first
      }
    } catch {}

    // 2) Affiner avec une mesure GPS précise (timeout généreux 15 s)
    try {
      const pos = await Promise.race([
        Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High }),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Timeout GPS')), 15000)),
      ])
      const fine = { lat: pos.coords.latitude, lng: pos.coords.longitude }
      setCoords(fine)
      lastCoordsRef.current = fine
      return fine
    } catch (e: any) {
      // Si on a déjà eu la "last known", on garde celle-là. Sinon on signale l'erreur.
      if (first) return first
      if (lastCoordsRef.current) return lastCoordsRef.current
      setErr(t('nearby.locationError'))
      return null
    }
  }

  const load = useCallback(async (c?: { lat: number; lng: number } | null, isRefresh = false) => {
    const target = c ?? coords
    if (!target) return
    const key = `nearby-${Math.round(target.lat * 10)}-${Math.round(target.lng * 10)}`
    if (isRefresh) {
      setRefreshing(true)
      await cacheClear(key)
    } else {
      setLoading(true)
    }
    setErr(null)
    try {
      await fetchWithCache(
        key,
        () => apiGet(`/api/services/matching?lng=${target.lng}&lat=${target.lat}&radiusKm=${RADIUS_KM}&excludeMine=true`).then(r => r.items || []),
        (items, fromCache) => {
          setItems(items)
          if (!fromCache) {
            setLoading(false)
            setRefreshing(false)
          }
        },
        2 * 60 * 1000 // 2 min TTL pour les demandes proches
      )
    } catch (e: any) {
      const msg = e?.message || String(e)
      setErr(t('nearby.loadError', { msg }))
      setLoading(false)
      setRefreshing(false)
    }
  }, [coords])

  useEffect(() => {
    (async () => { const c = await locate(); await load(c) })()
  }, [])

  // Refs stables pour éviter de réabonner les listeners à chaque changement de coords/load
  const coordsRef = useRef(coords)
  const loadRef = useRef(load)
  useEffect(() => { coordsRef.current = coords }, [coords])
  useEffect(() => { loadRef.current = load }, [load])

  // WebSocket: connexion + écouter acceptation d'offre + nouvelles demandes
  useEffect(() => {
    const socket = connectSocket()
    const handleAccepted = (_data: any) => {
      Alert.alert(t('nearby.offerAccepted'), t('nearby.offerAcceptedMsg'))
      const c = coordsRef.current
      if (c) cacheClear(`nearby-${Math.round(c.lat * 10)}-${Math.round(c.lng * 10)}`)
    }
    const handleRequestNew = (_data: any) => {
      // Reload silencieux (pas de popup bloquante)
      const c = coordsRef.current
      if (c) loadRef.current(c, true)
    }
    socket.on('offer:accepted', handleAccepted)
    socket.on('request:new', handleRequestNew)
    socket.on('request:nearby', handleRequestNew)
    return () => {
      socket.off('offer:accepted', handleAccepted)
      socket.off('request:new', handleRequestNew)
      socket.off('request:nearby', handleRequestNew)
    }
  }, [])

  const sendOffer = async () => {
    if (!selected || !price) return
    setSending(true)
    setErr(null)
    try {
      const r = await apiPostQueued('/api/services/offers', {
        requestId: selected._id,
        price: Number(price.replace(/\s/g, '')),
        etaMinutes: Number(eta) || 30,
        comment,
        validityMinutes,
        providerName: getProviderName(),
        travelIncluded,
        materialIncluded,
        availableNow,
      }, t('nearby.offerQueuedOffline'))
      setSentId(selected._id)
      setSelected(null)
      setPrice(''); setComment(''); setEta('30'); setValidityMinutes(30); setTravelIncluded(true); setMaterialIncluded(false); setAvailableNow(true)
      if (r) setItems(prev => prev.filter(it => it._id !== selected._id))
    } catch (e: any) { setErr(t('nearby.sendError', { msg: e.message })) }
    setSending(false)
  }

  const distLabel = (m?: number) => {
    if (!m) return ''
    return m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(1)} km`
  }

  // Zoom serré: ~0.04 ≈ couvre environ 4-5 km. (RADIUS_KM*0.018 = 0.18 → trop large)
  const mapRegion = coords ? {
    latitude: coords.lat,
    longitude: coords.lng,
    latitudeDelta: 0.04,
    longitudeDelta: 0.04,
  } : undefined

  // Recentre automatiquement la map quand la position est affinée
  useEffect(() => {
    if (mapRegion && mapRef.current) {
      mapRef.current.animateToRegion(mapRegion, 600)
    }
  }, [coords?.lat, coords?.lng])

  return (
    <SafeAreaView style={s.safe}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Text style={s.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={s.title}>{t('nearby.title')}</Text>
        <TouchableOpacity onPress={async () => { const c = await locate(); await load(c, true) }} style={s.refreshBtn}>
          <Text style={s.refreshIcon}>↻</Text>
        </TouchableOpacity>
      </View>

      {/* Toggle Carte / Liste */}
      <View style={s.toggleBar}>
        <TouchableOpacity
          style={[s.toggleBtn, viewMode === 'map' && s.toggleBtnActive]}
          onPress={() => setViewMode('map')}
        >
          <Text style={[s.toggleTxt, viewMode === 'map' && s.toggleTxtActive]}>{t('nearby.map')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.toggleBtn, viewMode === 'list' && s.toggleBtnActive]}
          onPress={() => setViewMode('list')}
        >
          <Text style={[s.toggleTxt, viewMode === 'list' && s.toggleTxtActive]}>
            {t('nearby.list')} {items.length > 0 ? `(${items.length})` : ''}
          </Text>
        </TouchableOpacity>
      </View>

      {sentId && (
        <View style={s.successBanner}>
          <View style={s.successDot} />
          <Text style={s.successText}>{t('nearby.offerSent')}</Text>
        </View>
      )}

      {loading ? (
        <ScrollView contentContainerStyle={s.list}>
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </ScrollView>
      ) : err ? (
        <View style={s.center}>
          <Text style={s.errText}>{err}</Text>
          <TouchableOpacity style={s.retryBtn} onPress={() => load()}>
            <Text style={s.retryTxt}>{t('common.retry')}</Text>
          </TouchableOpacity>
        </View>
      ) : viewMode === 'map' ? (
        /* ── VUE CARTE ── */
        <View style={s.mapContainer}>
          {Platform.OS === 'web' ? (
            <View style={s.center}>
              <Text style={s.emptyTitle}>{t('nearby.mapWeb')}</Text>
              <Text style={s.emptyText}>{t('nearby.mapWebSub')}</Text>
              <TouchableOpacity style={s.retryBtn} onPress={() => setViewMode('list')}>
                <Text style={s.retryTxt}>{t('nearby.viewList')}</Text>
              </TouchableOpacity>
            </View>
          ) : coords && mapRegion ? (
            <>
              <MapView
                ref={mapRef}
                style={s.map}
                provider={PROVIDER_DEFAULT}
                initialRegion={mapRegion}
                showsUserLocation
                showsMyLocationButton={false}
                showsCompass={false}
              >
                {/* Cercle de la zone autorisée */}
                <Circle
                  center={{ latitude: coords.lat, longitude: coords.lng }}
                  radius={RADIUS_KM * 1000}
                  strokeColor="rgba(5,150,105,0.6)"
                  strokeWidth={2}
                  fillColor="rgba(5,150,105,0.06)"
                />

                {/* Marqueurs des demandes */}
                {items.map(it => {
                  const loc = it.location?.coordinates
                  if (!loc || loc.length < 2) return null
                  const color = catMap[it.category]?.color || '#475569'
                  const abbr = catMap[it.category]?.abbr || it.category?.slice(0, 2).toUpperCase()
                  return (
                    <Marker
                      key={it._id}
                      coordinate={{ latitude: loc[1], longitude: loc[0] }}
                      onPress={() => { setSelected(it); setSentId(null) }}
                    >
                      <View style={[s.mapMarker, { backgroundColor: color }]}>
                        <Text style={s.mapMarkerText}>{abbr}</Text>
                      </View>
                      <View style={[s.mapMarkerTail, { borderTopColor: color }]} />
                    </Marker>
                  )
                })}
              </MapView>

              {/* Légende */}
              <View style={s.mapLegend}>
                <View style={s.legendDot} />
                <Text style={s.legendText}>{t('nearby.legend', { radius: RADIUS_KM, count: items.length })}</Text>
              </View>

              {/* Recentrer */}
              <TouchableOpacity
                style={s.recenterBtn}
                onPress={() => mapRef.current?.animateToRegion(mapRegion, 400)}
              >
                <Text style={s.recenterIcon}>◎</Text>
              </TouchableOpacity>
            </>
          ) : (
            <View style={s.center}>
              <ActivityIndicator size="large" color="#059669" />
              <Text style={s.loadingText}>{t('nearby.locating')}</Text>
            </View>
          )}
        </View>
      ) : (
        /* ── VUE LISTE ── */
        <ScrollView
          contentContainerStyle={s.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(null, true)} tintColor="#059669" />}
        >
          {items.length === 0 && (
            <EmptyState
              icon="📍"
              title={t('nearby.noRequests')}
              subtitle={t('nearby.noRequestsSub')}
            />
          )}

          {items.map(it => (
            <TouchableOpacity key={it._id} style={s.card} activeOpacity={0.88} onPress={() => { setSelected(it); setSentId(null) }}>
              <View style={s.cardHead}>
                <View style={s.catRow}>
                  <View style={[s.catMonogram, { backgroundColor: catMap[it.category]?.color || '#475569' }]}>
                    <Text style={s.catMonogramText}>{catMap[it.category]?.abbr || it.category?.slice(0,2).toUpperCase()}</Text>
                  </View>
                  <Text style={s.catText}>{catMap[it.category]?.label || it.category}</Text>
                </View>
                <View style={s.distBadge}>
                  <Text style={s.distText}>{distLabel(it._distance)}</Text>
                </View>
              </View>
              {it.description ? <Text style={s.desc} numberOfLines={2}>{it.description}</Text> : null}
              {it.media?.filter((m: any) => m.type === 'image').length > 0 && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 6 }}>
                  {it.media.filter((m: any) => m.type === 'image').map((m: any, i: number) => {
                    const uri = m.url?.startsWith('http') ? m.url : getBaseUrl() + m.url
                    return (
                      <Image
                        key={i}
                        source={{ uri }}
                        style={{ width: 80, height: 80, borderRadius: 8, marginRight: 6, backgroundColor: '#F1F5F9' }}
                      />
                    )
                  })}
                </ScrollView>
              )}
              {it.media?.some((m: any) => m.type === 'audio') && (() => {
                const audioUrl = it.media.find((m: any) => m.type === 'audio').url
                const fullUri = audioUrl.startsWith('http') ? audioUrl : getBaseUrl() + audioUrl
                return <VoicePlayer uri={fullUri} />
              })()}
              <View style={s.cardFoot}>
                {it.budget ? <Text style={s.budget}>{t('nearby.budget', { amount: Number(it.budget).toLocaleString('fr-FR') })}</Text> : <Text style={s.budgetNone}>{t('nearby.budgetNone')}</Text>}
                <TouchableOpacity style={s.offerChip} onPress={() => { setSelected(it); setSentId(null) }}>
                  <Text style={s.offerChipText}>{t('nearby.makeOffer')}</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Bottom sheet offre */}
      <BottomSheet visible={!!selected} onClose={() => setSelected(null)}>
        <View style={s.modalHeader}>
          <TouchableOpacity onPress={() => setSelected(null)} style={s.modalBackBtn}>
            <Text style={s.modalBackIcon}>←</Text>
          </TouchableOpacity>
          <Text style={s.modalTitle}>Faire une offre</Text>
          <TouchableOpacity onPress={() => setSelected(null)} style={s.modalCloseBtn}>
            <Text style={s.modalCloseIcon}>×</Text>
          </TouchableOpacity>
        </View>

        <ScrollView bounces={false} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 24 }}>
          {selected && (
            <View style={s.modalRecap}>
              <View style={s.modalCatRow}>
                <View style={[s.modalCatIcon, { backgroundColor: catMap[selected.category]?.color || '#475569' }]}>
                  <Text style={s.modalCatIconText}>{catMap[selected.category]?.abbr || selected.category?.slice(0,2).toUpperCase()}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.modalCatName}>{catMap[selected.category]?.label || selected.category}</Text>
                  <Text style={s.modalCatMeta}>Médina · {selected._distance ? distLabel(selected._distance) : 'À proximité'}</Text>
                </View>
              </View>
              <View style={s.modalBudgetRow}>
                <Text style={s.modalBudgetLabel}>Budget client</Text>
                <Text style={s.modalBudgetValue}>{selected.budget ? `${Number(selected.budget).toLocaleString('fr-FR')} FCFA` : 'Non précisé'}</Text>
              </View>
            </View>
          )}

          {/* Prix */}
          <Text style={s.modalSectionLabel}>Votre prix</Text>
          <View style={s.priceInputRow}>
            <TouchableOpacity style={s.priceAdjustBtn} onPress={() => setPrice(String(Math.max(0, (Number(price) || 0) - 1000)))}>
              <Text style={s.priceAdjustBtnText}>−</Text>
            </TouchableOpacity>
            <View style={s.priceDisplay}>
              <Text style={s.priceDisplayText}>{Number(price || 0).toLocaleString('fr-FR')}</Text>
              <Text style={s.priceDisplayUnit}>FCFA</Text>
            </View>
            <TouchableOpacity style={s.priceAdjustBtn} onPress={() => setPrice(String((Number(price) || 0) + 1000))}>
              <Text style={s.priceAdjustBtnText}>+</Text>
            </TouchableOpacity>
          </View>
          <Text style={s.priceHint}>Prix moyen constaté : 8 000 - 15 000 FCFA</Text>

          <Text style={s.modalSectionLabel}>Délai d'arrivée</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
            {['15', '30', '60', 'Autre'].map(v => {
              const isActive = v === 'Autre' ? !['15', '30', '60'].includes(eta) : eta === v
              return (
                <TouchableOpacity
                  key={v}
                  style={[s.etaChip, isActive && s.etaChipActive]}
                  onPress={() => setEta(v === 'Autre' ? '' : v)}
                >
                  <Text style={[s.etaChipText, isActive && s.etaChipTextActive]}>{v === 'Autre' ? 'Autre' : `${v} min`}</Text>
                </TouchableOpacity>
              )
            })}
          </View>

          <Text style={s.modalSectionLabel}>Message au client (optionnel)</Text>
          <TextInput style={s.textarea} value={comment} onChangeText={setComment} placeholder="Précisez votre offre..." multiline placeholderTextColor={colors.textMuted} />

          {/* Options */}
          <Text style={s.modalSectionLabel}>Options</Text>
          <View style={s.optionRow}>
            <Text style={s.optionLabel}>Déplacement inclus</Text>
            <TouchableOpacity style={[s.optionSwitch, travelIncluded && s.optionSwitchActive]} onPress={() => setTravelIncluded(v => !v)}>
              <View style={[s.optionSwitchThumb, travelIncluded && s.optionSwitchThumbActive]} />
            </TouchableOpacity>
          </View>
          <View style={s.optionRow}>
            <Text style={s.optionLabel}>Matériel inclus</Text>
            <TouchableOpacity style={[s.optionSwitch, materialIncluded && s.optionSwitchActive]} onPress={() => setMaterialIncluded(v => !v)}>
              <View style={[s.optionSwitchThumb, materialIncluded && s.optionSwitchThumbActive]} />
            </TouchableOpacity>
          </View>
          <View style={s.optionRow}>
            <Text style={s.optionLabel}>Disponible immédiatement</Text>
            <TouchableOpacity style={[s.optionSwitch, availableNow && s.optionSwitchActive]} onPress={() => setAvailableNow(v => !v)}>
              <View style={[s.optionSwitchThumb, availableNow && s.optionSwitchThumbActive]} />
            </TouchableOpacity>
          </View>

          {/* Sécurité */}
          <View style={s.secureBox}>
            <Text style={s.secureIcon}>S</Text>
            <Text style={s.secureText}>Paiement sécurisé via Xeuy</Text>
          </View>

          {err && <Text style={s.errText}>{err}</Text>}

          <View style={{ height: 24 }} />
        </ScrollView>

        <TouchableOpacity style={[s.sendOfferBtn, (!price || sending) && s.sendOfferBtnDisabled]} disabled={!price || sending} onPress={sendOffer}>
          {sending ? <ActivityIndicator color={colors.surface} size="small" /> : <Text style={s.sendOfferBtnText}>Envoyer l'offre</Text>}
        </TouchableOpacity>
      </BottomSheet>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingVertical: spacing.md, gap: spacing.md, backgroundColor: colors.surface },
  backBtn: { width: 40, height: 40, borderRadius: radius.md, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
  backIcon: { fontSize: 18, color: colors.text, fontWeight: typography.weight.extrabold as any },
  title: { flex: 1, fontSize: 18, fontWeight: typography.weight.extrabold as any, color: colors.text },
  refreshBtn: { width: 40, height: 40, borderRadius: radius.md, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
  refreshIcon: { fontSize: 18, color: colors.text, fontWeight: typography.weight.extrabold as any },
  toggleBar: { flexDirection: 'row', backgroundColor: colors.bg, margin: spacing.md, borderRadius: radius.lg, padding: 3, gap: 3 },
  toggleBtn: { flex: 1, paddingVertical: 9, alignItems: 'center', borderRadius: radius.md },
  toggleBtnActive: { backgroundColor: colors.surface, ...shadows.sm },
  toggleTxt: { fontSize: 14, fontWeight: typography.weight.semibold as any, color: colors.textSecondary },
  toggleTxtActive: { color: colors.text },
  successBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: spacing.md, marginBottom: 8, backgroundColor: colors.successLight, borderRadius: radius.lg, padding: spacing.md, borderWidth: 1, borderColor: '#BBF7D0' },
  successDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.success },
  successText: { color: colors.success, fontWeight: typography.weight.extrabold as any, fontSize: 13 },
  mapContainer: { flex: 1 },
  map: { flex: 1 },
  mapMarker: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', borderWidth: 2.5, borderColor: colors.surface, ...shadows.md },
  mapMarkerText: { fontSize: 10, fontWeight: typography.weight.extrabold as any, color: colors.surface },
  mapMarkerTail: { width: 0, height: 0, borderLeftWidth: 6, borderRightWidth: 6, borderTopWidth: 8, borderLeftColor: 'transparent', borderRightColor: 'transparent', alignSelf: 'center', marginTop: -1 },
  mapLegend: { position: 'absolute', top: 12, left: 12, backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: radius.lg, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, flexDirection: 'row', alignItems: 'center', gap: 6, ...shadows.md },
  legendDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.success, opacity: 0.7 },
  legendText: { fontSize: 12, fontWeight: typography.weight.extrabold as any, color: colors.text },
  recenterBtn: { position: 'absolute', bottom: 24, right: 16, width: 44, height: 44, borderRadius: 22, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', ...shadows.md },
  recenterIcon: { fontSize: 20, color: colors.success },
  loadingText: { fontSize: 13, color: colors.textSecondary, marginTop: 8 },
  list: { padding: spacing.md, gap: spacing.md, paddingBottom: 32 },
  card: { backgroundColor: colors.surface, borderRadius: radius.xl, padding: spacing.lg, gap: 10, borderWidth: 1, borderColor: colors.border, ...shadows.sm },
  cardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  catRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  catMonogram: { width: 36, height: 36, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  catMonogramText: { fontSize: 12, fontWeight: typography.weight.extrabold as any, color: colors.surface },
  catText: { fontSize: 15, fontWeight: typography.weight.extrabold as any, color: colors.text, textTransform: 'capitalize' },
  distBadge: { backgroundColor: colors.bg, borderRadius: radius.sm, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderWidth: 1, borderColor: colors.border },
  distText: { fontSize: 11, color: colors.textSecondary, fontWeight: typography.weight.extrabold as any },
  desc: { fontSize: 14, color: colors.textSecondary, lineHeight: 20 },
  cardFoot: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.bg },
  budget: { fontSize: 14, fontWeight: typography.weight.extrabold as any, color: colors.text },
  budgetNone: { fontSize: 14, color: colors.textMuted },
  offerChip: { backgroundColor: colors.navy, borderRadius: radius.md, paddingHorizontal: 18, paddingVertical: 9 },
  offerChipText: { color: colors.surface, fontSize: 13, fontWeight: typography.weight.extrabold as any },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 32 },
  errText: { color: colors.danger, fontSize: 13, textAlign: 'center' },
  retryBtn: { paddingHorizontal: 24, paddingVertical: 12, backgroundColor: colors.navy, borderRadius: radius.lg },
  retryTxt: { color: colors.surface, fontWeight: typography.weight.extrabold as any },
  empty: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyTitle: { fontSize: 18, fontWeight: typography.weight.extrabold as any, color: colors.text },
  emptyText: { fontSize: 13, color: colors.textMuted, textAlign: 'center', lineHeight: 20 },
  // Modal offre
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.lg },
  modalBackBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
  modalBackIcon: { fontSize: 18, color: colors.text },
  modalCloseBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
  modalCloseIcon: { fontSize: 24, color: colors.text, lineHeight: 24 },
  modalTitle: { flex: 1, textAlign: 'center', fontSize: 18, fontWeight: typography.weight.extrabold as any, color: colors.text },
  modalRecap: { backgroundColor: colors.bg, borderRadius: radius.xl, padding: spacing.md, gap: spacing.md, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.lg },
  modalCatRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  modalCatIcon: { width: 44, height: 44, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  modalCatIconText: { fontSize: 14, fontWeight: typography.weight.extrabold as any, color: colors.surface },
  modalCatName: { fontSize: 16, fontWeight: typography.weight.extrabold as any, color: colors.text, textTransform: 'capitalize' },
  modalCatMeta: { fontSize: 13, color: colors.textSecondary, marginTop: 1 },
  modalBudgetRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border },
  modalBudgetLabel: { fontSize: 13, color: colors.textSecondary },
  modalBudgetValue: { fontSize: 14, fontWeight: typography.weight.extrabold as any, color: colors.text },
  modalSectionLabel: { fontSize: 14, fontWeight: typography.weight.extrabold as any, color: colors.text, marginBottom: spacing.md, marginTop: spacing.lg },
  priceInputRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md, marginBottom: spacing.sm },
  priceAdjustBtn: { width: 48, height: 48, borderRadius: radius.lg, backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  priceAdjustBtnText: { fontSize: 24, color: colors.text, fontWeight: typography.weight.extrabold as any },
  priceDisplay: { flex: 1, alignItems: 'center' },
  priceDisplayText: { fontSize: 32, fontWeight: typography.weight.extrabold as any, color: colors.text },
  priceDisplayUnit: { fontSize: 14, color: colors.textSecondary, fontWeight: typography.weight.extrabold as any },
  priceHint: { fontSize: 12, color: colors.textMuted, textAlign: 'center', marginBottom: spacing.md },
  etaChip: { paddingVertical: 10, paddingHorizontal: 18, borderRadius: radius.pill, backgroundColor: colors.bg, borderWidth: 1.5, borderColor: colors.border },
  etaChipActive: { backgroundColor: colors.primaryLight, borderColor: colors.primary },
  etaChipText: { fontSize: 13, fontWeight: typography.weight.extrabold as any, color: colors.textSecondary },
  etaChipTextActive: { color: colors.primary },
  textarea: { borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.lg, padding: spacing.md, fontSize: 15, color: colors.text, minHeight: 90, textAlignVertical: 'top', backgroundColor: colors.bg },
  optionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  optionLabel: { fontSize: 15, color: colors.text, fontWeight: typography.weight.semibold as any },
  optionSwitch: { width: 50, height: 28, borderRadius: 14, backgroundColor: colors.border, padding: 2 },
  optionSwitchActive: { backgroundColor: colors.primary },
  optionSwitchThumb: { width: 24, height: 24, borderRadius: 12, backgroundColor: colors.surface },
  optionSwitchThumbActive: { transform: [{ translateX: 22 }] },
  secureBox: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.infoLight, borderRadius: radius.lg, padding: spacing.md, marginTop: spacing.lg },
  secureIcon: { width: 24, height: 24, borderRadius: 12, backgroundColor: colors.info, color: colors.surface, textAlign: 'center', lineHeight: 24, fontSize: 12, fontWeight: typography.weight.extrabold as any },
  secureText: { flex: 1, fontSize: 13, color: colors.info, fontWeight: typography.weight.extrabold as any },
  sendOfferBtn: { backgroundColor: colors.primary, borderRadius: radius.xl, padding: spacing.lg, alignItems: 'center', marginTop: spacing.md },
  sendOfferBtnDisabled: { opacity: 0.45 },
  sendOfferBtnText: { color: colors.surface, fontSize: 16, fontWeight: typography.weight.extrabold as any },
})

export default withScreenBoundary(NearbyRequests, 'NearbyRequests')
