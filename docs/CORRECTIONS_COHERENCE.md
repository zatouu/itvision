# Corrections Cohérence Catalogue - Implémentées

## ✅ Corrections Appliquées

### 1. stockStatus - Ajout de 'out_of_stock'

**Fichier** : `src/lib/models/Product.ts`

**Avant** :
```typescript
stockStatus?: 'in_stock' | 'preorder'
enum: ['in_stock', 'preorder']
```

**Après** :
```typescript
stockStatus?: 'in_stock' | 'preorder' | 'out_of_stock'
enum: ['in_stock', 'preorder', 'out_of_stock']
```

**Impact** : Le modèle supporte maintenant les 3 statuts comme les types TypeScript

---

### 2. currency - Normalisation vers 'FCFA'

**Fichier** : `src/lib/models/Product.ts`

**Avant** :
```typescript
currency: { type: String, default: 'Fcfa' }
```

**Après** :
```typescript
currency: { type: String, default: 'FCFA', enum: ['FCFA', 'EUR', 'USD', 'CNY'] }
```

**Impact** : 
- Normalisation vers 'FCFA' en majuscules
- Validation enum pour éviter les valeurs invalides

---

### 3. pricing1688 - Ajout du breakdown dans l'API

**Fichiers** :
- `src/app/api/catalog/products/route.ts`
- `src/lib/catalog-format.ts`

**Avant** :
```typescript
pricing1688: product.price1688 ? {
  price1688: product.price1688,
  price1688Currency: product.price1688Currency ?? 'CNY',
  exchangeRate: product.exchangeRate ?? 100,
  serviceFeeRate: product.serviceFeeRate ?? null,
  insuranceRate: product.insuranceRate ?? null
} : null
```

**Après** :
```typescript
pricing1688: product.price1688 ? (() => {
  const pricing1688Data = { ... }
  
  // Calculer le breakdown si transport disponible
  let breakdown = undefined
  if (pricing.shippingOptions.length > 0) {
    const simulation = simulatePricingFromProduct(product, {
      shippingMethod: defaultShipping.id,
      weightKg: product.weightKg,
      volumeM3: product.volumeM3,
      orderQuantity: 1
    })
    breakdown = simulation
  }
  
  return {
    ...pricing1688Data,
    breakdown
  }
})() : null
```

**Impact** : Le breakdown est maintenant calculé et inclus dans la réponse API

---

## ⚠️ Corrections Restantes (À Faire)

### 1. Unifier les modèles Product

**Action** : Migrer tous les imports vers `Product.validated.ts`

**Fichiers à modifier** :
- `src/app/api/products/route.ts`
- `src/app/api/catalog/products/route.ts`
- `src/app/api/catalog/products/[id]/route.ts`
- `src/app/api/pricing/simulate/route.ts`
- `src/app/api/products/import/route.ts`
- `src/app/api/accounting/record-sale/route.ts`
- `src/app/api/interventions/submit/route.ts`

**Commande de migration** :
```bash
# Remplacer dans tous les fichiers
import Product from '@/lib/models/Product'
# Par
import Product from '@/lib/models/Product.validated'
```

---

### 2. Utiliser types centralisés dans ProductCard

**Fichier** : `src/components/ProductCard.tsx`

**Action** : Remplacer l'interface locale par `ProductSummary` depuis `product.types.ts`

**Avant** :
```typescript
export interface ProductCardProps {
  name: string
  model?: string
  // ... interface locale
}
```

**Après** :
```typescript
import type { ProductSummary } from '@/lib/types/product.types'

export interface ProductCardProps extends Partial<ProductSummary> {
  detailHref?: string
  onCompareToggle?: (productId: string, isSelected: boolean) => void
  isComparing?: boolean
}
```

---

### 3. Uniformiser id vs _id

**Fichiers** :
- `src/app/produits/page.tsx` : Utilise `_id` au lieu de `id`
- `src/app/produits/favoris/page.tsx` : Utilise `_id` au lieu de `id`

**Action** : L'API retourne déjà `id`, il faut utiliser `id` partout côté frontend

---

### 4. Normaliser availabilityStatus

**Fichier** : `src/components/ProductCard.tsx`

**Avant** :
```typescript
availabilityStatus?: 'in_stock' | 'preorder' | string
```

**Après** :
```typescript
import type { StockStatus } from '@/lib/types/product.types'
availabilityStatus?: StockStatus
```

---

## 📊 État Actuel

| Correction | Statut | Fichiers Modifiés |
|------------|--------|-------------------|
| stockStatus | ✅ Fait | `Product.ts` |
| currency | ✅ Fait | `Product.ts` |
| pricing1688 breakdown | ✅ Fait | `catalog/products/route.ts`, `catalog-format.ts` |
| Unifier modèles | ⚠️ À faire | 7 fichiers API |
| Types centralisés | ⚠️ À faire | `ProductCard.tsx` |
| id vs _id | ⚠️ À faire | `produits/page.tsx`, `favoris/page.tsx` |
| availabilityStatus | ⚠️ À faire | `ProductCard.tsx` |

---

## 🎯 Prochaines Étapes

1. **Tester** les corrections appliquées
2. **Migrer** vers `Product.validated.ts`
3. **Refactorer** ProductCard avec types centralisés
4. **Uniformiser** id/_id dans le frontend
5. **Valider** la cohérence complète

---

**Date** : 2024
**Version** : 1.0

