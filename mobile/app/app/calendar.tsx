import { createThemedStyles } from '../src/theme'
import { useEffect, useRef, useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native'
import Toggle from '../src/components/Toggle'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { spacing, radius, shadows } from '../src/design'
import { Clock, Save, CalendarDays } from 'lucide-react-native'
import { BackIcon } from '../src/components/BackButton'
import { apiGet, apiPatch } from '../src/api'
import { withScreenBoundary } from '../src/components/withScreenBoundary'
import { useTranslation } from 'react-i18next'

// Les noms de jours servent de clés persistées dans preferences.schedule : ne pas les traduire ici.
const DAYS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche']
const DAY_LABEL_KEYS: Record<string, string> = {
  Lundi: 'calendarScreen.days.monday',
  Mardi: 'calendarScreen.days.tuesday',
  Mercredi: 'calendarScreen.days.wednesday',
  Jeudi: 'calendarScreen.days.thursday',
  Vendredi: 'calendarScreen.days.friday',
  Samedi: 'calendarScreen.days.saturday',
  Dimanche: 'calendarScreen.days.sunday',
}
const SLOTS = [
  { key: 'morning', labelKey: 'calendarScreen.slots.morning', hours: '08-12' },
  { key: 'afternoon', labelKey: 'calendarScreen.slots.afternoon', hours: '12-18' },
  { key: 'evening', labelKey: 'calendarScreen.slots.evening', hours: '18-22' },
]

const defaultSchedule = () => {
  const s: any = {}
  DAYS.forEach((d) => { s[d] = { morning: true, afternoon: true, evening: false } })
  return s
}

function CalendarScreen() {
  const { colors, s } = useStyles()
  const { t } = useTranslation()
  const [schedule, setSchedule] = useState<any>(defaultSchedule())
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const savedRef = useRef(JSON.stringify(defaultSchedule()))

  useEffect(() => {
    apiGet('/api/provider/profile')
      .then((data: any) => {
        const existing = data.provider?.preferences?.schedule
        if (existing && Object.keys(existing).length === 7) {
          setSchedule(existing)
          savedRef.current = JSON.stringify(existing)
        } else {
          const initial = defaultSchedule()
          setSchedule(initial)
          savedRef.current = JSON.stringify(initial)
        }
      })
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    const current = JSON.stringify(schedule)
    if (loading || current === savedRef.current) return
    const timer = setTimeout(() => {
      apiPatch('/api/provider/profile', { provider: { preferences: { schedule } } })
        .then(() => { savedRef.current = current })
        .finally(() => setSaving(false))
    }, 800)
    return () => clearTimeout(timer)
  }, [schedule, loading])

  const toggleSlot = (day: string, slotKey: string) => {
    setSchedule((prev: any) => ({
      ...prev,
      [day]: { ...prev[day], [slotKey]: !prev[day][slotKey] },
    }))
  }

  const toggleAll = (day: string, value: boolean) => {
    setSchedule((prev: any) => ({
      ...prev,
      [day]: { morning: value, afternoon: value, evening: value },
    }))
  }

  if (loading) return <SafeAreaView style={s.safe}><ActivityIndicator color={colors.primaryText} style={{ marginTop: 60 }} /></SafeAreaView>

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.back}>
          <BackIcon size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={s.title}>{t('calendarScreen.title')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={s.intro}>
        <CalendarDays size={20} color={colors.primaryText} />
        <Text style={s.introText}>{t('calendarScreen.intro')}</Text>
      </View>

      <ScrollView contentContainerStyle={s.body} showsVerticalScrollIndicator={false}>
        {DAYS.map((day) => {
          const daySlots = schedule[day] || defaultSchedule()[day]
          const allOn = SLOTS.every((slot) => daySlots[slot.key])
          return (
            <View key={day} style={s.card}>
              <View style={s.rowTop}>
                <Text style={s.day}>{t(DAY_LABEL_KEYS[day])}</Text>
                <View style={s.switchRow}>
                  <Text style={s.switchLabel}>{t('calendarScreen.all')}</Text>
                  <Toggle
                    value={allOn}
                    onValueChange={(v) => toggleAll(day, v)}
                  />
                </View>
              </View>
              <View style={s.slots}>
                {SLOTS.map((slot) => (
                  <TouchableOpacity
                    key={slot.key}
                    style={[s.slot, daySlots[slot.key] && s.slotActive]}
                    onPress={() => toggleSlot(day, slot.key)}
                  >
                    <Clock size={16} color={daySlots[slot.key] ? colors.onPrimary : colors.textSecondary} />
                    <Text style={[s.slotLabel, daySlots[slot.key] && s.slotLabelActive]}>{t(slot.labelKey)}</Text>
                    <Text style={[s.slotHours, daySlots[slot.key] && s.slotHoursActive]}>{slot.hours}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )
        })}

        {saving ? (
          <View style={s.saving}>
            <Save size={16} color={colors.primaryText} />
            <Text style={s.savingText}>{t('calendarScreen.saving')}</Text>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  )
}



export default withScreenBoundary(CalendarScreen, 'Calendar')

const useStyles = createThemedStyles(colors => {
  const s = StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.bgGlobal },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.lg, paddingBottom: spacing.md },
    back: { width: 44, height: 44, borderRadius: radius.full, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
    title: { fontSize: 22, fontWeight: '600', color: colors.text },
    intro: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.primaryLight, borderRadius: radius.lg, padding: spacing.lg, marginHorizontal: spacing.lg, marginBottom: spacing.lg },
    introText: { flex: 1, fontSize: 14, color: colors.text, lineHeight: 20 },
    body: { padding: spacing.lg, paddingBottom: 100 },
    card: { backgroundColor: colors.surface, borderRadius: radius.xl, padding: spacing.lg, marginBottom: spacing.md, ...shadows.sm },
    rowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
    day: { fontSize: 16, fontWeight: '600', color: colors.text },
    switchRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    switchLabel: { fontSize: 13, color: colors.textSecondary },
    slots: { flexDirection: 'row', gap: spacing.md },
    slot: { flex: 1, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, paddingVertical: spacing.md, paddingHorizontal: spacing.sm, alignItems: 'center', backgroundColor: colors.surface },
    slotActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    slotLabel: { fontSize: 12, fontWeight: '600', color: colors.text, marginTop: spacing.xs },
    slotLabelActive: { color: colors.onPrimary },
    slotHours: { fontSize: 10, color: colors.textSecondary, marginTop: 2 },
    slotHoursActive: { color: 'rgba(255,255,255,0.8)' },
    saving: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, marginTop: spacing.lg },
    savingText: { fontSize: 14, color: colors.primaryText, fontWeight: '500' },
  })
  return { colors, s }
})
