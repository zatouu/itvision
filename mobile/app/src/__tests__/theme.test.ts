import { createThemeStore, normalizeTheme, resolveTheme, THEME_STORAGE_KEY } from '../theme-preference'
import { colors, darkColors } from '../design'

jest.mock('react-native', () => ({ Platform: { OS: 'ios', select: (options: { ios: unknown }) => options.ios } }))

describe('apparence Xeuy', () => {
  test.each([null, undefined, '', 'invalid', 'system'])('normalise %p vers le systeme', value => {
    expect(normalizeTheme(value)).toBe('system')
  })

  test.each(['light', 'dark'] as const)('le choix %s prime sur le systeme', preference => {
    for (const system of ['light', 'dark', null]) expect(resolveTheme(preference, system)).toBe(preference)
  })

  test('suit les changements du systeme', () => {
    expect(resolveTheme('system', 'dark')).toBe('dark')
    expect(resolveTheme('system', 'light')).toBe('light')
    expect(resolveTheme('system', null)).toBe('light')
  })

  test('charge une seule fois la preference avant de devenir pret', async () => {
    const storage = { getItem: jest.fn().mockResolvedValue('dark'), setItem: jest.fn() }
    const store = createThemeStore(storage)
    expect(store.getSnapshot().ready).toBe(false)
    await Promise.all([store.load(), store.load()])
    expect(store.getSnapshot()).toEqual({ preference: 'dark', ready: true })
    expect(storage.getItem).toHaveBeenCalledTimes(1)
    expect(storage.getItem).toHaveBeenCalledWith(THEME_STORAGE_KEY)
  })

  test('un chargement tardif ne remplace pas un choix recent', async () => {
    let finishLoad!: (value: string) => void
    const store = createThemeStore({
      getItem: () => new Promise(resolve => { finishLoad = resolve }),
      setItem: jest.fn().mockResolvedValue(undefined),
    })
    const loading = store.load()
    await Promise.resolve()
    await store.setPreference('light')
    finishLoad('dark')
    await loading
    expect(store.getSnapshot().preference).toBe('light')
  })

  test('reste utilisable si le stockage echoue et permet de reessayer', async () => {
    const storage = {
      getItem: jest.fn().mockRejectedValue(new Error('unavailable')),
      setItem: jest.fn().mockRejectedValueOnce(new Error('full')).mockResolvedValue(undefined),
    }
    const store = createThemeStore(storage)
    await store.load()
    expect(store.getSnapshot()).toEqual({ preference: 'system', ready: true })
    expect(await store.setPreference('dark')).toBe(false)
    expect(store.getSnapshot().preference).toBe('dark')
    expect(await store.setPreference('light')).toBe(true)
  })

  test('serialise les choix rapides et notifie tous les abonnes', async () => {
    const written: string[] = []
    let finishFirst!: () => void
    const store = createThemeStore({
      getItem: async () => null,
      setItem: async (_key, value) => {
        if (value === 'dark') await new Promise<void>(resolve => { finishFirst = resolve })
        written.push(value)
      },
    })
    const listener = jest.fn()
    const unsubscribe = store.subscribe(listener)
    const first = store.setPreference('dark')
    const last = store.setPreference('system')
    expect(store.getSnapshot().preference).toBe('system')
    await Promise.resolve()
    expect(written).toEqual([])
    finishFirst()
    await Promise.all([first, last])
    expect(written).toEqual(['dark', 'system'])
    expect(listener).toHaveBeenCalledTimes(2)
    unsubscribe()
    await store.setPreference('light')
    expect(listener).toHaveBeenCalledTimes(2)
  })

  test('les textes sombres et les boutons principaux ont un contraste suffisant', () => {
    const luminance = (hex: string) => {
      const channels = [1, 3, 5].map(offset => parseInt(hex.slice(offset, offset + 2), 16) / 255)
        .map(channel => channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4)
      return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722
    }
    const contrast = (foreground: string, background: string) => {
      const levels = [luminance(foreground), luminance(background)].sort((left, right) => right - left)
      return (levels[0] + 0.05) / (levels[1] + 0.05)
    }
    expect(Object.keys(darkColors).sort()).toEqual(Object.keys(colors).sort())
    for (const palette of [colors, darkColors]) {
      for (const background of [palette.bg, palette.surface, palette.bgDeep]) {
        for (const token of ['text', 'textSecondary', 'textMuted', 'textDim', 'textFaint', 'primaryText'] as const) {
          expect(contrast(palette[token], background)).toBeGreaterThanOrEqual(4.5)
        }
      }
    }
    for (const palette of [colors, darkColors]) {
      expect(contrast(palette.onPrimary, palette.primary)).toBeGreaterThanOrEqual(4.5)
    }
  })
})