import type { SupplierPricelist } from './types'
import { ZHILIAN_PRICELIST } from './zhilian'
import { SMARTLOCK_PRICELIST } from './smartlock'
import { LIWO_PRICELIST } from './liwo'

/** Grilles de fournisseurs directs importables depuis /admin/fournisseurs. */
export const SUPPLIER_PRICELISTS: Record<string, SupplierPricelist> = {
  [ZHILIAN_PRICELIST.id]: ZHILIAN_PRICELIST,
  [SMARTLOCK_PRICELIST.id]: SMARTLOCK_PRICELIST,
  [LIWO_PRICELIST.id]: LIWO_PRICELIST,
}
