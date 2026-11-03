import { NextRequest } from 'next/server'

export type ProjectDomain = 'corporate' | 'marketplace' | 'services' | 'unknown'

export function getHost(request: NextRequest): string {
  return request.headers.get('host') || request.nextUrl.host || ''
}

// Domaines servant la marketplace DDM (domaine dédié + sous-domaines historiques)
const MARKET_DOMAINS = ['ddm.sn', 'ddmplus.sn', 'ddm.itvisionplus.sn']

/** Hôte (avec ou sans port / www) servant la marketplace DDM. */
export function isMarketHost(rawHost: string): boolean {
  const host = rawHost.toLowerCase().split(':')[0].replace(/^www\./, '')
  return host.startsWith('market.') || MARKET_DOMAINS.some(d => host === d || host.endsWith('.' + d))
}

export function isMarketDomain(request: NextRequest): boolean {
  return isMarketHost(getHost(request))
}

const LOCAL_HOST_RE = /^(localhost|127\.0\.0\.1|\[::1\])$/

/**
 * URL de la marketplace pour un chemin donné, depuis le domaine corporate.
 * Prod : https://ddm.sn ; dev : market.localhost (même port) pour rester en local.
 * L'accueil market est servi à la racine : `/market` → `/`.
 */
export function buildMarketUrl(request: NextRequest, pathname: string): URL {
  const marketPath = pathname === '/market' || pathname === '/market/' ? '/' : pathname
  const url = new URL(marketPath + request.nextUrl.search, request.url)
  const hostname = getHost(request).toLowerCase().split(':')[0]
  if (LOCAL_HOST_RE.test(hostname)) {
    url.hostname = 'market.localhost'
  } else {
    url.protocol = 'https:'
    url.hostname = MARKET_DOMAINS[0]
    url.port = ''
  }
  return url
}

export function isServicesDomain(request: NextRequest): boolean {
  return getHost(request).startsWith('services.') || getHost(request).startsWith('app.')
}

export function resolveProjectDomain(request: NextRequest): ProjectDomain {
  if (isMarketDomain(request)) return 'marketplace'
  if (isServicesDomain(request)) return 'services'
  return 'corporate'
}
