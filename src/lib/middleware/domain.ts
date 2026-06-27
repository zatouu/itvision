import { NextRequest } from 'next/server'

export type ProjectDomain = 'corporate' | 'marketplace' | 'services' | 'unknown'

export function isProxyRoutingEnabled(): boolean {
  return process.env.PROXY_SUBDOMAIN_ROUTING === 'true'
}

export function getHost(request: NextRequest): string {
  return request.headers.get('host') || request.nextUrl.host || ''
}

export function isMarketDomain(request: NextRequest): boolean {
  return getHost(request).startsWith('market.')
}

export function isServicesDomain(request: NextRequest): boolean {
  return getHost(request).startsWith('services.') || getHost(request).startsWith('app.')
}

export function resolveProjectDomain(request: NextRequest): ProjectDomain {
  if (isMarketDomain(request)) return 'marketplace'
  if (isServicesDomain(request)) return 'services'
  return 'corporate'
}
