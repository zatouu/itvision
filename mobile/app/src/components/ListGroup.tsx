import { createThemedStyles } from '../theme'
import { Children, isValidElement, cloneElement, ReactElement, ReactNode } from 'react'
import { View, Text, Pressable, StyleSheet } from 'react-native'
import { ChevronRight } from 'lucide-react-native'
import { type, isIOS } from '../design'

type GroupProps = { title?: string; footer?: string; children: ReactNode }

/** Liste groupée en encart (style Réglages iOS) : en-tête, lignes séparées par un filet, note de bas. */
export function ListGroup({ title, footer, children }: GroupProps) {
  const { s } = useStyles()
  const rows = Children.toArray(children).filter(isValidElement) as ReactElement<RowProps>[]
  return (
    <View style={s.group}>
      {title ? <Text style={s.groupTitle} accessibilityRole="header">{title}</Text> : null}
      <View style={s.card}>
        {rows.map((row, i) => cloneElement(row, { last: i === rows.length - 1, key: row.key ?? i }))}
      </View>
      {footer ? <Text style={s.footer}>{footer}</Text> : null}
    </View>
  )
}

type RowProps = {
  icon?: ReactNode
  iconBg?: string
  title: string
  subtitle?: string
  value?: string
  right?: ReactNode
  onPress?: () => void
  destructive?: boolean
  chevron?: boolean
  last?: boolean
}

export function ListRow({ icon, iconBg, title, subtitle, value, right, onPress, destructive, chevron, last }: RowProps) {
  const { colors, s } = useStyles()
  // Les chevrons de navigation sont une convention iOS, absente des listes Material.
  const showChevron = chevron ?? (isIOS && !!onPress && !right)
  const content = (
    <>
      {icon ? <View style={[s.icon, { backgroundColor: iconBg || colors.fill }]}>{icon}</View> : null}
      <View style={[s.main, !last && s.separator, !icon && s.mainNoIcon]}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[s.title, destructive && { color: colors.dangerInk }]} numberOfLines={1}>{title}</Text>
          {subtitle ? <Text style={s.subtitle} numberOfLines={2}>{subtitle}</Text> : null}
        </View>
        {value ? <Text style={s.value} numberOfLines={1}>{value}</Text> : null}
        {right}
        {showChevron ? <ChevronRight size={18} color={colors.textFaint} /> : null}
      </View>
    </>
  )
  if (!onPress) return <View style={s.row}>{content}</View>
  return (
    <Pressable
      onPress={onPress}
      android_ripple={{ color: 'rgba(10,22,40,0.08)' }}
      style={({ pressed }) => [s.row, isIOS && pressed && { backgroundColor: colors.fill }]}
      accessibilityRole="button"
      accessibilityLabel={subtitle ? `${title}, ${subtitle}` : title}
    >
      {content}
    </Pressable>
  )
}



const useStyles = createThemedStyles(colors => {
  const s = StyleSheet.create({
    group: { marginTop: 24, marginHorizontal: 16 },
    groupTitle: isIOS
      ? { ...type.overline, color: colors.textSecondary, marginLeft: 16, marginBottom: 8 }
      : { fontSize: 14, lineHeight: 20, fontWeight: '600', color: colors.primaryText, marginLeft: 16, marginBottom: 8 },
    card: { backgroundColor: colors.surface, borderRadius: isIOS ? 14 : 20, overflow: 'hidden' },
    footer: { ...type.footnote, color: colors.textSecondary, marginHorizontal: 16, marginTop: 8 },
    row: { flexDirection: 'row', alignItems: 'center', paddingLeft: 16, minHeight: 48 },
    icon: { width: 30, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
    main: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 12, paddingRight: 14 },
    mainNoIcon: {},
    separator: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.separator },
    title: { ...type.body, color: colors.ink },
    subtitle: { ...type.footnote, color: colors.textSecondary, marginTop: 1 },
    value: { ...type.subhead, color: colors.textSecondary, maxWidth: 140 },
  })
  return { colors, s }
})
