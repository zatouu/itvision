/**
 * Réorganisation idempotente des catégories marketplace :
 *  1. upsert des familles de l'arbre de référence (avec leurs sous-catégories) ;
 *  2. désactivation des anciennes catégories « à plat » devenues sous-catégories ;
 *  3. reclassement des produits (slug de référence d'après catégorie + nom).
 * `dryRun` : calcule le rapport sans rien écrire.
 */
import ProductCategory from '@/lib/models/ProductCategory'
import Product from '@/lib/models/Product'
import { CATEGORY_TREE, CATEGORY_TREE_SLUGS } from './category-tree'
import { classifyProductCategory, resolveCategoryExact } from './category-classifier'

export interface CategoryChange {
  id: string
  name: string
  from: string
  to: string
}

export interface CategoryReorganizationReport {
  dryRun: boolean
  families: { created: string[]; updated: string[] }
  deactivated: string[]
  customCategories: string[]
  products: {
    scanned: number
    changed: number
    byCategory: Record<string, number>
    changes: CategoryChange[]
    unresolved: Array<{ category: string; count: number }>
  }
}

const MAX_CHANGES_IN_REPORT = 300

export async function reorganizeCategories({ dryRun = true }: { dryRun?: boolean } = {}): Promise<CategoryReorganizationReport> {
  const treeSlugs = new Set(CATEGORY_TREE_SLUGS)
  const familySlugs = new Set(CATEGORY_TREE.map((f) => f.slug))

  // 1-2. Catégories
  const existing = (await ProductCategory.find({}, { slug: 1, name: 1, isActive: 1, parentSlug: 1 }).lean()) as any[]
  const existingSlugs = new Set(existing.map((c) => c.slug))
  const created: string[] = []
  const updated: string[] = []

  for (const [index, family] of CATEGORY_TREE.entries()) {
    ;(existingSlugs.has(family.slug) ? updated : created).push(family.slug)
    if (dryRun) continue
    await ProductCategory.updateOne(
      { slug: family.slug },
      {
        $set: {
          name: family.name,
          labelFr: family.name,
          icon: family.icon,
          description: family.description,
          subCategories: family.subs.map((s) => ({ slug: s.slug, name: s.name, labelFr: s.name, icon: s.icon })),
          order: index,
          level: 1,
          isLeaf: false,
          isActive: true,
        },
        $unset: { parentSlug: '' },
        $setOnInsert: { color: '#f97316' },
      },
      { upsert: true }
    )
  }

  const deactivated: string[] = []
  const customCategories: string[] = []
  for (const cat of existing) {
    if (familySlugs.has(cat.slug)) continue
    const known = treeSlugs.has(cat.slug) || resolveCategoryExact(cat.slug) || resolveCategoryExact(cat.name)
    if (!known) {
      if (cat.isActive !== false) customCategories.push(cat.slug)
      continue
    }
    if (cat.isActive === false) continue
    deactivated.push(cat.slug)
  }
  if (!dryRun && deactivated.length) {
    await ProductCategory.updateMany({ slug: { $in: deactivated } }, { $set: { isActive: false } })
  }

  // 3. Produits
  const customSet = new Set(customCategories)
  const products = (await Product.find({}, { name: 1, category: 1 }).lean()) as any[]
  const changes: CategoryChange[] = []
  const byCategory: Record<string, number> = {}
  const unresolved = new Map<string, number>()
  const ops: any[] = []

  for (const p of products) {
    const from = typeof p.category === 'string' ? p.category : ''
    // Catégorie personnalisée créée par l'admin : on n'y touche pas.
    const to = customSet.has(from) ? from : classifyProductCategory(from, p.name)
    byCategory[to || '(vide)'] = (byCategory[to || '(vide)'] || 0) + 1
    if (!treeSlugs.has(to) && !customSet.has(to)) unresolved.set(to || '(vide)', (unresolved.get(to || '(vide)') || 0) + 1)
    if (to && to !== from) {
      changes.push({ id: String(p._id), name: String(p.name || ''), from, to })
      ops.push({ updateOne: { filter: { _id: p._id }, update: { $set: { category: to } } } })
    }
  }

  if (!dryRun) {
    for (let i = 0; i < ops.length; i += 500) {
      await Product.bulkWrite(ops.slice(i, i + 500), { ordered: false })
    }
  }

  return {
    dryRun,
    families: { created, updated },
    deactivated,
    customCategories,
    products: {
      scanned: products.length,
      changed: changes.length,
      byCategory,
      changes: changes.slice(0, MAX_CHANGES_IN_REPORT),
      unresolved: Array.from(unresolved, ([category, count]) => ({ category, count })).sort((a, b) => b.count - a.count),
    },
  }
}
