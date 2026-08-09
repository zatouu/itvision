import { useLocalSearchParams, router } from 'expo-router'
import { useEffect, useState, useCallback } from 'react'
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, AppState, AppStateStatus, Modal, Pressable } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Image } from 'expo-image'
import { SkeletonCard } from '../../src/components/Skeleton'
import * as Location from 'expo-location'
import { MapPin, Mic, Check, Volume2, Play, X } from 'lucide-react-native'
import { useTranslation } from 'react-i18next'
import AppHeader from '../../src/components/AppHeader'
import StickyBottomBar from '../../src/components/StickyBottomBar'
import Button from '../../src/components/Button'
import StatusChip from '../../src/components/StatusChip'
import { getCategoryMeta, colors, spacing, radius, shadows, typography } from '../../src/design'
import VoicePlayer from '../../src/components/VoicePlayer'
import { apiGet } from '../../src/api'
import { toast } from '../../src/toast'
import { resolveMediaUrl } from '../../src/media'
import { Video, ResizeMode } from 'expo-av'
import { connectSocket, joinRequestRoom, leaveRequestRoom, emitProviderLocation, emitRequestViewing, emitStopViewing } from '../../src/socket'
import { getProviderName } from '../../src/user-profile'

const DEGS_TO_RADS = Math.PI / 180
function haversineM(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const dLat = (b.lat - a.lat) * DEGS_TO_RADS
  const dLng = (b.lng - a.lng) * DEGS_TO_RADS
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * DEGS_TO_RADS) * Math.cos(b.lat * DEGS_TO_RADS) * Math.sin(dLng / 2) ** 2
  return 2 * 6371000 * Math.asin(Math.sqrt(x))
}

