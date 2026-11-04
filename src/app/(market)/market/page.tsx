import ScreenHome from '@/components/market/storefront/screens/ScreenHome';
import { loadHomeInitialData } from '@/lib/market/storefront-ssr';
import { pageMetadata } from '@/lib/seo';

// Accueil DDM+ (servi à la racine de ddm.sn) : import Chine grand public, distinct du B2B IT Vision Plus
export const metadata = pageMetadata({
  path: '/',
  title: 'DDM+ — Import Chine au Sénégal : achats groupés et prix usine',
  description:
    'Achetez en Chine depuis Dakar avec DDM+ : électronique, maison, mode, beauté, auto. Prix usine, achats groupés jusqu\'à -45 %, contrôle qualité et livraison suivie au Sénégal.',
  siteName: 'DDM+ Marketplace',
});

// Pré-rendu serveur : produits, catégories et groupes présents dans le HTML (SEO)
export const dynamic = 'force-dynamic';

export default async function Page() {
  const initialData = await loadHomeInitialData();
  return <ScreenHome initialData={initialData} />;
}
