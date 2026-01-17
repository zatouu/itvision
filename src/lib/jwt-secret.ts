let warnedMissingSecret = false

function warnOnce(message: string) {
  if (warnedMissingSecret) return
  warnedMissingSecret = true
  console.warn(message)
}

/**
 * Returns the JWT secret as a string.
 *
 * - In production, the secret is mandatory (throws if missing).
 * - In development/test, we allow a fallback to keep local DX simple, but it is intentionally insecure.
 */
export function getJwtSecretString(): string {
  const secret = process.env.JWT_SECRET
  if (secret && secret.length > 0) return secret

  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET is required in production')
  }

  warnOnce('[SECURITY] JWT_SECRET is missing; using an insecure development fallback. Set JWT_SECRET in your env.')
  return 'dev-insecure-jwt-secret'
}

/**
 * Returns the JWT secret as a Uint8Array for `jose` (Edge-friendly).
 */
export function getJwtSecretKey(): Uint8Array {
  return new TextEncoder().encode(getJwtSecretString())
}
