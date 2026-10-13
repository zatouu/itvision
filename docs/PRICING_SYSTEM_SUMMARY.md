# Récapitulatif des Modifications - Gestion des Prix & Marge Commerciale

## 📋 Vue d'ensemble

Ce document récapitule **toutes les modifications** apportées au système de gestion des prix, notamment l'adaptation de la marge commerciale et la confirmation de la gestion des prix dégressifs et variantes.

---

## ✅ Modifications Appliquées

### 1. Marge Commerciale - Nouvelle Configuration

#### Objectif
Passer d'une **marge automatique de 25%** à une **marge par défaut de 0%**, ajustable manuellement pour une comptabilité transparente.

#### Fichiers Modifiés

| Fichier | Changement | Ligne(s) |
|---------|------------|----------|
| **src/lib/models/Product.ts** | `marginRate: { type: Number, default: 0 }` | ~95 |
| | Documentation interface : "Marge commerciale (0% par défaut, ajustable manuellement)" | ~34 |
| **src/lib/logistics.ts** | `const marginRate = typeof product.marginRate === 'number' ? product.marginRate : 0` | ~125 |
| **scripts/import-aliexpress.ts** | `const DEFAULT_MARGIN = Number(process.env.ALIEXPRESS_DEFAULT_MARGIN \|\| 0)` | ~43 |
| **src/app/api/products/import/route.ts** | `const DEFAULT_MARGIN = Number(process.env.ALIEXPRESS_DEFAULT_MARGIN \|\| 0)` | ~61 |
| **src/app/api/interventions/submit/route.ts** | `marginRate: productData?.marginRate ?? 0` | ~104 |

#### Impact

**Avant** :
```typescript
// Produit créé → marge 25% appliquée automatiquement
const product = { baseCost: 10000 }
// → salePrice = 12500 FCFA (marge cachée)
```

**Après** :
```typescript
// Produit créé → marge 0% par défaut
const product = { baseCost: 10000 }
// → salePrice = 10000 FCFA (transparent)

// Si marge ajustée manuellement à 15%
const product = { baseCost: 10000, marginRate: 15 }
// → salePrice = 11500 FCFA (marge explicite)
```

---

### 2. Script de Migration Créé

#### Fichier : `scripts/migrate-margin-rate.ts`

Script complet pour migrer les produits existants de marge 25% → 0%.

**Fonctionnalités** :
- ✅ Mode dry-run (simulation sans modification)
- ✅ Mode keep-custom (ne modifie que les produits avec marge 25%)
- ✅ Mode reset-all (réinitialise TOUS les produits - dangereux)
- ✅ Statistiques détaillées (comptage avant/après)
- ✅ Vérification post-migration
- ✅ Exemples de produits concernés

**Usage** :
```bash
# Simulation
npm run migrate:margin:dry

# Migration recommandée (keep-custom)
npm run migrate:margin

# Aide
tsx scripts/migrate-margin-rate.ts --help
```

#### Scripts ajoutés dans `package.json`

```json
{
  "scripts": {
    "migrate:margin": "tsx scripts/migrate-margin-rate.ts --keep-custom",
    "migrate:margin:dry": "tsx scripts/migrate-margin-rate.ts --dry-run"
  }
}
```

---

### 3. Documentation Créée/Mise à Jour

#### A. `docs/MARGIN_REFACTOR_PLAN.md` (NOUVEAU)

Plan complet de refactorisation avec :
- État actuel du système
- Changements à appliquer (détaillés par fichier)
- Compatibilité avec prix dégressifs et variantes
- Options de migration des données
- Tests à effectuer
- Checklist d'implémentation
- Impact sur la comptabilité

#### B. `docs/PRICING_ANALYSIS.md` (MIS À JOUR)

Ajout d'une section en haut du document :
- **🔄 Changements Récents - Marge Commerciale**
  - Nouvelle configuration (v2.0)
  - Impact sur le calcul
  - Instructions de migration

