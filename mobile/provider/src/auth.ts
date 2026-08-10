import { Platform } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import * as SecureStore from 'expo-secure-store'

const TOKEN_KEY = 'authToken'
const USER_KEY = 'authUser'
const isWeb = Platform.OS === 'web'

// Token JWT → stockage chiffré (SecureStore) sur natif, AsyncStorage sur web
async function readToken(): Promise<string | null> {
  try {
    if (isWeb) return await AsyncStorage.getItem(TOKEN_KEY)
    const t = await SecureStore.getItemAsync(TOKEN_KEY)
    if (t) return t
    // Fallback si SecureStore a échoué précédemment
    const fallback = await AsyncStorage.getItem(TOKEN_KEY)
    if (fallback) {
      await SecureStore.setItemAsync(TOKEN_KEY, fallback).catch(() => {})
    }
    // Migration depuis anciennes clés (auth:token)
    const legacy = await AsyncStorage.getItem('auth:token')
    if (legacy) {
      await SecureStore.setItemAsync(TOKEN_KEY, legacy).catch(() => {})
      await AsyncStorage.removeItem('auth:token').catch(() => {})
    }
    return fallback || legacy
  } catch {
    return null
  }
}

async function writeToken(token: string): Promise<void> {
  if (isWeb) { await AsyncStorage.setItem(TOKEN_KEY, token); return }
  try {
    await SecureStore.setItemAsync(TOKEN_KEY, token)
  } catch {
    // Fallback si SecureStore n'est pas utilisable sur ce device
    await AsyncStorage.setItem(TOKEN_KEY, token)
  }
}

async function deleteToken(): Promise<void> {
  if (isWeb) { await AsyncStorage.removeItem(TOKEN_KEY); return }
  await Promise.all([
    SecureStore.deleteItemAsync(TOKEN_KEY).catch(() => {}),
    AsyncStorage.removeItem(TOKEN_KEY).catch(() => {}),
  ])
}

export interface AuthUser {
  _id: string
  name: string
  phone: string
  role: string
  isNew?: boolean
  referralCode?: string
  referralBalance?: number
  avatarUrl?: string
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
      readToken(),
      AsyncStorage.getItem(USER_KEY),
    ])
    _token = t
    _user = u ? (JSON.parse(u) as AuthUser) : null
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
  const payload = user ? JSON.stringify(user) : ''
  await Promise.all([
    writeToken(token),
    AsyncStorage.setItem(USER_KEY, payload),
  ])
  notify()
}

export async function updateAuthUser(partial: Partial<AuthUser>): Promise<AuthUser | null> {
  if (!_user) return null
  _user = { ..._user, ...partial }
  await AsyncStorage.setItem(USER_KEY, JSON.stringify(_user))
  notify()
  return _user
}

/** Déconnexion */
export async function clearAuth(): Promise<void> {
  _token = null
  _user = null
  await Promise.all([
    deleteToken(),
    AsyncStorage.removeItem(USER_KEY),
  ])
  notify()
}
