import { useEffect, useRef, useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Switch, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { colors, spacing, radius, shadows } from '../src/design'
import { ArrowLeft, Clock, Save, CalendarDays } from 'lucide-react-native'
import { apiGet, apiPatch } from '../src/api'
import { withScreenBoundary } from '../src/components/withScreenBoundary'

const DAYS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche']
const SLOTS = [
  { key: 'morning', label: 'Matin', hours: '08-12' },
  { key: 'afternoon', label: 'Après-midi', hours: '12-18' },
  { key: 'evening', label: 'Soir', hours: '18-22' },
]

const defaultSchedule = () => {
  const s: any = {}
  DAYS.forEach((d) => { s[d] = { morning: true, afternoon: true, evening: false } })
  return s
}

function CalendarScreen() {
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
    const t = setTimeout(() => {
      apiPatch('/api/provider/profile', { provider: { preferences: { schedule } } })
        .then(() => { savedRef.current = current })
        .finally(() => setSaving(false))
    }, 800)
    return () => clearTimeout(t)
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

  if (loading) return <SafeAreaView style={s.safe}><ActivityIndicator color={colors.primary} style={{ marginTop: 60 }} /></SafeAreaView>

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.back}>
          <ArrowLeft size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={s.title}>Calendrier</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={s.intro}>
        <CalendarDays size={20} color={colors.primary} />
        <Text style={s.introText}>Cochez les créneaux où vous êtes disponibles chaque semaine. Les clients ne verront que ces plages.</Text>
      </View>

      <ScrollView contentContainerStyle={s.body} showsVerticalScrollIndicator={false}>
        {DAYS.map((day) => {
          const daySlots = schedule[day] || defaultSchedule()[day]
          const allOn = SLOTS.every((slot) => daySlots[slot.key])
          return (
            <View key={day} style={s.card}>
              <View style={s.rowTop}>
                <Text style={s.day}>{day}</Text>
                <View style={s.switchRow}>
                  <Text style={s.switchLabel}>Tout</Text>
                  <Switch
                    value={allOn}
                    onValueChange={(v) => toggleAll(day, v)}
                    trackColor={{ false: colors.border, true: colors.success }}
                    thumbColor="#fff"
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
                    <Clock size={16} color={daySlots[slot.key] ? '#fff' : colors.textSecondary} />
                    <Text style={[s.slotLabel, daySlots[slot.key] && s.slotLabelActive]}>{slot.label}</Text>
                    <Text style={[s.slotHours, daySlots[slot.key] && s.slotHoursActive]}>{slot.hours}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )
        })}

        {saving ? (
          <View style={s.saving}>
            <Save size={16} color={colors.primary} />
            <Text style={s.savingText}>Sauvegarde…</Text>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bgGlobal },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.lg, paddingBottom: spacing.md },
  back: { width: 40, height: 40, borderRadius: radius.full, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
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
  slotLabelActive: { color: '#fff' },
  slotHours: { fontSize: 10, color: colors.textSecondary, marginTop: 2 },
  slotHoursActive: { color: 'rgba(255,255,255,0.8)' },
  saving: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, marginTop: spacing.lg },
  savingText: { fontSize: 14, color: colors.primary, fontWeight: '500' },
})

export default withScreenBoundary(CalendarScreen, 'Calendar')
