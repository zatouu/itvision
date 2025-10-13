'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import EnhancedProjectPortal from '@/components/EnhancedProjectPortal'

export default function ClientPortalPage() {
  const router = useRouter()
  const [projectId, setProjectId] = useState<string | null>(null)
  const [accessCode, setAccessCode] = useState<string>('ACCESS24')
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)

  useEffect(() => {
    let cancelled = false
    const checkAuth = async () => {
      try {
        const res = await fetch('/api/auth/login', { credentials: 'include' })
        if (!res.ok) return
        const data = await res.json()
        const role = String(data.user?.role || '').toUpperCase()
        if (role !== 'CLIENT') {
          if (role === 'ADMIN') router.replace('/admin-reports')
          else if (role === 'TECHNICIAN') router.replace('/tech-interface')
          else router.replace('/login')
          return
        }
        if (cancelled) return
        // Assigner un projectId par défaut pour démo
        setProjectId('PRJ-001')
      } catch {}
      finally {
        if (!cancelled) setIsCheckingAuth(false)
      }
    }
    checkAuth()
    return () => { cancelled = true }
  }, [router])

  const handleLogout = async () => {
    try { await fetch('/api/auth/logout', { credentials: 'include' }) } catch {}
    router.replace('/login')
  }

  if (isCheckingAuth || !projectId) return null

  return (
    <EnhancedProjectPortal 
      projectId={projectId}
      accessCode={accessCode}
      onLogout={handleLogout}
    />
  )
}