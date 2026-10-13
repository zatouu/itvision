import { createContext, useContext, useEffect, useSyncExternalStore, ReactNode } from 'react'
import { Appearance, Platform, useColorScheme } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { colors as lightColors, darkColors, ThemeColors } from './design'
import { createThemeStore, resolveTheme, ThemePreference, ResolvedTheme } from './theme-preference'

const store = createThemeStore(AsyncStorage)

type ThemeContextValue = {
  colors: ThemeColors
  preference: ThemePreference
  resolvedTheme: ResolvedTheme
  isDark: boolean
  ready: boolean
  setPreference: (preference: ThemePreference) => Promise<boolean>
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { preference, ready } = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot)
  const systemTheme = useColorScheme()
  const resolvedTheme = resolveTheme(preference, systemTheme)

  useEffect(() => { void store.load() }, [])
  useEffect(() => {
    if (ready && Platform.OS !== 'web') {
      Appearance.setColorScheme(preference === 'system' ? null : preference)
    }
  }, [preference, ready])

  return (
    <ThemeContext.Provider value={{
      colors: resolvedTheme === 'dark' ? darkColors : lightColors,
      preference,
      resolvedTheme,
      isDark: resolvedTheme === 'dark',
      ready,
      setPreference: store.setPreference,
    }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const theme = useContext(ThemeContext)
  if (!theme) throw new Error('useTheme requires ThemeProvider')
  return theme
}

export function createThemedStyles<Styles>(factory: (colors: ThemeColors) => Styles) {
  const cache = new WeakMap<ThemeColors, Styles>()
  return function useThemedStyles() {
    const { colors } = useTheme()
    if (!cache.has(colors)) cache.set(colors, factory(colors))
    return cache.get(colors) as Styles
  }
}