import { useEffect, useMemo, useRef, useState } from 'react'
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native'
import MapView, { Marker, Polyline, PROVIDER_DEFAULT } from 'react-native-maps'
import { useTranslation } from 'react-i18next'

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
}

/**
 * Décode une polyline Google encodée en tableau de coordonnées {lat,lng}.
 */
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
}: LiveRouteMapProps) {
  const { t } = useTranslation()
  const mapRef = useRef<MapView>(null)
  const [route, setRoute] = useState<RouteInfo | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const activeOrigin = useMemo(() => {
    if (providerLocation) return { lat: providerLocation.lat, lng: providerLocation.lng }
    return origin || null
  }, [providerLocation, origin])

  const hasRoute = !!route?.polyline?.length

  useEffect(() => {
    if (!activeOrigin) return
    let cancelled = false
    const fetchRoute = async () => {
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
        if (!cancelled) {
          setRoute({
            polyline: decodePolyline(encoded),
            distance: { text: leg.distance?.text || '', value: leg.distance?.value || 0 },
            duration: { text: leg.duration?.text || '', value: leg.duration?.value || 0 },
          })
        }
      } catch (e: any) {
        if (!cancelled) setError(e.message || t('common.error'))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    fetchRoute()
    return () => { cancelled = true }
  }, [activeOrigin?.lat, activeOrigin?.lng, destination.lat, destination.lng, mode])

  useEffect(() => {
    if (!mapRef.current || !activeOrigin) return
    const coords = [
      { latitude: activeOrigin.lat, longitude: activeOrigin.lng },
      { latitude: destination.lat, longitude: destination.lng },
    ]
    mapRef.current.fitToCoordinates(coords, {
      edgePadding: { top: 40, right: 40, bottom: 40, left: 40 },
      animated: true,
    })
  }, [activeOrigin, destination, route])

  const isTracking = status === 'provider_arriving' || status === 'in_progress'

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

        {activeOrigin && (
          <Marker coordinate={{ latitude: activeOrigin.lat, longitude: activeOrigin.lng }}>
            <View style={[
              s.vehicleMarker,
              Number.isFinite(Number(providerLocation?.heading))
                ? { transform: [{ rotate: `${Number(providerLocation?.heading)}deg` }] }
                : undefined,
            ]}>
              <View style={s.vehicleIcon}>
                <Text style={s.vehicleIconText}>🚗</Text>
              </View>
            </View>
          </Marker>
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

        {!loading && error && (
          <View style={[s.badge, s.errorBadge]}>
            <Text style={s.errorText}>{error}</Text>
          </View>
        )}

        {!loading && route && isTracking && (
          <View style={s.statsCard}>
            <View style={s.stat}>
              <Text style={s.statValue}>{route.distance.text}</Text>
              <Text style={s.statLabel}>{t('mission.distance')}</Text>
            </View>
            <View style={s.statDivider} />
            <View style={s.stat}>
              <Text style={s.statValue}>{route.duration.text}</Text>
              <Text style={s.statLabel}>{t('mission.eta')}</Text>
            </View>
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
  vehicleIconText: {
    fontSize: 18,
  },
})
