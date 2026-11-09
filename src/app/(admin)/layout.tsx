import type { Metadata } from 'next'

// Espace d'administration : usage interne, jamais indexé. Chaque page peut préciser
// son titre (template « %s | Administration IT Vision »).
export const metadata: Metadata = {
  title: { default: 'Administration — IT Vision Plus', template: '%s | Administration IT Vision' },
  description: 'Administration IT Vision Plus.',
  robots: { index: false, follow: false },
  icons: {
    icon: '/Icone.png',
    shortcut: '/Icone.png',
    apple: '/Icone.png',
  },
}

export default function AdminGroupLayout({ children }: { children: React.ReactNode }) {
  return children
}
