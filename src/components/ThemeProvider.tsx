'use client'

import { useEffect, useRef, useState } from 'react'
import { ThemeContext } from '@/hooks/useTheme'
import {
  applyTheme,
  normalizeTheme,
  resolveTheme,
  type Theme,
  type ResolvedTheme,
} from '@/lib/theme'

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('system')
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>('light')
  const [mounted, setMounted] = useState(false)
  const themeRef = useRef<Theme>('system')

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const stored = normalizeTheme(localStorage.getItem('theme'))
    themeRef.current = stored
    setThemeState(stored)
    const resolved = resolveTheme(stored, mq.matches)
    setResolvedTheme(resolved)
    applyTheme(resolved)
    setMounted(true)

    const onChange = (e: MediaQueryListEvent) => {
      if (themeRef.current !== 'system') return
      const next: ResolvedTheme = e.matches ? 'dark' : 'light'
      setResolvedTheme(next)
      applyTheme(next)
    }
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  const setTheme = (next: Theme) => {
    themeRef.current = next
    setThemeState(next)
    try {
      localStorage.setItem('theme', next)
    } catch {}
    const resolved = resolveTheme(next, window.matchMedia('(prefers-color-scheme: dark)').matches)
    setResolvedTheme(resolved)
    applyTheme(resolved)
  }

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, mounted, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}
