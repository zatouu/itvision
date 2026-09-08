import AsyncStorage from '@react-native-async-storage/async-storage'

export interface PersistedMissionState {
  requestId: string
  startedAt?: number | null
  pausedAt?: number | null
  totalPausedSeconds?: number
  pauseCount?: number
  lastActivityAt?: number
  status?: string
}

const STORAGE_PREFIX = 'active_mission_'

export async function getPersistedMission(requestId: string): Promise<PersistedMissionState | null> {
  try {
    const raw = await AsyncStorage.getItem(`${STORAGE_PREFIX}${requestId}`)
    if (!raw) return null
    return JSON.parse(raw) as PersistedMissionState
  } catch (err) {
    console.warn('[missionStorage] Failed to read active mission state:', err)
    return null
  }
}

export async function savePersistedMission(
  requestId: string,
  state: Partial<PersistedMissionState>
): Promise<void> {
  try {
    const existing = (await getPersistedMission(requestId)) || { requestId }
    const merged: PersistedMissionState = {
      ...existing,
      ...state,
      requestId,
      lastActivityAt: Date.now(),
    }
    await AsyncStorage.setItem(`${STORAGE_PREFIX}${requestId}`, JSON.stringify(merged))
  } catch (err) {
    console.warn('[missionStorage] Failed to save active mission state:', err)
  }
}

export async function clearPersistedMission(requestId: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(`${STORAGE_PREFIX}${requestId}`)
  } catch (err) {
    console.warn('[missionStorage] Failed to clear active mission state:', err)
  }
}
