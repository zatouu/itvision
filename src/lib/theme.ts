export type Theme = 'light' | 'dark' | 'system'
export type ResolvedTheme = 'light' | 'dark'

export function normalizeTheme(value: unknown): Theme {
  return value === 'light' || value === 'dark' ? value : 'system'
}

export function resolveTheme(theme: Theme, systemDark: boolean): ResolvedTheme {
  return theme === 'system' ? (systemDark ? 'dark' : 'light') : theme
}

export function applyTheme(theme: ResolvedTheme) {
  const root = document.documentElement
  root.classList.toggle('dark', theme === 'dark')
  root.style.colorScheme = theme
}

export const THEME_INIT_SCRIPT = `(() => {
  let stored;
  try { stored = localStorage.getItem('theme'); } catch {}
  const theme = (${normalizeTheme.toString()})(stored);
  const resolved = (${resolveTheme.toString()})(theme, window.matchMedia('(prefers-color-scheme: dark)').matches);
  (${applyTheme.toString()})(resolved);
})();`