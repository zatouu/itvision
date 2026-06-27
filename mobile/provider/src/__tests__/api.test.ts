import { setOnUnauthorized } from '../api'

const mockFetch = jest.fn()
global.fetch = mockFetch as any

jest.mock('../auth', () => ({
  getAuthToken: jest.fn(() => 'test-token'),
}))

jest.mock('../sentry', () => ({
  captureError: jest.fn(),
}))

jest.mock('../offlineQueue', () => ({
  enqueue: jest.fn(),
  isNetworkError: jest.fn((e: Error) => e.message.includes('Réseau') || e.message.includes('Network') || e.message.includes('Délai')),
  replay: jest.fn(),
  startNetInfoReplay: jest.fn(() => () => {}),
}))

jest.mock('expo-file-system', () => ({}))

jest.mock('react-native', () => ({
  Alert: { alert: jest.fn() },
  Platform: { OS: 'ios' },
}))

import { apiGet, apiPost, apiPatch } from '../api'

function jsonResponse(data: any, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    url: 'http://localhost:3000' + (data?.path || ''),
    json: async () => data,
  } as Response
}

beforeEach(() => {
  mockFetch.mockReset()
})

describe('apiGet', () => {
  it('fetches with auth headers and returns JSON', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ items: [] }))
    const result = await apiGet('/api/test')
    expect(result).toEqual({ items: [] })
    const [, opts] = mockFetch.mock.calls[0]
    expect(opts.headers).toHaveProperty('Authorization', 'Bearer test-token')
  })

  it('retries on network error then succeeds', async () => {
    mockFetch
      .mockRejectedValueOnce(new Error('Réseau indisponible'))
      .mockResolvedValueOnce(jsonResponse({ ok: true }))
    const result = await apiGet('/api/test')
    expect(result).toEqual({ ok: true })
    expect(mockFetch).toHaveBeenCalledTimes(2)
  })

  it('throws after max retries', async () => {
    mockFetch.mockRejectedValue(new Error('Réseau indisponible'))
    await expect(apiGet('/api/test', 1)).rejects.toThrow('Réseau indisponible')
    expect(mockFetch).toHaveBeenCalledTimes(2)
  })
})

describe('apiPost', () => {
  it('sends POST with JSON body', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ success: true }))
    const result = await apiPost('/api/test', { foo: 'bar' })
    expect(result).toEqual({ success: true })
    const [, opts] = mockFetch.mock.calls[0]
    expect(opts.method).toBe('POST')
    expect(opts.body).toBe(JSON.stringify({ foo: 'bar' }))
  })
})

describe('apiPatch', () => {
  it('sends PATCH with JSON body', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ success: true }))
    await apiPatch('/api/test', { status: 'completed' })
    const [, opts] = mockFetch.mock.calls[0]
    expect(opts.method).toBe('PATCH')
    expect(opts.body).toBe(JSON.stringify({ status: 'completed' }))
  })
})

describe('handleStatus errors', () => {
  it('throws on 401 and fires unauthorized callback', async () => {
    const cb = jest.fn()
    setOnUnauthorized(cb)
    mockFetch.mockResolvedValueOnce(jsonResponse({ error: 'Unauthorized' }, 401))
    await expect(apiGet('/api/test', 0)).rejects.toThrow('Session expirée')
    expect(cb).toHaveBeenCalled()
  })

  it('throws on 403', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ error: 'Forbidden' }, 403))
    await expect(apiGet('/api/test', 0)).rejects.toThrow('Accès refusé')
  })

  it('throws on 404', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ error: 'Not found' }, 404))
    await expect(apiGet('/api/test', 0)).rejects.toThrow('Ressource introuvable')
  })

  it('throws on 500 with server message', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ error: 'DB down' }, 500))
    await expect(apiGet('/api/test', 0)).rejects.toThrow('DB down')
  })
})
