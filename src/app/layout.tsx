import type { Metadata } from 'next'
import { Fraunces, Plus_Jakarta_Sans } from 'next/font/google'
import './globals.css'
import PageVisitTracker from '@/components/PageVisitTracker'
import { Toaster } from '@/components/ui/Toaster'
import SessionProviderClient from '@/components/SessionProviderClient'
import { ThemeProvider } from '@/components/ThemeProvider'

const fraunces = Fraunces({
  subsets: ['latin'],
  weight: ['800', '900'],
  variable: '--font-fraunces',
  display: 'swap',
})

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-jakarta',
  display: 'swap',
})

export const viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
}

export const metadata: Metadata = {
  title: 'DDM+ Marketplace — Import Chine & Achats Groupés',
  manifest: '/manifest.webmanifest',
  description: 'DDM+ Marketplace : Import direct Chine → Sénégal. Mode, électronique, beauté, maison, auto, sport. Prix usine, achats groupés -45%, livraison Dakar.',
  keywords: 'DDM, Dieund Dal Ma, marketplace, import Chine Sénégal, achats groupés, mode, électronique, beauté, maison, auto, sport, prix usine, Dakar',
  authors: [{ name: 'DDM+' }],
  icons: {
    icon: '/branding/ddm-logo-favicon.svg',
    shortcut: '/branding/ddm-logo-favicon.svg',
    apple: '/branding/ddm-logo-favicon.svg',
  },
  openGraph: {
    title: 'DDM+ Marketplace — Import Chine & Achats Groupés',
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
    <html lang="fr" suppressHydrationWarning className={`${fraunces.variable} ${jakarta.variable}`}>
      <body className={`${jakarta.className} antialiased`}>
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
