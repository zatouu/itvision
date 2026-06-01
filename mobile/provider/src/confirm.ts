import { Alert, Platform } from 'react-native'

export function confirm(title: string, message: string): Promise<boolean> {
  if (Platform.OS === 'web') {
    const ok = typeof window !== 'undefined' && window.confirm(`${title}\n\n${message}`)
    return Promise.resolve(!!ok)
  }
  return new Promise((resolve) => {
    Alert.alert(title, message, [
      { text: 'Annuler', style: 'cancel', onPress: () => resolve(false) },
      { text: 'Voir', style: 'default', onPress: () => resolve(true) },
    ])
  })
}

export function notify(title: string, message?: string) {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') window.alert(message ? `${title}\n\n${message}` : title)
    return
  }
  Alert.alert(title, message)
}
