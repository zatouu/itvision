import { NextRequest } from 'next/server'

export type ProjectDomain = 'corporate' | 'marketplace' | 'services' | 'unknown'

export function getHost(request: NextRequest): string {
  return request.headers.get('host') || request.nextUrl.host || ''
}

// Domaines servant la marketplace DDM (domaine dédié + sous-domaines historiques)
const MARKET_DOMAINS = ['ddm.sn', 'ddmplus.sn', 'ddm.itvisionplus.sn']

export function isMarketDomain(request: NextRequest): boolean {
  const host = getHost(request).toLowerCase().split(':')[0].replace(/^www\./, '')
  return host.startsWith('market.') || MARKET_DOMAINS.some(d => host === d || host.endsWith('.' + d))
}

export function isServicesDomain(request: NextRequest): boolean {
  return getHost(request).startsWith('services.') || getHost(request).startsWith('app.')
}

export function resolveProjectDomain(request: NextRequest): ProjectDomain {
  if (isMarketDomain(request)) return 'marketplace'
  if (isServicesDomain(request)) return 'services'
  return 'corporate'
}
