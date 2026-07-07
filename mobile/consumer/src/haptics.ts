import * as Haptics from 'expo-haptics'
import { Platform } from 'react-native'

async function safe(trigger: () => Promise<void>) {
  if (Platform.OS === 'web') return
  try { await trigger() } catch {}
}

export function hapticLight() {
  safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light))
}

export function hapticMedium() {
  safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium))
}

export function hapticHeavy() {
  safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy))
}

export function hapticSuccess() {
  safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success))
}

export function hapticWarning() {
  safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning))
}

export function hapticError() {
  safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error))
}

export function hapticSelect() {
  safe(() => Haptics.selectionAsync())
}
