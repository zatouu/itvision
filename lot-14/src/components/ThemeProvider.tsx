'use client'

import { useEffect, useRef, useState } from 'react'
import { ThemeContext } from '@/hooks/useTheme'
import { applyTheme, normalizeTheme, resolveTheme, type Theme, type ResolvedTheme } from '@/lib/theme'

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('system')
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>('light')
  const [mounted, setMounted] = useState(false)
  const currentTheme = useRef<Theme>('system')

  function updateTheme(value: unknown) {
    const next = normalizeTheme(value)
    const resolved = resolveTheme(next, window.matchMedia('(prefers-color-scheme: dark)').matches)
    currentTheme.current = next
    applyTheme(resolved)
    setThemeState(next)
    setResolvedTheme(resolved)
  }

  useEffect(() => {
    let stored: string | null = null
    try { stored = localStorage.getItem('theme') } catch {}
    updateTheme(stored)
    setMounted(true)

    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const handleSystemChange = () => {
      if (currentTheme.current === 'system') updateTheme('system')
    }
    const handleStorage = (event: StorageEvent) => {
      if (event.key !== 'theme' && event.key !== null) return
      try {
        if (event.storageArea !== localStorage) return
      } catch { return }
      updateTheme(event.newValue)
    }
    media.addEventListener('change', handleSystemChange)
    window.addEventListener('storage', handleStorage)
    return () => {
      media.removeEventListener('change', handleSystemChange)
      window.removeEventListener('storage', handleStorage)
    }
  }, [])

  const setTheme = (next: Theme) => {
    updateTheme(next)
    try { localStorage.setItem('theme', normalizeTheme(next)) } catch {}
  }

  return <ThemeContext.Provider value={{ theme, resolvedTheme, mounted, setTheme }}>{children}</ThemeContext.Provider>
}
