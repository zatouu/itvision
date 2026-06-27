import AsyncStorage from '@react-native-async-storage/async-storage'

// Mock socket
jest.mock('../socket', () => ({
  connectSocket: jest.fn(() => ({
    on: jest.fn(),
    off: jest.fn(),
    emit: jest.fn(),
  })),
}))

import {
  loadNotifications,
  subscribeNotifications,
  markRead,
  markAllRead,
  clearNotifications,
  pushNotification,
} from '../notifications'

const store = (AsyncStorage as any)._store as Record<string, string>

beforeEach(async () => {
  Object.keys(store).forEach(k => delete store[k])
  jest.clearAllMocks()
  await clearNotifications()
})

describe('loadNotifications', () => {
  it('returns empty array when nothing stored', async () => {
    const result = await loadNotifications()
    expect(result).toEqual([])
  })

  it('persists notifications to AsyncStorage', async () => {
    await pushNotification({ kind: 'offer-received', title: 'Persisted', body: 'Test' })
    const raw = store['notifications:consumer']
    expect(raw).toBeDefined()
    const parsed = JSON.parse(raw)
    expect(parsed).toHaveLength(1)
    expect(parsed[0].title).toBe('Persisted')
  })
})

describe('pushNotification + subscribeNotifications', () => {
  it('adds a notification and notifies subscribers', async () => {
    const fn = jest.fn()
    const unsub = subscribeNotifications(fn)
    await pushNotification({
      kind: 'offer-received',
      title: 'New offer',
      body: 'You got an offer',
    })
    expect(fn).toHaveBeenCalled()
    const notified = fn.mock.calls[fn.mock.calls.length - 1][0]
    expect(notified).toHaveLength(1)
    expect(notified[0].title).toBe('New offer')
    expect(notified[0].read).toBe(false)
    unsub()
  })

  it('deduplicates identical notifications within 4s window', async () => {
    await clearNotifications()
    await pushNotification({ kind: 'offer-received', title: 'A', body: 'B' })
    await pushNotification({ kind: 'offer-received', title: 'A', body: 'B' })
    const items = await loadNotifications()
    expect(items).toHaveLength(1)
  })
})

describe('markRead', () => {
  it('marks a single notification as read', async () => {
    await pushNotification({ kind: 'offer-received', title: 'Test', body: 'Body' })
    const items = await loadNotifications()
    const id = items[0].id
    await markRead(id)
    const updated = await loadNotifications()
    expect(updated[0].read).toBe(true)
  })
})

describe('markAllRead', () => {
  it('marks all notifications as read', async () => {
    await pushNotification({ kind: 'offer-received', title: 'A', body: 'B' })
    await pushNotification({ kind: 'mission-update', title: 'C', body: 'D' })
    await markAllRead()
    const items = await loadNotifications()
    expect(items.every(n => n.read)).toBe(true)
  })
})

describe('clearNotifications', () => {
  it('removes all notifications', async () => {
    await pushNotification({ kind: 'offer-received', title: 'A', body: 'B' })
    await clearNotifications()
    const items = await loadNotifications()
    expect(items).toEqual([])
  })
})
