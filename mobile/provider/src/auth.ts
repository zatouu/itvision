import AsyncStorage from '@react-native-async-storage/async-storage'

const TOKEN_KEY = 'auth:token'
const USER_KEY = 'auth:user'

export interface AuthUser {
  _id: string
  name: string
  phone: string
  role: string
  isNew?: boolean
  referralCode?: string
  referralBalance?: number
}

let _token: string | null = null
let _user: AuthUser | null = null
const listeners: Set<(loggedIn: boolean) => void> = new Set()

function notify() {
  const loggedIn = !!_token
  listeners.forEach(fn => fn(loggedIn))
}

export function subscribeAuth(fn: (loggedIn: boolean) => void) {
  listeners.add(fn)
  return () => { listeners.delete(fn) }
}

export function getAuthToken(): string | null { return _token }
export function getAuthUser(): AuthUser | null { return _user }
export function isLoggedIn(): boolean { return !!_token }

/** Charger le token depuis AsyncStorage au démarrage */
export async function loadAuth(): Promise<boolean> {
  try {
    const [t, u] = await Promise.all([
      AsyncStorage.getItem(TOKEN_KEY),
      AsyncStorage.getItem(USER_KEY),
    ])
    _token = t
    _user = u ? JSON.parse(u) : null
    notify()
    return !!_token
  } catch {
    return false
  }
}

/** Stocker le token + user après login OTP */
export async function setAuth(token: string, user: AuthUser): Promise<void> {
  _token = token
  _user = user
  await Promise.all([
    AsyncStorage.setItem(TOKEN_KEY, token),
    AsyncStorage.setItem(USER_KEY, JSON.stringify(user)),
  ])
  notify()
}

/** Déconnexion */
export async function clearAuth(): Promise<void> {
  _token = null
  _user = null
  await Promise.all([
    AsyncStorage.removeItem(TOKEN_KEY),
    AsyncStorage.removeItem(USER_KEY),
  ])
  notify()
}
