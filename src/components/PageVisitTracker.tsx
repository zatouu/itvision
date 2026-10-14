'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

/**
 * Composant pour tracker automatiquement les visites de pages
 * À ajouter dans le layout principal
 */
export default function PageVisitTracker() {
  const pathname = usePathname()

  useEffect(() => {
    if (!pathname) return

    // Ignorer les pages d'API et les assets
    if (pathname.startsWith('/api/') || pathname.startsWith('/_next/')) return

    // Déterminer le nom de la page
    const pageNames: Record<string, string> = {
      '/': 'Accueil',
      '/produits': 'Catalogue Produits',
      '/produits/favoris': 'Favoris',
      '/produits/compare': 'Comparaison',
      '/admin': 'Dashboard Admin',
      '/admin/devis': 'Gestion Devis',
      '/admin/clients': 'Gestion Clients',
      '/admin/produits': 'Gestion Produits',
      '/admin/analytics': 'Analytics',
      '/admin/comptabilite': 'Comptabilité',
      '/admin/marketplace': 'Marketplace',
      '/client': 'Portail Client',
      '/technicien': 'Portail Technicien'
    }

    const pageName = pageNames[pathname] || pathname.split('/').pop() || 'Page'

    // Tracker la visite après un court délai (pour éviter les bounces)
    const timer = setTimeout(() => {
      trackVisit(pathname, pageName)
    }, 2000) // 2 secondes minimum

    return () => clearTimeout(timer)
  }, [pathname])

  return null
}

function trackVisit(path: string, pageName: string) {
  try {
    // Récupérer les métriques de scroll et durée
    let scrollDepth = 0
    let interactions = 0
    const startTime = Date.now()

    // Tracker le scroll
    const handleScroll = () => {
      const windowHeight = window.innerHeight
      const documentHeight = document.documentElement.scrollHeight
      const scrollTop = window.scrollY || document.documentElement.scrollTop
      scrollDepth = Math.round((scrollTop / (documentHeight - windowHeight)) * 100)
    }

    // Tracker les interactions
    const handleInteraction = () => {
      interactions++
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    window.addEventListener('click', handleInteraction, { passive: true })

    // Envoyer la visite après 5 secondes ou avant de quitter la page
    const sendVisit = () => {
      const duration = Math.round((Date.now() - startTime) / 1000)
      
      // Utiliser sendBeacon pour les envois avant fermeture de page
      const data = JSON.stringify({
        path,
        pageName,
        duration,
        scrollDepth,
        interactions,
        referrer: document.referrer
      })

      if (navigator.sendBeacon) {
        navigator.sendBeacon('/api/analytics/track', new Blob([data], { type: 'application/json' }))
      } else {
        fetch('/api/analytics/track', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: data,
          keepalive: true
        }).catch(() => {
          // Ignorer les erreurs silencieusement
        })
      }

      window.removeEventListener('scroll', handleScroll)
      window.removeEventListener('click', handleInteraction)
    }

    // Envoyer après 5 secondes
    const sendTimer = setTimeout(sendVisit, 5000)

    // Envoyer avant de quitter la page
    window.addEventListener('beforeunload', sendVisit, { once: true })
    window.addEventListener('pagehide', sendVisit, { once: true })

    // Cleanup
    return () => {
      clearTimeout(sendTimer)
      window.removeEventListener('scroll', handleScroll)
      window.removeEventListener('click', handleInteraction)
      window.removeEventListener('beforeunload', sendVisit)
      window.removeEventListener('pagehide', sendVisit)
    }
  } catch (error) {
    // Ignorer les erreurs silencieusement
  }
}

