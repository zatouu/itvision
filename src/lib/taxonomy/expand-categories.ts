import ProductCategory from '@/lib/models/ProductCategory'
import { categoryTreeDescendants } from '@/lib/catalog/category-tree'

/** Slugs demandés + leurs sous-catégories (base de données et arbre de référence). */
export async function expandCategorySlugs(slugs: string[]): Promise<string[]> {
  const expanded = new Set<string>()
  for (const slug of slugs) {
    for (const s of categoryTreeDescendants(slug)) expanded.add(s)
  }
  try {
    const dbCategories = (await ProductCategory.find({ slug: { $in: slugs }, isActive: true }, { subCategories: 1 }).lean()) as any[]
    for (const parent of dbCategories) {
      for (const sub of parent.subCategories || []) {
        if (sub?.slug) expanded.add(sub.slug)
      }
    }
  } catch (error) {
    console.error('expandCategorySlugs error', error)
  }
  return Array.from(expanded)
}