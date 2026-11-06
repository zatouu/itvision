import type { Metadata } from 'next'
import { ReactNode } from 'react'

export const metadata: Metadata = {
  title: {
    default: 'IT Vision — Sécurité électronique, domotique & digitalisation',
    template: '%s · IT Vision',
  },
  description:
    'IT Vision, experts en sécurité électronique, vidéosurveillance, contrôle d\'accès, domotique et digitalisation des processus PME au Sénégal.',
  keywords:
    'IT Vision, sécurité électronique, vidéosurveillance, contrôle d\'accès, domotique, digitalisation, Dakar, Sénégal',
  authors: [{ name: 'IT Vision' }],
  icons: {
    icon: '/Icone.png',
    shortcut: '/Icone.png',
    apple: '/Icone.png',
  },
  openGraph: {
    title: 'IT Vision — Sécurité électronique & Digitalisation',
    description:
      'Experts en vidéosurveillance, contrôle d\'accès, domotique et digitalisation des processus PME au Sénégal.',
    type: 'website',
  },
}

export default function CorporateLayout({ children }: { children: ReactNode }) {
  return <>{children}</>
}
