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
  // Blocking theme script - sets class, color-scheme, AND injects dark mode CSS
  const themeScript = `(function() {
    try {
      var stored = localStorage.getItem('theme');
      var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      var theme = stored || 'light';
      var resolved = theme === 'dark' || (theme === 'system' && prefersDark) ? 'dark' : 'light';
      var root = document.documentElement;
      
      if (resolved === 'dark') {
        root.classList.add('dark');
        root.style.colorScheme = 'dark';
      } else {
        root.classList.remove('dark');
        root.style.colorScheme = 'light';
      }
      root.classList.add('theme-initialized');
      
      // Inject dark mode CSS directly - bypasses Tailwind v4 tree-shaking
      var style = document.createElement('style');
      style.id = 'dark-mode-overrides';
      if (resolved === 'dark') {
        style.textContent = 
          'html.dark .bg-white, html.dark [class*="bg-white/"] { background-color: #0f172a !important; }' +
          'html.dark .bg-gray-50, html.dark .bg-slate-50 { background-color: #0b1220 !important; }' +
          'html.dark .bg-gray-100, html.dark .bg-gray-200 { background-color: #111827 !important; }' +
          'html.dark .text-gray-900 { color: #f9fafb !important; }' +
          'html.dark .text-gray-800 { color: #e5e7eb !important; }' +
          'html.dark .text-gray-700, html.dark .text-gray-600 { color: #d1d5db !important; }' +
          'html.dark .text-gray-500 { color: #9ca3af !important; }' +
          'html.dark .text-black { color: #f9fafb !important; }' +
          'html.dark .border-gray-100, html.dark .border-gray-200, html.dark .border-gray-300 { border-color: #1f2937 !important; }' +
          'html.dark .page-content, html.dark .hero-section { background-color: #0b0f14 !important; }' +
          'html.dark input, html.dark textarea, html.dark select { color: #e5e7eb !important; background-color: #1e293b !important; border-color: #334155 !important; }';
      }
      document.head.appendChild(style);
    } catch (e) {
      document.documentElement.classList.add('theme-initialized');
    }
  })();`

  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className={`${inter.className}`}>
        <SessionProviderClient>
          <PageVisitTracker />
          {children}
          <Toaster />
        </SessionProviderClient>
      </body>
    </html>
  )
}
