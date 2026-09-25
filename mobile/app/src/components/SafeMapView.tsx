import React, { forwardRef } from 'react'
import { Platform, StyleSheet, View, Text } from 'react-native'
import MapView from 'react-native-maps'
import Constants from 'expo-constants'
import { MapPin } from 'lucide-react-native'

/**
 * Sans clé Google Maps dans le manifest Android (build sans
 * EXPO_PUBLIC_GOOGLE_MAPS_API_KEY), MapView crash l'app au montage.
 * Ce wrapper rend un placeholder neutre à la place — détecté côté JS,
 * donc corrigeable par OTA.
 */
export function hasGoogleMapsKey(): boolean {
  if (Platform.OS !== 'android') return true
  const key = (Constants?.expoConfig as any)?.android?.config?.googleMaps?.apiKey
    || (Constants as any)?.manifest?.android?.config?.googleMaps?.apiKey
  return typeof key === 'string' && key.length > 10
}

interface Props extends React.ComponentProps<typeof MapView> {
  fallbackLabel?: string
}

const SafeMapView = forwardRef<MapView, Props>(function SafeMapView(
  { fallbackLabel, style, ...props },
  ref
) {
  if (!hasGoogleMapsKey()) {
    return (
      <View style={[style, s.fallback]}>
        <MapPin size={26} color="#94A3B8" />
        {fallbackLabel ? <Text style={s.fallbackText}>{fallbackLabel}</Text> : null}
      </View>
    )
  }
  return <MapView ref={ref} style={style} {...props} />
})

export default SafeMapView

const s = StyleSheet.create({
  fallback: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E2E8F0',
    gap: 6,
  },
  fallbackText: { fontSize: 12, color: '#64748B' },
})
