import type { Metadata } from 'next';
import { headers } from 'next/headers';
import MarketShell from '@/components/market/MarketShell';
import { CORPORATE_SITE_URL, MARKET_SITE_URL } from '@/lib/branding';
import { isMarketHost } from '@/lib/middleware/domain';
import { SITE_OG_IMAGES } from '@/lib/seo';
import { buildCorporateLocalBusinessJsonLd, buildOrganizationJsonLd, buildWebsiteJsonLd } from '@/lib/structured-data';

// Sur itvisionplus.sn, seule la vitrine B2B (/produits → /corporate-produits) passe par
// ce groupe : elle ne doit porter ni l'habillage ni l'identité DDM+.
async function onMarketHost() {
  return isMarketHost((await headers()).get('host') || '');
}

export async function generateMetadata(): Promise<Metadata> {
  if (!(await onMarketHost())) {
    return {
      metadataBase: new URL(CORPORATE_SITE_URL),
      applicationName: 'IT Vision Plus',
      authors: [{ name: 'IT Vision Plus' }],
      icons: { icon: '/Icone.png', shortcut: '/Icone.png', apple: '/Icone.png' },
      openGraph: { siteName: 'IT Vision Plus', locale: 'fr_SN', type: 'website', images: SITE_OG_IMAGES },
      twitter: { card: 'summary_large_image' },
    };
  }
  return {
    metadataBase: new URL(MARKET_SITE_URL),
    applicationName: 'DDM+',
    authors: [{ name: 'DDM+' }],
    openGraph: { siteName: 'DDM+ Marketplace', locale: 'fr_SN', type: 'website', images: SITE_OG_IMAGES },
    twitter: { card: 'summary_large_image' },
  };
}

export default async function MarketLayout({ children }: { children: React.ReactNode }) {
  if (!(await onMarketHost())) {
    return (
      <>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(buildCorporateLocalBusinessJsonLd()) }}
        />
        {children}
      </>
    );
  }
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify([buildOrganizationJsonLd(), buildWebsiteJsonLd()]) }}
      />
      <MarketShell>{children}</MarketShell>
    </>
  );
}
