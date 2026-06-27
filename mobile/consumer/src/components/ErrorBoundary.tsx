import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import i18n from 'i18next'

interface Props { children: React.ReactNode; onReset?: () => void }
interface State { hasError: boolean; error: string }

export default class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false, error: '' }

  static getDerivedStateFromError(err: Error) {
    return { hasError: true, error: err.message || 'Erreur inconnue' }
  }

  componentDidCatch(err: Error) {
    console.error('[ErrorBoundary]', err)
  }

  handleRetry = () => {
    this.props.onReset?.()
    this.setState({ hasError: false, error: '' })
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={s.container}>
          <Text style={s.icon}>⚠️</Text>
          <Text style={s.title}>{i18n.t('error.title')}</Text>
          <Text style={s.msg}>{this.state.error}</Text>
          <TouchableOpacity style={s.btn} onPress={this.handleRetry} accessibilityRole="button" accessibilityLabel="Réessayer">
            <Text style={s.btnText}>{i18n.t('error.retry')}</Text>
          </TouchableOpacity>
        </View>
      )
    }
    return this.props.children
  }
}

const s = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, backgroundColor: '#F8FAFC', gap: 12 },
  icon: { fontSize: 40 },
  title: { fontSize: 18, fontWeight: '700', color: '#0F172A', textAlign: 'center' },
  msg: { fontSize: 13, color: '#64748B', textAlign: 'center', lineHeight: 20 },
  btn: { backgroundColor: '#0F172A', borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12, marginTop: 8 },
  btnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
})
