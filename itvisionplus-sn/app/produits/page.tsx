import { fetchCorporateProducts } from '@/lib/api'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export const metadata = {
  title: 'Solutions & Équipements | IT Vision — Sécurité Électronique',
  description:
    "Équipements professionnels de sécurité électronique : vidéosurveillance, contrôle d'accès, alarme, réseau. Devis personnalisé, installation et maintenance au Sénégal.",
}

export default async function ProduitsPage() {
  const products = await fetchCorporateProducts()

  return (
    <main className="min-h-screen p-8">
      <h1 className="text-2xl font-bold mb-6">Solutions & Équipements</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {products.map((product) => (
          <article key={product.id} className="border rounded-lg p-4 shadow-sm">
            <h2 className="font-semibold text-lg">{product.name}</h2>
            <p className="text-sm text-gray-600">{product.category}</p>
            <p className="mt-2 text-sm">{product.description}</p>
            {product.priceAmount !== undefined && (
              <p className="mt-2 font-medium">
                {product.priceAmount.toLocaleString()} {product.currency}
              </p>
            )}
            <p className="mt-2 text-xs text-gray-500">{product.availabilityLabel}</p>
          </article>
        ))}
      </div>
    </main>
  )
}
