'use client'

import * as Sentry from '@sentry/nextjs'
import { useEffect } from 'react'

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  return (
    <html lang="fr">
      <body style={{ margin: 0, fontFamily: 'system-ui, sans-serif' }}>
        <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
          <div style={{ maxWidth: '28rem', width: '100%', textAlign: 'center' }}>
            <h1 style={{ fontSize: '1.25rem', marginBottom: '0.75rem' }}>Une erreur est survenue</h1>
            <p style={{ color: '#555', marginBottom: '1.5rem' }}>
              L&apos;incident a été signalé à notre équipe. Vous pouvez réessayer.
            </p>
            <button
              onClick={reset}
              style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '0.5rem', border: 0, background: '#111827', color: '#fff', fontSize: '1rem' }}
            >
              Réessayer
            </button>
          </div>
        </main>
      </body>
    </html>
  )
}
