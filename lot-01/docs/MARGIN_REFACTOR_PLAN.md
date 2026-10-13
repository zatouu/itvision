# Plan de Refactorisation - Marge Commerciale

## Objectif

Adapter le système de marge commerciale pour que :
1. **La valeur par défaut soit 0%** au lieu de 25%
2. La marge soit **ajustable manuellement** comme les autres frais (serviceFeeRate, insuranceRate)
3. Le système reste **cohérent** avec la gestion des prix existante (priceTiers, variants)

## État Actuel

### Fichiers concernés

| Fichier | Utilisation actuelle de marginRate |
|---------|-----------------------------------|
| `src/lib/models/Product.ts` | Définition interface + Schema Mongoose, **default: 25** |
| `src/lib/logistics.ts` | Calcul pricing avec `marginRate` (défaut 25 si absent) |
| `src/lib/types/product.types.ts` | Type TypeScript pour marginRate |
| `scripts/import-aliexpress.ts` | Import avec DEFAULT_MARGIN (25) |
| `src/app/api/products/import/route.ts` | Import avec DEFAULT_MARGIN (25) |
| `src/app/api/products/route.ts` | Parsing marginRate depuis form data |
| `src/app/api/interventions/submit/route.ts` | Calcul marge sur devis (30% par défaut) |
| `src/app/api/quotes/route.ts` | Calcul marge sur devis |

### Logique actuelle

```typescript
// Product.ts (Mongoose Schema)
marginRate: { type: Number, default: 25 }

// logistics.ts (Calcul pricing)
const marginRate = typeof product.marginRate === 'number' ? product.marginRate : 25
const salePrice = productCostFCFA !== null
  ? roundCurrency(productCostFCFA * (1 + marginRate / 100))
  : (typeof product.price === 'number' ? roundCurrency(product.price) : null)
```

**Problème** : La marge de 25% est appliquée automatiquement, ce qui n'est pas souhaité pour la comptabilité.

## Changements à Appliquer

### 1. Modifier les Valeurs par Défaut

#### A. Modèle Mongoose (`src/lib/models/Product.ts`)

```typescript
// AVANT
marginRate: { type: Number, default: 25 }

// APRÈS
marginRate: { type: Number, default: 0 }
```

#### B. Logique de calcul (`src/lib/logistics.ts`)

```typescript
// AVANT
const marginRate = typeof product.marginRate === 'number' ? product.marginRate : 25

// APRÈS
const marginRate = typeof product.marginRate === 'number' ? product.marginRate : 0
```

#### C. Scripts d'import

**`scripts/import-aliexpress.ts`** et **`src/app/api/products/import/route.ts`**

```typescript
// Rechercher toutes les occurrences de DEFAULT_MARGIN
const DEFAULT_MARGIN = 25 // ANCIEN
const DEFAULT_MARGIN = 0  // NOUVEAU
```

### 2. Adapter les API Routes

#### `src/app/api/interventions/submit/route.ts`

```typescript
// AVANT
marginRate: productData?.marginRate || 30

// APRÈS
marginRate: productData?.marginRate ?? 0
```

#### `src/app/api/quotes/route.ts`

```typescript
// AVANT
marginRate: p.marginRate || 0

// APRÈS (déjà correct, pas de changement)
marginRate: p.marginRate ?? 0
```

### 3. Documentation et Communication

#### Ajouter un commentaire explicite dans Product.ts

```typescript
export interface IProduct extends Document {
  // ...
  baseCost?: number                    // Coût fournisseur en FCFA
  marginRate?: number                  // Marge commerciale (0% par défaut, ajustable manuellement)
  // ...
}
```

#### Mettre à jour la documentation existante

Modifier `docs/PRICING_ANALYSIS.md` pour refléter le changement :

```markdown
### Marge Commerciale (`marginRate`)

- **Défaut** : 0% (aucune marge appliquée automatiquement)
- **Objectif** : Permettre une gestion manuelle de la marge selon les besoins
- **Utilisation** : Ajustable dans l'interface admin produit
- **Calcul** : `prixVente = coûtFournisseur * (1 + marginRate / 100)`
```

## Compatibilité avec Système Existant

### ✅ Prix Dégressifs (priceTiers)

Les `priceTiers` fonctionnent indépendamment de `marginRate` :
- Ils définissent des prix fixes pour des paliers de quantité
- La marge n'affecte pas ces prix (déjà calculés)
- Aucun changement requis

### ✅ Variantes (variantGroups)

Les variantes peuvent avoir leur propre `price1688` :
- Le calcul de marge s'applique au prix de base ou à la variante
- Aucun changement requis dans la logique

### ✅ Frais de Service et Assurance

Ces frais restent ajustables comme avant :
- `serviceFeeRate` : défaut 10%
- `insuranceRate` : défaut 2.5%
- Ils s'ajoutent au coût fournisseur, pas au prix de vente

## Migration des Données Existantes

### Option 1 : Migration Automatique (Recommandé)

