import { headers } from 'next/headers'
import { isMarketHost } from '@/lib/middleware/domain'

// Manifeste PWA propre à chaque domaine : le nom et l'icône installés sur
// l'écran d'accueil suivent itvisionplus.sn (IT Vision Plus) ou ddm.sn (DDM+).
export default async function manifest() {
  const host = (await headers()).get('host') || ''
  if (isMarketHost(host)) {
    return {
      name: 'DDM+ Marketplace',
      short_name: 'DDM+',
      id: '/?utm_source=pwa',
      description: "Marketplace d'import direct Chine et d'achats groupés au Sénégal.",
      start_url: '/',
      scope: '/',
      display: 'standalone',
      orientation: 'portrait',
      background_color: '#0f172a',
      theme_color: '#0f172a',
      lang: 'fr',
      dir: 'ltr',
      categories: ['shopping', 'marketplace', 'business'],
      icons: [
        { src: '/android-chrome-192x192.png', sizes: '192x192', type: 'image/png' },
        { src: '/android-chrome-512x512.png', sizes: '512x512', type: 'image/png' },
      ],
      shortcuts: [
        {
          name: 'Catalogue',
          short_name: 'Catalogue',
          description: 'Parcourir le catalogue de produits',
          url: '/produits',
          icons: [{ src: '/android-chrome-192x192.png', sizes: '192x192' }],
        },
        {
          name: 'Mon panier',
          short_name: 'Panier',
          description: 'Voir mon panier',
          url: '/panier',
          icons: [{ src: '/android-chrome-192x192.png', sizes: '192x192' }],
        },
      ],
    }
  }
  return {
    name: 'IT Vision Plus',
    short_name: 'IT Vision',
    id: '/',
    description: 'Sécurité électronique, vidéosurveillance, contrôle d’accès et digitalisation à Dakar.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#0f766e',
    lang: 'fr',
    dir: 'ltr',
    categories: ['business', 'productivity'],
    icons: [
      { src: '/Icone.png', sizes: '4000x4000', type: 'image/png' },
      { src: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  }
}
