import CorporateCatalogClient from '@/components/corporate/CorporateCatalogClient'
import { fetchCorporateProductsFromApi } from '@/lib/api/corporate-products'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export const metadata = {
  title: 'Solutions & Équipements | IT Vision — Sécurité Électronique',
  description:
    "Équipements professionnels de sécurité électronique : vidéosurveillance, contrôle d'accès, alarme, réseau. Devis personnalisé, installation et maintenance au Sénégal.",
}

async function fetchProducts() {
  const { products } = await fetchCorporateProductsFromApi()
  return products
}

export default async function CorporateProduitsPage() {
  const products = await fetchProducts()
  return <CorporateCatalogClient products={products} />
}
