'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

// L'écran terrain est intégré à l'espace technicien (onglet Accueil) : anciens liens conservés
export default function TechTerrainRedirect() {
  const router = useRouter()
  useEffect(() => { router.replace('/tech-interface') }, [router])
  return null
}
