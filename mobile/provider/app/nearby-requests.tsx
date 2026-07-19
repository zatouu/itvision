import { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, TextInput, ActivityIndicator, RefreshControl, Alert, Platform, Animated, AppState } from 'react-native'
import { Image } from 'expo-image'
import BottomSheet from '../src/components/BottomSheet'
import MapView, { Marker, Circle, PROVIDER_DEFAULT } from 'react-native-maps'
import * as Location from 'expo-location'
import { router } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { apiGet, apiPostQueued } from '../src/api'
import { getProviderWallet } from '../src/wallet'
import { fetchWithCache, cacheClear } from '../src/storage'
import { connectSocket, joinNearbyRoom, leaveNearbyRoom, emitOfferTyping } from '../src/socket'
import { getProviderName } from '../src/user-profile'
import { withScreenBoundary } from '../src/components/withScreenBoundary'
import { SkeletonCard } from '../src/components/Skeleton'
import VoicePlayer from '../src/components/VoicePlayer'
import { resolveMediaUrl } from '../src/media'
import { loadCategories, getCategoryLabel, ServiceCategory } from '../src/categories'
import { getCategoryIcon } from '../src/categoryIcons'
import { hapticSuccess, hapticLight, hapticSelect } from '../src/haptics'
import { useTranslation } from 'react-i18next'
import EmptyState from '../src/components/EmptyState'
import { colors, radius, spacing, typography, shadows } from '../src/design'
import { ArrowLeft, RefreshCw, Crosshair, MapPin, X, Minus, Plus, ShieldCheck, Volume2 } from 'lucide-react-native'

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
  const [unlockEnabled, setUnlockEnabled] = useState(false)
  const successScale = useRef(new Animated.Value(0))

  // Notifier le client quand le prestataire est en train de rédiger une offre
  useEffect(() => {
    if (!selected) return
    const requestId = selected._id
    const providerName = getProviderName()
    emitOfferTyping(requestId, true, providerName || undefined)
    return () => {
      emitOfferTyping(requestId, false, providerName || undefined)
    }
  }, [selected])

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
  const loadInFlightRef = useRef(false)

  const locate = async (): Promise<{ lat: number; lng: number } | null> => {
    let { status } = await Location.getForegroundPermissionsAsync()
    if (status !== 'granted') {
      const req = await Location.requestForegroundPermissionsAsync()
      status = req.status
    }
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

  const load = useCallback(async (c?: { lat: number; lng: number } | null, isRefresh = false, silent = false) => {
    const target = c ?? coords
    if (!target || loadInFlightRef.current) return
    loadInFlightRef.current = true
    const key = `nearby-${Math.round(target.lat * 10)}-${Math.round(target.lng * 10)}`
    if (isRefresh) {
      setRefreshing(true)
      await cacheClear(key)
    } else if (!silent) {
      setLoading(true)
    }
    if (!silent) setErr(null)
    try {
      await fetchWithCache(
        key,
        () => apiGet(`/api/services/matching?lng=${target.lng}&lat=${target.lat}&radiusKm=${RADIUS_KM}&excludeMine=true`).then(r => r.items || []),
        (items) => {
          setItems(items)
          setLoading(false)
          setErr(null)
        },
        2 * 60 * 1000 // 2 min TTL pour les demandes proches
      )
    } catch (e: any) {
      if (!silent) {
        const msg = e?.message || String(e)
        setErr(t('nearby.loadError', { msg }))
      }
    } finally {
      loadInFlightRef.current = false
      setLoading(false)
      setRefreshing(false)
    }
  }, [coords, t])

  useEffect(() => {
    (async () => {
      const c = await locate()
      await load(c)
      if (c) joinNearbyRoom(c.lat, c.lng, RADIUS_KM)
      try {
        const w = await getProviderWallet()
        setUnlockEnabled(w.config.credits.unlockEnabled)
      } catch {}
    })()
    return () => { leaveNearbyRoom() }
  }, [])

  // Refs stables pour éviter de réabonner les listeners à chaque changement de coords/load
  const coordsRef = useRef(coords)
  const loadRef = useRef(load)
  useEffect(() => { coordsRef.current = coords }, [coords])
  useEffect(() => { loadRef.current = load }, [load])

  // WebSocket: connexion + écouter acceptation d'offre + nouvelles demandes
  useEffect(() => {
    const socket = connectSocket()
    const rejoinAndRefresh = () => {
      const c = coordsRef.current
      if (!c) return
      joinNearbyRoom(c.lat, c.lng, RADIUS_KM)
      loadRef.current(c, false, true)
    }
    const handleAccepted = (_data: any) => {
      Alert.alert(t('nearby.offerAccepted'), t('nearby.offerAcceptedMsg'))
      const c = coordsRef.current
      if (c) cacheClear(`nearby-${Math.round(c.lat * 10)}-${Math.round(c.lng * 10)}`)
    }
    const handleRequestNew = (_data: any) => {
      // Reload silencieux (pas de popup bloquante)
      const c = coordsRef.current
      if (c) loadRef.current(c, false, true)
    }
    const handleAppState = (next: string) => {
      if (next === 'active') rejoinAndRefresh()
    }
    socket.on('connect', rejoinAndRefresh)
    socket.on('offer:accepted', handleAccepted)
    socket.on('request:new', handleRequestNew)
    socket.on('request:nearby', handleRequestNew)
    const appStateSubscription = AppState.addEventListener('change', handleAppState)
    return () => {
      appStateSubscription.remove()
      socket.off('connect', rejoinAndRefresh)
      socket.off('offer:accepted', handleAccepted)
      socket.off('request:new', handleRequestNew)
      socket.off('request:nearby', handleRequestNew)
    }
  }, [t])

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
      hapticSuccess()
      Animated.spring(successScale.current, { toValue: 1, useNativeDriver: true, friction: 8, tension: 40 }).start()
      setTimeout(() => Animated.timing(successScale.current, { toValue: 0, duration: 200, useNativeDriver: true }).start(), 3000)
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
  const mapRegion = useMemo(() => coords ? {
    latitude: coords.lat,
    longitude: coords.lng,
    latitudeDelta: 0.06,
    longitudeDelta: 0.06,
  } : undefined, [coords?.lat, coords?.lng])

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
          <ArrowLeft size={20} color={colors.text} />
        </TouchableOpacity>
        <Text style={s.title}>{t('nearby.title')}</Text>
        <TouchableOpacity onPress={async () => { const c = await locate(); await load(c, true) }} style={s.refreshBtn}>
          <RefreshCw size={18} color={colors.text} />
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
        <Animated.View style={[s.successBanner, { transform: [{ scale: successScale.current }] }]}>
          <View style={s.successDot} />
          <Text style={s.successText}>{t('nearby.offerSent')}</Text>
        </Animated.View>
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
                  const Icon = getCategoryIcon(it.category)
                  const hasAudio = it._hasAudio || it.media?.some((m: any) => m.type === 'audio')
                  const hasPhoto = it._hasPhoto || it.media?.some((m: any) => m.type === 'image')
                  const hasVideo = it._hasVideo || it.media?.some((m: any) => m.type === 'video')
                  return (
                    <Marker
                      key={it._id}
                      coordinate={{ latitude: loc[1], longitude: loc[0] }}
                      onPress={() => { hapticLight(); setSelected(it); setSentId(null) }}
                    >
                      <View style={s.markerWrap}>
                        <View style={[s.mapMarker, { backgroundColor: color }]}>
                          <Icon size={16} color="#fff" />
                        </View>
                        <View style={[s.mapMarkerTail, { borderTopColor: color }]} />
                        {(hasAudio || hasPhoto || hasVideo) && (
                          <View style={[s.markerBadge, { backgroundColor: '#0F172A' }]}>
                            <Text style={s.markerBadgeText}>{hasAudio ? '♪' : '📷'}</Text>
                          </View>
                        )}
                        {it.budget && (
                          <View style={s.markerBudget}>
                            <Text style={s.markerBudgetText}>{`${(Number(it.budget)/1000).toFixed(0)}k`}</Text>
                          </View>
                        )}
                      </View>
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
                <Crosshair size={20} color={colors.success} />
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
              icon={<MapPin size={32} color="#94A3B8" />}
              title={t('nearby.noRequests')}
              subtitle={t('nearby.noRequestsSub')}
            />
          )}

          {items.map(it => (
            <TouchableOpacity key={it._id} style={s.card} activeOpacity={0.88} onPress={() => { hapticLight(); setSelected(it); setSentId(null) }}>
              <View style={s.cardHead}>
                <View style={s.catRow}>
                  <View style={[s.catMonogram, { backgroundColor: catMap[it.category]?.color || '#475569' }]}>
                    {(() => { const Icon = getCategoryIcon(it.category); return <Icon size={16} color="#fff" /> })()}
                  </View>
                  <Text style={s.catText}>{catMap[it.category]?.label || it.category}</Text>
                </View>
                <View style={s.distBadge}>
                  <Text style={s.distText}>{distLabel(it._distance)}</Text>
                </View>
              </View>
              {it.media?.some((m: any) => m.type === 'audio') && (
                <View style={s.audioBadge}>
                  <Volume2 size={14} color="#0369A1" />
                  <Text style={s.audioBadgeText}>{t('providerNearby.voiceMessage')}</Text>
                </View>
              )}
              {it.description ? <Text style={s.desc} numberOfLines={2}>{it.description}</Text> : null}
              {it.media?.filter((m: any) => m.type === 'image').length > 0 && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 6 }}>
                  {it.media.filter((m: any) => m.type === 'image').map((m: any, i: number) => {
                    const uri = resolveMediaUrl(m.url)
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
                return <VoicePlayer uri={audioUrl} />
              })()}
              <View style={s.cardFoot}>
                {it.budget ? <Text style={s.budget}>{t('nearby.budget', { amount: Number(it.budget).toLocaleString('fr-FR') })}</Text> : <Text style={s.budgetNone}>{t('nearby.budgetNone')}</Text>}
                <TouchableOpacity style={s.offerChip} onPress={() => { hapticSelect(); setSelected(it); setSentId(null) }}>
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
            <ArrowLeft size={18} color={colors.text} />
          </TouchableOpacity>
          <Text style={s.modalTitle}>Faire une offre</Text>
          <TouchableOpacity onPress={() => setSelected(null)} style={s.modalCloseBtn}>
            <X size={20} color={colors.text} />
          </TouchableOpacity>
        </View>

        <View style={{ paddingBottom: 24 }}>
          {selected && (
            <View style={s.modalRecap}>
              <View style={s.modalCatRow}>
                <View style={[s.modalCatIcon, { backgroundColor: catMap[selected.category]?.color || '#475569' }]}>
                  <Text style={s.modalCatIconText}>{catMap[selected.category]?.abbr || selected.category?.slice(0,2).toUpperCase()}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.modalCatName}>{catMap[selected.category]?.label || selected.category}</Text>
                  <Text style={s.modalCatMeta}>{selected.location?.address || 'À proximité'}{selected._distance ? ` · ${distLabel(selected._distance)}` : ''}{selected._unlockCost ? ` · ${selected._unlockCost} crédits si sélectionné` : ''}</Text>
                </View>
              </View>

              {/* 1. Audio en premier pour décision rapide */}
              {selected.media?.some((m: any) => m.type === 'audio') && (() => {
                const audioUrl = selected.media.find((m: any) => m.type === 'audio').url
                return (
                  <View style={s.audioFirstBox}>
                    <Text style={s.audioFirstLabel}>{t('nearby.listenClient')}</Text>
                    <VoicePlayer uri={audioUrl} />
                  </View>
                )
              })()}

              {/* 2. Galerie médias — scroll horizontal, pas vertical */}
              {selected.media?.filter((m: any) => m.type === 'image' || m.type === 'video').length > 0 && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 12 }}>
                  {selected.media.filter((m: any) => m.type === 'image' || m.type === 'video').map((m: any, i: number) => {
                    const uri = resolveMediaUrl(m.url)
                    return (
                      <View key={i} style={s.mediaThumbWrap}>
                        <Image source={{ uri }} style={s.mediaThumb} />
                        {m.type === 'video' && <Text style={s.videoBadge}>▶</Text>}
                      </View>
                    )
                  })}
                </ScrollView>
              )}

              <View style={s.modalBudgetRow}>
                <Text style={s.modalBudgetLabel}>{t('nearby.clientBudget')}</Text>
                <Text style={s.modalBudgetValue}>{selected.budget ? `${Number(selected.budget).toLocaleString('fr-FR')} FCFA` : t('nearby.budgetNone')}</Text>
              </View>
            </View>
          )}

          {unlockEnabled && (
            <View style={s.unlockBox}>
              <Text style={s.unlockTitle}>Crédits à la sélection</Text>
              <Text style={s.unlockSub}>{selected?._unlockCost || '?'} crédits seront débités uniquement si le client choisit votre offre.</Text>
            </View>
          )}

          {/* Prix direct + chips rapides */}
          <Text style={s.modalSectionLabel}>{t('nearby.yourPrice')}</Text>
          <TextInput
            style={s.priceTextInput}
            value={price}
            onChangeText={(txt) => setPrice(txt.replace(/[^0-9]/g, ''))}
            keyboardType="numeric"
            placeholder="0"
            placeholderTextColor={colors.textMuted}
          />
          <View style={s.quickPriceRow}>
            {[selected?.budget ? Math.round(Number(selected.budget) * 0.9 / 1000) * 1000 : 10000,
              selected?.budget ? Math.round(Number(selected.budget) / 1000) * 1000 : 15000,
              selected?.budget ? Math.round(Number(selected.budget) * 1.1 / 1000) * 1000 : 20000,
              selected?.budget ? Math.round(Number(selected.budget) * 1.25 / 1000) * 1000 : 25000,
            ].map((v, i) => (
              <TouchableOpacity key={i} style={s.quickPriceChip} onPress={() => setPrice(String(v))}>
                <Text style={s.quickPriceChipText}>{(v / 1000).toFixed(0)}k</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={s.modalSectionLabel}>{t('nearby.arrivalEta')}</Text>
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

          <Text style={s.modalSectionLabel}>{t('nearby.optionalMessage')}</Text>
          <TextInput style={s.textarea} value={comment} onChangeText={setComment} placeholder={t('nearby.messagePlaceholder')} multiline placeholderTextColor={colors.textMuted} />

          {/* Options */}
          <Text style={s.modalSectionLabel}>{t('nearby.options')}</Text>
          <View style={s.optionRow}>
            <Text style={s.optionLabel}>{t('nearby.travelIncluded')}</Text>
            <TouchableOpacity style={[s.optionSwitch, travelIncluded && s.optionSwitchActive]} onPress={() => setTravelIncluded(v => !v)}>
              <View style={[s.optionSwitchThumb, travelIncluded && s.optionSwitchThumbActive]} />
            </TouchableOpacity>
          </View>
          <View style={s.optionRow}>
            <Text style={s.optionLabel}>{t('nearby.materialIncluded')}</Text>
            <TouchableOpacity style={[s.optionSwitch, materialIncluded && s.optionSwitchActive]} onPress={() => setMaterialIncluded(v => !v)}>
              <View style={[s.optionSwitchThumb, materialIncluded && s.optionSwitchThumbActive]} />
            </TouchableOpacity>
          </View>
          <View style={s.optionRow}>
            <Text style={s.optionLabel}>{t('nearby.availableNow')}</Text>
            <TouchableOpacity style={[s.optionSwitch, availableNow && s.optionSwitchActive]} onPress={() => setAvailableNow(v => !v)}>
              <View style={[s.optionSwitchThumb, availableNow && s.optionSwitchThumbActive]} />
            </TouchableOpacity>
          </View>

          {/* Sécurité */}
          <View style={s.secureBox}>
            <ShieldCheck size={18} color={colors.info} />
            <Text style={s.secureText}>{t('nearby.securePayment')}</Text>
          </View>

          {err && <Text style={s.errText}>{err}</Text>}

          <TouchableOpacity style={[s.sendOfferBtn, (!price || sending) && s.sendOfferBtnDisabled]} disabled={!price || sending} onPress={sendOffer}>
            {sending ? <ActivityIndicator color={colors.surface} size="small" /> : <Text style={s.sendOfferBtnText}>{t('nearby.sendOffer')}</Text>}
          </TouchableOpacity>
        </View>
      </BottomSheet>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingVertical: spacing.md, gap: spacing.md, backgroundColor: colors.surface },
  backBtn: { width: 40, height: 40, borderRadius: radius.md, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
  backIcon: { color: colors.text },
  title: { flex: 1, fontSize: 18, fontWeight: typography.weight.extrabold as any, color: colors.text },
  refreshBtn: { width: 40, height: 40, borderRadius: radius.md, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
  refreshIcon: { color: colors.text },
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
  markerWrap: { alignItems: 'center', justifyContent: 'center' },
  mapMarker: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', borderWidth: 2.5, borderColor: colors.surface, ...shadows.md },
  mapMarkerText: { fontSize: 10, fontWeight: typography.weight.extrabold as any, color: colors.surface },
  mapMarkerTail: { width: 0, height: 0, borderLeftWidth: 6, borderRightWidth: 6, borderTopWidth: 8, borderLeftColor: 'transparent', borderRightColor: 'transparent', alignSelf: 'center', marginTop: -1 },
  markerBadge: { position: 'absolute', top: -4, right: -4, minWidth: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: colors.surface },
  markerBadgeText: { fontSize: 9, fontWeight: '800', color: '#fff' },
  markerBudget: { position: 'absolute', bottom: -10, backgroundColor: 'rgba(15,23,42,0.85)', borderRadius: 10, paddingHorizontal: 6, paddingVertical: 2 },
  markerBudgetText: { fontSize: 9, fontWeight: '700', color: '#fff' },
  mapLegend: { position: 'absolute', top: 12, left: 12, backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: radius.lg, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, flexDirection: 'row', alignItems: 'center', gap: 6, ...shadows.md },
  legendDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.success, opacity: 0.7 },
  legendText: { fontSize: 12, fontWeight: typography.weight.extrabold as any, color: colors.text },
  recenterBtn: { position: 'absolute', bottom: 24, right: 16, width: 44, height: 44, borderRadius: 22, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', ...shadows.md },
  recenterIcon: { color: colors.success },
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
  audioBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#E0F7FF', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 16, alignSelf: 'flex-start', marginTop: 6, marginBottom: 4 },
  audioBadgeText: { fontSize: 11, fontWeight: '700', color: '#0369A1' },
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
  audioFirstBox: { backgroundColor: '#F0FDF4', borderRadius: radius.lg, padding: spacing.md, marginTop: spacing.md },
  audioFirstLabel: { fontSize: 13, fontWeight: typography.weight.semibold as any, color: '#166534', marginBottom: 8 },
  mediaThumbWrap: { width: 100, height: 100, borderRadius: radius.md, marginRight: 8, backgroundColor: colors.bg, overflow: 'hidden' },
  mediaThumb: { width: 100, height: 100 },
  videoBadge: { position: 'absolute', top: 6, right: 6, fontSize: 16, color: '#fff', textShadowColor: 'rgba(0,0,0,0.4)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 },
  unlockBox: { backgroundColor: '#E6F4EC', borderRadius: radius.lg, padding: spacing.md, marginTop: spacing.md },
  unlockTitle: { fontSize: 15, fontWeight: typography.weight.extrabold as any, color: '#065F3A' },
  unlockSub: { fontSize: 13, color: '#0F7B4F', marginTop: 4, marginBottom: 12 },
  unlockBtn: { backgroundColor: '#0F7B4F', borderRadius: radius.lg, paddingVertical: 12, alignItems: 'center' },
  unlockBtnText: { color: '#fff', fontWeight: typography.weight.extrabold as any, fontSize: 15 },
  priceTextInput: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, paddingHorizontal: spacing.md, paddingVertical: 12, fontSize: 18, fontWeight: typography.weight.extrabold as any, color: colors.text, backgroundColor: colors.surface },
  quickPriceRow: { flexDirection: 'row', gap: 8, marginTop: 10, marginBottom: 12 },
  quickPriceChip: { backgroundColor: colors.bg, borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: colors.border },
  quickPriceChipText: { fontSize: 13, fontWeight: typography.weight.extrabold as any, color: colors.text },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.lg },
  modalBackBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
  modalBackIcon: { color: colors.text },
  modalCloseBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
  modalCloseIcon: { color: colors.text },
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
  priceAdjustBtnText: { color: colors.text },
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
  secureIcon: { color: colors.info },
  secureText: { flex: 1, fontSize: 13, color: colors.info, fontWeight: typography.weight.extrabold as any },
  sendOfferBtn: { backgroundColor: colors.primary, borderRadius: radius.xl, padding: spacing.lg, alignItems: 'center', marginTop: spacing.md },
  sendOfferBtnDisabled: { opacity: 0.45 },
  sendOfferBtnText: { color: colors.surface, fontSize: 16, fontWeight: typography.weight.extrabold as any },
})

export default withScreenBoundary(NearbyRequests, 'NearbyRequests')
