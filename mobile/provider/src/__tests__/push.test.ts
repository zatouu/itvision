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
  getAuthUser: jest.fn(() => ({ _id: 'provider1', role: 'TECHNICIAN' })),
}))

import { resolveNavTarget } from '../push'

describe('resolveNavTarget (provider)', () => {
  it('routes request:new to nearby-requests', () => {
    expect(resolveNavTarget({ type: 'request:new' })).toBe('/nearby-requests')
  })

  it('routes offer:accepted with requestId to active-mission', () => {
    expect(resolveNavTarget({ type: 'offer:accepted', requestId: 'r1' })).toBe('/active-mission/r1')
  })

  it('routes offer:accepted without requestId to my-offers', () => {
    expect(resolveNavTarget({ type: 'offer:accepted' })).toBe('/my-offers')
  })

  it('routes offer:rejected to my-offers', () => {
    expect(resolveNavTarget({ type: 'offer:rejected' })).toBe('/my-offers')
  })

  it('routes offer:counter to my-offers', () => {
    expect(resolveNavTarget({ type: 'offer:counter' })).toBe('/my-offers')
  })

  it('routes payment:released to active-mission', () => {
    expect(resolveNavTarget({ type: 'payment:released', requestId: 'r2' })).toBe('/active-mission/r2')
  })

  it('routes payment:released without requestId to null', () => {
    expect(resolveNavTarget({ type: 'payment:released' })).toBeNull()
  })

  it('routes request:status-changed to active-mission', () => {
    expect(resolveNavTarget({ type: 'request:status-changed', requestId: 'r3' })).toBe('/active-mission/r3')
  })

  it('routes chat:message to mission-chat', () => {
    expect(resolveNavTarget({ type: 'chat:message', requestId: 'r4' })).toBe('/mission-chat?id=r4')
  })

  it('falls back to active-mission for unknown type with requestId', () => {
    expect(resolveNavTarget({ type: 'unknown:type', requestId: 'r5' })).toBe('/active-mission/r5')
  })

  it('falls back to notifications for unknown type without requestId', () => {
    expect(resolveNavTarget({ type: 'unknown:type' })).toBe('/notifications')
  })
})
