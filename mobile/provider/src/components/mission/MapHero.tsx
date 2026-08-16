import React, { useRef, useEffect } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native'
import MapView, { Marker, Polyline, PROVIDER_DEFAULT } from 'react-native-maps'
import { MapPin, Home, Crosshair, Navigation, ArrowLeft, Share2 } from 'lucide-react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { FloatingMapCard } from './FloatingMapCard'
import { radius, spacing } from '../../design'

interface LatLng {
  lat: number
  lng: number
}

interface Props {
  clientLocation: LatLng
  clientAddress?: string
  providerLocation?: LatLng | null
  routeCoordinates?: Array<{ latitude: number; longitude: number }>
  distanceText?: string
  durationText?: string
  onBack?: () => void
  onShare?: () => void
  onRecenter?: () => void
}

const { height: SCREEN_HEIGHT } = Dimensions.get('window')

export const MapHero: React.FC<Props> = ({
  clientLocation,
  clientAddress = 'Berger, Maârif, Casablanca',
  providerLocation,
  routeCoordinates = [],
  distanceText = '1.2 km',
  durationText = '2 min',
  onBack,
  onShare,
  onRecenter,
}) => {
  const insets = useSafeAreaInsets()
  const mapRef = useRef<MapView>(null)

  const fitCoordinates = () => {
    if (!mapRef.current) return
    const points: Array<{ latitude: number; longitude: number }> = [
      { latitude: clientLocation.lat, longitude: clientLocation.lng },
    ]
    if (providerLocation) {
      points.push({ latitude: providerLocation.lat, longitude: providerLocation.lng })
    }
    if (routeCoordinates.length > 0) {
      points.push(...routeCoordinates)
    }

    mapRef.current.fitToCoordinates(points, {
      edgePadding: {
        top: insets.top + 80,
        right: 50,
        bottom: 80,
        left: 50,
      },
      animated: true,
    })
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      fitCoordinates()
    }, 400)
    return () => clearTimeout(timer)
  }, [clientLocation.lat, clientLocation.lng, providerLocation?.lat, providerLocation?.lng])

  const initialRegion = {
    latitude: (clientLocation.lat + (providerLocation?.lat ?? clientLocation.lat)) / 2,
    longitude: (clientLocation.lng + (providerLocation?.lng ?? clientLocation.lng)) / 2,
    latitudeDelta: 0.03,
    longitudeDelta: 0.03,
  }

  // Fallback direct line if no polyline provided
  const polylineCoords =
    routeCoordinates.length > 0
      ? routeCoordinates
      : providerLocation
      ? [
          { latitude: providerLocation.lat, longitude: providerLocation.lng },
          { latitude: clientLocation.lat, longitude: clientLocation.lng },
        ]
      : []

  return (
    <View style={s.container}>
      <MapView
        ref={mapRef}
        provider={PROVIDER_DEFAULT}
        style={StyleSheet.absoluteFillObject}
        initialRegion={initialRegion}
        showsUserLocation={false}
        showsCompass={false}
        showsMyLocationButton={false}
      >
        {/* Route Polyline */}
        {polylineCoords.length > 1 && (
          <Polyline
            coordinates={polylineCoords}
            strokeColor="#0F7B4F"
            strokeWidth={4}
            lineDashPattern={[0]}
          />
        )}

        {/* Client Marker */}
        <Marker
          coordinate={{ latitude: clientLocation.lat, longitude: clientLocation.lng }}
          anchor={{ x: 0.5, y: 0.5 }}
        >
          <View style={s.clientHalo}>
            <View style={s.clientPin}>
              <Home size={18} color="#FFFFFF" strokeWidth={2.5} />
            </View>
          </View>
        </Marker>

        {/* Provider Marker */}
        {providerLocation && (
          <Marker
            coordinate={{ latitude: providerLocation.lat, longitude: providerLocation.lng }}
            anchor={{ x: 0.5, y: 0.5 }}
          >
            <View style={s.providerHalo}>
              <View style={s.providerPin}>
                <Navigation size={18} color="#FFFFFF" strokeWidth={2.5} />
              </View>
            </View>
          </Marker>
        )}
      </MapView>

      {/* Top Floating Bar */}
      <View style={[s.topBar, { top: insets.top + spacing.sm }]}>
        <TouchableOpacity
          style={s.circleBtn}
          activeOpacity={0.8}
          onPress={onBack}
        >
          <ArrowLeft size={20} color="#0A1628" strokeWidth={2.2} />
        </TouchableOpacity>

        {clientAddress ? (
          <View style={s.addressPill}>
            <MapPin size={14} color="#0F7B4F" style={{ marginRight: 4 }} />
            <Text style={s.addressText} numberOfLines={1}>
              {clientAddress}
            </Text>
          </View>
        ) : (
          <View style={{ flex: 1 }} />
        )}

        <TouchableOpacity
          style={s.circleBtn}
          activeOpacity={0.8}
          onPress={onShare}
        >
          <Share2 size={18} color="#0A1628" strokeWidth={2.2} />
        </TouchableOpacity>
      </View>

      {/* Bottom Floating Stats Card */}
      <View style={s.bottomStats}>
        <FloatingMapCard duration={durationText} distance={distanceText} />
      </View>

      {/* Recenter Button */}
      <TouchableOpacity
        style={s.recenterBtn}
        activeOpacity={0.8}
        onPress={() => {
          fitCoordinates()
          onRecenter?.()
        }}
      >
        <Crosshair size={22} color="#0A1628" strokeWidth={2} />
      </TouchableOpacity>
    </View>
  )
}

const s = StyleSheet.create({
  container: {
    width: '100%',
    height: SCREEN_HEIGHT * 0.56,
    position: 'relative',
  },
  topBar: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 10,
  },
  circleBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
  },
  addressPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 24,
    maxWidth: '65%',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
  },
  addressText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0A1628',
  },
  bottomStats: {
    position: 'absolute',
    bottom: 24,
    left: spacing.lg,
    zIndex: 10,
  },
  recenterBtn: {
    position: 'absolute',
    bottom: 24,
    right: spacing.lg,
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
    zIndex: 10,
  },
  clientHalo: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(15, 123, 79, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  clientPin: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#0F7B4F',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2.5,
    borderColor: '#FFFFFF',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  providerHalo: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: 'rgba(37, 99, 235, 0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  providerPin: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2.5,
    borderColor: '#FFFFFF',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
})
