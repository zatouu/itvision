# Vérification Cohérence Catalogue - Base / Backend / Frontend

## 🔍 Analyse Complète

Date : 2024
Version : 1.0

---

## ❌ INCOHÉRENCES IDENTIFIÉES

### 1. MODÈLES PRODUCT DUPLIQUÉS

**Problème** : Deux modèles Product existent
- `src/lib/models/Product.ts` (ancien)
- `src/lib/models/Product.validated.ts` (nouveau avec validations)

**Impact** : Confusion sur quel modèle utiliser, risque d'incohérence

**Solution** : 
- ✅ Utiliser uniquement `Product.validated.ts`
- ❌ Supprimer ou déprécier `Product.ts`

---

### 2. INCOHÉRENCE stockStatus

**Base de données** (`Product.ts`) :
```typescript
stockStatus?: 'in_stock' | 'preorder'
```

**Types TypeScript** (`product.types.ts`) :
```typescript
type StockStatus = 'in_stock' | 'preorder' | 'out_of_stock'
```

**API Catalogue** (`/api/catalog/products`) :
```typescript
status: product.stockStatus ?? 'preorder'  // Pas de 'out_of_stock'
```

**Frontend** (`produits/page.tsx`) :
```typescript
availabilityStatus?: 'in_stock' | 'preorder' | string  // Accepte string
```

**Impact** : Le statut `'out_of_stock'` n'est pas géré partout

**Solution** :
- ✅ Ajouter `'out_of_stock'` dans le modèle Product
- ✅ Mettre à jour l'API pour gérer ce statut
- ✅ Uniformiser les types frontend

---

### 3. INCOHÉRENCE currency

**Base de données** (`Product.ts`) :
```typescript
currency: { type: String, default: 'Fcfa' }  // ❌ 'Fcfa' avec 'c' minuscule
```

**Types TypeScript** (`product.types.ts`) :
```typescript
type Currency = 'FCFA' | 'EUR' | 'USD' | 'CNY'  // ✅ 'FCFA' en majuscules
```

**API Catalogue** :
```typescript
// Utilise directement product.currency sans normalisation
```

**Impact** : Incohérence entre 'Fcfa' et 'FCFA'

**Solution** :
- ✅ Normaliser vers 'FCFA' dans le modèle
- ✅ Ajouter validation enum dans Mongoose

---

### 4. STRUCTURE pricing1688 INCOHÉRENTE

**Base de données** :
```typescript
price1688?: number
price1688Currency?: string
exchangeRate?: number
serviceFeeRate?: number
insuranceRate?: number
```

**API Catalogue** (`/api/catalog/products`) :
```typescript
pricing1688: product.price1688 ? {
  price1688: product.price1688,
  price1688Currency: product.price1688Currency ?? 'CNY',
  exchangeRate: product.exchangeRate ?? 100,
  serviceFeeRate: product.serviceFeeRate ?? null,
  insuranceRate: product.insuranceRate ?? null
} : null
// ❌ Pas de breakdown
```

**Types TypeScript** (`product.types.ts`) :
```typescript
export interface Pricing1688Data {
  price1688: number
  price1688Currency: Currency
  exchangeRate: number
  serviceFeeRate: ServiceFeeRate | null
  insuranceRate: number | null
  breakdown?: Pricing1688Breakdown  // ✅ Optionnel mais devrait être calculé
}
```

**Frontend** (`ProductCard.tsx`) :
```typescript
pricing1688?: {
  price1688: number
  price1688Currency: string
  exchangeRate: number
} | null
// ❌ Structure minimale, pas de breakdown
```

**Impact** : Le breakdown n'est pas disponible côté frontend pour affichage détaillé

**Solution** :
- ✅ Calculer le breakdown dans l'API catalogue
- ✅ Inclure breakdown dans la réponse API
- ✅ Utiliser les types stricts dans ProductCard

---

### 5. TYPES DISPERSÉS

**Problème** : Beaucoup d'interfaces locales au lieu d'utiliser les types centralisés

**Fichiers avec interfaces locales** :
- `src/app/produits/page.tsx` : `ApiProduct`, `ShippingOptionSummary`
- `src/components/ProductCard.tsx` : `ProductCardProps` (propre interface)
- `src/components/ProductDetailExperience.tsx` : `ProductDetailData`, `SimilarProductSummary`
- `src/app/produits/favoris/page.tsx` : `WishlistProduct`

**Impact** : Duplication, maintenance difficile, risques d'incohérence

**Solution** :
- ✅ Utiliser `ProductResponse` et `ProductSummary` depuis `product.types.ts`
- ✅ Refactorer les composants pour utiliser les types centralisés

---

### 6. INCOHÉRENCE availability

**Base de données** :
```typescript
stockStatus?: 'in_stock' | 'preorder'
stockQuantity?: number
leadTimeDays?: number
```

**API Catalogue** :
```typescript
availability: {
  status: product.stockStatus ?? 'preorder',
  label: pricing.availabilityLabel,  // Calculé dans logistics.ts
  note: pricing.availabilitySubLabel ?? null,
  stockQuantity: product.stockQuantity ?? 0,
  leadTimeDays: product.leadTimeDays ?? null
}
```

