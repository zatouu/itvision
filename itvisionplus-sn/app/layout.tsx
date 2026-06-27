import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'IT Vision - Sécurité Électronique au Sénégal',
  description:
    "Solutions professionnelles de vidéosurveillance, contrôle d'accès, alarme, réseau et domotique pour entreprises et particuliers au Sénégal.",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  )
}
