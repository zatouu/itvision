import { useEffect, useState, useCallback } from 'react'
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator, RefreshControl, Image, Linking } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import MapView, { Marker } from 'react-native-maps'
import * as Location from 'expo-location'
import { apiGet, apiPatchQueued, getBaseUrl } from '../../src/api'
import { connectSocket, emitProviderLocation, joinRequestRoom, leaveRequestRoom } from '../../src/socket'
import { confirm, notify } from '../../src/confirm'

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  assigned:           { label: 'À démarrer',       color: '#065F46', bg: '#ECFDF5' },
  provider_arriving:  { label: 'En route',          color: '#0369A1', bg: '#E0F2FE' },
  in_progress:        { label: 'Mission en cours',  color: '#5B21B6', bg: '#F5F3FF' },
  completed:          { label: 'Terminée',         color: '#374151', bg: '#F1F5F9' },
  cancelled:          { label: 'Annulée',          color: '#991B1B', bg: '#FEF2F2' },
}

const FLOW_STEPS = [
  { key: 'assigned', label: 'Mission assignée' },
  { key: 'provider_arriving', label: 'En route' },
  { key: 'in_progress', label: 'Intervention en cours' },
  { key: 'completed', label: 'Mission terminée' },
] as const

function getStepState(currentStatus: string, stepKey: string): 'done' | 'active' | 'todo' {
  if (currentStatus === 'cancelled') return 'todo'
  const order: Record<string, number> = { assigned: 0, provider_arriving: 1, in_progress: 2, completed: 3 }
  const current = order[currentStatus] ?? 0
  const target = order[stepKey] ?? 0
  if (target < current) return 'done'
  if (target === current) return 'active'
  return 'todo'
}

function normalizeId(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) return value[0] || null
  return value || null
}

function formatMoney(value: unknown): string {
  const amount = Number(value)
  if (!Number.isFinite(amount) || amount < 0) return 'Non renseigné'
  return `${amount.toLocaleString('fr-FR')} FCFA`
}

function formatDateTime(value: unknown): string {
  if (!value) return 'Non renseignée'
  const d = new Date(String(value))
  if (Number.isNaN(d.getTime())) return 'Non renseignée'
  return d.toLocaleString('fr-FR')
}

function isImageMedia(type: unknown, url: unknown): boolean {
  const mediaType = String(type || '').toLowerCase()
  if (mediaType === 'image') return true
  const mediaUrl = String(url || '')
  return /\.(png|jpe?g|gif|webp|bmp|heic|heif)$/i.test(mediaUrl)
}

function resolveMediaUrl(rawUrl: unknown): string | null {
  if (typeof rawUrl !== 'string') return null
  const v = rawUrl.trim()
  if (!v) return null
  if (/^(https?:|file:|blob:|data:)/i.test(v)) return v
  const base = getBaseUrl().replace(/\/$/, '')
  if (v.startsWith('/')) return `${base}${v}`
  return `${base}/${v}`
}

function getMediaLabel(type: unknown): string {
  const mediaType = String(type || '').toLowerCase()
  if (mediaType === 'audio') return 'Audio'
  if (mediaType === 'video') return 'Vidéo'
  if (mediaType === 'image') return 'Image'
  return 'Fichier'
}

function hasValidCoords(location: any): location is { coordinates: [number, number]; address?: string } {
  return (
    Array.isArray(location?.coordinates)
    && location.coordinates.length === 2
    && Number.isFinite(Number(location.coordinates[0]))
    && Number.isFinite(Number(location.coordinates[1]))
  )
}

