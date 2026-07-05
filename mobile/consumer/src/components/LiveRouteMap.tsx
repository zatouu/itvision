import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import { View, Text, StyleSheet, ActivityIndicator, Animated } from 'react-native'
import MapView, { Marker, Polyline, PROVIDER_DEFAULT, AnimatedRegion } from 'react-native-maps'
import { useTranslation } from 'react-i18next'
import { Navigation } from 'lucide-react-native'

export interface RouteInfo {
  polyline: Array<{ lat: number; lng: number }>
  distance: { text: string; value: number }
  duration: { text: string; value: number }
}

export interface LiveRouteMapProps {
  origin?: { lat: number; lng: number } | null
  destination: { lat: number; lng: number }
  destinationLabel?: string
  providerLocation?: { lat: number; lng: number; heading?: number | null } | null
  status?: string
  mode?: 'driving' | 'walking' | 'bicycling'
  onRouteInfo?: (info: { distance: string; duration: string; distanceValue: number; durationValue: number }) => void
}

const ROUTE_REFRESH_MIN_MS = 20000
const ROUTE_REFETCH_MIN_MOVE_M = 80
const DEGS_TO_RADS = Math.PI / 180

function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const dLat = (b.lat - a.lat) * DEGS_TO_RADS
  const dLng = (b.lng - a.lng) * DEGS_TO_RADS
  const lat1 = a.lat * DEGS_TO_RADS
  const lat2 = b.lat * DEGS_TO_RADS
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
  return 2 * 6371 * Math.asin(Math.sqrt(x))
}

function formatKm(meters: number) {
  if (meters < 1000) return `${Math.round(meters)} m`
  return `${(meters / 1000).toFixed(1)} km`
}

function formatDuration(seconds: number) {
  if (seconds < 60) return '< 1 min'
  if (seconds < 3600) return `${Math.round(seconds / 60)} min`
  const h = Math.floor(seconds / 3600)
  const m = Math.round((seconds % 3600) / 60)
  return m > 0 ? `${h} h ${m} min` : `${h} h`
}

function decodePolyline(encoded: string): Array<{ lat: number; lng: number }> {
  const points: Array<{ lat: number; lng: number }> = []
  let index = 0
  let lat = 0
  let lng = 0

  while (index < encoded.length) {
    let b: number
    let shift = 0
    let result = 0
    do {
      b = encoded.charCodeAt(index++) - 63
      result |= (b & 0x1f) << shift
      shift += 5
    } while (b >= 0x20)
    const dlat = (result & 1) !== 0 ? ~(result >> 1) : result >> 1
    lat += dlat

    shift = 0
    result = 0
    do {
      b = encoded.charCodeAt(index++) - 63
      result |= (b & 0x1f) << shift
      shift += 5
    } while (b >= 0x20)
    const dlng = (result & 1) !== 0 ? ~(result >> 1) : result >> 1
    lng += dlng

    points.push({ lat: lat / 1e5, lng: lng / 1e5 })
  }

  return points
}

