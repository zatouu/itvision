import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { useTranslation } from 'react-i18next'
import { changeLanguage, LANGUAGES } from '../i18n'

export default function LanguagePicker() {
  const { i18n } = useTranslation()

  return (
    <View style={s.container}>
      {LANGUAGES.map(lang => {
        const active = i18n.language === lang.code
        return (
          <TouchableOpacity
            key={lang.code}
            style={[s.chip, active && s.chipActive]}
            onPress={() => changeLanguage(lang.code)}
            activeOpacity={0.75}
          >
            <Text style={s.flag}>{lang.flag}</Text>
            <Text style={[s.label, active && s.labelActive]}>{lang.label}</Text>
          </TouchableOpacity>
        )
      })}
    </View>
  )
}

const s = StyleSheet.create({
  container: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 20, backgroundColor: '#F1F5F9',
    borderWidth: 1.5, borderColor: 'transparent',
  },
  chipActive: {
    backgroundColor: '#EFF6FF', borderColor: '#3B82F6',
  },
  flag: { fontSize: 18 },
  label: { fontSize: 13, fontWeight: '500', color: '#64748B' },
  labelActive: { color: '#1D4ED8', fontWeight: '700' },
})
