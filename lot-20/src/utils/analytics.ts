declare global {
  interface Window {
    gtag?: (...args: any[]) => void
    mixpanel?: any
  }
}

export type AnalyticsCurrency = 'XOF' | 'USD' | 'EUR'

export interface AnalyticsItem {
  item_id: string
  item_name: string
  item_category?: string
  item_category2?: string
  item_brand?: string
  item_variant?: string
  price?: number
  quantity?: number
}

export interface AnalyticsEventPayload {
  currency?: AnalyticsCurrency | string
  value?: number
  items?: AnalyticsItem[]
  transaction_id?: string
  [key: string]: any
}

export type AnalyticsEventName =
  | 'page_view'
  | 'search'
  | 'view_item'
  | 'view_item_list'
  | 'select_item'
  | 'add_to_cart'
  | 'remove_from_cart'
  | 'view_cart'
  | 'begin_checkout'
  | 'purchase'
  | 'add_to_wishlist'
  | 'remove_from_wishlist'
  | 'share'
  | 'select_content'
  | 'login'
  | 'sign_up'
  | 'generate_lead'
  | 'quote_request'
  | 'negotiation_request'
  | 'product_install_request'
  | string

const GA_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID
const MIXPANEL_TOKEN = process.env.NEXT_PUBLIC_MIXPANEL_PROJECT_TOKEN
const DEBUG = process.env.NEXT_PUBLIC_ANALYTICS_DEBUG === 'true'

let consent = true

export function setAnalyticsConsent(granted: boolean) {
  consent = granted
}

function log(...args: any[]) {
  if (DEBUG) console.log('[Analytics]', ...args)
}

function sendToGA(event: string, payload: AnalyticsEventPayload = {}) {
  if (!GA_ID || !window.gtag) return
  try {
    if (event === 'page_view') {
      window.gtag('config', GA_ID, {
        page_path: payload.page_path,
        page_title: payload.page_title,
        send_page_view: false,
      })
    }
    window.gtag('event', event, payload)
  } catch (e) {
    log('GA4 error', e)
  }
}

function sendToMixpanel(event: string, payload: AnalyticsEventPayload = {}) {
  if (!MIXPANEL_TOKEN || !window.mixpanel?.track) return
  try {
    window.mixpanel.track(event, payload)
  } catch (e) {
    log('Mixpanel error', e)
  }
}

/**
 * Track any analytics event. Works with GA4, Mixpanel, or console fallback.
 */
export function trackEvent(
  event: AnalyticsEventName,
  payload?: AnalyticsEventPayload
) {
  if (typeof window === 'undefined') return
  if (!consent) return

  const safePayload = payload || {}

  try {
    sendToGA(event, safePayload)
    sendToMixpanel(event, safePayload)

    if (DEBUG || (!GA_ID && !MIXPANEL_TOKEN)) {
      log(event, safePayload)
    }
  } catch (e) {
    log('trackEvent error', e)
  }
}

/**
 * Track a page view. Should be called from the client router change listener.
 */
export function trackPageview(path: string, title?: string) {
  if (typeof window === 'undefined') return
  trackEvent('page_view', {
    page_path: path,
    page_title: title || document.title,
  })
}

/**
 * Identify a user across analytics tools.
 */
export function identifyUser(
  userId: string,
  traits: Record<string, any> = {}
) {
  if (typeof window === 'undefined') return
  if (!consent) return

  try {
    if (GA_ID && window.gtag) {
      window.gtag('config', GA_ID, { user_id: userId })
    }
    if (MIXPANEL_TOKEN && window.mixpanel) {
      window.mixpanel.identify(userId)
      if (window.mixpanel.people?.set) {
        window.mixpanel.people.set(traits)
      }
    }
    log('identify', userId, traits)
  } catch (e) {
    log('identify error', e)
  }
}

/**
 * Reset analytics identity (logout).
 */
export function resetAnalyticsIdentity() {
  if (typeof window === 'undefined') return
  try {
    if (MIXPANEL_TOKEN && window.mixpanel?.reset) {
      window.mixpanel.reset()
    }
    log('reset')
  } catch (e) {
    log('reset error', e)
  }
}
