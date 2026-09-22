import type { Metadata } from 'next'
import localFont from 'next/font/local'
import './globals.css'
import PageVisitTracker from '@/components/PageVisitTracker'
import AnalyticsScripts from '@/components/AnalyticsScripts'
import SkipLink from '@/components/a11y/SkipLink'
import { Toaster } from '@/components/ui/Toaster'
import SessionProviderClient from '@/components/SessionProviderClient'
import { ThemeProvider } from '@/components/ThemeProvider'
import { buildOrganizationJsonLd, buildWebsiteJsonLd } from '@/lib/structured-data'

// Fontes self-hostées (fontes variables Google téléchargées dans
// public/fonts/) — zéro fetch réseau au build, plus rapide au runtime.
const fraunces = localFont({
  src: '../../public/fonts/fraunces-var.woff2',
  weight: '100 900',
  variable: '--font-fraunces',
  display: 'swap',
})

const jakarta = localFont({
  src: '../../public/fonts/jakarta-var.woff2',
  weight: '100 900',
  variable: '--font-jakarta',
  display: 'swap',
})

const caveat = localFont({
  src: '../../public/fonts/caveat-var.woff2',
  weight: '100 900',
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
        <SkipLink />
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
            <div id="main-content" role="main" tabIndex={-1} className="outline-none">
              {children}
            </div>
            <Toaster />
          </ThemeProvider>
        </SessionProviderClient>
      </body>
    </html>
  )
}
