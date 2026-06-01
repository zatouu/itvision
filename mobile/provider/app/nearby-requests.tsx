import { useEffect, useState, useCallback, useRef } from 'react'
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, TextInput, ActivityIndicator, RefreshControl, Alert, Platform } from 'react-native'
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

type ViewMode = 'map' | 'list'

export default function NearbyRequests() {
  const [items, setItems] = useState<any[]>([])
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [viewMode, setViewMode] = useState<ViewMode>(Platform.OS === 'web' ? 'list' : 'map')

  const [selected, setSelected] = useState<any | null>(null)
  const [price, setPrice] = useState('')
  const [eta, setEta] = useState('30')
  const [comment, setComment] = useState('')
  const [validityMinutes, setValidityMinutes] = useState<number>(30)
  const [sending, setSending] = useState(false)
  const [sentId, setSentId] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)

  const { i18n } = useTranslation()
  const [catMap, setCatMap] = useState<Record<string, { abbr: string; color: string; label: string }>>({})

  useEffect(() => {
    loadCategories().then(cats => {
      const m: Record<string, { abbr: string; color: string; label: string }> = {}
      cats.forEach(c => { m[c.slug] = { abbr: c.abbr, color: c.color, label: getCategoryLabel(c, i18n.language) } })
      setCatMap(m)
    }).catch(() => {})
  }, [])

  const mapRef = useRef<MapView>(null)

  const locate = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync()
    if (status !== 'granted') return null
    try {
      const pos = await Promise.race([
        Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Timeout localisation')), 5000)),
      ])
      const c = { lat: pos.coords.latitude, lng: pos.coords.longitude }
      setCoords(c)
      return c
    } catch {
      // Fallback Dakar centre (Place de l'Indépendance)
      const fallback = { lat: 14.6928, lng: -17.4467 }
      setCoords(fallback)
      return fallback
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
    } catch {
      setErr('Impossible de charger les demandes')
      setLoading(false)
      setRefreshing(false)
    }
  }, [coords])

  useEffect(() => {
    (async () => { const c = await locate(); await load(c) })()
  }, [])

  // WebSocket: connexion + écouter acceptation d'offre + nouvelles demandes
  useEffect(() => {
    const socket = connectSocket()
    const handleAccepted = (data: any) => {
      Alert.alert('Offre acceptée !', 'Un client a choisi votre offre. La mission démarre.')
      if (coords) {
        const key = `nearby-${Math.round(coords.lat * 10)}-${Math.round(coords.lng * 10)}`
        cacheClear(key)
      }
    }
    const handleRequestNew = async (data: any) => {
      const title = data.category ? `Nouvelle demande — ${data.category}` : 'Nouvelle demande proche'
      const msg = data.description ? `${data.description.slice(0, 80)}${data.description.length > 80 ? '…' : ''}` : 'Un client vient de publier une demande dans votre zone.'
      const ok = await confirm(title, msg)
      if (ok && coords) load(coords, true)
    }
    socket.on('offer:accepted', handleAccepted)
    socket.on('request:new', handleRequestNew)
    return () => {
      socket.off('offer:accepted', handleAccepted)
      socket.off('request:new', handleRequestNew)
    }
  }, [coords, load])

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
      }, 'Offre enregistrée hors ligne — sera envoyée dès le retour réseau.')
      setSentId(selected._id)
      setSelected(null)
      setPrice(''); setComment(''); setEta('30'); setValidityMinutes(30)
      if (r) setItems(prev => prev.filter(it => it._id !== selected._id))
    } catch (e: any) { setErr('Erreur envoi: ' + e.message) }
    setSending(false)
  }

  const distLabel = (m?: number) => {
    if (!m) return ''
    return m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(1)} km`
  }

  const mapRegion = coords ? {
    latitude: coords.lat,
    longitude: coords.lng,
    latitudeDelta: RADIUS_KM * 0.018,
    longitudeDelta: RADIUS_KM * 0.018,
  } : undefined

  return (
    <SafeAreaView style={s.safe}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Text style={s.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={s.title}>Demandes proches</Text>
        <TouchableOpacity onPress={() => load(null, true)} style={s.refreshBtn}>
          <Text style={s.refreshIcon}>↻</Text>
        </TouchableOpacity>
      </View>

      {/* Toggle Carte / Liste */}
      <View style={s.toggleBar}>
        <TouchableOpacity
          style={[s.toggleBtn, viewMode === 'map' && s.toggleBtnActive]}
          onPress={() => setViewMode('map')}
        >
          <Text style={[s.toggleTxt, viewMode === 'map' && s.toggleTxtActive]}>Carte</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.toggleBtn, viewMode === 'list' && s.toggleBtnActive]}
          onPress={() => setViewMode('list')}
        >
          <Text style={[s.toggleTxt, viewMode === 'list' && s.toggleTxtActive]}>
            Liste {items.length > 0 ? `(${items.length})` : ''}
          </Text>
        </TouchableOpacity>
      </View>

      {sentId && (
        <View style={s.successBanner}>
          <View style={s.successDot} />
          <Text style={s.successText}>Offre envoyée avec succès</Text>
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
            <Text style={s.retryTxt}>Réessayer</Text>
          </TouchableOpacity>
        </View>
      ) : viewMode === 'map' ? (
        /* ── VUE CARTE ── */
        <View style={s.mapContainer}>
          {Platform.OS === 'web' ? (
            <View style={s.center}>
              <Text style={s.emptyTitle}>Carte non disponible sur web</Text>
              <Text style={s.emptyText}>Basculez en mode Liste pour voir les demandes proches.</Text>
              <TouchableOpacity style={s.retryBtn} onPress={() => setViewMode('list')}>
                <Text style={s.retryTxt}>Voir la liste</Text>
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
                <Text style={s.legendText}>Zone {RADIUS_KM} km — {items.length} demande{items.length > 1 ? 's' : ''}</Text>
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
              <Text style={s.loadingText}>Localisation en cours…</Text>
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
              title="Aucune demande proche"
              subtitle="Aucune demande dans un rayon de 10 km. Tirez vers le bas pour actualiser."
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
              {it.media?.some((m: any) => m.type === 'audio') && (() => {
                const audioUrl = it.media.find((m: any) => m.type === 'audio').url
                const fullUri = audioUrl.startsWith('http') ? audioUrl : getBaseUrl() + audioUrl
                return <VoicePlayer uri={fullUri} />
              })()}
              <View style={s.cardFoot}>
                {it.budget ? <Text style={s.budget}>Budget: {Number(it.budget).toLocaleString('fr-FR')} FCFA</Text> : <Text style={s.budgetNone}>Budget non précisé</Text>}
                <TouchableOpacity style={s.offerChip} onPress={() => { setSelected(it); setSentId(null) }}>
                  <Text style={s.offerChipText}>Faire une offre</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Bottom sheet offre */}
      <BottomSheet visible={!!selected} onClose={() => setSelected(null)}>
        <Text style={s.modalTitle}>Votre offre</Text>
        {selected && (
          <View style={s.modalRecap}>
            <View style={s.modalCatRow}>
              <View style={[s.catMonogram, { backgroundColor: catMap[selected.category]?.color || '#475569' }]}>
                <Text style={s.catMonogramText}>{catMap[selected.category]?.abbr || selected.category?.slice(0,2).toUpperCase()}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.modalCat}>{catMap[selected.category]?.label || selected.category}</Text>
                {selected._distance ? (
                  <Text style={s.modalDist}>{distLabel(selected._distance)} de vous</Text>
                ) : null}
              </View>
            </View>
            {selected.description ? <Text style={s.modalDesc} numberOfLines={2}>{selected.description}</Text> : null}
            {selected.budget ? (
              <View style={{ gap: 6 }}>
                <Text style={s.modalBudget}>Budget client: {Number(selected.budget).toLocaleString('fr-FR')} FCFA</Text>
                <TouchableOpacity
                  style={s.acceptBudgetBtn}
                  onPress={() => setPrice(String(selected.budget))}
                >
                  <Text style={s.acceptBudgetBtnText}>✓ Accepter ce budget</Text>
                </TouchableOpacity>
              </View>
            ) : null}
          </View>
        )}

        {/* Prix rapides */}
        <Text style={s.modalLabel}>Prix (FCFA) *</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {QUICK_PRICES.map(p => (
              <TouchableOpacity key={p} style={[s.priceChip, price === String(p) && s.priceChipActive]} onPress={() => setPrice(String(p))}>
                <Text style={[s.priceChipTxt, price === String(p) && s.priceChipTxtActive]}>{p.toLocaleString('fr-FR')}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
        <TextInput style={s.input} value={price} onChangeText={setPrice} placeholder="Prix libre (ex: 12000)" keyboardType="numeric" placeholderTextColor="#9CA3AF" />

        <Text style={s.modalLabel}>Délai d'arrivée (min)</Text>
        <TextInput style={s.input} value={eta} onChangeText={setEta} keyboardType="numeric" placeholderTextColor="#9CA3AF" />

        <Text style={s.modalLabel}>Validité de l'offre</Text>
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

        <Text style={s.modalLabel}>Message (optionnel)</Text>
        <TextInput style={s.textarea} value={comment} onChangeText={setComment} placeholder="Ex: J'ai 5 ans d'expérience..." multiline placeholderTextColor="#9CA3AF" />

        {err && <Text style={s.errText}>{err}</Text>}

        <View style={s.modalActions}>
          <TouchableOpacity style={s.cancelBtn} onPress={() => setSelected(null)}>
            <Text style={s.cancelTxt}>Annuler</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.sendBtn, (!price || sending) && s.sendBtnDisabled]} disabled={!price || sending} onPress={sendOffer}>
            {sending ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.sendTxt}>Envoyer l'offre</Text>}
          </TouchableOpacity>
        </View>
      </BottomSheet>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, gap: 12, borderBottomWidth: 1, borderBottomColor: '#E2E8F0', backgroundColor: '#fff' },
  backBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },
  backIcon: { fontSize: 16, color: '#0F172A' },
  title: { flex: 1, fontSize: 17, fontWeight: '700', color: '#0F172A' },
  refreshBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },
  refreshIcon: { fontSize: 18, color: '#0F172A', fontWeight: '600' },
  toggleBar: { flexDirection: 'row', backgroundColor: '#F1F5F9', margin: 12, borderRadius: 12, padding: 3, gap: 3 },
  toggleBtn: { flex: 1, paddingVertical: 9, alignItems: 'center', borderRadius: 10 },
  toggleBtnActive: { backgroundColor: '#fff', shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  toggleTxt: { fontSize: 14, fontWeight: '600', color: '#64748B' },
  toggleTxtActive: { color: '#0F172A' },
  successBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 12, marginBottom: 8, backgroundColor: '#ECFDF5', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: '#BBF7D0' },
  successDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#16A34A' },
  successText: { color: '#15803D', fontWeight: '600', fontSize: 13 },
  mapContainer: { flex: 1 },
  map: { flex: 1 },
  mapMarker: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', borderWidth: 2.5, borderColor: '#fff', shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 4, elevation: 4 },
  mapMarkerText: { fontSize: 10, fontWeight: '800', color: '#fff' },
  mapMarkerTail: { width: 0, height: 0, borderLeftWidth: 6, borderRightWidth: 6, borderTopWidth: 8, borderLeftColor: 'transparent', borderRightColor: 'transparent', alignSelf: 'center', marginTop: -1 },
  mapLegend: { position: 'absolute', top: 12, left: 12, backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 6, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 6, elevation: 3 },
  legendDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#059669', opacity: 0.7 },
  legendText: { fontSize: 12, fontWeight: '600', color: '#0F172A' },
  recenterBtn: { position: 'absolute', bottom: 24, right: 16, width: 44, height: 44, borderRadius: 22, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 6, elevation: 4 },
  recenterIcon: { fontSize: 20, color: '#059669' },
  loadingText: { fontSize: 13, color: '#64748B', marginTop: 8 },
  list: { padding: 12, gap: 12, paddingBottom: 32 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, gap: 10, borderWidth: 1, borderColor: '#E2E8F0' },
  cardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  catRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  catMonogram: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  catMonogramText: { fontSize: 11, fontWeight: '700', color: '#fff' },
  catText: { fontSize: 14, fontWeight: '600', color: '#0F172A', textTransform: 'capitalize' },
  distBadge: { backgroundColor: '#F1F5F9', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: '#E2E8F0' },
  distText: { fontSize: 11, color: '#64748B', fontWeight: '600' },
  desc: { fontSize: 13, color: '#64748B', lineHeight: 19 },
  cardFoot: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 8, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  budget: { fontSize: 13, fontWeight: '700', color: '#0F172A' },
  budgetNone: { fontSize: 13, color: '#94A3B8' },
  offerChip: { backgroundColor: '#0F172A', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 7 },
  offerChipText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 32 },
  errText: { color: '#DC2626', fontSize: 13, textAlign: 'center' },
  retryBtn: { paddingHorizontal: 24, paddingVertical: 12, backgroundColor: '#111827', borderRadius: 12 },
  retryTxt: { color: '#fff', fontWeight: '700' },
  empty: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#0F172A' },
  emptyText: { fontSize: 13, color: '#94A3B8', textAlign: 'center', lineHeight: 20 },
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
