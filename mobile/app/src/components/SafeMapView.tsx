import { createThemedStyles } from '../theme'
import React, { forwardRef } from 'react'
import { Platform, StyleSheet, View, Text } from 'react-native'
import MapView from 'react-native-maps'
import Constants from 'expo-constants'
import { MapPin } from 'lucide-react-native'
import { useTheme } from '../theme'

/**
 * Sans clé Google Maps dans le manifest Android (build sans
 * EXPO_PUBLIC_GOOGLE_MAPS_API_KEY), MapView crash l'app au montage.
 * Ce wrapper rend un placeholder neutre à la place — détecté côté JS,
 * donc corrigeable par OTA.
 */
export function hasGoogleMapsKey(): boolean {
  if (Platform.OS !== 'android') return true
  // 1) Env inlinée par Metro au build (fiable : c'est la valeur utilisée par
  //    le plugin withGoogleMapsApiKey pour la meta-data AndroidManifest).
  const envKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY
  if (typeof envKey === 'string' && envKey.length > 10) return true
  // 2) Repli : config embarquée (peut ne pas contenir android.config.googleMaps
  //    selon l'ordre d'évaluation d'app.config.js au build).
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
  const { colors, s } = useStyles()
  const { isDark } = useTheme()
  if (!hasGoogleMapsKey()) {
    return (
      <View style={[style, s.fallback]}>
        <MapPin size={26} color={colors.textMuted} />
        {fallbackLabel ? <Text style={s.fallbackText}>{fallbackLabel}</Text> : null}
      </View>
    )
  }
  return <MapView ref={ref} style={style} {...props} userInterfaceStyle={isDark ? 'dark' : 'light'} customMapStyle={isDark ? DARK_MAP_STYLE : props.customMapStyle} />
})

export default SafeMapView

const DARK_MAP_STYLE = [
  { elementType: 'geometry', stylers: [{ color: '#172027' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#CDD6E0' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#172027' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#39444F' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#193A48' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#253631' }] },
]



const useStyles = createThemedStyles(colors => {
  const s = StyleSheet.create({
    fallback: {
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.bgDeep,
      gap: 6,
    },
    fallbackText: { fontSize: 12, color: colors.textSecondary },
  })
  return { colors, s }
})
