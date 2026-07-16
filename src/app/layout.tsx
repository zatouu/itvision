import type { Metadata } from 'next'
import { Fraunces, Plus_Jakarta_Sans, Caveat } from 'next/font/google'
import './globals.css'
import PageVisitTracker from '@/components/PageVisitTracker'
import AnalyticsScripts from '@/components/AnalyticsScripts'
import { Toaster } from '@/components/ui/Toaster'
import SessionProviderClient from '@/components/SessionProviderClient'
import { ThemeProvider } from '@/components/ThemeProvider'
import { buildOrganizationJsonLd, buildWebsiteJsonLd } from '@/lib/structured-data'

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

const caveat = Caveat({
  subsets: ['latin'],
  weight: ['500', '700'],
  variable: '--font-caveat',
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
    <html lang="fr" suppressHydrationWarning className={`${fraunces.variable} ${jakarta.variable} ${caveat.variable}`}>
      <head>
        {/* Préconnexion aux CDN d'images pour réduire le TTFB des images produits */}
        <link rel="dns-prefetch" href="https://img.alicdn.com" />
        <link rel="preconnect" href="https://img.alicdn.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://ae01.alicdn.com" />
        <link rel="preconnect" href="https://ae01.alicdn.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://cbu01.alicdn.com" />
        <link rel="preconnect" href="https://cbu01.alicdn.com" crossOrigin="anonymous" />
      </head>
      <body className={`${jakarta.className} antialiased`}>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  const theme = localStorage.getItem('theme')
                  const isDark = theme === 'dark' || (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches)
                  if (isDark) {
                    document.documentElement.classList.add('dark')
                    document.documentElement.style.colorScheme = 'dark'
                  } else {
                    document.documentElement.classList.remove('dark')
                    document.documentElement.style.colorScheme = 'light'
                  }
                } catch (e) {}
              })()
            `,
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify([
              buildOrganizationJsonLd(),
              buildWebsiteJsonLd(),
            ]),
          }}
        />
        <SessionProviderClient>
          <ThemeProvider>
            <AnalyticsScripts />
            <PageVisitTracker />
            {children}
            <Toaster />
          </ThemeProvider>
        </SessionProviderClient>
      </body>
    </html>
  )
}
