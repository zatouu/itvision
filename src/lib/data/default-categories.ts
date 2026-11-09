import { CATEGORY_TREE } from '@/lib/catalog/category-tree'

export interface DefaultSubCategory {
  id: string
  name: string
  icon: string
}

export interface DefaultProductCategory {
  id: string
  name: string
  description: string
  icon: string
  margin: number
  isActive: boolean
  subCategories?: DefaultSubCategory[]
}

/** Arborescence par défaut — dérivée de l'arbre de référence (`category-tree.ts`). */
export const defaultProductCategories: DefaultProductCategory[] = CATEGORY_TREE.map((family) => ({
  id: family.slug,
  name: family.name,
  description: family.description,
  icon: family.icon,
  margin: 0,
  isActive: true,
  subCategories: family.subs.map((sub) => ({ id: sub.slug, name: sub.name, icon: sub.icon })),
}))