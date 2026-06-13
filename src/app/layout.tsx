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
  title: 'IT Vision Plus — Marketplace Import Chine & Achats Groupés',
  manifest: '/manifest.webmanifest',
  description: 'Marketplace IT Vision Plus : Import direct Chine → Sénégal. Mode, électronique, beauté, maison, auto, sport. Prix usine, achats groupés -45%, livraison Dakar.',
  keywords: 'marketplace, import Chine Sénégal, achats groupés, mode, électronique, beauté, maison, auto, sport, prix usine, Dakar, IT Vision Plus',
  authors: [{ name: 'IT Vision Plus' }],
  icons: {
    icon: '/Icone.png',
    shortcut: '/Icone.png',
    apple: '/apple-touch-icon.png',
  },
  openGraph: {
    title: 'IT Vision Plus — Marketplace Import Chine & Achats Groupés',
    description: 'Import direct Chine, livraison Sénégal. Mode, tech, beauté, maison, auto, sport. Achats groupés pour payer moins cher.',
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
