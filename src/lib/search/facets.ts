/**
 * Facet aggregation helpers for the catalog search pipeline.
 * Works within a Mongo $facet stage so it can run alongside pagination.
 */

export const PRICE_RANGES = [
  { min: 0, max: 50000, label: 'Moins de 50 000' },
  { min: 50000, max: 100000, label: '50 000 - 100 000' },
  { min: 100000, max: 250000, label: '100 000 - 250 000' },
  { min: 250000, max: 500000, label: '250 000 - 500 000' },
  { min: 500000, max: 1000000, label: '500 000 - 1 000 000' },
  { min: 1000000, max: Infinity, label: 'Plus de 1 000 000' },
]

function priceRangeBucket() {
  return {
    $switch: {
      branches: PRICE_RANGES.map((range) => ({
        case: range.max === Infinity
          ? { $gte: ['$__shownPrice', range.min] }
          : { $and: [{ $gte: ['$__shownPrice', range.min] }, { $lt: ['$__shownPrice', range.max] }] },
        then: String(range.min),
      })),
      default: 'unknown',
    },
  }
}

export function buildFacetStages() {
  return {
    categories: [
      { $match: { category: { $exists: true, $nin: [null, ''] } } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 50 },
      { $project: { _id: 0, name: '$_id', count: 1 } },
    ],
    priceRanges: [
      { $match: { __shownPrice: { $exists: true, $ne: null } } },
      { $addFields: { __priceBucket: priceRangeBucket() } },
      { $group: { _id: '$__priceBucket', count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
      { $project: { _id: 0, key: '$_id', count: 1 } },
    ],
    availability: [
      { $group: { _id: '$stockStatus', count: { $sum: 1 } } },
      { $project: { _id: 0, status: '$_id', count: 1 } },
    ],
    segments: [
      {
        $group: {
          _id: null,
          inStock: { $sum: { $cond: [{ $eq: ['$stockStatus', 'in_stock'] }, 1, 0] } },
          groupBuy: { $sum: { $cond: ['$groupBuyEnabled', 1, 0] } },
          importChina: {
            $sum: {
              $cond: [
                {
                  $or: [
                    { $gt: ['$price1688', 0] },
                    { $in: ['$sourcing.platform', ['1688', 'alibaba', 'taobao', 'xianyu', 'idlefish']] },
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },
      {
        $project: {
          _id: 0,
          items: [
            { id: 'in_stock', label: 'Stock Dakar', count: '$inStock' },
            { id: 'group_buy', label: 'Achats groupés', count: '$groupBuy' },
            { id: 'import', label: 'Import Chine', count: '$importChina' },
          ],
        },
      },
    ],
  }
}

export function formatFacets(raw: any) {
  return {
    categories: raw?.categories || [],
    priceRanges: (raw?.priceRanges || [])
      .map((r: any) => ({
        ...PRICE_RANGES.find((p) => String(p.min) === r.key),
        count: r.count,
      }))
      .filter((r: any) => r.count > 0 && typeof r.min === 'number'),
    availability: raw?.availability || [],
    segments: raw?.segments?.[0]?.items || [],
  }
}