#### C. `docs/PRICING_SYSTEM_SUMMARY.md` (CE FICHIER)

Récapitulatif complet de toutes les modifications et de l'état du système.

---

## 🔍 Vérifications Effectuées

### Prix Dégressifs (priceTiers)

✅ **Confirmé** : Le système gère déjà les prix dégressifs via `priceTiers`

**Structure** :
```typescript
priceTiers: [
  { minQty: 1, maxQty: 9, price: 10000, discount: 0 },
  { minQty: 10, maxQty: 49, price: 9000, discount: 10 },
  { minQty: 50, price: 8000, discount: 20 }
]
```

**Fichiers impliqués** :
- `src/lib/models/Product.ts` (interface IPriceTier)
- `src/components/ProductDetailSidebar.tsx` (affichage)
- `src/components/ProductDetailExperience.tsx` (calculs)
- `src/app/achats-groupes/[groupId]/page.tsx` (achats groupés)
- `src/app/api/group-orders/route.ts` (API)

**Fonctionnement** :
- Les `priceTiers` définissent des **prix fixes** pour des paliers de quantité
- La `marginRate` n'affecte **pas** ces prix dégressifs (déjà calculés)
- ✅ Aucun changement requis

---

### Variantes (variantGroups)

✅ **Confirmé** : Le système gère les variantes avec prix et images spécifiques

**Structure** :
```typescript
variantGroups: [
  {
    name: "Couleur",
    variants: [
      { id: "red", name: "Rouge", image: "/uploads/red.jpg", price1688: 350 },
      { id: "blue", name: "Bleu", image: "/uploads/blue.jpg", price1688: 380 }
    ]
  },
  {
    name: "Taille",
    variants: [
      { id: "S", name: "Small", stock: 10 },
      { id: "M", name: "Medium", stock: 15 }
    ]
  }
]
```

**Fichiers impliqués** :
- `src/lib/models/Product.ts` (interface IProductVariantGroup)
- `src/components/ProductDetailSidebar.tsx` (sélection variantes)
- `src/components/ProductDetailExperience.tsx` (calcul prix variantes)
- `src/app/api/products/route.ts` (normalisation)

**Fonctionnement** :
- Chaque variante peut avoir son propre `price1688` (prix fournisseur)
- Le calcul de marge s'applique au prix de base **ou** à la variante
- Les images de variantes remplacent l'image principale lors de la sélection
- ✅ Aucun changement requis

---

## 📊 Système de Prix - État Complet

### Formule de Calcul Finale

```
┌─────────────────────────────────────────────────────────────────┐
│                    PRIX FINAL CLIENT                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. Coût Fournisseur                                            │
│     baseCost OU (price1688 × exchangeRate)                      │
│     → Exemple: 350 ¥ × 100 = 35,000 FCFA                        │
│                                                                  │
│  2. Frais Import (uniquement si importé)                        │
│     • Service Fee: coût × serviceFeeRate (défaut 10%)          │
│       → 35,000 × 10% = 3,500 FCFA                               │
│     • Assurance: coût × insuranceRate (défaut 2.5%)            │
│       → 35,000 × 2.5% = 875 FCFA                                │
│     Sous-total: 35,000 + 3,500 + 875 = 39,375 FCFA             │
│                                                                  │
│  3. Marge Commerciale (NOUVEAU : défaut 0%)                     │
│     Sous-total × (1 + marginRate/100)                           │
│     → Si marginRate = 0% : 39,375 FCFA                          │
│     → Si marginRate = 15% : 39,375 × 1.15 = 45,281 FCFA        │
│                                                                  │
│  4. Transport (si pas en stock)                                 │
│     • Air Express 3j: 12,000 FCFA/kg                            │
│     • Air 15j: 8,000 FCFA/kg                                    │
│     • Maritime 60j: 140,000 FCFA/m³                             │
│     → Exemple: 2kg × 8,000 = 16,000 FCFA                        │
│                                                                  │
│  PRIX TOTAL = 39,375 + 16,000 = 55,375 FCFA                    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Variables Configurables

| Variable | Valeur par défaut | Ajustable | Niveau |
|----------|-------------------|-----------|--------|
| `exchangeRate` | 100 FCFA/¥ | ✅ Oui | Global / Produit |
| `serviceFeeRate` | 10% | ✅ Oui (5%, 10%, 15%) | Produit |
| `insuranceRate` | 2.5% | ✅ Oui | Produit |
| **`marginRate`** | **0%** | **✅ Oui** | **Produit** |
| Transport (Air Express) | 12,000 FCFA/kg | ✅ Oui (override) | Produit |
| Transport (Air 15j) | 8,000 FCFA/kg | ✅ Oui (override) | Produit |
| Transport (Maritime) | 140,000 FCFA/m³ | ✅ Oui (override) | Produit |

---

## 🎯 Prochaines Étapes

### 1. Migration des Données (Recommandé)

```bash
# 1. Simulation pour voir les changements
npm run migrate:margin:dry

