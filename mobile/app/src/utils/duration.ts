/**
 * Duration formatting utilities for Active Mission
 */

/**
 * Formats a duration in seconds into a friendly localized string
 * Examples:
 * 45 -> "45 s"
 * 356 -> "5 min 56 s"
 * 3665 -> "1 h 1 min"
 */
export function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0 s'
  const totalSeconds = Math.floor(seconds)
  if (totalSeconds < 60) {
    return `${totalSeconds} s`
  }
  const minutes = Math.floor(totalSeconds / 60)
  const remainingSeconds = totalSeconds % 60

  if (minutes < 60) {
    return remainingSeconds > 0 ? `${minutes} min ${remainingSeconds} s` : `${minutes} min`
  }

  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  return remainingMinutes > 0 ? `${hours} h ${remainingMinutes} min` : `${hours} h`
}

/**
 * Formats a duration in seconds into MM:SS (or HH:MM:SS) timer format
 * Examples:
 * 56 -> "00:56"
 * 356 -> "05:56"
 * 3665 -> "01:01:05"
 */
export function formatTimer(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '00:00'
  const totalSeconds = Math.floor(seconds)
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = totalSeconds % 60

  const pad = (n: number) => n.toString().padStart(2, '0')

  if (h > 0) {
    return `${pad(h)}:${pad(m)}:${pad(s)}`
  }
  return `${pad(m)}:${pad(s)}`
}
