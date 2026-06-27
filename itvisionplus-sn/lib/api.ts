const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://itvisionplus.sn'

export interface CorporateProduct {
  id: string
  name: string
  category: string
  description: string
  image?: string
  priceAmount?: number
  currency: string
  features: string[]
  stockStatus: 'in_stock' | 'preorder' | 'out_of_stock'
  stockQuantity: number
  availabilityLabel: string
}

export async function fetchCorporateProducts(): Promise<CorporateProduct[]> {
  const res = await fetch(`${API_BASE_URL}/api/corporate/products?limit=80`, {
    next: { revalidate: 0 },
    cache: 'no-store',
  })
  if (!res.ok) {
    throw new Error(`Failed to fetch corporate products: ${res.status}`)
  }
  const data = await res.json()
  if (!data.success || !Array.isArray(data.items)) {
    throw new Error(data.error || 'Invalid corporate products response')
  }
  return data.items
}