export function LiveRouteMap({
  origin,
  destination,
  destinationLabel,
  providerLocation,
  status,
  mode = 'driving',
  onRouteInfo,
}: LiveRouteMapProps) {
  const { t } = useTranslation()
  const mapRef = useRef<MapView>(null)
  const [route, setRoute] = useState<RouteInfo | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const lastFetchAt = useRef(0)
  const lastFetchOrigin = useRef<{ lat: number; lng: number } | null>(null)
  const pendingFetch = useRef<ReturnType<typeof setTimeout> | null>(null)
  const headingAnim = useRef(new Animated.Value(0)).current

  const activeOrigin = useMemo(() => {
    if (providerLocation) return { lat: providerLocation.lat, lng: providerLocation.lng }
    return origin || null
  }, [providerLocation, origin])

  const animatedCoordinate = useMemo(() => {
    const init = activeOrigin || destination
    return new AnimatedRegion({
      latitude: init.lat,
      longitude: init.lng,
      latitudeDelta: 0,
      longitudeDelta: 0,
    })
  }, [])

  const hasRoute = !!route?.polyline?.length
  const isTracking = status === 'provider_arriving' || status === 'in_progress' || status === 'assigned'
  const showVehicle = isTracking && activeOrigin

  const fitToRoute = useCallback(() => {
    if (!mapRef.current) return
    const coords: Array<{ latitude: number; longitude: number }> = [
      { latitude: destination.lat, longitude: destination.lng },
    ]
    if (activeOrigin) {
      coords.push({ latitude: activeOrigin.lat, longitude: activeOrigin.lng })
    } else if (route?.polyline?.length) {
      coords.push(...route.polyline.slice(0, 1).map(p => ({ latitude: p.lat, longitude: p.lng })))
    }
    mapRef.current.fitToCoordinates(coords, {
      edgePadding: { top: 60, right: 60, bottom: 120, left: 60 },
      animated: true,
    })
  }, [activeOrigin, destination, route])

  const fetchRoute = useCallback(async () => {
    if (!activeOrigin) return
    const now = Date.now()
    if (now - lastFetchAt.current < ROUTE_REFRESH_MIN_MS) {
      if (pendingFetch.current) clearTimeout(pendingFetch.current)
      pendingFetch.current = setTimeout(() => fetchRoute(), ROUTE_REFRESH_MIN_MS - (now - lastFetchAt.current))
      return
    }
    // Économie API : ne pas refetch si le prestataire n'a presque pas bougé depuis le dernier itinéraire réussi
    if (lastFetchOrigin.current) {
      const movedM = haversineKm(lastFetchOrigin.current, activeOrigin) * 1000
      if (movedM < ROUTE_REFETCH_MIN_MOVE_M) return
    }
    lastFetchAt.current = now
    setLoading(true)
    setError(null)
    try {
      const apiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY
      if (!apiKey) throw new Error('Google Maps API key missing')
      const url =
        `https://maps.googleapis.com/maps/api/directions/json` +
        `?origin=${activeOrigin.lat},${activeOrigin.lng}` +
        `&destination=${destination.lat},${destination.lng}` +
        `&mode=${mode}&key=${apiKey}`
      const res = await fetch(url)
      const data = await res.json()
      if (data.status !== 'OK' || !data.routes?.length) {
        throw new Error(data.status || 'Aucun itinéraire')
      }
      const leg = data.routes[0].legs[0]
      const encoded = data.routes[0].overview_polyline?.points || ''
      const newRoute = {
        polyline: decodePolyline(encoded),
        distance: { text: leg.distance?.text || '', value: leg.distance?.value || 0 },
        duration: { text: leg.duration?.text || '', value: leg.duration?.value || 0 },
      }
      setRoute(newRoute)
      lastFetchOrigin.current = { lat: activeOrigin.lat, lng: activeOrigin.lng }
      if (onRouteInfo) {
        onRouteInfo({
          distance: newRoute.distance.text || formatKm(newRoute.distance.value),
          duration: newRoute.duration.text || formatDuration(newRoute.duration.value),
          distanceValue: newRoute.distance.value,
          durationValue: newRoute.duration.value,
        })
      }
    } catch (e: any) {
      const dist = haversineKm(activeOrigin, destination)
      const durationSec = Math.round((dist / 30) * 3600)
      const fallback = { distance: formatKm(dist * 1000), duration: formatDuration(durationSec), distanceValue: Math.round(dist * 1000), durationValue: durationSec }
      setError(e.message || t('common.error'))
      if (onRouteInfo) onRouteInfo(fallback)
    } finally {
      setLoading(false)
    }
  }, [activeOrigin, destination, mode, onRouteInfo, t])

  useEffect(() => {
    if (!activeOrigin) return
    let cancelled = false
    const schedule = () => {
      if (cancelled) return
      fetchRoute()
      pendingFetch.current = setTimeout(schedule, ROUTE_REFRESH_MIN_MS)
    }
    schedule()
    return () => {
      cancelled = true
      if (pendingFetch.current) clearTimeout(pendingFetch.current)
    }
  }, [activeOrigin, fetchRoute])

  useEffect(() => {
    if (activeOrigin) {
      (animatedCoordinate as any).timing({
        latitude: activeOrigin.lat,
        longitude: activeOrigin.lng,
        latitudeDelta: 0,
        longitudeDelta: 0,
        duration: 1000,
        useNativeDriver: false,
      }).start()
    }
    fitToRoute()
  }, [activeOrigin, animatedCoordinate, fitToRoute])

  useEffect(() => {
    if (providerLocation?.heading == null) return
    const heading = Number(providerLocation.heading)
    if (!Number.isFinite(heading)) return
    Animated.spring(headingAnim, { toValue: heading, useNativeDriver: true, friction: 5 }).start()
  }, [providerLocation?.heading, headingAnim])

  useEffect(() => {
    if (!route || !mapRef.current || !activeOrigin) return
    fitToRoute()
  }, [route, activeOrigin, fitToRoute])

  return (
    <View style={s.container}>
      <MapView
        ref={mapRef}
        provider={PROVIDER_DEFAULT}
        style={s.map}
        initialRegion={{
          latitude: destination.lat,
          longitude: destination.lng,
          latitudeDelta: 0.02,
          longitudeDelta: 0.02,
        }}
        showsUserLocation={false}
        showsMyLocationButton={false}
        showsCompass={false}
        mapType="standard"
      >
        <Marker coordinate={{ latitude: destination.lat, longitude: destination.lng }}>
          <View style={s.destinationMarker}>
            <View style={s.destinationDot} />
            <View style={s.destinationPin} />
          </View>
        </Marker>

        {showVehicle && (
          <Marker.Animated coordinate={animatedCoordinate as any}>
            <Animated.View style={[s.vehicleMarker, { transform: [{ rotate: headingAnim.interpolate({ inputRange: [0, 360], outputRange: ['0deg', '360deg'] }) }] }]}>
              <View style={s.vehicleIcon}>
                <Navigation size={18} color="#FFFFFF" fill="#FFFFFF" />
              </View>
            </Animated.View>
          </Marker.Animated>
        )}

        {hasRoute && (
          <Polyline
            coordinates={route.polyline.map(p => ({ latitude: p.lat, longitude: p.lng }))}
            strokeColor="#2563EB"
            strokeWidth={5}
          />
        )}
      </MapView>

      <View style={s.overlay} pointerEvents="none">
        {destinationLabel ? (
          <View style={s.badge}>
            <Text style={s.badgeText} numberOfLines={1}>{destinationLabel}</Text>
          </View>
        ) : null}

        {loading && (
          <View style={[s.badge, s.loadingBadge]}>
            <ActivityIndicator size="small" color="#2563EB" />
            <Text style={s.loadingText}>{t('mission.routeLoading')}</Text>
          </View>
        )}

        {!loading && error && !route && (
          <View style={[s.badge, s.errorBadge]}>
            <Text style={s.errorText}>{error}</Text>
          </View>
        )}

        {!loading && route && isTracking && (
          <View style={s.statsCard}>
            <View style={s.stat}>
              <Text style={s.statValue}>{route.distance.text || formatKm(route.distance.value)}</Text>
              <Text style={s.statLabel}>{t('mission.distance')}</Text>
            </View>
            <View style={s.statDivider} />
            <View style={s.stat}>
              <Text style={s.statValue}>{route.duration.text || formatDuration(route.duration.value)}</Text>
              <Text style={s.statLabel}>{t('mission.eta')}</Text>
            </View>
          </View>
        )}

        {!loading && isTracking && !activeOrigin && (
          <View style={[s.badge, s.loadingBadge]}>
            <ActivityIndicator size="small" color="#2563EB" />
            <Text style={s.loadingText}>{t('mission.waitingProviderLocation')}</Text>
          </View>
        )}
      </View>
    </View>
  )
}

const s = StyleSheet.create({
  container: {
    width: '100%',
    height: 280,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#E2E8F0',
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    padding: 12,
    justifyContent: 'space-between',
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.95)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 3,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  loadingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  loadingText: {
    fontSize: 12,
    color: '#2563EB',
    fontWeight: '600',
  },
  errorBadge: {
    backgroundColor: '#FEF2F2',
  },
  errorText: {
    fontSize: 12,
    color: '#B91C1C',
  },
  statsCard: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  stat: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  statLabel: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  destinationMarker: {
    alignItems: 'center',
  },
  destinationDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#DC2626',
    borderWidth: 3,
    borderColor: '#FFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  destinationPin: {
    width: 4,
    height: 10,
    backgroundColor: '#DC2626',
    opacity: 0.4,
    borderRadius: 2,
    marginTop: -2,
  },
  vehicleMarker: {
    alignItems: 'center',
  },
  vehicleIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2563EB',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
})
