export function isPhoneLike(s?: string): boolean {
  if (!s) return false
  const digits = s.replace(/\D/g, '')
  return /^\+?[\d\s]{7,}$/.test(s.trim()) || digits.length >= 9
}

export function formatPhone(phone?: string, full = true): string {
  if (!phone) return ''
  const digits = phone.replace(/\D/g, '')
  if (digits.length >= 9) {
    const local = digits.slice(-9)
    const prefix = digits.slice(0, -9)
    const localFormatted = local.replace(/(\d{2})(\d{3})(\d{2})(\d{2})/, '$1 $2 $3 $4')
    return full ? `${prefix ? '+' + prefix + ' ' : ''}${localFormatted}` : localFormatted
  }
  return phone
}

export function getInitials(raw?: string): string {
  if (!raw) return '?'
  const trimmed = raw.trim()
  if (isPhoneLike(trimmed)) {
    const digits = trimmed.replace(/\D/g, '')
    return digits.slice(-2).toUpperCase() || '?'
  }
  return trimmed.split(/\s+/).map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()
}
