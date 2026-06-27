jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn() },
}))

jest.mock('expo-notifications', () => ({
  addNotificationResponseReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  setNotificationHandler: { setHandler: jest.fn() },
  addNotificationReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
}))

jest.mock('../notifications', () => ({
  addNotification: jest.fn(),
  loadStoredNotifications: jest.fn(),
}))

jest.mock('../api', () => ({
  apiPost: jest.fn(),
  apiGet: jest.fn(),
  getAuthToken: jest.fn(() => 'test-token'),
}))

jest.mock('../auth', () => ({
  getAuthUser: jest.fn(() => ({ _id: 'user1', role: 'CLIENT' })),
}))

import { resolveNavTarget } from '../push'

describe('resolveNavTarget (consumer)', () => {
  it('routes offer:new to request-offers', () => {
    expect(resolveNavTarget({ type: 'offer:new', requestId: 'r1' })).toBe('/request-offers?id=r1')
  })

  it('routes offer:new without requestId to null', () => {
    expect(resolveNavTarget({ type: 'offer:new' })).toBeNull()
  })

  it('routes offer:accepted to mission detail', () => {
    expect(resolveNavTarget({ type: 'offer:accepted', requestId: 'r2' })).toBe('/mission/r2')
  })

  it('routes payment:held to mission detail', () => {
    expect(resolveNavTarget({ type: 'payment:held', requestId: 'r3' })).toBe('/mission/r3')
  })

  it('routes request:status-changed to mission detail', () => {
    expect(resolveNavTarget({ type: 'request:status-changed', requestId: 'r4' })).toBe('/mission/r4')
  })

  it('routes offer:counter-accepted to mission detail', () => {
    expect(resolveNavTarget({ type: 'offer:counter-accepted', requestId: 'r5' })).toBe('/mission/r5')
  })

  it('routes offer:counter-rejected to mission detail', () => {
    expect(resolveNavTarget({ type: 'offer:counter-rejected', requestId: 'r6' })).toBe('/mission/r6')
  })

  it('routes chat:message to mission-chat', () => {
    expect(resolveNavTarget({ type: 'chat:message', requestId: 'r7' })).toBe('/mission-chat?id=r7')
  })

  it('routes request:new to my-requests', () => {
    expect(resolveNavTarget({ type: 'request:new' })).toBe('/my-requests')
  })

  it('falls back to mission detail for unknown type with requestId', () => {
    expect(resolveNavTarget({ type: 'unknown:type', requestId: 'r8' })).toBe('/mission/r8')
  })

  it('falls back to notifications for unknown type without requestId', () => {
    expect(resolveNavTarget({ type: 'unknown:type' })).toBe('/notifications')
  })
})
