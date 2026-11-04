import { createThemedStyles } from '../../theme'
import { useEffect, useMemo, useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, Platform, InteractionManager } from 'react-native'
import { Circle, Marker, PROVIDER_DEFAULT } from 'react-native-maps'
import { useTranslation } from 'react-i18next'
import { ChevronRight, MapPin, Power } from 'lucide-react-native'
import SafeMapView from '../SafeMapView'
import { getCategoryIcon } from '../../categoryIcons'
import { getCategoryMeta, radius, shadows, spacing } from '../../design'

const MAP_HEIGHT = 190
const MAX_MARKERS = 15

type Props = {
  coords: { lat: number; lng: number } | null
  radiusKm: number
  items: any[]
  todayCount: number
  online: boolean
  busy?: boolean
  onPress: () => void
  onGoOnline: () => void
}

/**
 * Aperçu non interactif de la zone du prestataire : cercle du rayon réel et une icône par demande
 * (position approximative fournie par le serveur). Un appui ouvre la carte complète.
 */
export default function NearbyMapCard({ coords, radiusKm, items, todayCount, online, busy, onPress, onGoOnline }: Props) {
  const { colors, s } = useStyles()
  const { t } = useTranslation()

  const markers = useMemo(() => [...items]
    .filter(it => Array.isArray(it?.location?.coordinates) && it.location.coordinates.length === 2)
    .sort((a, b) => (b._score || 0) - (a._score || 0))
    .slice(0, MAX_MARKERS), [items])

  // Les icônes SVG des marqueurs doivent être capturées après leur rendu : la fenêtre de capture
  // redémarre à chaque (re)montage des marqueurs (nouvelles demandes ou passage en ligne)
  const [tracksChanges, setTracksChanges] = useState(true)
  const markerKey = `${online}|${markers.map(m => m._id).join(',')}`
  useEffect(() => {
    setTracksChanges(true)
    const timer = setTimeout(() => setTracksChanges(false), 800)
    return () => clearTimeout(timer)
  }, [markerKey])

  const region = useMemo(() => {
    if (!coords) return null
    const delta = (radiusKm * 2.4) / 111
    return { latitude: coords.lat, longitude: coords.lng, latitudeDelta: delta, longitudeDelta: delta }
  }, [coords?.lat, coords?.lng, radiusKm])

  const count = items.length
  // La carte native (lourde) n'est montée qu'après l'animation d'arrivée sur l'écran : sur les
  // téléphones modestes, la monter pendant la transition saccadait la bascule de mode.
  const [mapMounted, setMapMounted] = useState(false)
  useEffect(() => {
    const task = InteractionManager.runAfterInteractions(() => setMapMounted(true))
    return () => task.cancel()
  }, [])
  const canShowMap = Platform.OS !== 'web' && !!region && mapMounted

  return (
    <TouchableOpacity style={[s.card, shadows.sm]} onPress={onPress} activeOpacity={0.9} accessibilityRole="button"
      accessibilityLabel={`${t('proHome.mapTitle')} : ${t('proHome.mapRequests', { count })}`}>
      <View style={s.mapArea}>
        {canShowMap ? (
          <View style={StyleSheet.absoluteFill} pointerEvents="none">
            <SafeMapView
              provider={PROVIDER_DEFAULT}
              style={StyleSheet.absoluteFill}
              region={region!}
              scrollEnabled={false}
              zoomEnabled={false}
              pitchEnabled={false}
              rotateEnabled={false}
              toolbarEnabled={false}
              showsCompass={false}
              showsMyLocationButton={false}
              showsUserLocation
              fallbackLabel={t('proHome.mapTitle')}
            >
              <Circle
                center={{ latitude: region!.latitude, longitude: region!.longitude }}
                radius={radiusKm * 1000}
                strokeColor="rgba(5,150,105,0.7)"
                strokeWidth={2}
                fillColor="rgba(5,150,105,0.08)"
              />
              {online && markers.map(it => {
                const [lng, lat] = it.location.coordinates
                const color = getCategoryMeta(it.category).color
                const Icon = getCategoryIcon(it.category)
                return (
                  <Marker key={String(it._id)} coordinate={{ latitude: lat, longitude: lng }} anchor={{ x: 0.5, y: 0.5 }} tracksViewChanges={tracksChanges}>
                    <View style={[s.marker, { backgroundColor: color }]}>
                      <Icon size={13} color="#FFFFFF" />
                    </View>
                  </Marker>
                )
              })}
            </SafeMapView>
          </View>
        ) : (
          <View style={s.placeholder}>
            {!region && (
              <>
                <MapPin size={26} color={colors.textMuted} />
                <Text style={s.placeholderText}>{t('proHome.mapNoGps')}</Text>
              </>
            )}
          </View>
        )}

        <View style={s.titleChip} pointerEvents="none">
          <Text style={s.titleChipText}>{t('proHome.mapTitle')}</Text>
          {online && count > 0 && <View style={s.countBadge}><Text style={s.countBadgeText}>{count}</Text></View>}
        </View>

        {!online && (
          <View style={s.offlineOverlay}>
            <Text style={s.offlineText}>{t('proHome.mapOffline')}</Text>
            <TouchableOpacity style={s.goOnlineBtn} onPress={onGoOnline} disabled={busy} activeOpacity={0.85} accessibilityRole="button">
              <Power size={15} color={colors.onPrimary} />
              <Text style={s.goOnlineText}>{t('proHome.goOnline', { defaultValue: 'Passer en ligne' })}</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <View style={s.footer}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={s.footerTitle} numberOfLines={1}>
            {online && count === 0 ? t('proHome.mapEmpty') : t('proHome.mapRequests', { count })}
          </Text>
          <Text style={s.footerSub} numberOfLines={1}>
            {[todayCount > 0 ? t('proHome.mapToday', { count: todayCount }) : null, t('proHome.mapRadius', { km: radiusKm })].filter(Boolean).join(' · ')}
          </Text>
        </View>
        <View style={s.openLink}>
          <Text style={s.openLinkText}>{t('proHome.mapOpen')}</Text>
          <ChevronRight size={16} color={colors.primaryText} />
        </View>
      </View>
    </TouchableOpacity>
  )
}

const useStyles = createThemedStyles(colors => {
  const s = StyleSheet.create({
    card: {
      marginHorizontal: spacing.xl,
      marginTop: spacing.md,
      borderRadius: radius.xl,
      backgroundColor: colors.surface,
      overflow: 'hidden',
    },
    mapArea: { height: MAP_HEIGHT, backgroundColor: colors.bgDeep },
    placeholder: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingHorizontal: spacing.xl },
    placeholderText: { fontSize: 13, color: colors.textSecondary, textAlign: 'center' },
    marker: {
      width: 26,
      height: 26,
      borderRadius: 13,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
      borderColor: '#FFFFFF',
    },
    titleChip: {
      position: 'absolute',
      top: spacing.md,
      left: spacing.md,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: radius.pill,
      backgroundColor: colors.surface,
      ...shadows.sm,
    },
    titleChipText: { fontSize: 12, fontWeight: '800', color: colors.text },
    countBadge: { minWidth: 20, height: 20, borderRadius: 10, paddingHorizontal: 5, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary },
    countBadgeText: { fontSize: 11, fontWeight: '800', color: colors.onPrimary },
    offlineOverlay: {
      ...StyleSheet.absoluteFillObject,
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
      backgroundColor: 'rgba(10,22,40,0.55)',
      paddingHorizontal: spacing.xl,
    },
    offlineText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF', textAlign: 'center' },
    goOnlineBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      minHeight: 44,
      paddingHorizontal: spacing.lg,
      borderRadius: radius.pill,
      backgroundColor: colors.primary,
    },
    goOnlineText: { fontSize: 14, fontWeight: '800', color: colors.onPrimary },
    footer: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
    footerTitle: { fontSize: 15, fontWeight: '800', color: colors.text },
    footerSub: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
    openLink: { flexDirection: 'row', alignItems: 'center', gap: 2 },
    openLinkText: { fontSize: 13, fontWeight: '700', color: colors.primaryText },
  })
  return { colors, s }
})
