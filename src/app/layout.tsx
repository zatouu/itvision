import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import PageVisitTracker from '@/components/PageVisitTracker'
import { Toaster } from '@/components/ui/Toaster'
import SessionProviderClient from '@/components/SessionProviderClient'

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
  const themeScript = `(function() {
    try {
      var stored = localStorage.getItem('theme');
      var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      var theme = stored || 'system';
      var resolved = theme === 'dark' || (theme === 'system' && prefersDark) ? 'dark' : 'light';
      var root = document.documentElement;
      var body = document.body;
      
      if (resolved === 'dark') {
        root.classList.add('dark');
        root.style.colorScheme = 'dark';
        body.style.backgroundColor = '#0b0f14';
        body.style.color = '#e5e7eb';
      } else {
        root.classList.remove('dark');
        root.style.colorScheme = 'light';
        body.style.backgroundColor = '#ffffff';
        body.style.color = '#171717';
      }
      
      // Marquer comme initialisé pour activer les styles dark
      root.classList.add('theme-initialized');
    } catch (e) {
      document.documentElement.classList.add('theme-initialized');
    }
  })();`

  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className={`${inter.className}`} style={{ backgroundColor: '#ffffff', color: '#171717' }}>
        <SessionProviderClient>
          <PageVisitTracker />
          {children}
          <Toaster />
        </SessionProviderClient>
      </body>
    </html>
  )
}