# 2. Si OK, appliquer la migration
npm run migrate:margin

# 3. Vérifier dans l'interface admin
# Les produits avec marge 25% → 0%
# Les produits avec marge personnalisée → INCHANGÉS
```

### 2. Tests à Effectuer

- [ ] **Création produit** : Vérifier que `marginRate` = 0 par défaut
- [ ] **Import produits** : Vérifier que `DEFAULT_MARGIN` = 0
- [ ] **Calcul prix** : Vérifier le prix final avec marge 0%
- [ ] **Ajustement manuel** : Tester modification de marge à 15%
- [ ] **Devis** : Vérifier calculs avec nouvelle marge
- [ ] **Prix dégressifs** : Confirmer que `priceTiers` fonctionne
- [ ] **Variantes** : Confirmer calcul prix variantes

### 3. Améliorations Futures (Optionnelles)

#### A. Interface Admin - Formulaire Produit

Ajouter un champ dédié pour la marge :

```tsx
<div className="form-group">
  <label>Marge Commerciale (%)</label>
  <input
    type="number"
    name="marginRate"
    min="0"
    max="100"
    step="0.1"
    defaultValue={0}
    placeholder="0 (aucune marge par défaut)"
  />
  <div className="preview">
    Coût: {baseCost} FCFA
    + Marge ({marginRate}%): {marginAmount} FCFA
    = Prix vente: {salePrice} FCFA
  </div>
</div>
```

#### B. Dashboard Comptable

Créer une vue pour analyser les marges :

```
┌──────────────────────────────────────────────────────────────┐
│              Dashboard Marges Commerciales                    │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  Produits avec marge > 0% : 45                                │
│  Produits sans marge (0%) : 123                               │
│                                                               │
│  Marge moyenne appliquée : 8.5%                               │
│  Marge totale (en valeur) : 125,000 FCFA                      │
│                                                               │
│  Par catégorie:                                               │
│  - Caméras : 12% (15 produits)                                │
│  - Alarmes : 5% (8 produits)                                  │
│  - Accessoires : 0% (123 produits)                            │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

#### C. Validations & Alertes

```typescript
// Validation lors de la sauvegarde
if (marginRate > 50) {
  alert("⚠️ Marge élevée (>50%). Vérifier si c'est intentionnel.")
}

// Suggestion selon catégorie
const suggestedMargin = {
  'Caméras': 15,
  'Alarmes': 10,
  'Accessoires': 5
}

if (marginRate === 0 && category in suggestedMargin) {
  hint.show(`💡 Marge suggérée pour ${category}: ${suggestedMargin[category]}%`)
}
```

#### D. Taux de Change Dynamique

Implémenter une API pour récupérer le taux CNY → FCFA en temps réel :

