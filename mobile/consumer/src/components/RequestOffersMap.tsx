import React, { memo, useEffect, useMemo, useState } from 'react'
import { View, Text, Platform, StyleSheet, AppState } from 'react-native'
import MapView, { Marker, PROVIDER_DEFAULT } from 'react-native-maps'
import { useTranslation } from 'react-i18next'
import { connectSocket, joinRequestRoom, leaveRequestRoom } from '../socket'
import { apiGet } from '../api'
import { colors, spacing, radius, shadows, typography } from '../design'

type Viewer = {
  lat: number
  lng: number
  name?: string
  providerId?: string
  lastSeen: number
  status?: string
  distanceKm?: number
  etaMinutes?: number
}

function toLatLng(data: any): { lat: number; lng: number } | null {
  if (Number.isFinite(Number(data?.lat)) && Number.isFinite(Number(data?.lng))) {
    return { lat: Number(data.lat), lng: Number(data.lng) }
  }
  const coords = data?.coordinates
  if (Array.isArray(coords) && coords.length === 2 && Number.isFinite(Number(coords[0])) && Number.isFinite(Number(coords[1]))) {
    return { lat: Number(coords[1]), lng: Number(coords[0]) }
  }
  return null
}

const RequestOffersMap = memo(function RequestOffersMap({
  requestId,
  requestLat,
  requestLng,
  wsConnected,
  requestDone,
}: {
  requestId: string
  requestLat?: number
  requestLng?: number
  wsConnected: boolean
  requestDone: boolean
}) {
  const { t } = useTranslation()
  const [viewerLocations, setViewerLocations] = useState<Record<string, Viewer>>({})

  useEffect(() => {
    if (requestDone || !requestId || requestLat == null || requestLng == null) return

    const socket = connectSocket()
    joinRequestRoom(requestId)

    const handleProviderLocation = (data: any) => {
      if (!data?.providerId) return
      if (!Number.isFinite(Number(data?.lat)) || !Number.isFinite(Number(data?.lng))) return
      setViewerLocations(prev => ({
        ...prev,
        [data.providerId]: {
          lat: Number(data.lat),
          lng: Number(data.lng),
          name: data.providerName,
          providerId: data.providerId,
          lastSeen: Number(data.timestamp) || Date.now(),
          status: data.status || 'assigned',
          distanceKm: data.distance,
          etaMinutes: data.eta,
        },
      }))
    }

    const handleRequestViewing = (data: any) => {
      if (!data?.providerId) return
      const viewerLocation = toLatLng(data)
      if (!viewerLocation) return
      setViewerLocations(prev => ({
        ...prev,
        [data.providerId]: {
          ...viewerLocation,
          name: data.providerName,
          providerId: data.providerId,
          lastSeen: Number(data.timestamp) || Date.now(),
          status: 'viewing',
        },
      }))
    }

    const handleStopViewing = (data: any) => {
      if (!data?.providerId) return
      setViewerLocations(prev => {
        if (!prev[data.providerId]) return prev
        const next = { ...prev }
        delete next[data.providerId]
        return next
      })
    }

    socket.on('provider:location', handleProviderLocation)
    socket.on('request:viewing', handleRequestViewing)
    socket.on('request:stop-viewing', handleStopViewing)

    let active = true
    let fetchInFlight = false
    const fetchLive = async () => {
      if (!active || fetchInFlight || AppState.currentState !== 'active') return
      fetchInFlight = true
      try {
        const data = await apiGet(`/api/services/requests/${requestId}/live`)
        if (!active) return
        const next: Record<string, Viewer> = {}
        const merge = (p: any) => {
          if (!p || !Number.isFinite(Number(p.lat)) || !Number.isFinite(Number(p.lng))) return
          next[String(p.providerId)] = {
            lat: Number(p.lat),
            lng: Number(p.lng),
            name: p.name,
            providerId: String(p.providerId),
            lastSeen: new Date(p.lastSeenAt || Date.now()).getTime(),
            status: p.status,
            distanceKm: p.distanceKm,
            etaMinutes: p.etaMinutes,
          }
        }
        data.assigned && merge(data.assigned)
        ;(data.offerors || []).forEach(merge)
        ;(data.viewers || []).forEach(merge)
        ;(data.nearby || []).forEach(merge)
        setViewerLocations(next)
      } catch {
      } finally {
        fetchInFlight = false
      }
    }

    fetchLive()
    const liveInterval = setInterval(fetchLive, 30_000)
    const appStateSubscription = AppState.addEventListener('change', next => {
      if (next === 'active') fetchLive()
    })

    const cleanup = setInterval(() => {
      const cutoff = Date.now() - 60_000
      setViewerLocations(prev => {
        const next: Record<string, Viewer> = {}
        let changed = false
        Object.entries(prev).forEach(([key, v]) => {
          if (v.lastSeen >= cutoff) next[key] = v
          else changed = true
        })
        return changed ? next : prev
      })
    }, 10_000)

    return () => {
      active = false
      clearInterval(liveInterval)
      clearInterval(cleanup)
      appStateSubscription.remove()
      leaveRequestRoom(requestId)
      socket.off('provider:location', handleProviderLocation)
      socket.off('request:viewing', handleRequestViewing)
      socket.off('request:stop-viewing', handleStopViewing)
    }
  }, [requestId, requestDone, requestLat, requestLng])

  const initialRegion = useMemo(() => ({
    latitude: requestLat ?? 0,
    longitude: requestLng ?? 0,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  }), [requestLat, requestLng])

  const markerEntries = useMemo(() => Object.entries(viewerLocations).filter(([, v]) => Number.isFinite(v.lat) && Number.isFinite(v.lng)), [viewerLocations])

  if (requestDone || requestLat == null || requestLng == null || !Number.isFinite(requestLat) || !Number.isFinite(requestLng)) return null

  return (
    <View style={s.mapWrap}>
      <View style={s.mapHeader}>
        <View style={[s.rtDot, { backgroundColor: wsConnected ? '#16A34A' : '#94A3B8' }]} />
        <Text style={s.mapTitle}>{t('offers.liveViewers', { count: Object.keys(viewerLocations).length })}</Text>
      </View>
      {Platform.OS === 'web' ? (
        <View style={s.mapPlaceholder}>
          <Text style={s.mapPlaceholderText}>{t('offers.mapWebViewers')}</Text>
        </View>
      ) : (
        <MapView
          provider={PROVIDER_DEFAULT}
          style={s.map}
          initialRegion={initialRegion}
          pointerEvents="none"
          scrollEnabled={false}
          zoomEnabled={false}
          pitchEnabled={false}
          rotateEnabled={false}
          moveOnMarkerPress={false}
        >
          <Marker
            coordinate={{ latitude: requestLat, longitude: requestLng }}
            title={t('offers.requestLocation')}
            pinColor={colors.primary}
          />
          {markerEntries.map(([key, v]) => {
            const statusColor = v.status === 'selected' || v.status === 'arriving' || v.status === 'in_progress' ? '#2563EB'
              : v.status === 'offered' ? '#0F7B4F'
              : v.status === 'viewing' ? '#10B981'
              : '#64748B'
            const label = v.status === 'arriving' ? t('offers.statusArriving')
              : v.status === 'in_progress' ? t('offers.statusInProgress')
              : v.status === 'selected' ? t('offers.statusSelected')
              : v.status === 'offered' ? t('offers.statusOffered')
              : v.status === 'viewing' ? t('offers.statusViewing')
              : t('offers.viewer')
            const sub = [v.distanceKm ? `${v.distanceKm} km` : null, v.etaMinutes ? `${v.etaMinutes} min` : null].filter(Boolean).join(' · ')
            return (
              <Marker
                key={key}
                coordinate={{ latitude: v.lat, longitude: v.lng }}
              >
                <View style={[s.providerMarker, { borderColor: statusColor }]}>
                  <Text style={[s.providerMarkerText, { color: statusColor }]}>{(v.name || 'P').slice(0, 1).toUpperCase()}</Text>
                </View>
                <View style={[s.providerMarkerTail, { borderTopColor: statusColor }]} />
                {(sub || label) ? (
                  <View style={s.providerMarkerCallout}>
                    <Text style={s.providerMarkerStatus}>{label}</Text>
                    {!!sub && <Text style={s.providerMarkerSub}>{sub}</Text>}
                  </View>
                ) : null}
              </Marker>
            )
          })}
        </MapView>
      )}
    </View>
  )
})

