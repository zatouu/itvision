import { useState, useEffect, useCallback } from 'react'
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Switch, Dimensions, KeyboardAvoidingView, Platform } from 'react-native'
import MapView, { Marker, PROVIDER_DEFAULT } from 'react-native-maps'
import * as Location from 'expo-location'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { MapPin, Crosshair, Check, ChevronRight, Building2, MessageSquare } from 'lucide-react-native'
import AppHeader from '../../src/components/AppHeader'
import { toast } from '../../src/toast'
import StickyBottomBar from '../../src/components/StickyBottomBar'
import Button from '../../src/components/Button'
import { colors, spacing, radius, shadows, typography } from '../../src/design'
import { reverseGeocode } from '../../src/geocode'
import { mockAddresses } from '../../src/mock'

const STEPS = ['Catégorie', 'Détails', 'Lieu']

export default function RequestLocation() {
  const { t } = useTranslation()
  const [address, setAddress] = useState('')
  const [street, setStreet] = useState('')
  const [building, setBuilding] = useState('')
  const [instructions, setInstructions] = useState('')
  const [saveAddress, setSaveAddress] = useState(false)
  const [selectedSaved, setSelectedSaved] = useState<string | null>(null)
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [loadingLocation, setLoadingLocation] = useState(false)

  const useMyLocation = useCallback(async () => {
    setLoadingLocation(true)
    try {
      const { status } = await Location.requestForegroundPermissionsAsync()
      if (status !== 'granted') {
        toast.error(t('common.error'), 'Permission de localisation requise')
        return
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })
      const { latitude, longitude } = pos.coords
      setCoords({ lat: latitude, lng: longitude })
      const geo = await reverseGeocode(latitude, longitude)
      if (geo) {
        const parts = [geo.neighbourhood, geo.suburb, geo.city].filter(Boolean)
        setAddress(parts.join(', ') || geo.display.split(',').slice(0, 3).join(','))
      } else {
        setAddress(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`)
      }
    } catch {
      toast.error(t('common.error'), t('request.gpsRequired'))
    } finally {
      setLoadingLocation(false)
    }
  }, [t])

  useEffect(() => {
    useMyLocation()
  }, [useMyLocation])

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={0}>
      <AppHeader title={t('clientRequest.location')} onBack={() => router.back()} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 180 }}>
        <View style={s.stepper}>
          {STEPS.map((step, idx) => {
            const active = idx === 2
            const done = idx < 2
            return (
              <View key={step} style={s.step}>
                <View style={[s.stepDot, active && s.stepDotActive, done && s.stepDotDone]}>
                  {done ? <Check size={14} color={colors.surface} /> : <Text style={[s.stepNumber, (active || done) && s.stepNumberActive]}>{idx + 1}</Text>}
                </View>
                <Text style={[s.stepLabel, active && s.stepLabelActive]}>{step}</Text>
                {idx < STEPS.length - 1 && <View style={[s.stepLine, done && s.stepLineDone]} />}
              </View>
            )
          })}
        </View>

        <Text style={s.title}>{t('clientRequest.where')}</Text>
        <Text style={s.subtitle}>{t('clientRequest.whereSub')}</Text>

        <View style={s.searchRow}>
          <MapPin size={18} color={colors.textSecondary} />
          <TextInput
            value={address}
            onChangeText={setAddress}
            placeholder={t('clientRequest.addressPlaceholder')}
            style={s.searchInput}
          />
        </View>

        <TouchableOpacity style={s.useLocationBtn} activeOpacity={0.85} onPress={useMyLocation} disabled={loadingLocation}>
          <Crosshair size={18} color={loadingLocation ? colors.textMuted : colors.primary} />
          <Text style={[s.useLocationText, loadingLocation && { color: colors.textMuted }]}>
            {loadingLocation ? t('clientRequest.locating') : t('clientRequest.useLocation')}
          </Text>
        </TouchableOpacity>

        <View style={s.mapCard}>
          <MapView
            provider={PROVIDER_DEFAULT}
            style={s.map}
            initialRegion={{
              latitude: coords?.lat ?? 14.7167,
              longitude: coords?.lng ?? -17.4677,
              latitudeDelta: 0.015,
              longitudeDelta: 0.0121,
            }}
            region={coords ? { latitude: coords.lat, longitude: coords.lng, latitudeDelta: 0.015, longitudeDelta: 0.0121 } : undefined}
          >
            {coords && (
              <Marker
                coordinate={{ latitude: coords.lat, longitude: coords.lng }}
                title={address}
                description={street}
              />
            )}
          </MapView>
          <View style={s.mapOverlay}>
            <MapPin size={20} color={colors.primary} />
            <View style={{ flex: 1 }}>
              <Text style={s.mapOverlayTitle}>{address}</Text>
              <Text style={s.mapOverlaySub}>{street}</Text>
            </View>
            <ChevronRight size={20} color={colors.textSecondary} />
          </View>
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>{t('clientRequest.savedAddresses')}</Text>
          {mockAddresses.map(addr => (
            <TouchableOpacity
              key={addr.id}
              style={[s.savedRow, selectedSaved === addr.id && s.savedRowActive]}
              onPress={() => { setSelectedSaved(addr.id); setAddress(addr.label); setStreet(addr.street || '') }}
              activeOpacity={0.8}
            >
              <MapPin size={18} color={colors.textSecondary} />
              <View style={{ flex: 1 }}>
                <Text style={s.savedLabel}>{addr.label}</Text>
                <Text style={s.savedSub}>{addr.street}</Text>
              </View>
              <View style={[s.radio, selectedSaved === addr.id && s.radioActive]}>
                {selectedSaved === addr.id && <Check size={12} color={colors.surface} />}
              </View>
            </TouchableOpacity>
          ))}
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>{t('clientRequest.accessInfo')}</Text>
          <View style={s.inputRow}>
            <Building2 size={18} color={colors.textSecondary} />
            <TextInput
              value={building}
              onChangeText={setBuilding}
              placeholder={t('clientRequest.buildingPlaceholder')}
              style={s.input}
            />
          </View>
          <View style={s.inputRow}>
            <MessageSquare size={18} color={colors.textSecondary} />
            <TextInput
              value={instructions}
              onChangeText={setInstructions}
              placeholder={t('clientRequest.instructionsPlaceholder')}
              style={s.input}
            />
          </View>
        </View>

        <View style={s.toggleRow}>
          <View style={{ flex: 1 }}>
            <Text style={s.toggleLabel}>{t('clientRequest.saveAddress')}</Text>
            <Text style={s.toggleSub}>{t('clientRequest.saveAddressSub')}</Text>
          </View>
          <Switch
            value={saveAddress}
            onValueChange={setSaveAddress}
            trackColor={{ false: '#CBD5E1', true: colors.primary }}
            thumbColor="#fff"
            ios_backgroundColor="#CBD5E1"
          />
        </View>
      </ScrollView>

      <StickyBottomBar>
        <Button
          title={t('clientRequest.publish')}
          onPress={() => router.push('/requests/published')}
          fullWidth
          size="lg"
        />
      </StickyBottomBar>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    marginBottom: spacing.xl,
  },
  step: { flex: 1, alignItems: 'center', position: 'relative' },
  stepDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDotActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  stepDotDone: { backgroundColor: colors.success, borderColor: colors.success },
  stepNumber: { fontSize: typography.sm.fontSize, fontWeight: typography.weight.extrabold as any, color: colors.textMuted },
  stepNumberActive: { color: colors.surface },
  stepLabel: { fontSize: typography.xs.fontSize, color: colors.textMuted, marginTop: 4 },
  stepLabelActive: { color: colors.text, fontWeight: typography.weight.extrabold as any },
  stepLine: { position: 'absolute', top: 15, left: '60%', right: '-40%', height: 2, backgroundColor: colors.border },
  stepLineDone: { backgroundColor: colors.success },
  title: {
    marginHorizontal: spacing.lg,
    fontSize: typography.xxl.fontSize,
    fontWeight: typography.weight.extrabold as any,
    color: colors.text,
  },
  subtitle: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.xs,
    fontSize: typography.base.fontSize,
    color: colors.textSecondary,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    marginTop: spacing.xl,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  searchInput: { flex: 1, fontSize: typography.base.fontSize, color: colors.text },
  useLocationBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  useLocationText: { fontSize: typography.base.fontSize, color: colors.primary, fontWeight: typography.weight.extrabold as any },
  mapCard: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.xl,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  map: {
    height: 220,
    width: '100%',
  },
  mapOverlay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  mapOverlayIcon: { fontSize: 20 },
  mapOverlayTitle: { fontSize: typography.base.fontSize, fontWeight: typography.weight.extrabold as any, color: colors.text },
  mapOverlaySub: { fontSize: typography.sm.fontSize, color: colors.textSecondary, marginTop: 2 },
  mapOverlayArrow: { fontSize: 22, color: colors.textSecondary },
  section: { marginHorizontal: spacing.lg, marginTop: spacing.xl },
  sectionTitle: {
    fontSize: typography.sm.fontSize,
    fontWeight: typography.weight.extrabold as any,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.md,
  },
  savedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  savedRowActive: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  savedLabel: { fontSize: typography.base.fontSize, fontWeight: typography.weight.extrabold as any, color: colors.text },
  savedSub: { fontSize: typography.sm.fontSize, color: colors.textSecondary, marginTop: 2 },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  radioCheck: { fontSize: 12, color: colors.surface },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  input: { flex: 1, fontSize: typography.base.fontSize, color: colors.text },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  toggleLabel: { fontSize: typography.base.fontSize, fontWeight: typography.weight.extrabold as any, color: colors.text },
  toggleSub: { fontSize: typography.sm.fontSize, color: colors.textSecondary, marginTop: 2 },
})
