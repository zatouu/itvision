'use client'

import { useRouter } from 'next/navigation'
import { ReactNode } from 'react'

interface LogoutButtonProps {
  children?: ReactNode
  className?: string
  redirectTo?: string
  onDone?: () => void
}

export default function LogoutButton({
  children = 'Se déconnecter',
  className = '',
  redirectTo = '/login',
  onDone
}: LogoutButtonProps) {
  const router = useRouter()

  const handleLogout = async () => {
    try {
      const res = await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
        headers: {
          accept: 'application/json',
          'content-type': 'application/json'
        }
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        // eslint-disable-next-line no-console
        console.error('Logout failed', data.error || res.statusText)
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Logout error', err)
    } finally {
      router.push(redirectTo)
      router.refresh()
      onDone?.()
    }
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      className={className}
    >
      {children}
    </button>
  )
}
