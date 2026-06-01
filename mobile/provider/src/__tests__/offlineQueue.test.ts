import AsyncStorage from '@react-native-async-storage/async-storage'
import { enqueue, replay, getQueueSize, clearQueue, isNetworkError } from '../offlineQueue'

const store = (AsyncStorage as any)._store as Record<string, string>

beforeEach(() => {
  Object.keys(store).forEach(k => delete store[k])
  jest.clearAllMocks()
})

describe('isNetworkError', () => {
  it('detects French network message', () => {
    expect(isNetworkError(new Error('Réseau indisponible — vérifiez que le serveur est démarré'))).toBe(true)
  })
  it('detects timeout message', () => {
    expect(isNetworkError(new Error('Délai dépassé — le serveur met trop de temps à répondre'))).toBe(true)
  })
  it('detects English network error', () => {
    expect(isNetworkError(new Error('Network request failed'))).toBe(true)
  })
  it('rejects business errors', () => {
    expect(isNetworkError(new Error('Non authentifié — token manquant ou expiré'))).toBe(false)
    expect(isNetworkError(new Error('Accès refusé'))).toBe(false)
    expect(isNetworkError(new Error('Erreur serveur (500)'))).toBe(false)
  })
})

describe('enqueue', () => {
  it('adds an entry to the queue', async () => {
    await enqueue({ method: 'POST', path: '/api/test', body: { foo: 'bar' } })
    expect(await getQueueSize()).toBe(1)
  })

  it('deduplicates identical entries', async () => {
    await enqueue({ method: 'POST', path: '/api/test', body: { foo: 'bar' } })
    await enqueue({ method: 'POST', path: '/api/test', body: { foo: 'bar' } })
    expect(await getQueueSize()).toBe(1)
  })

  it('allows different bodies', async () => {
    await enqueue({ method: 'POST', path: '/api/test', body: { a: 1 } })
    await enqueue({ method: 'POST', path: '/api/test', body: { a: 2 } })
    expect(await getQueueSize()).toBe(2)
  })

  it('allows same path with different methods', async () => {
    await enqueue({ method: 'POST', path: '/api/test', body: { a: 1 } })
    await enqueue({ method: 'PATCH', path: '/api/test', body: { a: 1 } })
    expect(await getQueueSize()).toBe(2)
  })
})

describe('replay', () => {
  it('replays entries in FIFO order', async () => {
    await enqueue({ method: 'POST', path: '/api/a', body: { n: 1 } })
    await enqueue({ method: 'PATCH', path: '/api/b', body: { n: 2 } })

    const calls: string[] = []
    const executor = jest.fn(async (m, p, b) => { calls.push(`${m} ${p}`) })

    const result = await replay(executor)
    expect(result).toEqual({ replayed: 2, failed: 0, remaining: 0 })
    expect(calls).toEqual(['POST /api/a', 'PATCH /api/b'])
    expect(await getQueueSize()).toBe(0)
  })

  it('keeps remaining entries on network error', async () => {
    await enqueue({ method: 'POST', path: '/api/a', body: {} })
    await enqueue({ method: 'POST', path: '/api/b', body: {} })

    const executor = jest.fn()
      .mockRejectedValueOnce(new Error('Réseau indisponible'))

    const result = await replay(executor)
    expect(result.replayed).toBe(0)
    expect(result.remaining).toBe(2) // both kept
    expect(await getQueueSize()).toBe(2)
  })

  it('removes entries on business error', async () => {
    await enqueue({ method: 'POST', path: '/api/a', body: {} })

    const executor = jest.fn().mockRejectedValueOnce(new Error('Accès refusé'))

    const result = await replay(executor)
    expect(result.failed).toBe(1)
    expect(result.remaining).toBe(0)
    expect(await getQueueSize()).toBe(0)
  })

  it('handles mixed success/network-failure', async () => {
    await enqueue({ method: 'POST', path: '/api/a', body: { n: 1 } })
    await enqueue({ method: 'POST', path: '/api/b', body: { n: 2 } })
    await enqueue({ method: 'POST', path: '/api/c', body: { n: 3 } })

    const executor = jest.fn()
      .mockResolvedValueOnce({ ok: true }) // a succeeds
      .mockRejectedValueOnce(new Error('Network request failed')) // b fails network

    const result = await replay(executor)
    expect(result.replayed).toBe(1)
    expect(result.remaining).toBe(2) // b + c kept
    expect(executor).toHaveBeenCalledTimes(2) // c never attempted
  })

  it('returns zeros on empty queue', async () => {
    const result = await replay(jest.fn())
    expect(result).toEqual({ replayed: 0, failed: 0, remaining: 0 })
  })
})

describe('clearQueue', () => {
  it('empties the queue', async () => {
    await enqueue({ method: 'POST', path: '/api/x', body: {} })
    expect(await getQueueSize()).toBe(1)
    await clearQueue()
    expect(await getQueueSize()).toBe(0)
  })
})
