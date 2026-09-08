import { useMemo, useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { useTranslation } from 'react-i18next'
import { CalendarClock } from 'lucide-react-native'
import { colors, radius, typography } from '../design'

const HOURS = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20]
const DAYS_AHEAD = 7

/** Formate un créneau pour l'affichage : "lun. 8 sept. · 15:00" */
export function formatSlot(iso: string | Date, lang: string): string {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  const day = d.toLocaleDateString(lang, { weekday: 'short', day: 'numeric', month: 'short' })
  const time = d.toLocaleTimeString(lang, { hour: '2-digit', minute: '2-digit' })
  return `${day} · ${time}`
}

type Props = {
  /** Date choisie (jour + heure) ou null */
  value: Date | null
  onChange: (d: Date | null) => void
  /** Restreint la sélection au jour même (masque la rangée de jours) */
  todayOnly?: boolean
}

/**
 * Sélecteur de créneau : rangée de jours (7 prochains) + grille d'horaires.
 * Utilisé pour programmer une mission (client) ou contre-proposer un
 * horaire (prestataire). Pas de dépendance native — OTA-safe.
 */
export default function SchedulePicker({ value, onChange, todayOnly = false }: Props) {
  const { t, i18n } = useTranslation()
  const [dayOffset, setDayOffset] = useState(0)
  const now = new Date()

  const days = useMemo(() => {
    return Array.from({ length: DAYS_AHEAD }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i)
      const weekday = d.toLocaleDateString(i18n.language, { weekday: 'short' })
      const label = i === 0 ? t('schedule.todayShort') : i === 1 ? t('schedule.tomorrow') : weekday
      return { offset: i, date: d, label, num: d.getDate() }
    })
  }, [i18n.language])

  const minHour = dayOffset === 0 ? now.getHours() + 1 : 8
  const hours = HOURS.filter(h => h >= Math.max(minHour, 8))

  const pick = (offset: number, hour: number) => {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset, hour, 0, 0, 0)
    onChange(d)
  }

  const isSelectedDay = (offset: number) =>
    !!value && value.getDate() === new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset).getDate()
  const isSelectedHour = (h: number) => !!value && value.getHours() === h && value.getMinutes() === 0

  return (
    <View style={s.box}>
      {!todayOnly && (
      <View style={s.dayRow}>
        {days.map(d => {
          const sel = isSelectedDay(d.offset)
          const disabled = d.offset === 0 && hours.length === 0
          return (
            <TouchableOpacity
              key={d.offset}
              style={[s.dayChip, sel && s.dayChipActive, disabled && { opacity: 0.35 }]}
              disabled={disabled}
              onPress={() => { setDayOffset(d.offset); onChange(null) }}
              activeOpacity={0.75}
            >
              <Text style={[s.dayLabel, sel && s.dayLabelActive]}>{d.label}</Text>
              <Text style={[s.dayNum, sel && s.dayNumActive]}>{d.num}</Text>
            </TouchableOpacity>
          )
        })}
      </View>
      )}
      {hours.length === 0 ? (
        <Text style={s.noHours}>{t('schedule.noHoursToday')}</Text>
      ) : (
        <View style={s.hourGrid}>
          {hours.map(h => {
            const sel = isSelectedDay(dayOffset) && isSelectedHour(h)
            return (
              <TouchableOpacity
                key={h}
                style={[s.hourChip, sel && s.hourChipActive]}
                onPress={() => pick(dayOffset, h)}
                activeOpacity={0.75}
              >
                <Text style={[s.hourText, sel && s.hourTextActive]}>{h}:00</Text>
              </TouchableOpacity>
            )
          })}
        </View>
      )}
      {value && (
        <View style={s.summary}>
          <CalendarClock size={13} color={colors.primary} />
          <Text style={s.summaryText}>{formatSlot(value, i18n.language)}</Text>
        </View>
      )}
    </View>
  )
}

const s = StyleSheet.create({
  box: { gap: 10 },
  dayRow: { flexDirection: 'row', gap: 6 },
  dayChip: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dayChipActive: { backgroundColor: colors.brandSoft, borderColor: colors.primary },
  dayLabel: { fontSize: 10.5, fontWeight: typography.weight.semibold as any, color: colors.textMuted, textTransform: 'capitalize' },
  dayLabelActive: { color: colors.brandInk },
  dayNum: { fontSize: 13, fontWeight: typography.weight.extrabold as any, color: colors.text, marginTop: 1 },
  dayNumActive: { color: colors.brandInk },
  hourGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  hourChip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  hourChipActive: { backgroundColor: colors.ink, borderColor: colors.ink },
  hourText: { fontSize: 12.5, fontWeight: typography.weight.bold as any, color: colors.text },
  hourTextActive: { color: '#fff' },
  noHours: { fontSize: 12.5, color: colors.textMuted, fontStyle: 'italic', paddingVertical: 4 },
  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.brandSoft,
    borderRadius: radius.md,
    paddingHorizontal: 10,
    paddingVertical: 7,
    alignSelf: 'flex-start',
  },
  summaryText: { fontSize: 12.5, fontWeight: typography.weight.bold as any, color: colors.brandInk },
})
