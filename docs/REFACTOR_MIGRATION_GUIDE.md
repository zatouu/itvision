# Guide de Migration - Refactor Produits

## 📋 Résumé des changements

Ce refactor complet apporte :
- ✅ Types TypeScript stricts centralisés
- ✅ Validations Mongoose améliorées
- ✅ Module pricing 1688 refactoré avec marge dynamique
- ✅ ProductCard avec mode 1688 transparent
- ✅ Module Installation techniciens complet
- ✅ Documentation complète

---

## 🗂️ Nouveaux fichiers créés

### Types & Validations
- `src/lib/types/product.types.ts` - Types TypeScript stricts
- `src/lib/models/Product.validated.ts` - Modèle avec validations Mongoose

### Pricing
- `src/lib/pricing1688.refactored.ts` - Module pricing refactoré avec marge dynamique

### Installation
- `src/lib/models/Installation.ts` - Modèle Installation
- `src/app/api/installations/route.ts` - API création/liste
- `src/app/api/installations/[id]/assign/route.ts` - API affectation
- `src/app/api/installations/[id]/status/route.ts` - API statut

### Composants
- `src/components/ProductCard.refactored.tsx` - ProductCard avec mode 1688 transparent

### Documentation
- `docs/ARCHITECTURE_PRODUITS.md` - Documentation complète
- `docs/REFACTOR_MIGRATION_GUIDE.md` - Ce guide

---

## 🔄 Migration

### Étape 1 : Types TypeScript

**Avant** :
```typescript
// Types dispersés dans chaque fichier
interface Product {
  name: string
  price?: number
  // ...
}
```

**Après** :
```typescript
import type { ProductResponse, ProductSummary } from '@/lib/types/product.types'
```

### Étape 2 : Modèle Product

**Avant** :
```typescript
import Product from '@/lib/models/Product'
```

**Après** :
```typescript
import Product from '@/lib/models/Product.validated'
// Validations automatiques activées
```

### Étape 3 : Pricing 1688

**Avant** :
```typescript
import { simulatePricing1688 } from '@/lib/pricing1688'
```

**Après** :
```typescript
import { simulatePricing1688, getDynamicMarginMultiplier } from '@/lib/pricing1688.refactored'
// Marge dynamique selon volume automatique
```

### Étape 4 : ProductCard

**Avant** :
```typescript
import ProductCard from '@/components/ProductCard'
```

**Après** :
```typescript
import ProductCard from '@/components/ProductCard.refactored'
// Mode 1688 transparent activable
```

---

## 🎯 Utilisation

### Mode 1688 Transparent

```tsx
<ProductCard
  {...product}
  show1688Transparent={true} // Active l'affichage détaillé
/>
```

### Marge Dynamique

La marge s'ajuste automatiquement selon la quantité :
- 1-5 unités : marge standard (×1.0)
- 6-20 unités : -5% (×0.95)
- 21-50 unités : -10% (×0.90)
- 51+ unités : -15% (×0.85)

### Installation Techniciens

```typescript
// Créer une installation
POST /api/installations
{
  productId: "...",
  clientName: "...",
  // ...
}

// Affecter automatiquement
POST /api/installations/[id]/assign
{
  autoAssign: true
}

// Mettre à jour le statut
PATCH /api/installations/[id]/status
{
  status: "in_progress"
}
```

---

## ⚠️ Breaking Changes

### 1. Types Product

Les types ont changé. Utiliser `ProductResponse` au lieu de types locaux.

### 2. Pricing 1688

Le calcul inclut maintenant la marge dynamique par défaut. Pour désactiver :
```typescript
// Utiliser orderQuantity = 1 pour marge standard
simulatePricing1688({ ..., orderQuantity: 1 })
```

### 3. Validations Mongoose

Le modèle `Product.validated.ts` a des validations strictes :
- Nom : 2-200 caractères (requis)
- Prix : doit être positif ou nul
- Dimensions : toutes requises si une présente
- Service fee : uniquement 5, 10, ou 15

---

## 📝 Checklist Migration

- [ ] Remplacer imports `Product` par `Product.validated`
- [ ] Remplacer imports `pricing1688` par `pricing1688.refactored`
- [ ] Utiliser types depuis `product.types.ts`
- [ ] Tester validations Mongoose
- [ ] Vérifier marge dynamique
- [ ] Activer mode 1688 transparent si besoin
- [ ] Migrer vers API Installations
- [ ] Lire documentation `ARCHITECTURE_PRODUITS.md`

---

## 🚀 Prochaines étapes

1. **Tester** les nouvelles validations
2. **Migrer** progressivement les composants
3. **Activer** le mode 1688 transparent
4. **Intégrer** le module Installation
5. **Documenter** les workflows spécifiques

---

**Date** : 2024
**Version** : 2.0

