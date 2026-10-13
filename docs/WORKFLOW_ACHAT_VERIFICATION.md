# Workflow d'Achat - Vérification et Corrections

## ✅ Corrections appliquées au workflow

### 1. Modèle Order mis à jour (`src/lib/models/Order.ts`)

**Avant** : Stockage basique (subtotal, shipping, total)
**Après** : Décomposition complète des frais

```typescript
interface IOrder {
  // ... champs existants ...
  
  fees: {
    supplierCost: number          // Coût fournisseur 1688
    serviceFeeRate: number         // Taux appliqué (réduction B2B)
    serviceFeeStandardRate: number // 10%
    serviceFeeAmount: number
    serviceFeeSavings: number      // Économie B2B
    insuranceRate: number        // 2.5%
    insuranceAmount: number
    totalFees: number
    quantityDiscount?: {          // Réduction par quantité
      percent: number
      amount: number
      label: string
    }
  }
  subtotalBeforeDiscounts: number  // Avant réduction quantité
  subtotal: number                 // Après réduction quantité
  shipping: {
    method: string
    totalCost: number
    totalWeight: number
    totalVolume: number
    weightDetails?: {              // 🔥 NOUVEAU: Poids volumétrique
      actualWeight: number
      volumetricWeight: number
      billedWeight: number
      billingMethod: 'actual' | 'volumetric'
    }
  }
  total: number
}
```

---

### 2. API Order corrigée (`src/app/api/order/route.ts`)

**Problèmes identifiés et corrigés :**

| Problème | Avant | Après |
|----------|-------|-------|
| Poids volumétrique | Non calculé | ✅ Calcul avec `calculateBilledWeight()` |
| Réduction B2B frais | Non appliquée | ✅ Appliquée selon montant commande |
| Décomposition prix | Non stockée | ✅ Stockée dans `order.fees` |
| Réduction quantité | Calculée séparément | ✅ Intégrée au calcul global |

**Nouveau flux de calcul :**
```
1. Calculer coût fournisseur (1688 × taux change)
2. Appliquer palier B2B → taux frais de service
3. Calculer frais: service + assurance
4. Sous-total avant réduction = fournisseur + frais
5. Appliquer réduction quantité
6. Sous-total après réduction
7. Calculer transport (poids volumétrique si aérien)
8. Total final
```

---

### 3. Calculateur de panier unifié (`src/lib/pricing/cart-calculator.ts`)

**Fonctions disponibles :**

```typescript
// Version async (serveur) - avec taux de change dynamique
const calculation = await calculateCartTotal(
  items,
  'air_15',
  { rate: 8500, minimumCharge: 8500, label: 'Aérien 10-15j' }
)

// Version sync (client) - estimation rapide
const estimate = calculateCartTotalSync(
  items,
  'air_15',
  { rate: 8500, minimumCharge: 8500, label: 'Aérien 10-15j' }
)
```

**Retour structuré :**
```typescript
{
  totalQuantity: number
  totalItems: number
  fees: {
    supplierCost: number
    serviceFeeRate: number      // 10%, 8%, 6% ou 5%
    serviceFeeStandardRate: number
    serviceFeeAmount: number
    serviceFeeSavings: number   // Si réduction B2B
    insuranceRate: number
    insuranceAmount: number
    totalFees: number
  }
  subtotalBeforeDiscounts: number
  quantityDiscount: {
    percent: number
    amount: number
    tier: TierPricing | null
  }
  subtotal: number
  shipping: {
    methodId: string
    methodLabel: string
    actualWeight: number
    volumetricWeight: number
    billedWeight: number        // max(actual, volumétrique)
    billingMethod: 'actual' | 'volumetric'
    ratePerKg: number
    cost: number
  }
  total: number
  b2bTier: { label, minAmount, feeRate }
}
```

---

### 4. Séparation visuelle des réductions

**Deux systèmes distincts, affichés séparément :**

