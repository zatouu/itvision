import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'

interface EmptyStateProps {
  icon: string
  title: string
  subtitle?: string
  actionLabel?: string
  onAction?: () => void
}

export default function EmptyState({ icon, title, subtitle, actionLabel, onAction }: EmptyStateProps) {
  return (
    <View style={s.container}>
      <View style={s.iconCircle}>
        <Text style={s.icon}>{icon}</Text>
      </View>
      <Text style={s.title}>{title}</Text>
      {subtitle ? <Text style={s.subtitle}>{subtitle}</Text> : null}
      {actionLabel && onAction ? (
        <TouchableOpacity style={s.btn} onPress={onAction} activeOpacity={0.85}>
          <Text style={s.btnText}>{actionLabel}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  )
}

const s = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center', paddingVertical: 48, paddingHorizontal: 32, gap: 12 },
  iconCircle: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  icon: { fontSize: 32 },
  title: { fontSize: 17, fontWeight: '700', color: '#0F172A', textAlign: 'center' },
  subtitle: { fontSize: 13, color: '#64748B', textAlign: 'center', lineHeight: 20, maxWidth: 260 },
  btn: { backgroundColor: '#0F172A', borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12, marginTop: 8 },
  btnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
})
