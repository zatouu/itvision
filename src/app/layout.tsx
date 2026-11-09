import type { Metadata } from 'next'
import localFont from 'next/font/local'
import './globals.css'
import PageVisitTracker from '@/components/PageVisitTracker'
import AnalyticsScripts from '@/components/AnalyticsScripts'
import SkipLink from '@/components/a11y/SkipLink'
import { Toaster } from '@/components/ui/Toaster'
import SessionProviderClient from '@/components/SessionProviderClient'
import { ThemeProvider } from '@/components/ThemeProvider'
import { THEME_INIT_SCRIPT } from '@/lib/theme'

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

// Valeurs neutres de repli : chaque section redéfinit titre, description et favicon
// dans son propre layout — corporate (IT Vision Plus), market (DDM+), admin, pages
// partagées (login, légal) qui suivent le domaine consulté. Le manifeste PWA est
// fourni par app/manifest.ts, lui aussi propre à chaque domaine.
export const metadata: Metadata = {
  // Titre simple, sans template : un template ici serait propagé à tous les segments
  // enfants et suffixerait les titres DDM+/admin (« … | IT Vision Plus » sur ddm.sn).
  title: 'IT Vision Plus',
  description:
    'IT Vision Plus : sécurité électronique, vidéosurveillance, contrôle d\'accès, réseau et digitalisation au Sénégal. DDM+ : marketplace d\'import Chine et d\'achats groupés.',
  applicationName: 'IT Vision Plus',
  authors: [{ name: 'IT Vision Plus' }],
  icons: {
    icon: '/Icone.png',
    shortcut: '/Icone.png',
    apple: '/Icone.png',
  },
  openGraph: {
    siteName: 'IT Vision Plus',
    locale: 'fr_SN',
    type: 'website',
  },
  twitter: { card: 'summary_large_image' },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fr" suppressHydrationWarning className={`${fraunces.variable} ${jakarta.variable} ${caveat.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
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
