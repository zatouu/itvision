import { useEffect, useMemo, useRef } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, Linking, Animated, Easing } from 'react-native'
import MapView, { Marker, Polyline, PROVIDER_DEFAULT } from 'react-native-maps'
import { router } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { Phone, MessageCircle, Star, LocateFixed, Check } from 'lucide-react-native'
import { radius, spacing, typography } from '../../design'

// Hero palette — matches the Mission Control design (variant A)
const INK = '#0D1520'
const GREEN = '#16A574'
const MUTED = '#8A97AD'
const TEXT_SOFT = '#B6C4D8'
const AMBER = '#F5A524'
const GLASS = 'rgba(255,255,255,0.10)'
const GLASS_BORDER = 'rgba(255,255,255,0.14)'

export type HeroLiveProvider = {
  providerId: string
  name?: string
  status: string
  lat: number
  lng: number
  etaMinutes?: number | null
}

type LatLng = { lat: number; lng: number }

export interface MissionHeroProps {
  mission: any
  title: string
  categoryColor: string
  liveProvider?: HeroLiveProvider | null
  userLocation?: LatLng | null
}

// Status -> step index on the 4-step tracker
const STEP_INDEX: Record<string, number> = {
  accepted: 0,
  assigned: 0,
  on_the_way: 1,
  provider_arriving: 2,
  in_progress: 3,
}

function PulseDot({ color = GREEN, size = 8 }: { color?: string; size?: number }) {
  const anim = useRef(new Animated.Value(0)).current
  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(anim, { toValue: 1, duration: 1600, easing: Easing.out(Easing.ease), useNativeDriver: true })
    )
    loop.start()
    return () => loop.stop()
  }, [anim])
  return (
    <View style={{ width: size, height: size }}>
      <View style={[StyleSheet.absoluteFillObject, { borderRadius: size / 2, backgroundColor: color }]} />
      <Animated.View
        style={[StyleSheet.absoluteFillObject, {
          borderRadius: size / 2,
          backgroundColor: color,
          opacity: anim.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0] }),
          transform: [{ scale: anim.interpolate({ inputRange: [0, 1], outputRange: [1, 2.2] }) }],
        }]}
      />
    </View>
  )
}