```
DÉCOMPOSITION DU PRIX
────────────────────────────────────────
Prix fournisseur (1688)       35,000 FCFA
Frais de service (8%)          + 2,800 FCFA  [-700 FCFA réduction B2B]
Assurance (2.5%)               +   875 FCFA
────────────────────────────────────────
Sous-total                     38,675 FCFA
Réduction volume (-5%)         - 1,750 FCFA  [palier 20-49 produits]
────────────────────────────────────────
Transport (poids volumétrique) + 12,000 FCFA
                              (12kg facturés vs 2kg réels)
────────────────────────────────────────
TOTAL                          48,925 FCFA
```

---

## 🔄 Workflow complet mis à jour

### Étape 1: Panier (`/app/panier/page.tsx`)
- [x] Calcul local avec `calculateCartTotalSync()` (estimation)
- [x] Affichage séparé des réductions
- [ ] **TODO**: Intégrer `PriceBreakdown` pour décomposition détaillée
- [ ] **TODO**: Intégrer `ServiceFeeTierProgress` pour motivation B2B

### Étape 2: Création commande (`POST /api/order`)
- [x] Calcul complet serveur avec `calculateCartTotal()`
- [x] Poids volumétrique appliqué
- [x] Réduction B2B sur frais de service
- [x] Stockage détaillé dans Order

### Étape 3: Paiement (`/paiement/checkout/[orderId]`)
- [x] Récupération Order avec décomposition complète
- [ ] **TODO**: Afficher décomposition prix dans page paiement

### Étape 4: Confirmation
- [x] Email avec lien de suivi
- [x] Log détaillé (supplierCost, serviceFeeRate, billingMethod)

---

## 📝 Fichiers modifiés/créés

| Fichier | Action | Description |
|---------|--------|-------------|
| `src/lib/models/Order.ts` | ✅ Modifié | Ajout `fees`, `subtotalBeforeDiscounts`, `weightDetails` |
| `src/app/api/order/route.ts` | ✅ Modifié | Intégration `calculateCartTotal()` |
| `src/lib/pricing/cart-calculator.ts` | ✅ Créé | Calculateur unifié sync + async |
| `src/components/PriceBreakdown.tsx` | ✅ Créé | Décomposition prix (séparation visuelle) |

---

## ⚠️ Points de vigilance

1. **Poids volumétrique** : Les produits volumineux mais légers (antennes, packaging) verront leur transport augmenter. Prévoir message explicatif.

2. **Taux de change** : Le taux dynamique (~85 FCFA/¥) vs conservateur (100) augmentera vos marges si activé.

3. **Migration données** : Les anciennes commandes n'auront pas le champ `fees`. Le code doit gérer `order.fees || null`.

4. **Comptabilité** : Le service comptable reçoit toujours `unitPrice` (prix avec frais) et `shippingCost`. À mettre à jour si besoin de décomposition.

---

## 🚀 Prochaines étapes recommandées

1. **Intégrer PriceBreakdown dans le panier**
   ```tsx
   // Dans /app/panier/page.tsx
   import { PriceBreakdown } from '@/components/PriceBreakdown'
   
   <PriceBreakdown
     price1688={item.price1688}
     exchangeRate={item.exchangeRate}
     quantityDiscount={{
       percent: breakdown.discountPercent,
       amount: breakdown.discountAmount,
       label: breakdown.tier?.label
     }}
     serviceFeeDiscount={{
       standardRate: 10,
       appliedRate: calculation.fees.serviceFeeRate,
       savings: calculation.fees.serviceFeeSavings,
       tierLabel: calculation.b2bTier.label
     }}
     salePrice={item.price}
     shippingCost={transportCost}
   />
   ```

2. **Tester le workflow complet**
   - Commande avec poids volumétrique (produit volumineux)
   - Commande avec réduction B2B (>500k FCFA)
   - Commande avec réduction quantité (>20 produits)
   - Vérifier cohérence prix affiché vs prix stocké

3. **Mettre à jour la page de paiement**
   - Afficher décomposition des frais
   - Mentionner si poids volumétrique appliqué