**Types TypeScript** :
```typescript
export interface ProductAvailability {
  status: StockStatus  // 'in_stock' | 'preorder' | 'out_of_stock'
  label: string
  note: string | null
  stockQuantity: number
  leadTimeDays: number | null
}
```

**Frontend** :
```typescript
availabilityStatus?: 'in_stock' | 'preorder' | string  // ❌ Trop permissif
```

**Impact** : Types trop permissifs côté frontend

**Solution** :
- ✅ Utiliser `StockStatus` strict partout
- ✅ Normaliser les labels d'availability

---

### 7. INCOHÉRENCE shippingOptions

**API Catalogue** :
```typescript
pricing: {
  shippingOptions: ShippingOption[]  // Depuis computeProductPricing
}
```

**Frontend** (`ProductCard.tsx`) :
```typescript
shippingOptions?: ShippingOption[]  // Interface locale
```

**Types TypeScript** :
```typescript
export interface ShippingOption {
  id: ShippingMethodId
  label: string
  description: string
  durationDays: number
  cost: number
  currency: Currency
  total: number
}
```

**Impact** : Interface locale au lieu d'utiliser le type centralisé

**Solution** :
- ✅ Importer `ShippingOption` depuis `product.types.ts`

---

### 8. INCOHÉRENCE id vs _id

**Base de données** :
```typescript
_id: ObjectId  // MongoDB
```

**API Catalogue** :
```typescript
id: String(product._id)  // ✅ Converti en string
```

**Frontend** :
```typescript
_id: string  // ❌ Utilise _id au lieu de id
```

**Impact** : Mélange entre `id` et `_id`

**Solution** :
- ✅ Uniformiser vers `id` (string) partout côté API/Frontend
- ✅ Garder `_id` uniquement dans le modèle Mongoose

---

## ✅ POINTS COHÉRENTS

### 1. Structure pricing
- ✅ Calcul cohérent via `computeProductPricing()`
- ✅ Formatage homogène via `catalog-format.ts`

### 2. Champs 1688
- ✅ Présence cohérente dans le modèle
- ✅ Transmission correcte dans l'API

### 3. Logistique
- ✅ Dimensions, poids, volume bien structurés
- ✅ Calcul automatique du volume

---

## 🔧 CORRECTIONS NÉCESSAIRES

### Priorité HAUTE

1. **Unifier les modèles Product**
   - Supprimer `Product.ts` ou le marquer comme déprécié
   - Utiliser uniquement `Product.validated.ts`

2. **Normaliser stockStatus**
   - Ajouter `'out_of_stock'` dans le modèle
   - Mettre à jour l'enum Mongoose
   - Uniformiser les types frontend

3. **Corriger currency**
   - Changer default de `'Fcfa'` à `'FCFA'`
   - Ajouter validation enum

4. **Ajouter breakdown dans API**
   - Calculer `Pricing1688Breakdown` dans `/api/catalog/products`
   - Inclure dans la réponse

### Priorité MOYENNE

5. **Utiliser types centralisés**
   - Refactorer `ProductCard` pour utiliser `ProductSummary`
   - Refactorer `ProductDetailExperience` pour utiliser `ProductResponse`
   - Supprimer interfaces locales

6. **Uniformiser id/_id**
   - Utiliser `id` partout côté API/Frontend
   - Documenter la conversion `_id` → `id`

### Priorité BASSE

7. **Améliorer validations**
   - Ajouter validations Mongoose pour tous les champs
   - Utiliser les types stricts partout

---

## 📊 MATRICE DE COHÉRENCE

| Champ | Base | API | Frontend | Types | Statut |
|-------|------|-----|----------|-------|--------|
| `id` | `_id` | ✅ `id` | ⚠️ `_id` | ✅ `id` | À corriger |
| `name` | ✅ | ✅ | ✅ | ✅ | OK |
| `stockStatus` | ⚠️ 2 valeurs | ⚠️ 2 valeurs | ⚠️ string | ✅ 3 valeurs | Incohérent |
| `currency` | ❌ 'Fcfa' | ⚠️ | ✅ | ✅ 'FCFA' | Incohérent |
| `pricing1688` | ✅ | ⚠️ Sans breakdown | ⚠️ Structure min | ✅ Avec breakdown | Incohérent |
| `shippingOptions` | N/A | ✅ | ⚠️ Interface locale | ✅ Type centralisé | Incohérent |
| `availability` | N/A | ✅ | ⚠️ Types permissifs | ✅ Types stricts | Incohérent |

**Légende** :
- ✅ Cohérent
- ⚠️ Partiellement cohérent
- ❌ Incohérent

---

## 🎯 PLAN D'ACTION

### Phase 1 : Corrections critiques (1-2h)
1. Unifier modèles Product
2. Normaliser stockStatus
3. Corriger currency

### Phase 2 : Améliorations structurelles (2-3h)
4. Ajouter breakdown dans API
5. Utiliser types centralisés
6. Uniformiser id/_id

### Phase 3 : Optimisations (1-2h)
7. Améliorer validations
8. Documentation

---

**Prochaine étape** : Implémenter les corrections de Phase 1

