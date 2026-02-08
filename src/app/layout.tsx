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
    } catch (e) {
      document.documentElement.classList.add('theme-initialized');
    }
  })();`

  // Dark mode overrides — injected as inline <style> to bypass Tailwind v4 tree-shaking
  // (Tailwind v4 strips .dark .utility-class rules from globals.css during compilation)
  const darkModeCSS = `
    .dark .page-content, .dark .hero-section { background-color: #0b0f14; }
    .dark .bg-white { background-color: #0f172a !important; }
    .dark .bg-white\\/98 { background-color: rgba(15,23,42,0.98) !important; }
    .dark .bg-white\\/95 { background-color: rgba(15,23,42,0.95) !important; }
    .dark .bg-white\\/90 { background-color: rgba(15,23,42,0.9) !important; }
    .dark .bg-white\\/80 { background-color: rgba(15,23,42,0.8) !important; }
    .dark .bg-white\\/70 { background-color: rgba(15,23,42,0.7) !important; }
    .dark .bg-white\\/60 { background-color: rgba(15,23,42,0.6) !important; }
    .dark .bg-white\\/50 { background-color: rgba(15,23,42,0.5) !important; }
    .dark .bg-white\\/40 { background-color: rgba(15,23,42,0.4) !important; }
    .dark .bg-white\\/30 { background-color: rgba(15,23,42,0.3) !important; }
    .dark .bg-white\\/20 { background-color: rgba(15,23,42,0.2) !important; }
    .dark .bg-white\\/10 { background-color: rgba(15,23,42,0.12) !important; }
    .dark .bg-white\\/5 { background-color: rgba(15,23,42,0.08) !important; }
    .dark .bg-gray-50, .dark .bg-slate-50 { background-color: #0b1220 !important; }
    .dark .bg-gray-50\\/50, .dark .bg-gray-100\\/50 { background-color: rgba(15,23,42,0.5) !important; }
    .dark .bg-gray-100 { background-color: #111827 !important; }
    .dark .bg-gray-200 { background-color: #111827 !important; }
    .dark .bg-emerald-50 { background-color: rgba(16,185,129,0.08) !important; }
    .dark .bg-purple-50 { background-color: rgba(139,92,246,0.08) !important; }
    .dark .text-gray-900 { color: #f9fafb !important; }
    .dark .text-gray-800 { color: #e5e7eb !important; }
    .dark .text-gray-700 { color: #d1d5db !important; }
    .dark .text-gray-600 { color: #cbd5f5 !important; }
    .dark .text-gray-500 { color: #9ca3af !important; }
    .dark .text-gray-400 { color: #94a3b8 !important; }
    .dark .text-black { color: #f9fafb !important; }
    .dark .border-gray-100, .dark .border-gray-200 { border-color: #1f2937 !important; }
    .dark .border-gray-300 { border-color: #334155 !important; }
    .dark .border-gray-400 { border-color: #475569 !important; }
    .dark .border-emerald-100 { border-color: #064e3b !important; }
    .dark .border-white\\/10, .dark .border-white\\/20, .dark .border-white\\/30,
    .dark .border-white\\/40, .dark .border-white\\/50 { border-color: #1f2937 !important; }
    .dark .shadow-sm, .dark .shadow, .dark .shadow-md,
    .dark .shadow-lg, .dark .shadow-xl, .dark .shadow-2xl {
      box-shadow: 0 10px 25px rgba(0,0,0,0.35) !important;
    }
    .dark input[type="text"], .dark input[type="email"], .dark input[type="password"],
    .dark input[type="number"], .dark input[type="tel"], .dark input[type="url"],
    .dark input[type="search"], .dark input[type="date"], .dark textarea, .dark select {
      color: #e5e7eb !important;
      background-color: #1e293b !important;
      border-color: #334155 !important;
    }
    .dark input[type="text"]:focus, .dark input[type="email"]:focus,
    .dark input[type="password"]:focus, .dark input[type="number"]:focus,
    .dark textarea:focus, .dark select:focus {
      color: #f9fafb !important;
      background-color: #1e293b !important;
      border-color: #6366f1 !important;
      box-shadow: 0 0 0 3px rgba(99,102,241,0.15) !important;
    }
    .dark input::placeholder, .dark textarea::placeholder { color: #64748b !important; }
    .dark input.variant-qty-input { background-color: transparent !important; border: none !important; }
  `

  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <style dangerouslySetInnerHTML={{ __html: darkModeCSS }} />
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
