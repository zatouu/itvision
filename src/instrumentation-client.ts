import * as Sentry from '@sentry/nextjs'

// Inactif tant que NEXT_PUBLIC_SENTRY_DSN n'est pas fourni au build
if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    environment: process.env.NODE_ENV,
    tracesSampleRate: 0,
  })
}

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart
