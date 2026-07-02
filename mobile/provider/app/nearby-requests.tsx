import { useEffect, useState, useCallback, useRef } from 'react'
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, TextInput, ActivityIndicator, RefreshControl, Alert, Platform, Switch, Animated } from 'react-native'
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

function NearbyRequests() {
  const [items, setItems] = useState<any[]>([])
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [shareLocation, setShareLocation] = useState(false)
  const [sheetExpanded, setSheetExpanded] = useState(false)

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

  // Partage de position : met à jour la position toutes les 30s et recharge les demandes
  useEffect(() => {
    if (!shareLocation || !coords) return
    let mounted = true
    const interval = setInterval(async () => {
      try {
        const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })
        const c = { lat: pos.coords.latitude, lng: pos.coords.longitude }
        if (mounted) {
          setCoords(c)
          lastCoordsRef.current = c
          loadRef.current(c, true)
        }
      } catch {}
    }, 30_000)
    return () => { mounted = false; clearInterval(interval) }
  }, [shareLocation, coords])

  const sendOffer = async () => {
    if (!selected || !price) return
    setSending(true)
    setErr(null)
    const parts = [comment, travelIncluded ? t('nearby.travelIncluded') : '', materialIncluded ? t('nearby.materialIncluded') : '', availableNow ? t('nearby.availableNow') : ''].filter(Boolean)
    const fullComment = parts.join(' — ')
    try {
      const r = await apiPostQueued('/api/services/offers', {
        requestId: selected._id,
        price: Number(price.replace(/\s/g, '')),
        etaMinutes: Number(eta) || 30,
        comment: fullComment,
        validityMinutes,
        providerName: getProviderName(),
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
      {/* Header InDriver */}
      <View style={s.header}>
        <View>
          <Text style={s.title}>{t('nearby.title')}</Text>
          <View style={s.onlineRow}>
            <View style={[s.onlineDot, { backgroundColor: shareLocation ? '#16A34A' : '#94A3B8' }]} />
            <Text style={s.onlineLabel}>{shareLocation ? t('nearby.online') : t('nearby.offline')}</Text>
          </View>
        </View>
        <View style={s.headerActions}>
          <View style={s.shareBox}>
            <Switch
              value={shareLocation}
              onValueChange={setShareLocation}
              trackColor={{ false: '#E2E8F0', true: '#BBF7D0' }}
              thumbColor={shareLocation ? '#16A34A' : '#94A3B8'}
              ios_backgroundColor="#E2E8F0"
            />
          </View>
          <TouchableOpacity onPress={async () => { const c = await locate(); await load(c, true) }} style={s.refreshBtn}>
            <Text style={s.refreshIcon}>↻</Text>
          </TouchableOpacity>
        </View>
      </View>

      {sentId && (
        <View style={s.successBanner}>
          <View style={s.successDot} />
          <Text style={s.successText}>{t('nearby.offerSent')}</Text>
        </View>
      )}

      {err && !loading ? (
        <View style={s.center}>
          <Text style={s.errText}>{err}</Text>
          <TouchableOpacity style={s.retryBtn} onPress={() => load()}>
            <Text style={s.retryTxt}>{t('common.retry')}</Text>
          </TouchableOpacity>
        </View>
      ) : loading && items.length === 0 ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color="#059669" />
          <Text style={s.loadingText}>{t('nearby.locating')}</Text>
        </View>
      ) : (
        <View style={s.mapContainer}>
          {Platform.OS === 'web' ? (
            <View style={s.center}>
              <Text style={s.emptyTitle}>{t('nearby.mapWeb')}</Text>
              <Text style={s.emptyText}>{t('nearby.mapWebSub')}</Text>
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
                <Circle
                  center={{ latitude: coords.lat, longitude: coords.lng }}
                  radius={RADIUS_KM * 1000}
                  strokeColor="rgba(5,150,105,0.6)"
                  strokeWidth={2}
                  fillColor="rgba(5,150,105,0.06)"
                />
                {items.map(it => {
                  const loc = it.location?.coordinates
                  if (!loc || loc.length < 2) return null
                  const color = catMap[it.category]?.color || '#475569'
                  const abbr = catMap[it.category]?.abbr || it.category?.slice(0, 2).toUpperCase()
                  return (
                    <Marker
                      key={it._id}
                      coordinate={{ latitude: loc[1], longitude: loc[0] }}
                      onPress={() => { setSelected(it); setSentId(null); setSheetExpanded(false) }}
                    >
                      <View style={s.markerContainer}>
                        <View style={[s.mapMarker, { backgroundColor: color }]}>
                          <Text style={s.mapMarkerText}>{abbr}</Text>
                        </View>
                        <View style={[s.mapMarkerTail, { borderTopColor: color }]} />
                      </View>
                    </Marker>
                  )
                })}
              </MapView>

              <View style={s.mapLegend}>
                <View style={s.legendDot} />
                <Text style={s.legendText}>{t('nearby.legend', { radius: RADIUS_KM, count: items.length })}</Text>
              </View>

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
      )}

      {/* Bottom sheet liste des demandes */}
      {!err && items.length > 0 && (
        <View style={[s.sheet, sheetExpanded && s.sheetExpanded]}>
          <TouchableOpacity activeOpacity={1} onPress={() => setSheetExpanded(!sheetExpanded)} style={s.sheetHandleRow}>
            <View style={s.sheetHandle} />
          </TouchableOpacity>
          <View style={s.sheetHeader}>
            <Text style={s.sheetTitle}>{t('nearby.listTitle')} ({items.length})</Text>
            <TouchableOpacity onPress={() => setSheetExpanded(!sheetExpanded)}>
              <Text style={s.sheetToggle}>{sheetExpanded ? '⌃' : '⌄'}</Text>
            </TouchableOpacity>
          </View>
          <ScrollView
            horizontal={!sheetExpanded}
            showsHorizontalScrollIndicator={false}
            showsVerticalScrollIndicator={false}
            refreshControl={sheetExpanded ? <RefreshControl refreshing={refreshing} onRefresh={() => load(null, true)} tintColor="#059669" /> : undefined}
            contentContainerStyle={sheetExpanded ? s.sheetListVertical : s.sheetListHorizontal}
          >
            {items.map(it => (
              <TouchableOpacity
                key={it._id}
                style={sheetExpanded ? s.sheetCardVertical : s.sheetCardHorizontal}
                activeOpacity={0.88}
                onPress={() => { setSelected(it); setSentId(null); setSheetExpanded(false) }}
              >
                <View style={s.sheetCardTop}>
                  <View style={s.catRow}>
                    <View style={[s.sheetCatMonogram, { backgroundColor: catMap[it.category]?.color || '#475569' }]}>
                      <Text style={s.sheetCatMonogramText}>{catMap[it.category]?.abbr || it.category?.slice(0,2).toUpperCase()}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.sheetCatText} numberOfLines={1}>{catMap[it.category]?.label || it.category}</Text>
                      <Text style={s.sheetDist}>{distLabel(it._distance)}</Text>
                    </View>
                  </View>
                  <Text style={s.sheetBudget}>{it.budget ? t('nearby.budget', { amount: Number(it.budget).toLocaleString('fr-FR') }) : t('nearby.budgetNone')}</Text>
                </View>
                {it.description ? <Text style={s.sheetDesc} numberOfLines={sheetExpanded ? 2 : 1}>{it.description}</Text> : null}
                <TouchableOpacity style={s.sheetOfferBtn} onPress={() => { setSelected(it); setSentId(null); setSheetExpanded(false) }}>
                  <Text style={s.sheetOfferBtnText}>{t('nearby.makeOffer')}</Text>
                </TouchableOpacity>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {!err && items.length === 0 && !loading && (
        <View style={s.emptySheet}>
          <EmptyState
            icon=""
            title={t('nearby.noRequests')}
            subtitle={t('nearby.noRequestsSub')}
          />
        </View>
      )}

      {/* Bottom sheet offre style inDrive */}
      <BottomSheet visible={!!selected} onClose={() => setSelected(null)}>
        {/* Header modal */}
        <View style={s.offerHeader}>
          <TouchableOpacity onPress={() => setSelected(null)} style={s.offerBackBtn}>
            <Text style={s.offerBackIcon}>←</Text>
          </TouchableOpacity>
          <Text style={s.offerTitle}>{t('nearby.makeOffer')}</Text>
          <TouchableOpacity onPress={() => setSelected(null)} style={s.offerCloseBtn}>
            <Text style={s.offerCloseIcon}>×</Text>
          </TouchableOpacity>
        </View>

        {selected && (
          <View style={s.offerRecap}>
            <View style={s.offerRecapLeft}>
              <View style={[s.offerRecapMono, { backgroundColor: catMap[selected.category]?.color || '#475569' }]}>
                <Text style={s.offerRecapMonoText}>{catMap[selected.category]?.abbr || selected.category?.slice(0,2).toUpperCase()}</Text>
              </View>
              <View>
                <Text style={s.offerRecapCat}>{catMap[selected.category]?.label || selected.category}</Text>
                <Text style={s.offerRecapMeta}>{selected._distance ? t('nearby.distFromYou', { dist: distLabel(selected._distance) }) : ''}</Text>
              </View>
            </View>
            <Text style={s.offerRecapBudget}>{selected.budget ? t('nearby.clientBudget', { amount: Number(selected.budget).toLocaleString('fr-FR') }) : ''}</Text>
          </View>
        )}

        {/* Gros prix central */}
        <View style={s.priceBlock}>
          <Text style={s.priceLabel}>{t('nearby.priceLabel')}</Text>
          <View style={s.priceInputRow}>
            <TouchableOpacity style={s.priceAdjust} onPress={() => setPrice(String(Math.max(0, (Number(price.replace(/\s/g, '')) || 0) - 500)))}>
              <Text style={s.priceAdjustText}>−</Text>
            </TouchableOpacity>
            <View style={s.priceDisplay}>
              <Text style={s.priceValue}>{price ? Number(price.replace(/\s/g, '')).toLocaleString('fr-FR') : '0'}</Text>
              <Text style={s.priceCurrency}>FCFA</Text>
            </View>
            <TouchableOpacity style={s.priceAdjust} onPress={() => setPrice(String((Number(price.replace(/\s/g, '')) || 0) + 500))}>
              <Text style={s.priceAdjustText}>+</Text>
            </TouchableOpacity>
          </View>
          {selected?.budget && (
            <Text style={s.priceHint}>{t('nearby.avgPriceHint', { min: Math.round(Number(selected.budget) * 0.8).toLocaleString('fr-FR'), max: Math.round(Number(selected.budget) * 1.5).toLocaleString('fr-FR') })}</Text>
          )}
          <TextInput style={s.priceInput} value={price} onChangeText={setPrice} keyboardType="numeric" placeholder="0" placeholderTextColor="#9CA3AF" />
        </View>

        {/* Délai pills */}
        <Text style={s.offerSectionLabel}>{t('nearby.etaLabel')}</Text>
        <View style={s.etaRow}>
          {['15', '30', '60', 'other'].map(v => (
            <TouchableOpacity
              key={v}
              style={[s.etaPill, eta === v && s.etaPillActive]}
              onPress={() => setEta(v === 'other' ? '' : v)}
            >
              <Text style={[s.etaPillText, eta === v && s.etaPillTextActive]}>{v === 'other' ? t('nearby.otherEta') : `${v} min`}</Text>
            </TouchableOpacity>
          ))}
        </View>
        {eta === 'other' || eta === '' ? (
          <TextInput style={s.input} value={eta === 'other' ? '' : eta} onChangeText={setEta} keyboardType="numeric" placeholder={t('nearby.etaPlaceholder')} placeholderTextColor="#9CA3AF" />
        ) : null}

        {/* Options */}
        <Text style={s.offerSectionLabel}>{t('nearby.options')}</Text>
        <View style={s.optionRow}>
          <View style={s.optionIcon}><Text style={s.optionIconText}>V</Text></View>
          <View style={{ flex: 1 }}>
            <Text style={s.optionTitle}>{t('nearby.travelIncluded')}</Text>
            <Text style={s.optionSub}>{t('nearby.travelIncludedSub')}</Text>
          </View>
          <Switch value={travelIncluded} onValueChange={setTravelIncluded} trackColor={{ false: '#E2E8F0', true: '#BBF7D0' }} thumbColor={travelIncluded ? '#16A34A' : '#94A3B8'} ios_backgroundColor="#E2E8F0" />
        </View>
        <View style={s.optionRow}>
          <View style={[s.optionIcon, { backgroundColor: '#FFFBEB' }]}><Text style={[s.optionIconText, { color: '#D97706' }]}>M</Text></View>
          <View style={{ flex: 1 }}>
            <Text style={s.optionTitle}>{t('nearby.materialIncluded')}</Text>
            <Text style={s.optionSub}>{t('nearby.materialIncludedSub')}</Text>
          </View>
          <Switch value={materialIncluded} onValueChange={setMaterialIncluded} trackColor={{ false: '#E2E8F0', true: '#BBF7D0' }} thumbColor={materialIncluded ? '#16A34A' : '#94A3B8'} ios_backgroundColor="#E2E8F0" />
        </View>
        <View style={s.optionRow}>
          <View style={[s.optionIcon, { backgroundColor: '#ECFDF5' }]}><Text style={[s.optionIconText, { color: '#16A34A' }]}>!</Text></View>
          <View style={{ flex: 1 }}>
            <Text style={s.optionTitle}>{t('nearby.availableNow')}</Text>
            <Text style={s.optionSub}>{t('nearby.availableNowSub')}</Text>
          </View>
          <Switch value={availableNow} onValueChange={setAvailableNow} trackColor={{ false: '#E2E8F0', true: '#BBF7D0' }} thumbColor={availableNow ? '#16A34A' : '#94A3B8'} ios_backgroundColor="#E2E8F0" />
        </View>

        {/* Message */}
        <Text style={s.offerSectionLabel}>{t('nearby.messageLabel')}</Text>
        <TextInput style={s.textarea} value={comment} onChangeText={setComment} placeholder={t('nearby.messagePlaceholder')} multiline placeholderTextColor="#9CA3AF" />

        {/* Validité */}
        <Text style={s.offerSectionLabel}>{t('nearby.validityLabel')}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {VALIDITY_OPTIONS.map(v => (
              <TouchableOpacity
                key={v.mins}
                style={[s.priceChip, validityMinutes === v.mins && s.priceChipActive]}
                onPress={() => setValidityMinutes(v.mins)}
              >
                <Text style={[s.priceChipTxt, validityMinutes === v.mins && s.priceChipTxtActive]}>{v.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        {/* Sécurité */}
        <View style={s.secureBox}>
          <Text style={s.secureIcon}>S</Text>
          <Text style={s.secureText}>{t('nearby.paymentSecured')}</Text>
        </View>

        {err && <Text style={s.errText}>{err}</Text>}

        <TouchableOpacity style={[s.sendOfferBtn, (!price || sending) && s.sendOfferBtnDisabled]} disabled={!price || sending} onPress={sendOffer}>
          {sending ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.sendOfferBtnText}>{t('nearby.sendOfferBtn')} →</Text>}
        </TouchableOpacity>
      </BottomSheet>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#E2E8F0', backgroundColor: '#fff', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 18, fontWeight: '800', color: '#0F172A' },
  onlineRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  onlineDot: { width: 7, height: 7, borderRadius: 4 },
  onlineLabel: { fontSize: 12, color: '#64748B', fontWeight: '600' },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  shareBox: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  refreshBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },
  refreshIcon: { fontSize: 18, color: '#0F172A', fontWeight: '600' },
  successBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 12, marginBottom: 8, backgroundColor: '#ECFDF5', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: '#BBF7D0' },
  successDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#16A34A' },
  successText: { color: '#15803D', fontWeight: '600', fontSize: 13 },
  mapContainer: { flex: 1 },
  map: { flex: 1 },
  markerContainer: { alignItems: 'center' },
  mapMarker: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: '#fff', shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 5, elevation: 5 },
  mapMarkerText: { fontSize: 11, fontWeight: '800', color: '#fff' },
  mapMarkerTail: { width: 0, height: 0, borderLeftWidth: 7, borderRightWidth: 7, borderTopWidth: 10, borderLeftColor: 'transparent', borderRightColor: 'transparent', alignSelf: 'center', marginTop: -2 },
  mapLegend: { position: 'absolute', top: 12, left: 12, backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 6, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 6, elevation: 3 },
  legendDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#059669', opacity: 0.7 },
  legendText: { fontSize: 12, fontWeight: '700', color: '#0F172A' },
  recenterBtn: { position: 'absolute', bottom: 170, right: 16, width: 48, height: 48, borderRadius: 24, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 6, elevation: 4 },
  recenterIcon: { fontSize: 20, color: '#059669', fontWeight: '700' },
  loadingText: { fontSize: 13, color: '#64748B', marginTop: 8 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 32 },
  errText: { color: '#DC2626', fontSize: 13, textAlign: 'center' },
  retryBtn: { paddingHorizontal: 24, paddingVertical: 12, backgroundColor: '#111827', borderRadius: 12 },
  retryTxt: { color: '#fff', fontWeight: '700' },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#0F172A' },
  emptyText: { fontSize: 13, color: '#94A3B8', textAlign: 'center', lineHeight: 20 },

  // Bottom sheet
  sheet: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 16, paddingTop: 10, paddingBottom: 20, maxHeight: '45%', shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 12, elevation: 10 },
  sheetExpanded: { maxHeight: '78%' },
  sheetHandleRow: { alignItems: 'center', paddingVertical: 6 },
  sheetHandle: { width: 40, height: 5, borderRadius: 3, backgroundColor: '#CBD5E1' },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sheetTitle: { fontSize: 16, fontWeight: '800', color: '#0F172A' },
  sheetToggle: { fontSize: 20, color: '#64748B', fontWeight: '700' },
  sheetListVertical: { gap: 10, paddingBottom: 16 },
  sheetListHorizontal: { gap: 10, paddingRight: 16 },
  sheetCardVertical: { backgroundColor: '#fff', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#E2E8F0', gap: 10 },
  sheetCardHorizontal: { width: 280, backgroundColor: '#fff', borderRadius: 18, padding: 14, borderWidth: 1, borderColor: '#E2E8F0', gap: 10, marginRight: 10 },
  sheetCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  catRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sheetCatMonogram: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  sheetCatMonogramText: { fontSize: 12, fontWeight: '800', color: '#fff' },
  sheetCatText: { fontSize: 13, fontWeight: '700', color: '#0F172A', textTransform: 'capitalize' },
  sheetDist: { fontSize: 11, color: '#64748B', marginTop: 2 },
  sheetBudget: { fontSize: 13, fontWeight: '800', color: '#059669' },
  sheetDesc: { fontSize: 13, color: '#64748B', lineHeight: 19 },
  sheetOfferBtn: { backgroundColor: '#0F172A', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10, alignItems: 'center', alignSelf: 'flex-start' },
  sheetOfferBtnText: { color: '#fff', fontSize: 13, fontWeight: '800' },
  emptySheet: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '35%', shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 12, elevation: 10 },

  // Modal offre style inDrive
  offerHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  offerBackBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },
  offerBackIcon: { fontSize: 18, color: '#0F172A', fontWeight: '600' },
  offerTitle: { fontSize: 17, fontWeight: '800', color: '#0F172A' },
  offerCloseBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },
  offerCloseIcon: { fontSize: 22, color: '#64748B', fontWeight: '300', lineHeight: 24 },
  offerRecap: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#F8FAFC', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 16 },
  offerRecapLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  offerRecapMono: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  offerRecapMonoText: { fontSize: 14, fontWeight: '800', color: '#fff' },
  offerRecapCat: { fontSize: 14, fontWeight: '800', color: '#0F172A', textTransform: 'capitalize' },
  offerRecapMeta: { fontSize: 12, color: '#64748B', marginTop: 1 },
  offerRecapBudget: { fontSize: 13, fontWeight: '800', color: '#059669' },

  priceBlock: { alignItems: 'center', marginBottom: 20 },
  priceLabel: { fontSize: 13, fontWeight: '700', color: '#64748B', marginBottom: 10 },
  priceInputRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  priceAdjust: { width: 48, height: 48, borderRadius: 14, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#E2E8F0' },
  priceAdjustText: { fontSize: 26, color: '#0F172A', fontWeight: '300' },
  priceDisplay: { alignItems: 'center' },
  priceValue: { fontSize: 40, fontWeight: '800', color: '#0F172A', letterSpacing: -1 },
  priceCurrency: { fontSize: 13, fontWeight: '700', color: '#64748B' },
  priceHint: { fontSize: 12, color: '#059669', fontWeight: '600', marginTop: 8 },
  priceInput: { position: 'absolute', opacity: 0, width: 1, height: 1 },

  offerSectionLabel: { fontSize: 13, fontWeight: '700', color: '#64748B', marginBottom: 10, marginTop: 4 },
  etaRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  etaPill: { flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: '#F1F5F9', alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0' },
  etaPillActive: { backgroundColor: '#0F172A', borderColor: '#0F172A' },
  etaPillText: { fontSize: 13, fontWeight: '700', color: '#64748B' },
  etaPillTextActive: { color: '#fff' },

  optionRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#fff', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 10 },
  optionIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#EFF6FF', alignItems: 'center', justifyContent: 'center' },
  optionIconText: { fontSize: 16, fontWeight: '800', color: '#3B82F6' },
  optionTitle: { fontSize: 14, fontWeight: '800', color: '#0F172A' },
  optionSub: { fontSize: 12, color: '#64748B', marginTop: 1 },

  secureBox: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#F8FAFC', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 12 },
  secureIcon: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#0F172A', color: '#fff', fontSize: 12, fontWeight: '800', textAlign: 'center', lineHeight: 28 },
  secureText: { fontSize: 13, color: '#64748B', fontWeight: '600', flex: 1 },

  sendOfferBtn: { backgroundColor: '#0F7B4F', borderRadius: 16, padding: 17, alignItems: 'center', marginTop: 4 },
  sendOfferBtnDisabled: { opacity: 0.4 },
  sendOfferBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },

  // Modal offre legacy (gardé pour compatibilité)
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#0F172A', marginBottom: 12 },
  modalRecap: { backgroundColor: '#F8FAFC', borderRadius: 10, padding: 12, gap: 8, borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 16 },
  modalCatRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  modalCat: { fontSize: 14, fontWeight: '700', color: '#0F172A', textTransform: 'capitalize' },
  modalDist: { fontSize: 11, color: '#64748B', marginTop: 1 },
  modalDesc: { fontSize: 13, color: '#64748B' },
  modalBudget: { fontSize: 12, fontWeight: '600', color: '#059669' },
  acceptBudgetBtn: { backgroundColor: '#F0FDF4', borderRadius: 8, paddingVertical: 8, paddingHorizontal: 12, alignSelf: 'flex-start', borderWidth: 1.5, borderColor: '#BBF7D0' },
  acceptBudgetBtnText: { fontSize: 12, fontWeight: '700', color: '#15803D' },
  modalLabel: { fontSize: 13, fontWeight: '600', color: '#374151' },
  priceChip: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 999, backgroundColor: '#F3F4F6', borderWidth: 1.5, borderColor: 'transparent' },
  priceChipActive: { backgroundColor: '#FFFBEB', borderColor: '#F59E0B' },
  priceChipTxt: { fontSize: 13, fontWeight: '600', color: '#6B7280' },
  priceChipTxtActive: { color: '#B45309' },
  input: { borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 12, padding: 13, fontSize: 15, color: '#111827', backgroundColor: '#F9FAFB' },
  textarea: { borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 12, padding: 13, fontSize: 15, color: '#111827', minHeight: 72, textAlignVertical: 'top', backgroundColor: '#F9FAFB' },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 4 },
  cancelBtn: { flex: 1, borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 12, padding: 15, alignItems: 'center' },
  cancelTxt: { fontSize: 14, fontWeight: '600', color: '#6B7280' },
  sendBtn: { flex: 2, backgroundColor: '#059669', borderRadius: 12, padding: 15, alignItems: 'center' },
  sendBtnDisabled: { opacity: 0.4 },
  sendTxt: { color: '#fff', fontSize: 14, fontWeight: '700' },
})

export default withScreenBoundary(NearbyRequests, 'NearbyRequests')