export default function NearbyRequestDetail() {
  const { t } = useTranslation()
  const { id } = useLocalSearchParams<{ id: string }>()
  const [request, setRequest] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [myLocation, setMyLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [fullMedia, setFullMedia] = useState<{ uri: string; type: string } | null>(null)

  const load = useCallback(async () => {
    if (!id) return
    setLoading(true)
    try {
      const r = await apiGet(`/api/services/requests/${id}`)
      setRequest(r.item || r)
    } catch (e: any) {
      toast.error(t('common.error'), e?.message || t('nearby.loadError'))
    } finally {
      setLoading(false)
    }
  }, [id, t])

  useEffect(() => { load() }, [load])

  // Localisation provider + room + émission position temps réel
  useEffect(() => {
    if (!id) return
    let mounted = true
    let locInterval: any = null

    const startLocation = async () => {
      try {
        const perm = await Location.getForegroundPermissionsAsync()
        if (perm.status !== 'granted') {
          const req = await Location.requestForegroundPermissionsAsync()
          if (req.status !== 'granted') return
        }
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })
        const { latitude, longitude } = loc.coords
        if (!mounted) return
        setMyLocation({ lat: latitude, lng: longitude })
        const socket = connectSocket()
        joinRequestRoom(id)
        emitProviderLocation(id, { lat: latitude, lng: longitude })
        emitRequestViewing(id, getProviderName(), latitude, longitude)
        locInterval = setInterval(async () => {
          try {
            const fresh = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })
            if (mounted) {
              setMyLocation({ lat: fresh.coords.latitude, lng: fresh.coords.longitude })
              emitProviderLocation(id, { lat: fresh.coords.latitude, lng: fresh.coords.longitude })
              emitRequestViewing(id, getProviderName(), fresh.coords.latitude, fresh.coords.longitude)
            }
          } catch {}
        }, 10_000)
      } catch {}
    }

    const stopLocation = () => {
      if (locInterval) { clearInterval(locInterval); locInterval = null }
    }

    const handleAppStateChange = (nextState: AppStateStatus) => {
      if (nextState === 'active') startLocation()
      else stopLocation()
    }

    startLocation()
    const sub = AppState.addEventListener('change', handleAppStateChange)

    return () => {
      mounted = false
      stopLocation()
      sub.remove()
      leaveRequestRoom(id)
      emitStopViewing(id)
    }
  }, [id])

  const distLabel = (m?: number) => {
    if (!m && m !== 0) return ''
    if (m < 1000) return `${Math.round(m)} m`
    return `${(m / 1000).toFixed(1)} km`
  }

  const distance = request?.location?.lat && request?.location?.lng && myLocation
    ? haversineM(myLocation, request.location)
    : undefined

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
        <AppHeader title={t('providerNearby.request')} onBack={() => router.back()} />
        <ScrollView contentContainerStyle={{ padding: 16 }}>
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </ScrollView>
      </SafeAreaView>
    )
  }

  if (!request) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
        <AppHeader title={t('providerNearby.request')} onBack={() => router.back()} />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: colors.textSecondary }}>{t('providerNearby.notFound')}</Text>
        </View>
      </SafeAreaView>
    )
  }

  const meta = getCategoryMeta(request.category)
  const postedAt = request.createdAt ? new Date(request.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : ''
  const initials = (request.clientName || 'CL').slice(0, 2).toUpperCase()

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <AppHeader title={t('providerNearby.request')} onBack={() => router.back()} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 160 }}>
        <View style={s.categoryRow}>
          <View style={[s.categoryIcon, { backgroundColor: meta.bg }]}>
            <Text style={[s.categoryAbbr, { color: meta.color }]}>{meta.label.slice(0, 2).toUpperCase()}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.category}>{meta.label}</Text>
            <Text style={s.subCategory}>{request.subCategory || request.description?.slice(0, 40)}</Text>
          </View>
        </View>

        <View style={s.pills}>
          <StatusChip label={`${t('providerNearby.posted')} ${postedAt}`} variant="neutral" small />
          {distance !== undefined ? <StatusChip label={distLabel(distance)} variant="info" small /> : null}
          <StatusChip label={t('providerNearby.urgent')} variant="warning" small />
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>{t('providerNearby.location')}</Text>
          <View style={s.locationRow}>
            <MapPin size={18} color={colors.textSecondary} />
            <Text style={s.locationText}>{request.location?.address || request.address || ''}</Text>
          </View>
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>{t('providerNearby.description')}</Text>
          <Text style={s.description}>{request.description || '—'}</Text>
        </View>

        {request.media?.some((m: any) => m.type === 'audio') && (() => {
          const audioMedia = request.media.find((m: any) => m.type === 'audio')
          return (
            <View style={s.section}>
              <View style={s.audioBadge}>
                <Volume2 size={16} color="#1DC3F0" />
                <Text style={s.audioBadgeText}>{t('providerNearby.voiceMessage')}</Text>
              </View>
              <VoicePlayer uri={resolveMediaUrl(audioMedia.url || audioMedia.uri)} />
            </View>
          )
        })()}

        {request.media && request.media.some((m: any) => ['image', 'video'].includes(m.type || 'image')) ? (
          <View style={s.section}>
            <Text style={s.sectionTitle}>{t('providerNearby.media')}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={{ flexDirection: 'row', gap: spacing.md }}>
                {request.media.filter((m: any) => ['image', 'video'].includes(m.type || 'image')).map((m: any, i: number) => {
                  const uri = resolveMediaUrl(m.url || m.uri)
                  const isVideo = m.type === 'video'
                  return (
                    <TouchableOpacity key={i} style={s.thumb} onPress={() => setFullMedia({ uri, type: m.type || 'image' })}>
                      {isVideo ? (
                        <View style={s.thumbImage}>
                          <Video
                            source={{ uri }}
                            style={StyleSheet.absoluteFill}
                            resizeMode={ResizeMode.COVER}
                            shouldPlay={false}
                            isLooping={false}
                            useNativeControls={false}
                          />
                          <View style={s.playOverlay}>
                            <Play size={24} color="#fff" fill="#fff" />
                          </View>
                        </View>
                      ) : (
                        <Image source={{ uri }} style={s.thumbImage} contentFit="cover" />
                      )}
                    </TouchableOpacity>
                  )
                })}
              </View>
            </ScrollView>
          </View>
        ) : null}

        <Modal visible={!!fullMedia} transparent animationType="fade" onRequestClose={() => setFullMedia(null)}>
          <Pressable style={s.modalOverlay} onPress={() => setFullMedia(null)}>
            <View style={s.modalContent}>
              <TouchableOpacity style={s.modalClose} onPress={() => setFullMedia(null)}>
                <X size={24} color="#fff" />
              </TouchableOpacity>
              {fullMedia?.type === 'video' ? (
                <Video
                  source={{ uri: fullMedia.uri }}
                  style={s.fullMedia}
                  resizeMode={ResizeMode.CONTAIN}
                  useNativeControls
                  shouldPlay
                  isLooping={false}
                />
              ) : fullMedia ? (
                <Image source={{ uri: fullMedia.uri }} style={s.fullMedia} contentFit="contain" />
              ) : null}
            </View>
          </Pressable>
        </Modal>

        <View style={s.detailCard}>
          <Text style={s.sectionTitle}>{t('providerNearby.details')}</Text>
          <View style={s.detailRow}>
            <Text style={s.detailLabel}>{t('providerNearby.budget')}</Text>
            <Text style={s.detailValue}>{request.budget ? `${Number(request.budget).toLocaleString('fr-FR')} FCFA` : t('providerNearby.budgetNone')}</Text>
          </View>
          <View style={s.detailRow}>
            <Text style={s.detailLabel}>{t('providerNearby.reference')}</Text>
            <Text style={s.detailValue}>#{String(request._id).slice(-6).toUpperCase()}</Text>
          </View>
          <View style={s.detailRow}>
            <Text style={s.detailLabel}>{t('providerNearby.payment')}</Text>
            <Text style={s.detailValue}>{t('providerNearby.cashOrMobile')}</Text>
          </View>
        </View>

        <View style={s.clientCard}>
          <View style={s.clientAvatar}>
            <Text style={s.clientInitials}>{initials}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.clientName}>{t('providerNearby.client')}</Text>
            <Text style={s.clientSub}>{t('providerNearby.verifiedClient')}</Text>
          </View>
          <View style={s.trustBadge}>
            <Check size={12} color={colors.success} />
            <Text style={s.trustText}>{t('providerNearby.trust')}</Text>
          </View>
        </View>
      </ScrollView>

      <StickyBottomBar>
        <View style={s.bottomActions}>
          <Button
            title={t('providerNearby.askQuestion')}
            variant="outline"
            onPress={() => router.push(`/mission-chat?id=${request._id}`)}
            fullWidth={false}
          />
          <View style={{ width: spacing.md }} />
          <Button
            title={t('providerNearby.makeOffer')}
            onPress={() => router.push(`/offer/create?requestId=${request._id}`)}
            fullWidth={false}
          />
        </View>
      </StickyBottomBar>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
  },
  categoryIcon: {
    width: 56,
    height: 56,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryAbbr: { fontSize: 18, fontWeight: typography.weight.extrabold as any },
  category: { fontSize: typography.lg.fontSize, fontWeight: typography.weight.extrabold as any, color: colors.text },
  subCategory: { fontSize: typography.sm.fontSize, color: colors.textSecondary, marginTop: 2 },
  pills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
  },
  section: { marginHorizontal: spacing.lg, marginTop: spacing.xl },
  sectionTitle: {
    fontSize: typography.sm.fontSize,
    fontWeight: typography.weight.extrabold as any,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  locationIcon: { fontSize: 16 },
  locationText: { fontSize: typography.base.fontSize, color: colors.text, fontWeight: typography.weight.medium as any, flex: 1 },
  description: { fontSize: typography.base.fontSize, color: colors.textSecondary, lineHeight: 22 },
  audioBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#E0F7FF', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, alignSelf: 'flex-start', marginBottom: 8 },
  audioBadgeText: { fontSize: 12, fontWeight: '700', color: '#0369A1' },
  thumb: { width: 80, height: 80, borderRadius: radius.lg, overflow: 'hidden' },
  thumbImage: { width: '100%', height: '100%' },
  audioThumb: {
    flex: 1,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  audioIcon: { fontSize: 24 },
  playOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
  },
  modalContent: {
    width: '100%',
    height: '80%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalClose: {
    position: 'absolute',
    top: 0,
    right: 0,
    zIndex: 10,
    padding: spacing.sm,
  },
  fullMedia: {
    width: '100%',
    height: '100%',
    borderRadius: radius.lg,
  },
  detailCard: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.xl,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  detailRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing.sm },
  detailLabel: { fontSize: typography.base.fontSize, color: colors.textSecondary },
  detailValue: { fontSize: typography.base.fontSize, color: colors.text, fontWeight: typography.weight.extrabold as any },
  clientCard: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  clientAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.navy,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clientInitials: { fontSize: 16, color: colors.surface, fontWeight: typography.weight.extrabold as any },
  clientName: { fontSize: typography.base.fontSize, fontWeight: typography.weight.extrabold as any, color: colors.text },
  clientSub: { fontSize: typography.sm.fontSize, color: colors.textSecondary, marginTop: 2 },
  trustBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.successLight,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  trustText: { fontSize: typography.sm.fontSize, color: colors.success, fontWeight: typography.weight.extrabold as any },
  bottomActions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
})
