import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'IT Vision - Sécurité Électronique & Solutions Technologiques',
  description: 'IT Vision : Votre partenaire expert en sécurité électronique. Solutions innovantes de vidéosurveillance, contrôle d\'accès, domotique et sécurité incendie. Vision technologique avancée.',
  keywords: 'IT Vision, sécurité électronique, vidéosurveillance, contrôle accès, domotique, sécurité incendie, technologie, innovation, solutions IT',
  authors: [{ name: 'IT Vision' }],
  icons: {
    icon: '/Icone.png',
    shortcut: '/Icone.png',
    apple: '/apple-touch-icon.png',
  },
  openGraph: {
    title: 'IT Vision - Sécurité Électronique & Solutions Technologiques',
    description: 'IT Vision : Solutions innovantes de sécurité électronique avec une vision technologique avancée.',
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fr">
      <body className={inter.className}>
        {children}
      </body>
    </html>
  )
}
