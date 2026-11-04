'use client'

import { createContext, useContext } from 'react'
import type { Theme, ResolvedTheme } from '@/lib/theme'

type ThemeState = {
  theme: Theme
  resolvedTheme: ResolvedTheme
  mounted: boolean
  setTheme: (theme: Theme) => void
}

export const ThemeContext = createContext<ThemeState | null>(null)

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) throw new Error('useTheme doit être utilisé dans ThemeProvider')
  return context
}