```typescript
// src/lib/pricing/exchange-rate.ts
export async function fetchLiveExchangeRate(): Promise<number> {
  // Appel à une API externe (ex: exchangerate-api.com)
  const response = await fetch('https://api.exchangerate-api.com/v4/latest/CNY')
  const data = await response.json()
  const usdToFcfa = 655 // 1 USD ≈ 655 FCFA (fixe ou API)
  const cnyToUsd = data.rates.USD
  return Math.round(cnyToUsd * usdToFcfa)
}

// Mettre à jour le taux global quotidiennement
```

---

## 📝 Changelog

### v2.0.0 - Refactorisation Marge Commerciale

**BREAKING CHANGES** :
- ⚠️ `marginRate` passe de 25% → 0% par défaut
- ⚠️ Nécessite migration des produits existants

**Ajouts** :
- ✅ Script de migration `scripts/migrate-margin-rate.ts`
- ✅ Documentation complète (`MARGIN_REFACTOR_PLAN.md`)
- ✅ Mise à jour `PRICING_ANALYSIS.md`
- ✅ Scripts npm `migrate:margin` et `migrate:margin:dry`

**Modifications** :
- 🔧 `Product.ts` : `marginRate` default 0
- 🔧 `logistics.ts` : fallback marge à 0
- 🔧 `import-aliexpress.ts` : DEFAULT_MARGIN = 0
- 🔧 `products/import/route.ts` : DEFAULT_MARGIN = 0
- 🔧 `interventions/submit/route.ts` : marginRate ?? 0

**Vérifications** :
- ✅ Prix dégressifs (`priceTiers`) : fonctionnels, aucun changement
- ✅ Variantes (`variantGroups`) : fonctionnelles, aucun changement
- ✅ Compatibilité avec frais service/assurance : OK

---

## 🎓 Résumé pour Comptabilité

### Avant (marge cachée)

```
Exemple : Caméra IP
- Coût fournisseur : 35,000 FCFA
- Frais import : 4,375 FCFA (service 10% + assurance 2.5%)
- Marge automatique : 9,844 FCFA (25%)
- Prix affiché : 49,219 FCFA

❌ Problème : La marge n'est pas visible/traçable
❌ Comptabilité : Difficile d'auditer les marges
```

### Après (marge transparente)

```
Exemple : Caméra IP
- Coût fournisseur : 35,000 FCFA
- Frais import : 4,375 FCFA (service 10% + assurance 2.5%)
- Marge : 0 FCFA (0% par défaut)
- Prix affiché : 39,375 FCFA

✅ Si marge ajustée à 15% :
- Marge : 5,906 FCFA (15%)
- Prix affiché : 45,281 FCFA

✅ Avantages :
- Transparence totale sur la marge appliquée
- Traçabilité pour la comptabilité
- Flexibilité selon besoins (promotion, catégorie, client)
- Cohérence avec frais service/assurance (ajustables)
```

---

## 🔗 Références

### Fichiers Modifiés
- `src/lib/models/Product.ts`
- `src/lib/logistics.ts`
- `scripts/import-aliexpress.ts`
- `src/app/api/products/import/route.ts`
- `src/app/api/interventions/submit/route.ts`
- `package.json`

### Documentation
- `docs/MARGIN_REFACTOR_PLAN.md` (plan détaillé)
- `docs/PRICING_ANALYSIS.md` (analyse complète)
- `docs/PRICING_SYSTEM_SUMMARY.md` (ce fichier)

### Scripts
- `scripts/migrate-margin-rate.ts` (migration)
- `npm run migrate:margin` (exécution)
- `npm run migrate:margin:dry` (simulation)

---

## 💬 Support

Pour toute question ou problème :
1. Consulter `docs/MARGIN_REFACTOR_PLAN.md` (détails techniques)
2. Vérifier `docs/PRICING_ANALYSIS.md` (formules de calcul)
3. Tester avec `npm run migrate:margin:dry` avant migration réelle

---

**Date de dernière mise à jour** : 2025-01-XX  
**Version** : 2.0.0  
**Statut** : ✅ Prêt pour migration
