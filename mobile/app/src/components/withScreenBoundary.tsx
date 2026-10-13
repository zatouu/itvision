import React from 'react'
import { router } from 'expo-router'
import ErrorBoundary from './ErrorBoundary'

export function withScreenBoundary<P extends object>(
  Component: React.ComponentType<P>,
  screenName?: string,
): React.FC<P> {
  const Wrapped: React.FC<P> = (props) => (
    <ErrorBoundary onReset={() => router.back()}>
      <Component {...props} />
    </ErrorBoundary>
  )
  Wrapped.displayName = `withScreenBoundary(${screenName || Component.displayName || Component.name || 'Screen'})`
  return Wrapped
}
