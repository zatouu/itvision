import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import PageVisitTracker from '@/components/PageVisitTracker'
import { Toaster } from '@/components/ui/Toaster'
import SessionProviderClient from '@/components/SessionProviderClient'
import { ThemeProvider } from '@/components/ThemeProvider'

const inter = Inter({ subsets: ['latin'] })

export const viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
}

export const metadata: Metadata = {
  title: 'IT Vision - Sécurité Électronique & Solutions Technologiques',
  manifest: '/manifest.webmanifest',
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
    <html lang="fr" suppressHydrationWarning>
      <body className={`${inter.className}`}>
        <SessionProviderClient>
          <ThemeProvider>
            <PageVisitTracker />
            {children}
            <Toaster />
          </ThemeProvider>
        </SessionProviderClient>
      </body>
    </html>
  )
}
