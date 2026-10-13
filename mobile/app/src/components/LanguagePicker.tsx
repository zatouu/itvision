import { createThemedStyles } from '../theme'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { useTranslation } from 'react-i18next'
import { changeLanguage, LANGUAGES } from '../i18n'

export default function LanguagePicker() {
  const { s } = useStyles()
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
            accessibilityRole="button"
            accessibilityLabel={`Langue: ${lang.label}`}
            accessibilityState={{ selected: active }}
            aria-selected={active}
          >
            <Text style={[s.flag, active && s.flagActive]}>{lang.flag}</Text>
            <Text style={[s.label, active && s.labelActive]}>{lang.label}</Text>
          </TouchableOpacity>
        )
      })}
    </View>
  )
}



const useStyles = createThemedStyles(colors => {
  const s = StyleSheet.create({
    container: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
    chip: {
      flexDirection: 'row', alignItems: 'center', gap: 6,
      minHeight: 44,
      paddingHorizontal: 14, paddingVertical: 8,
      borderRadius: 20, backgroundColor: colors.slate100,
      borderWidth: 1.5, borderColor: 'transparent',
    },
    chipActive: {
      backgroundColor: colors.infoSoft, borderColor: colors.info,
    },
    flag: { fontSize: 18, color: colors.textSecondary },
    flagActive: { color: colors.infoInk },
    label: { fontSize: 13, fontWeight: '500', color: colors.textSecondary },
    labelActive: { color: colors.infoInk, fontWeight: '700' },
  })
  return { colors, s }
})