export default function MissionHero({ mission, title, categoryColor, liveProvider, userLocation }: MissionHeroProps) {
  const { t } = useTranslation()
  const offer = mission?.acceptedOffer || {}

  const providerName = offer.providerName || liveProvider?.name || t('mission.defaultProvider')
  const initials = providerName.trim().split(/\s+/).map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()
  const rating = Number(offer.providerRating?.avg) || null
  const eta = Number.isFinite(Number(liveProvider?.etaMinutes))
    ? Math.max(0, Math.round(Number(liveProvider!.etaMinutes)))
    : Number.isFinite(Number(offer.etaMinutes)) ? Math.max(0, Math.round(Number(offer.etaMinutes))) : null

  const status = mission?.status || 'assigned'
  const stepIndex = STEP_INDEX[status] ?? 0
  const stepKeys = ['home.stepAssigned', 'home.stepEnRoute', 'home.stepArriving', 'home.stepInProgress']
  const statusTextKey: Record<string, string> = {
    accepted: 'mission.step_assigned',
    assigned: 'mission.step_assigned',
    on_the_way: 'mission.step_arriving',
    provider_arriving: 'mission.step_arriving',
    in_progress: 'mission.step_in_progress',
  }
  const statusText = t(statusTextKey[status] || 'mission.step_assigned')

  const destCoord: LatLng | null = mission?.location?.coordinates
    ? { lat: mission.location.coordinates[1], lng: mission.location.coordinates[0] }
    : null
  const providerCoord: LatLng | null =
    liveProvider && Number.isFinite(liveProvider.lat) && Number.isFinite(liveProvider.lng)
      ? { lat: liveProvider.lat, lng: liveProvider.lng }
      : null
  const lineEnd = destCoord || userLocation

  const region = useMemo(() => {
    const pts = [providerCoord, destCoord, userLocation].filter(Boolean) as LatLng[]
    if (pts.length === 0) return null
    const lats = pts.map(p => p.lat)
    const lngs = pts.map(p => p.lng)
    const minLat = Math.min(...lats), maxLat = Math.max(...lats)
    const minLng = Math.min(...lngs), maxLng = Math.max(...lngs)
    return {
      latitude: (minLat + maxLat) / 2,
      longitude: (minLng + maxLng) / 2,
      latitudeDelta: Math.max((maxLat - minLat) * 2.2, 0.02),
      longitudeDelta: Math.max((maxLng - minLng) * 2.2, 0.02),
    }
  }, [providerCoord?.lat, providerCoord?.lng, destCoord?.lat, destCoord?.lng, userLocation?.lat, userLocation?.lng])

  const callProvider = () => {
    if (offer.providerPhone) Linking.openURL(`tel:${offer.providerPhone}`).catch(() => {})
  }
  const openChat = () => {
    const q = `id=${mission._id}&providerName=${encodeURIComponent(providerName)}${offer.providerPhone ? `&providerPhone=${encodeURIComponent(offer.providerPhone)}` : ''}`
    router.push(`/mission-chat?${q}` as any)
  }
  const openDetails = () => router.push(`/mission/${mission._id}` as any)

  return (
    <View style={s.hero}>
      {/* Header */}
      <View style={s.heroHead}>
        <View style={s.heroHeadLeft}>
          <PulseDot />
          <Text style={s.heroHeadLabel}>{t('home.missionActive')}</Text>
        </View>
        <TouchableOpacity style={s.detailsPill} onPress={openDetails} activeOpacity={0.75}>
          <Text style={s.detailsPillText}>{t('home.details')} →</Text>
        </TouchableOpacity>
      </View>

      {/* Live map slice */}
      {region && (
        <View style={s.mapWrap}>
          <MapView
            provider={PROVIDER_DEFAULT}
            style={StyleSheet.absoluteFillObject}
            initialRegion={region}
            region={region}
            scrollEnabled={false}
            zoomEnabled={false}
            pitchEnabled={false}
            rotateEnabled={false}
            toolbarEnabled={false}
            showsCompass={false}
            showsMyLocationButton={false}
            pointerEvents="none"
          >
            {providerCoord && lineEnd && (lineEnd.lat !== providerCoord.lat || lineEnd.lng !== providerCoord.lng) && (
              <Polyline
                coordinates={[
                  { latitude: providerCoord.lat, longitude: providerCoord.lng },
                  { latitude: lineEnd.lat, longitude: lineEnd.lng },
                ]}
                strokeColor="#2E7EF5"
                strokeWidth={4}
                lineCap="round"
              />
            )}
            {destCoord && (
              <Marker coordinate={{ latitude: destCoord.lat, longitude: destCoord.lng }} anchor={{ x: 0.5, y: 0.5 }} tracksViewChanges={false}>
                <View style={s.userPinOuter}>
                  <View style={s.userPin} />
                </View>
              </Marker>
            )}
            {userLocation && !destCoord && (
              <Marker coordinate={{ latitude: userLocation.lat, longitude: userLocation.lng }} anchor={{ x: 0.5, y: 0.5 }} tracksViewChanges={false}>
                <View style={s.userPinOuter}>
                  <View style={s.userPin} />
                </View>
              </Marker>
            )}
            {providerCoord && (
              <Marker coordinate={{ latitude: providerCoord.lat, longitude: providerCoord.lng }} anchor={{ x: 0.5, y: 1 }}>
                <View style={s.providerPin}>
                  <View style={s.providerPinDot} />
                  <Text style={s.providerPinText}>{eta != null ? `${eta} min` : t('mission.providerMarkerTitle')}</Text>
                </View>
              </Marker>
            )}
          </MapView>
          <View style={s.liveBadge}>
            <LocateFixed size={12} color={GREEN} />
            <Text style={s.liveBadgeText}>{t('home.liveTracking')}</Text>
          </View>
        </View>
      )}

      {/* Body */}
      <View style={s.heroBody}>
        <View style={s.providerRow}>
          <View style={s.avatarWrap}>
            <View style={[s.avatar, { backgroundColor: categoryColor }]}>
              <Text style={s.avatarText}>{initials}</Text>
            </View>
            {!!offer.providerVerified && (
              <View style={s.verifiedBadge}>
                <Check size={9} color="#fff" strokeWidth={3.5} />
              </View>
            )}
          </View>
          <View style={s.providerInfo}>
            <Text style={s.providerName} numberOfLines={1}>{providerName}</Text>
            <View style={s.providerMeta}>
              {rating != null && (
                <>
                  <Star size={12} color={AMBER} fill={AMBER} />
                  <Text style={s.ratingText}>{rating.toFixed(1)}</Text>
                  <Text style={s.metaSep}>•</Text>
                </>
              )}
              <Text style={s.providerMetaText} numberOfLines={1}>{title}</Text>
            </View>
          </View>
          {eta != null && (
            <View style={s.etaBlock}>
              <Text style={s.etaLabel}>{t('home.eta')}</Text>
              <Text style={s.etaValue}>{eta} min</Text>
            </View>
          )}
        </View>

        {/* Step tracker */}
        <View style={s.tracker}>
          <View style={s.trackerBars}>
            {stepKeys.map((k, i) => (
              <View key={k} style={[s.trackerBar, i <= stepIndex && s.trackerBarActive]} />
            ))}
          </View>
          <View style={s.trackerLabels}>
            <Text style={s.trackerStatus}>{statusText}</Text>
            <Text style={s.trackerCount}>{t('home.stepProgress', { current: stepIndex + 1, total: stepKeys.length })}</Text>
          </View>
        </View>

        {/* Actions */}
        <View style={s.actions}>
          <TouchableOpacity
            style={[s.actionBtn, s.actionPrimary, !offer.providerPhone && { opacity: 0.5 }]}
            onPress={callProvider}
            activeOpacity={0.8}
            disabled={!offer.providerPhone}
            accessibilityLabel={t('home.call')}
          >
            <Phone size={16} color={INK} />
            <Text style={s.actionPrimaryText}>{t('home.call')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.actionBtn, s.actionGhost]} onPress={openChat} activeOpacity={0.8} accessibilityLabel={t('home.message')}>
            <MessageCircle size={16} color="#fff" />
            <Text style={s.actionGhostText}>{t('home.message')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  )
}

