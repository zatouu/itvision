import type { SupplierPricelist } from './types'
import { ZHILIAN_PRICELIST } from './zhilian'

/** Grilles de fournisseurs directs importables depuis /admin/fournisseurs. */
export const SUPPLIER_PRICELISTS: Record<string, SupplierPricelist> = {
  [ZHILIAN_PRICELIST.id]: ZHILIAN_PRICELIST,
}
