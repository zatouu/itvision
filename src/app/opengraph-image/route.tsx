import { ImageResponse } from 'next/og'
import { headers } from 'next/headers'
import { isMarketHost } from '@/lib/middleware/domain'

const size = { width: 1200, height: 630 }

const BRANDS = {
  market: {
    name: 'DDM+',
    title: 'Marketplace import Chine → Sénégal',
    subtitle: 'Achats groupés, prix usine, contrôle qualité et livraison suivie à Dakar.',
    domain: 'ddm.sn',
    from: '#7c3aed',
    to: '#4f46e5',
  },
  corporate: {
    name: 'IT Vision Plus',
    title: 'Sécurité électronique à Dakar',
    subtitle: 'Vidéosurveillance, contrôle d’accès, sécurité incendie, réseau et domotique.',
    domain: 'itvisionplus.sn',
    from: '#0f766e',
    to: '#047857',
  },
} as const

// Image de partage (Open Graph / WhatsApp / réseaux sociaux) propre à chaque domaine.
// Route explicite (et non la convention opengraph-image) : son URL est résolue par le
// metadataBase de chaque site, jamais par l'hôte de secours de Next.
export async function GET() {
  const brand = isMarketHost((await headers()).get('host') || '') ? BRANDS.market : BRANDS.corporate
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '72px 80px',
          color: 'white',
          backgroundImage: `linear-gradient(135deg, ${brand.from}, ${brand.to})`,
        }}
      >
        <div style={{ fontSize: 44, fontWeight: 800, letterSpacing: -1 }}>{brand.name}</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div style={{ fontSize: 76, fontWeight: 800, lineHeight: 1.05, letterSpacing: -2 }}>{brand.title}</div>
          <div style={{ fontSize: 34, opacity: 0.9, lineHeight: 1.3 }}>{brand.subtitle}</div>
        </div>
        <div style={{ fontSize: 30, opacity: 0.85 }}>{brand.domain}</div>
      </div>
    ),
    { ...size, headers: { 'Cache-Control': 'public, max-age=86400, s-maxage=86400' } },
  )
}
