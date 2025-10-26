'use client'

import { usePathname } from 'next/navigation'
import Breadcrumb from './Breadcrumb'

const HIDDEN_PATHS_PREFIXES = [
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password'
]

export default function GlobalBreadcrumb() {
  const pathname = usePathname()
  const shouldHide = HIDDEN_PATHS_PREFIXES.some((p) => pathname.startsWith(p))
  if (shouldHide) return null
  return <Breadcrumb />
}

