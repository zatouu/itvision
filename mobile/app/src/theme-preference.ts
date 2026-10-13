export type ThemePreference = 'light' | 'dark' | 'system'
export type ResolvedTheme = 'light' | 'dark'

export const THEME_STORAGE_KEY = 'app:theme'

export function normalizeTheme(value: unknown): ThemePreference {
  return value === 'light' || value === 'dark' ? value : 'system'
}

export function resolveTheme(preference: ThemePreference, system: string | null | undefined): ResolvedTheme {
  return preference === 'system' ? (system === 'dark' ? 'dark' : 'light') : preference
}

type Storage = {
  getItem: (key: string) => Promise<string | null>
  setItem: (key: string, value: string) => Promise<unknown>
}

export function createThemeStore(storage: Storage) {
  let snapshot: { preference: ThemePreference; ready: boolean } = { preference: 'system', ready: false }
  let revision = 0
  let loading: Promise<void> | undefined
  let writing = Promise.resolve(true)
  const listeners = new Set<() => void>()
  const publish = (preference: ThemePreference) => {
    snapshot = { preference, ready: true }
    listeners.forEach(listener => listener())
  }

  return {
    getSnapshot: () => snapshot,
    subscribe: (listener: () => void) => {
      listeners.add(listener)
      return () => { listeners.delete(listener) }
    },
    load: () => {
      if (!loading) {
        const initialRevision = revision
        loading = Promise.resolve().then(() => storage.getItem(THEME_STORAGE_KEY))
          .then(normalizeTheme, () => 'system' as const)
          .then(preference => {
            if (initialRevision === revision) publish(preference)
          })
      }
      return loading
    },
    setPreference: (preference: ThemePreference) => {
      revision += 1
      const normalized = normalizeTheme(preference)
      publish(normalized)
      writing = writing.then(() => storage.setItem(THEME_STORAGE_KEY, normalized))
        .then(() => true, () => false)
      return writing
    },
  }
}