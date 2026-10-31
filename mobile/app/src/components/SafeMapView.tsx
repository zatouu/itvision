import { createThemedStyles } from '../theme'
import React, { forwardRef } from 'react'
import { Platform, StyleSheet, View, Text } from 'react-native'
import MapView from 'react-native-maps'
import { requireOptionalNativeModule } from 'expo'
import { MapPin } from 'lucide-react-native'
import { useTheme } from '../theme'

let nativeKeyCache: boolean | undefined

/**
 * Sans clé Google Maps dans l'AndroidManifest de l'APK installé, MapView plante l'app en natif
 * au montage (« l'application a cessé de fonctionner »). Ce wrapper rend un encart à la place.
 *
 * La décision se fonde sur la config EMBARQUÉE dans l'APK (module natif ExponentConstants), pas
 * sur Constants.expoConfig ni sur la variable inlinée : une OTA récente peut contenir la clé côté
 * JS alors que l'APK du testeur a été compilé sans → crash à l'ouverture d'un écran avec carte.
 * Marqueur `extra.nativeGoogleMapsKey` posé par app.config.js au build ; absent (APK plus ancien
 * que ce marqueur) → carte désactivée par prudence, jusqu'à l'installation d'un APK récent.
 */
export function hasGoogleMapsKey(): boolean {
  if (Platform.OS !== 'android') return true
  if (nativeKeyCache !== undefined) return nativeKeyCache
  nativeKeyCache = false
  try {
    const raw = requireOptionalNativeModule<{ manifest?: unknown }>('ExponentConstants')?.manifest
    const embedded = typeof raw === 'string' ? JSON.parse(raw) : raw
    nativeKeyCache = (embedded as any)?.extra?.nativeGoogleMapsKey === true
  } catch {
    nativeKeyCache = false
  }
  return nativeKeyCache
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
