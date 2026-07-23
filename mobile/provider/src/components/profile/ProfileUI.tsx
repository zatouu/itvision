import { useState, ReactNode } from 'react'
import {
  View, Text, TouchableOpacity, TextInput, Switch, StyleSheet,
  ScrollView
} from 'react-native'
import { colors, spacing, radius, typography, shadows } from '../../design'
import { ChevronDown, ChevronUp } from 'lucide-react-native'

export function Section({
  title,
  icon,
  children,
  defaultOpen = false,
  right,
}: {
  title: string
  icon?: ReactNode
  children: ReactNode
  defaultOpen?: boolean
  right?: ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <View style={s.card}>
      <TouchableOpacity
        activeOpacity={0.7}
        style={s.sectionHeader}
        onPress={() => setOpen(!open)}
      >
        <View style={s.sectionTitleRow}>
          {icon && <View style={s.iconWrap}>{icon}</View>}
          <Text style={s.sectionTitle}>{title}</Text>
        </View>
        <View style={s.sectionRight}>
          {right}
          {open ? <ChevronUp size={18} color={colors.textMuted} /> : <ChevronDown size={18} color={colors.textMuted} />}
        </View>
      </TouchableOpacity>
      {open && <View style={s.sectionBody}>{children}</View>}
    </View>
  )
}

export function SectionHint({ text }: { text: string }) {
  return <Text style={s.hint}>{text}</Text>
}

export function StaticRow({
  label,
  value,
  onPress,
  icon,
}: {
  label: string
  value?: string
  onPress?: () => void
  icon?: ReactNode
}) {
  const content = (
    <View style={[s.row, onPress && s.rowPress]}>
      <View style={s.rowLeft}>
        {icon && <View style={s.rowIcon}>{icon}</View>}
        <Text style={s.rowLabel}>{label}</Text>
      </View>
      <Text style={s.rowValue} numberOfLines={1}>{value || '-'}</Text>
    </View>
  )
  if (onPress) return <TouchableOpacity activeOpacity={0.7} onPress={onPress}>{content}</TouchableOpacity>
  return content
}

export function InputRow({
  label,
  value,
  onChange,
  placeholder = '',
  keyboardType = 'default',
  multiline = false,
  maxLength,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  keyboardType?: 'default' | 'email-address' | 'phone-pad' | 'numeric'
  multiline?: boolean
  maxLength?: number
}) {
  return (
    <View style={s.row}>
      <Text style={s.rowLabel}>{label}</Text>
      <TextInput
        style={[s.input, multiline && s.inputMultiline]}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        keyboardType={keyboardType}
        multiline={multiline}
        maxLength={maxLength}
      />
    </View>
  )
}

export function SwitchRow({
  label,
  value,
  onChange,
  description,
}: {
  label: string
  value: boolean
  onChange: (v: boolean) => void
  description?: string
}) {
  return (
    <View style={s.rowSwitch}>
      <View style={s.rowSwitchText}>
        <Text style={s.rowLabel}>{label}</Text>
        {description ? <Text style={s.rowDesc}>{description}</Text> : null}
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: colors.border, true: colors.primary }}
        thumbColor="#fff"
      />
    </View>
  )
}

export function SelectRow<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: T
  options: T[]
  onChange: (v: T) => void
}) {
  return (
    <View style={s.row}>
      <Text style={s.rowLabel}>{label}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chipRow}>
        {options.map((opt) => {
          const active = opt === value
          return (
            <TouchableOpacity
              key={opt}
              activeOpacity={0.7}
              onPress={() => onChange(opt)}
              style={[s.chip, active && s.chipActive]}
            >
              <Text style={[s.chipText, active && s.chipTextActive]}>{opt}</Text>
            </TouchableOpacity>
          )
        })}
      </ScrollView>
    </View>
  )
}

export function ChipSelect({
  label,
  options,
  selected,
  onChange,
  max,
}: {
  label: string
  options: string[]
  selected: string[]
  onChange: (selected: string[]) => void
  max?: number
}) {
  const toggle = (opt: string) => {
    if (selected.includes(opt)) {
      onChange(selected.filter((x) => x !== opt))
      return
    }
    if (max && selected.length >= max) return
    onChange([...selected, opt])
  }
  return (
    <View style={s.row}>
      <Text style={s.rowLabel}>{label}</Text>
      <View style={s.wrap}>
        {options.map((opt) => {
          const active = selected.includes(opt)
          return (
            <TouchableOpacity
              key={opt}
              activeOpacity={0.7}
              onPress={() => toggle(opt)}
              style={[s.chip, active && s.chipActive]}
            >
              <Text style={[s.chipText, active && s.chipTextActive]}>{opt}</Text>
            </TouchableOpacity>
          )
        })}
      </View>
    </View>
  )
}

export function ButtonRow({ label, onPress, type = 'primary' }: { label: string; onPress: () => void; type?: 'primary' | 'danger' }) {
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      style={[s.btn, type === 'danger' && s.btnDanger]}
    >
      <Text style={s.btnText}>{label}</Text>
    </TouchableOpacity>
  )
}

const s = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
  },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  sectionTitle: { fontSize: typography.md.fontSize, fontWeight: typography.weight.bold, color: colors.text },
  sectionRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  iconWrap: {
    width: 28,
    height: 28,
    borderRadius: radius.md,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionBody: { paddingHorizontal: spacing.lg, paddingBottom: spacing.lg, gap: spacing.sm },
  hint: { fontSize: typography.sm.fontSize, color: colors.textSecondary, marginBottom: spacing.sm },
  row: {
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowPress: { opacity: 0.8 },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  rowIcon: { width: 24, alignItems: 'center' },
  rowLabel: { fontSize: typography.base.fontSize, fontWeight: typography.weight.semibold, color: colors.text, flex: 1 },
  rowValue: { fontSize: typography.base.fontSize, color: colors.textSecondary, marginTop: spacing.xs },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginTop: spacing.xs,
    fontSize: typography.base.fontSize,
    color: colors.text,
    backgroundColor: colors.bg,
  },
  inputMultiline: { minHeight: 64, textAlignVertical: 'top' },
  rowSwitch: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowSwitchText: { flex: 1, paddingRight: spacing.md },
  rowDesc: { fontSize: typography.sm.fontSize, color: colors.textMuted, marginTop: 2 },
  chipRow: { gap: spacing.sm, paddingVertical: spacing.xs },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.xs },
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    backgroundColor: colors.bg,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: typography.sm.fontSize, color: colors.textSecondary },
  chipTextActive: { color: '#fff', fontWeight: typography.weight.semibold },
  btn: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  btnDanger: { backgroundColor: colors.danger },
  btnText: { color: '#fff', fontSize: typography.base.fontSize, fontWeight: typography.weight.bold },
})