const s = StyleSheet.create({
  hero: {
    backgroundColor: INK,
    borderRadius: 24,
    overflow: 'hidden',
    marginHorizontal: spacing.lg,
    shadowColor: '#0D1520',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
  },
  heroHead: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 14, paddingBottom: 12,
  },
  heroHeadLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  heroHeadLabel: {
    fontSize: 11.5, fontWeight: typography.weight.bold as any, letterSpacing: 0.6,
    textTransform: 'uppercase', color: TEXT_SOFT,
  },
  detailsPill: {
    backgroundColor: GLASS, borderWidth: 1, borderColor: GLASS_BORDER,
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill,
  },
  detailsPillText: { color: '#fff', fontSize: 11.5, fontWeight: typography.weight.bold as any },
  mapWrap: { height: 130, overflow: 'hidden', backgroundColor: '#111826' },
  liveBadge: {
    position: 'absolute', left: 12, top: 12, flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(13,21,32,0.85)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.pill,
  },
  liveBadgeText: { color: '#fff', fontSize: 11, fontWeight: typography.weight.bold as any },
  userPinOuter: {
    width: 22, height: 22, borderRadius: 11, backgroundColor: 'rgba(46,126,245,0.25)',
    alignItems: 'center', justifyContent: 'center',
  },
  userPin: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#2E7EF5', borderWidth: 2.5, borderColor: '#fff' },
  providerPin: {
    flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: INK,
    paddingHorizontal: 9, paddingVertical: 5, borderRadius: radius.pill,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 6, elevation: 4,
  },
  providerPinDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: GREEN },
  providerPinText: { color: '#fff', fontSize: 11, fontWeight: typography.weight.bold as any },
  heroBody: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 16 },
  providerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatarWrap: { position: 'relative' },
  avatar: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontSize: 17, fontWeight: typography.weight.bold as any },
  verifiedBadge: {
    position: 'absolute', right: -2, bottom: -2, width: 18, height: 18, borderRadius: 9,
    backgroundColor: GREEN, borderWidth: 2, borderColor: INK, alignItems: 'center', justifyContent: 'center',
  },
  providerInfo: { flex: 1, minWidth: 0 },
  providerName: { color: '#fff', fontSize: 15, fontWeight: typography.weight.extrabold as any, letterSpacing: -0.2 },
  providerMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  ratingText: { color: '#fff', fontSize: 12.5, fontWeight: typography.weight.bold as any },
  metaSep: { color: '#4B5A72', fontSize: 12.5 },
  providerMetaText: { color: TEXT_SOFT, fontSize: 12.5, flexShrink: 1 },
  etaBlock: { alignItems: 'flex-end' },
  etaLabel: { color: MUTED, fontSize: 10.5, fontWeight: typography.weight.bold as any, letterSpacing: 0.4, textTransform: 'uppercase' },
  etaValue: { color: '#fff', fontSize: 19, fontWeight: typography.weight.extrabold as any, letterSpacing: -0.4 },
  tracker: { marginTop: 14 },
  trackerBars: { flexDirection: 'row', gap: 4 },
  trackerBar: { flex: 1, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.14)' },
  trackerBarActive: { backgroundColor: GREEN },
  trackerLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  trackerStatus: { color: GREEN, fontSize: 12, fontWeight: typography.weight.bold as any },
  trackerCount: { color: MUTED, fontSize: 11.5 },
  actions: { flexDirection: 'row', gap: 8, marginTop: 14 },
  actionBtn: { flex: 1, height: 46, borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  actionPrimary: { backgroundColor: '#fff' },
  actionPrimaryText: { color: INK, fontSize: 13.5, fontWeight: typography.weight.bold as any },
  actionGhost: { backgroundColor: GLASS, borderWidth: 1, borderColor: GLASS_BORDER },
  actionGhostText: { color: '#fff', fontSize: 13.5, fontWeight: typography.weight.bold as any },
})
