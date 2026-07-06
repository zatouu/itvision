import ProductCategory from '@/lib/models/ProductCategory'
import { defaultProductCategories } from '@/lib/data/default-categories'

export async function expandCategorySlugs(slugs: string[]): Promise<string[]> {
  try {
    const dbCategories = await ProductCategory.find({ isActive: true }).lean()
    const categories = dbCategories.length > 0
      ? dbCategories
      : (defaultProductCategories.map((c) => ({
          slug: c.id,
          subCategories: (c.subCategories || []).map((s) => ({ slug: s.id }))
        })) as any)

    const expanded = new Set<string>()
    for (const slug of slugs) {
      expanded.add(slug)
      const parent = categories.find((c: any) => c.slug === slug)
      if (parent?.subCategories?.length) {
        for (const sub of parent.subCategories) {
          expanded.add(sub.slug)
        }
      }
    }
    return Array.from(expanded)
  } catch (error) {
    console.error('expandCategorySlugs error', error)
    return slugs
  }
}
