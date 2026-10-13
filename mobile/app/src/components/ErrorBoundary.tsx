import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import i18n from 'i18next'
import { logError } from '../log'
import { TriangleAlert } from 'lucide-react-native'
import { createThemedStyles } from '../theme'

interface Props { children: React.ReactNode; onReset?: () => void }
interface State { hasError: boolean; error: string }

export default class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false, error: '' }

  static getDerivedStateFromError(err: Error) {
    return { hasError: true, error: err.message || 'Erreur inconnue' }
  }

  componentDidCatch(err: Error, info: React.ErrorInfo) {
    logError('ErrorBoundary', err, { componentStack: info?.componentStack?.slice(0, 2000) })
  }

  handleRetry = () => {
    this.props.onReset?.()
    this.setState({ hasError: false, error: '' })
  }

  render() {
    if (this.state.hasError) {
      return <ErrorFallback message={this.state.error} onRetry={this.handleRetry} />
    }
    return this.props.children
  }
}

function ErrorFallback({ message, onRetry }: { message: string; onRetry: () => void }) {
  const { colors, styles } = useStyles()
  return (
    <View style={styles.container}>
      <TriangleAlert size={40} color={colors.warnInk} />
      <Text style={styles.title}>{i18n.t('error.title')}</Text>
      <Text style={styles.msg}>{message}</Text>
      <TouchableOpacity style={styles.btn} onPress={onRetry} accessibilityRole="button" accessibilityLabel={i18n.t('error.retry')}>
        <Text style={styles.btnText}>{i18n.t('error.retry')}</Text>
      </TouchableOpacity>
    </View>
  )
}

const useStyles = createThemedStyles(colors => ({
  colors,
  styles: StyleSheet.create({
    container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, backgroundColor: colors.bg, gap: 12 },
    title: { fontSize: 18, fontWeight: '700', color: colors.text, textAlign: 'center' },
    msg: { fontSize: 13, color: colors.textSecondary, textAlign: 'center', lineHeight: 20 },
    btn: { backgroundColor: colors.primary, minHeight: 44, borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12, marginTop: 8 },
    btnText: { color: colors.onPrimary, fontWeight: '600', fontSize: 14 },
  }),
}))
