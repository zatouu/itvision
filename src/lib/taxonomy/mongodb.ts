/**
 * Helpers pour intégrer la taxonomy src/lib/taxonomy/taxonomy.json
 * dans le modèle MongoDB ProductCategory existant.
 */
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import ProductCategory from '../models/ProductCategory'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const JSON_PATH = resolve(__dirname, 'taxonomy.json')

export interface TaxonomyCategoryJson {
  id: string
  parent_id: string | null
  level: number
  name: Record<string, string>
  slug: string
  icon: string
  image: string
  order: number
  isActive: boolean
  isLeaf: boolean
  seoTitle: Record<string, string>
  seoDescription: Record<string, string>
  keywords: Record<string, string[]>
  synonyms?: Record<string, string[]>
  typos?: string[]
  closeCategories?: string[]
  allowedUnits: string[]
  requiredAttributes: string[]
  optionalAttributes: string[]
  searchFilters: string[]
  supportsWholesale: boolean
  supportsDropshipping: boolean
  supportsGroupBuying: boolean
  commissionRate: number
  createdAt: string
  updatedAt: string
}

export interface TaxonomyJson {
  version: string
  generatedAt: string
  schema: {
    maxDepth: number
    supportedLanguages: string[]
    currency: string
    defaultUnit: string
  }
  categories: TaxonomyCategoryJson[]
}

export function loadTaxonomy(): TaxonomyJson {
  return JSON.parse(readFileSync(JSON_PATH, 'utf8'))
}

export function taxonomyToProductCategoryDocs(categories: TaxonomyCategoryJson[]): any[] {
  const byId = new Map<string, TaxonomyCategoryJson>()
  const childrenByParent = new Map<string, TaxonomyCategoryJson[]>()

  for (const c of categories) {
    byId.set(c.id, c)
    if (c.parent_id) {
      const siblings = childrenByParent.get(c.parent_id) || []
      siblings.push(c)
      childrenByParent.set(c.parent_id, siblings)
    }
  }

  function parentSlugOf(c: TaxonomyCategoryJson): string | undefined {
    if (!c.parent_id) return undefined
    const parent = byId.get(c.parent_id)
    return parent?.slug
  }

  function buildSubCategories(c: TaxonomyCategoryJson) {
    const children = childrenByParent.get(c.id) || []
    return children.map(child => ({
      slug: child.slug,
      name: child.name.fr || child.name.en || child.slug,
      labelFr: child.name.fr || child.name.en || child.slug,
      icon: child.icon || 'tag'
    }))
  }

  return categories.map(c => {
    const pslug = parentSlugOf(c)
    const subCategories = !c.isLeaf ? buildSubCategories(c) : []
    return {
      slug: c.slug,
      name: c.name.fr || c.name.en || c.slug,
      labelFr: c.name.fr || c.name.en || c.slug,
      labelEn: c.name.en || undefined,
      labelWo: c.name.wo || undefined,
      icon: c.icon || 'tag',
      color: '#f97316',
      description: c.seoDescription?.fr || undefined,
      parentSlug: pslug,
      subCategories,
      order: c.order,
      isActive: c.isActive,
      taxonomyId: c.id,
      level: c.level,
      isLeaf: c.isLeaf,
      image: c.image || undefined,
      seoTitle: c.seoTitle,
      seoDescription: c.seoDescription,
      keywords: c.keywords,
      synonyms: c.synonyms,
      typos: c.typos || [],
      closeCategories: c.closeCategories || [],
      allowedUnits: c.allowedUnits || ['piece'],
      requiredAttributes: c.requiredAttributes || [],
      optionalAttributes: c.optionalAttributes || [],
      searchFilters: c.searchFilters || [],
      supportsWholesale: c.supportsWholesale ?? true,
      supportsDropshipping: c.supportsDropshipping ?? true,
      supportsGroupBuying: c.supportsGroupBuying ?? true,
      commissionRate: c.commissionRate ?? 0.08,
    }
  })
}

export interface SeedTaxonomyResult {
  total: number
  created: number
  updated: number
}

export async function seedTaxonomyToMongoDB(dryRun = false): Promise<SeedTaxonomyResult> {
  const taxonomy = loadTaxonomy()
  const docs = taxonomyToProductCategoryDocs(taxonomy.categories)
  let created = 0
  let updated = 0

  for (const doc of docs) {
    const existing = await ProductCategory.findOne({ slug: doc.slug }).lean()
    if (dryRun) {
      existing ? (updated += 1) : (created += 1)
      continue
    }

    await ProductCategory.findOneAndUpdate(
      { slug: doc.slug },
      { $set: doc },
      { upsert: true, new: true }
    )
    existing ? (updated += 1) : (created += 1)
  }

  return { total: docs.length, created, updated }
}

export default seedTaxonomyToMongoDB
