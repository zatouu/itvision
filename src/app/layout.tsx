import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import PageVisitTracker from '@/components/PageVisitTracker'

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
  const themeScript = `(() => {
    try {
      const stored = localStorage.getItem('theme');
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const theme = stored === 'light' || stored === 'dark' || stored === 'system' ? stored : 'dark';
      const resolved = theme === 'dark' || (theme === 'system' && prefersDark) ? 'dark' : 'light';
      const root = document.documentElement;
      if (resolved === 'dark') {
        root.classList.add('dark');
        root.style.colorScheme = 'dark';
      } else {
        root.classList.remove('dark');
        root.style.colorScheme = 'light';
      }
    } catch (e) {}
  })();`

  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className={`${inter.className} bg-white text-gray-900 dark:bg-gray-950 dark:text-gray-100`}>
        <PageVisitTracker />
        {children}
      </body>
    </html>
  )
}