export default function ActiveMission() {
  const { id } = useLocalSearchParams<{ id?: string | string[] }>()
  const requestId = normalizeId(id)
  const [item, setItem] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [updating, setUpdating] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const load = useCallback(async (isRefresh = false) => {
    if (!requestId) return
    if (isRefresh) setRefreshing(true)
    else setLoading(true)
    setErr(null)
    try {
      const r = await apiGet(`/api/services/requests/${requestId}`)
      setItem(r.item)
    } catch (e: any) { setErr(e.message) }
    finally {
      if (isRefresh) setRefreshing(false)
      else setLoading(false)
    }
  }, [requestId])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (!requestId) return
    const socket = connectSocket()
    joinRequestRoom(requestId)
    let mounted = true

    const syncMission = async () => {
      try {
        const r = await apiGet(`/api/services/requests/${requestId}`)
        if (mounted) setItem(r.item)
      } catch {
        // no-op: fallback silencieux pour éviter un bruit d'erreur inutile
      }
    }

    const handleStatusChanged = (data: any) => {
      if (String(data.requestId) === String(requestId)) {
        syncMission()
      }
    }

    socket.on('request:status-changed', handleStatusChanged)

    // Fallback périodique si WS manque un event
    const interval = setInterval(() => {
      syncMission()
    }, 15000)

    return () => {
      mounted = false
      clearInterval(interval)
      leaveRequestRoom(requestId)
      socket.off('request:status-changed', handleStatusChanged)
    }
  }, [requestId])

  useEffect(() => {
    if (!requestId || item?.status !== 'provider_arriving') return
    let cancelled = false
    let timer: ReturnType<typeof setInterval> | null = null

    const publishLocation = async () => {
      try {
        const perm = await Location.requestForegroundPermissionsAsync()
        if (perm.status !== 'granted' || cancelled) return
        const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })
        if (cancelled) return
        emitProviderLocation(requestId, {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          heading: pos.coords.heading,
          speed: pos.coords.speed,
        })
      } catch {}
    }

    publishLocation()
    timer = setInterval(publishLocation, 10000)

    return () => {
      cancelled = true
      if (timer) clearInterval(timer)
    }
  }, [requestId, item?.status])

  const doUpdateStatus = async (nextStatus: string) => {
    if (!requestId) return
    setUpdating(true)
    try {
      const r = await apiPatchQueued(
        `/api/services/requests/${requestId}`,
        { status: nextStatus },
        'Changement de statut enregistré — sera envoyé dès le retour réseau.'
      )
      if (r) await load(true)
    } catch (e: any) { notify('Erreur', e.message) }
    finally { setUpdating(false) }
  }

  const handleArriving = async () => {
    const ok = await confirm('En route', 'Confirmer que vous êtes en route ?')
    if (!ok) return
    doUpdateStatus('provider_arriving')
  }

  const handleStart = async () => {
    const ok = await confirm('Démarrer', 'Confirmer le démarrage de la mission ?')
    if (!ok) return
    doUpdateStatus('in_progress')
  }

  const handleComplete = async () => {
    const ok = await confirm('Terminer', 'Marquer cette mission comme terminée ?')
    if (!ok) return
    doUpdateStatus('completed')
  }

  if (loading && !item) return (
    <SafeAreaView style={s.safe}><ActivityIndicator style={{ marginTop: 40 }} color="#0F172A" /></SafeAreaView>
  )

  if (!requestId) return (
    <SafeAreaView style={s.safe}>
      <View style={s.centerBlock}>
        <Text style={s.err}>Mission invalide</Text>
      </View>
    </SafeAreaView>
  )

  const openMedia = async (url?: string) => {
    const mediaUrl = resolveMediaUrl(url)
    if (!mediaUrl) {
      notify('Média indisponible', 'Lien du média invalide')
      return
    }
    try {
      const canOpen = await Linking.canOpenURL(mediaUrl)
      if (!canOpen) {
        notify('Média indisponible', 'Impossible d’ouvrir ce lien')
        return
      }
      await Linking.openURL(mediaUrl)
    } catch {
      notify('Média indisponible', 'Impossible d’ouvrir ce média')
    }
  }

  const st = item ? STATUS_CONFIG[item.status] || STATUS_CONFIG.assigned : null
  const loc = item?.location
  const offer = item?.acceptedOffer
  const hasCoords = hasValidCoords(loc)
  const lat = hasCoords ? Number(loc.coordinates[1]) : 0
  const lng = hasCoords ? Number(loc.coordinates[0]) : 0
  const locationAddress = typeof item?.location?.address === 'string' ? item.location.address : undefined
  const missionRef = item?._id ? String(item._id).slice(-6).toUpperCase() : '------'
  const etaLabel = Number.isFinite(Number(offer?.etaMinutes)) ? `${Math.max(0, Math.round(Number(offer?.etaMinutes)))} min` : 'Non renseignée'

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Text style={s.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>Mission active</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        contentContainerStyle={s.body}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />}
      >
        {err && <Text style={s.err}>{err}</Text>}

        {item && (
          <>
            <View style={[s.statusBanner, { backgroundColor: st?.bg }]}>
              <Text style={[s.statusText, { color: st?.color }]}>{st?.label}</Text>
            </View>

            {item.status !== 'cancelled' && (
              <View style={s.card}>
                <Text style={s.cardTitle}>Progression</Text>
                <View style={s.timeline}>
                  {FLOW_STEPS.map((step, idx) => {
                    const state = getStepState(item.status, step.key)
                    return (
                      <View key={step.key} style={s.timelineRow}>
                        <View style={s.timelineLeft}>
                          <View style={[
                            s.timelineDot,
                            state === 'done' && s.timelineDotDone,
                            state === 'active' && s.timelineDotActive,
                          ]} />
                          {idx < FLOW_STEPS.length - 1 && <View style={s.timelineLine} />}
                        </View>
                        <Text style={[
                          s.timelineLabel,
                          state === 'active' && s.timelineLabelActive,
                          state === 'done' && s.timelineLabelDone,
                        ]}>{step.label}</Text>
                      </View>
                    )
                  })}
                </View>
              </View>
            )}

            <View style={s.card}>
              <Text style={s.cardTitle}>Détails mission</Text>
              <View style={s.detailRow}>
                <Text style={s.detailLabel}>Référence</Text>
                <Text style={s.detailValue}>#{missionRef}</Text>
              </View>
              <View style={s.detailRow}>
                <Text style={s.detailLabel}>Catégorie</Text>
                <Text style={s.detailValue}>{item.category || 'Non renseignée'}</Text>
              </View>
              <View style={s.detailRow}>
                <Text style={s.detailLabel}>Budget client</Text>
                <Text style={s.detailValue}>{formatMoney(item.budget)}</Text>
              </View>
              <View style={s.detailRow}>
                <Text style={s.detailLabel}>Créée le</Text>
                <Text style={s.detailValue}>{formatDateTime(item.createdAt)}</Text>
              </View>
              <View style={s.detailRow}>
                <Text style={s.detailLabel}>Votre offre</Text>
                <Text style={s.detailValue}>{offer ? `${formatMoney(offer.price)} · ETA ${etaLabel}` : 'Non disponible'}</Text>
              </View>
            </View>

            {/* Client / Demande */}
            <View style={s.card}>
              <Text style={s.cardTitle}>Demande</Text>
              <Text style={s.descText}>{item.description || '—'}</Text>
              {item.budget ? <Text style={s.meta}>Budget estimé: {item.budget.toLocaleString('fr-FR')} FCFA</Text> : null}
            </View>

            {/* Médias */}
            {item.media && item.media.length > 0 && (
              <View style={s.card}>
                <Text style={s.cardTitle}>Médias client</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    {item.media.map((m: any, i: number) => {
                      const mediaUrl = resolveMediaUrl(m?.url)
                      const asImage = mediaUrl && isImageMedia(m?.type, mediaUrl)
                      return asImage
                        ? (
                            <Image key={i} source={{ uri: mediaUrl }} style={s.mediaThumb} />
                          )
                        : (
                            <TouchableOpacity key={i} style={s.mediaFile} onPress={() => openMedia(m?.url)}>
                              <Text style={s.mediaFileType}>{getMediaLabel(m?.type)}</Text>
                              <Text style={s.mediaFileText} numberOfLines={2}>{m?.title || 'Ouvrir le média'}</Text>
                            </TouchableOpacity>
                          )
                    })}
                  </View>
                </ScrollView>
              </View>
            )}

            {/* Carte */}
            {hasCoords && (
              <View style={s.card}>
                <Text style={s.cardTitle}>Adresse client</Text>
                <Text style={s.meta}>{locationAddress || `${lat.toFixed(5)}, ${lng.toFixed(5)}`}</Text>
                <MapView
                  style={{ width: '100%', height: 220, borderRadius: 12, marginTop: 8 }}
                  initialRegion={{
                    latitude: lat,
                    longitude: lng,
                    latitudeDelta: 0.02,
                    longitudeDelta: 0.02,
                  }}
                >
                  <Marker coordinate={{ latitude: lat, longitude: lng }} />
                </MapView>
              </View>
            )}

            {/* Chat */}
            {['assigned', 'provider_arriving', 'in_progress'].includes(item.status) && (
              <TouchableOpacity
                style={s.chatBtn}
                onPress={() => router.push(`/mission-chat?id=${requestId}`)}
              >
                <Text style={s.chatBtnText}>💬 Contacter le client</Text>
              </TouchableOpacity>
            )}

            {/* Actions */}
            <View style={{ gap: 10, marginTop: 8 }}>
              {item.status === 'assigned' && (
                <TouchableOpacity style={[s.actionBtn, s.arrivingBtn]} onPress={handleArriving} disabled={updating}>
                  <Text style={s.arrivingBtnText}>🚗 Je suis en route</Text>
                </TouchableOpacity>
              )}
              {item.status === 'provider_arriving' && (
                <TouchableOpacity style={[s.actionBtn, s.startBtn]} onPress={handleStart} disabled={updating}>
                  <Text style={s.startBtnText}>Démarrer la mission</Text>
                </TouchableOpacity>
              )}
              {item.status === 'in_progress' && (
                <TouchableOpacity style={[s.actionBtn, s.completeBtn]} onPress={handleComplete} disabled={updating}>
                  <Text style={s.completeBtnText}>Terminer la mission</Text>
                </TouchableOpacity>
              )}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14 },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  backIcon: { fontSize: 18, color: '#111827' },
  headerTitle: { flex: 1, fontSize: 17, fontWeight: '700', color: '#111827', textAlign: 'center' },
  centerBlock: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  body: { padding: 20, paddingBottom: 40, gap: 16 },
  err: { color: '#DC2626', fontSize: 13, textAlign: 'center' },
  statusBanner: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 10, alignItems: 'center' },
  statusText: { fontSize: 14, fontWeight: '700' },
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 16, gap: 8, borderWidth: 1, borderColor: '#E2E8F0' },
  cardTitle: { fontSize: 13, fontWeight: '600', color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.5 },
  descText: { fontSize: 14, color: '#374151', lineHeight: 22 },
  meta: { fontSize: 13, color: '#64748B' },
  detailRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  detailLabel: { fontSize: 13, color: '#64748B' },
  detailValue: { flex: 1, textAlign: 'right', fontSize: 13, color: '#1E293B', fontWeight: '600' },
  timeline: { gap: 8 },
  timelineRow: { flexDirection: 'row', alignItems: 'flex-start' },
  timelineLeft: { width: 20, alignItems: 'center' },
  timelineDot: { width: 11, height: 11, borderRadius: 6, backgroundColor: '#CBD5E1', marginTop: 2 },
  timelineDotDone: { backgroundColor: '#16A34A' },
  timelineDotActive: { backgroundColor: '#2563EB' },
  timelineLine: { width: 2, flex: 1, backgroundColor: '#E2E8F0', marginTop: 4, marginBottom: -4 },
  timelineLabel: { fontSize: 13, color: '#94A3B8', paddingBottom: 10 },
  timelineLabelActive: { color: '#1E293B', fontWeight: '700' },
  timelineLabelDone: { color: '#15803D', fontWeight: '600' },
  mediaThumb: { width: 100, height: 100, borderRadius: 10 },
  mediaFile: { width: 140, height: 100, borderRadius: 10, borderWidth: 1, borderColor: '#CBD5E1', backgroundColor: '#F8FAFC', padding: 10, justifyContent: 'center', gap: 4 },
  mediaFileType: { fontSize: 11, color: '#334155', fontWeight: '700', textTransform: 'uppercase' },
  mediaFileText: { fontSize: 12, color: '#475569', lineHeight: 16 },
  actionBtn: { borderRadius: 12, padding: 16, alignItems: 'center' },
  startBtn: { backgroundColor: '#0F172A' },
  startBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  completeBtn: { backgroundColor: '#16A34A' },
  completeBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  chatBtn: { backgroundColor: '#EFF6FF', borderRadius: 10, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: '#BFDBFE' },
  chatBtnText: { color: '#1D4ED8', fontWeight: '700', fontSize: 14 },
  arrivingBtn: { backgroundColor: '#E0F2FE', borderWidth: 1, borderColor: '#7DD3FC' },
  arrivingBtnText: { color: '#0369A1', fontWeight: '700', fontSize: 15 },
})
