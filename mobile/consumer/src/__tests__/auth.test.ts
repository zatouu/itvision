import AsyncStorage from '@react-native-async-storage/async-storage'
import { loadAuth, setAuth, clearAuth, getAuthToken, getAuthUser, isLoggedIn, subscribeAuth } from '../auth'
import type { AuthUser } from '../auth'

const store = (AsyncStorage as any)._store as Record<string, string>

const mockUser: AuthUser = {
  _id: 'user123',
  name: 'Test User',
  phone: '+22177123456',
  role: 'CLIENT',
  referralCode: 'TESTCODE',
  referralBalance: 500,
}

beforeEach(() => {
  Object.keys(store).forEach(k => delete store[k])
  jest.clearAllMocks()
  clearAuth()
})

describe('setAuth / getAuthToken / getAuthUser', () => {
  it('stores token and user in memory + AsyncStorage', async () => {
    await setAuth('my-token', mockUser)
    expect(getAuthToken()).toBe('my-token')
    expect(getAuthUser()).toEqual(mockUser)
    expect(isLoggedIn()).toBe(true)
    expect(JSON.parse(store['authUser'])).toEqual(mockUser)
  })
})

describe('clearAuth', () => {
  it('removes token and user from memory + AsyncStorage', async () => {
    await setAuth('my-token', mockUser)
    await clearAuth()
    expect(getAuthToken()).toBeNull()
    expect(getAuthUser()).toBeNull()
    expect(isLoggedIn()).toBe(false)
    expect(store['authToken']).toBeUndefined()
    expect(store['authUser']).toBeUndefined()
  })
})

describe('loadAuth', () => {
  it('returns false when nothing stored', async () => {
    const result = await loadAuth()
    expect(result).toBe(false)
    expect(getAuthToken()).toBeNull()
  })

  it('loads token and user from AsyncStorage', async () => {
    store['authToken'] = 'stored-token'
    store['authUser'] = JSON.stringify(mockUser)
    const result = await loadAuth()
    expect(result).toBe(true)
    expect(getAuthToken()).toBe('stored-token')
    expect(getAuthUser()?._id).toBe('user123')
  })

  it('returns false on corrupted data', async () => {
    store['authToken'] = 'stored-token'
    store['authUser'] = '{invalid json'
    const result = await loadAuth()
    expect(result).toBe(false)
  })
})

describe('subscribeAuth', () => {
  it('notifies on login', async () => {
    const fn = jest.fn()
    const unsub = subscribeAuth(fn)
    await setAuth('tok', mockUser)
    expect(fn).toHaveBeenCalledWith(true)
    unsub()
  })

  it('notifies on logout', async () => {
    await setAuth('tok', mockUser)
    const fn = jest.fn()
    const unsub = subscribeAuth(fn)
    await clearAuth()
    expect(fn).toHaveBeenCalledWith(false)
    unsub()
  })

  it('unsubscribe stops notifications', async () => {
    const fn = jest.fn()
    const unsub = subscribeAuth(fn)
    unsub()
    await setAuth('tok', mockUser)
    expect(fn).not.toHaveBeenCalled()
  })
})