const s = StyleSheet.create({
  mapWrap: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    marginBottom: spacing.lg,
    borderRadius: radius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    ...shadows.sm,
  },
  mapHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rtDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  mapTitle: {
    fontSize: 13,
    fontWeight: typography.weight.extrabold as any,
    color: colors.text,
    flex: 1,
  },
  map: {
    width: '100%',
    height: 140,
  },
  mapPlaceholder: {
    width: '100%',
    height: 140,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg,
  },
  mapPlaceholderText: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
  },
  providerMarker: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#fff',
    borderWidth: 3,
    borderColor: colors.success,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.md,
  },
  providerMarkerText: {
    fontSize: 14,
    fontWeight: typography.weight.extrabold as any,
  },
  providerMarkerTail: {
    width: 0,
    height: 0,
    borderLeftWidth: 5,
    borderRightWidth: 5,
    borderTopWidth: 7,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    alignSelf: 'center',
    marginTop: -1,
  },
  providerMarkerCallout: {
    position: 'absolute',
    top: -34,
    backgroundColor: 'rgba(15,23,42,0.88)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    minWidth: 70,
    alignItems: 'center',
  },
  providerMarkerStatus: {
    fontSize: 10,
    fontWeight: typography.weight.extrabold as any,
    color: '#fff',
  },
  providerMarkerSub: {
    fontSize: 9,
    color: '#CBD5E1',
    marginTop: 1,
  },
})

export default RequestOffersMap
