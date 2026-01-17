// Simple analytics event tracker compatible with GA4 (fallback to console)
export const trackEvent = (event: string, data?: Record<string, any>) => {
  if (typeof window === 'undefined') return;
  try {
    // GA4 style if available
    // @ts-expect-error gtag est injecté par le script d'analytics
    window.gtag?.('event', event, data);
  } catch {}
  // Fallback logging for debugging
  console.log('Event:', event, data);
};