Créer un script de migration pour mettre à jour tous les produits existants :

```typescript
// scripts/migrate-margin-rate.ts
import Product from '../src/lib/models/Product'
import connectDB from '../src/lib/db/mongodb'

async function migrateMarginRates() {
  await connectDB()
  
  // Option A : Mettre à 0 tous les produits avec marge par défaut (25%)
  const result1 = await Product.updateMany(
    { marginRate: 25 },
    { $set: { marginRate: 0 } }
  )
  
  console.log(`✅ ${result1.modifiedCount} produits mis à jour (marge 25% → 0%)`)
  
  // Option B : Mettre à 0 tous les produits sans marginRate explicite
  const result2 = await Product.updateMany(
    { marginRate: { $exists: false } },
    { $set: { marginRate: 0 } }
  )
  
  console.log(`✅ ${result2.modifiedCount} produits mis à jour (marge undefined → 0%)`)
}

migrateMarginRates().then(() => process.exit(0))
```

### Option 2 : Migration Manuelle

- Exporter la liste des produits avec `marginRate: 25`
- Réviser manuellement chaque produit
- Définir la marge souhaitée (0% ou autre)

## Tests à Effectuer

### 1. Création de Nouveau Produit

- [ ] Créer un produit sans spécifier `marginRate`
- [ ] Vérifier que `marginRate` = 0
- [ ] Vérifier que le prix calculé = coût fournisseur (sans marge)

### 2. Import de Produits

- [ ] Importer des produits via AliExpress
- [ ] Vérifier que `marginRate` = 0 par défaut
- [ ] Vérifier le calcul du prix final

### 3. Produits Existants

- [ ] Tester un produit avec `marginRate: 25` (ancien)
- [ ] Vérifier que le prix calculé reste cohérent
- [ ] Mettre à jour manuellement la marge à 0
- [ ] Vérifier le nouveau prix calculé

### 4. Devis et Interventions

- [ ] Créer un devis avec produits à marge 0
- [ ] Vérifier le calcul du total
- [ ] Soumettre une intervention
- [ ] Vérifier le calcul de la marge totale

### 5. Prix Dégressifs et Variantes

- [ ] Tester un produit avec `priceTiers`
- [ ] Vérifier que la marge n'affecte pas les prix dégressifs
- [ ] Tester un produit avec variantes
- [ ] Vérifier le calcul de marge sur variantes

## Checklist d'Implémentation

- [ ] **1. Modifier Product.ts** (default: 0)
- [ ] **2. Modifier logistics.ts** (défaut 0)
- [ ] **3. Modifier scripts/import-aliexpress.ts** (DEFAULT_MARGIN = 0)
- [ ] **4. Modifier src/app/api/products/import/route.ts** (DEFAULT_MARGIN = 0)
- [ ] **5. Modifier src/app/api/interventions/submit/route.ts** (|| 30 → ?? 0)
- [ ] **6. Créer script de migration** (scripts/migrate-margin-rate.ts)
- [ ] **7. Mettre à jour docs/PRICING_ANALYSIS.md**
- [ ] **8. Tester tous les cas d'usage**
- [ ] **9. Exécuter migration en production** (si applicable)
- [ ] **10. Documenter changement dans CHANGELOG**

## Impact sur la Comptabilité

### Avant (marge 25% automatique)

```
Coût fournisseur : 10 000 FCFA
Marge automatique : 2 500 FCFA (25%)
Prix vente : 12 500 FCFA
→ Comptabilité floue : la marge est "cachée"
```

### Après (marge 0% par défaut, ajustable)

```
Coût fournisseur : 10 000 FCFA
Marge : 0 FCFA (0% par défaut)
Prix vente : 10 000 FCFA

Si marge ajustée à 15% :
Coût fournisseur : 10 000 FCFA
Marge : 1 500 FCFA (15%)
Prix vente : 11 500 FCFA
→ Comptabilité claire : la marge est explicite
```

## Prochaines Étapes (Optionnelles)

1. **Interface Admin Améliorée**
   - Ajouter un champ "Marge commerciale %" dans le formulaire produit
   - Afficher le calcul en temps réel : Coût + Marge = Prix

2. **Dashboard Comptable**
   - Afficher la marge totale par produit/catégorie
   - Exporter les données pour analyse comptable

3. **Alertes et Validations**
   - Alerter si marge > 50% (vérification anormale)
   - Suggérer une marge selon la catégorie produit

---

## Résumé

**Changement Principal** : `marginRate` passe de 25% → 0% par défaut

**Avantages** :
- ✅ Transparence totale sur la marge appliquée
- ✅ Comptabilité fiable et traçable
- ✅ Flexibilité pour ajuster selon besoins
- ✅ Cohérent avec la gestion des autres frais (service, assurance)

**Risques** :
- ⚠️ Produits existants avec marge 25% : nécessite migration
- ⚠️ Interface admin : à adapter pour clarifier l'ajustement manuel
