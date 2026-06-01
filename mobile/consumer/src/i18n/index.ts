import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import AsyncStorage from '@react-native-async-storage/async-storage'

import fr from './fr.json'
import wo from './wo.json'
import en from './en.json'

const LANG_KEY = 'app:lang'

const resources = {
  fr: { translation: fr },
  wo: { translation: wo },
  en: { translation: en },
}

i18n.use(initReactI18next).init({
  resources,
  lng: 'fr',
  fallbackLng: 'fr',
  interpolation: { escapeValue: false },
  compatibilityJSON: 'v4',
})

/** Load saved language from AsyncStorage */
export async function loadSavedLanguage() {
  try {
    const saved = await AsyncStorage.getItem(LANG_KEY)
    if (saved && ['fr', 'wo', 'en'].includes(saved)) {
      await i18n.changeLanguage(saved)
    }
  } catch { /* ignore */ }
}

/** Change language and persist */
export async function changeLanguage(lng: 'fr' | 'wo' | 'en') {
  await i18n.changeLanguage(lng)
  try { await AsyncStorage.setItem(LANG_KEY, lng) } catch { /* ignore */ }
}

export const LANGUAGES = [
  { code: 'fr' as const, label: 'Français', flag: '🇫🇷' },
  { code: 'wo' as const, label: 'Wolof', flag: '🇸🇳' },
  { code: 'en' as const, label: 'English', flag: '🇬🇧' },
]

export default i18n
