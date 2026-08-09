import { Alert, Platform } from 'react-native'
import i18n from './i18n'
import { toast } from './toast'

export function confirm(title: string, message: string): Promise<boolean> {
  if (Platform.OS === 'web') {
    const ok = typeof window !== 'undefined' && window.confirm(`${title}\n\n${message}`)
    return Promise.resolve(!!ok)
  }
  return new Promise((resolve) => {
    Alert.alert(title, message, [
      { text: i18n.t('common.cancel'), style: 'cancel', onPress: () => resolve(false) },
      { text: i18n.t('common.confirm'), style: 'default', onPress: () => resolve(true) },
    ])
  })
}

export function notify(title: string, message?: string) {
  toast.info(title, message)
}
