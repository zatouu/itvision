# Module Produits 1688 - Système de Pricing

## Vue d'ensemble

Ce module permet de gérer les produits importés depuis 1688 avec un système de calcul automatique des coûts, marges et projections.

## Fonctionnement métier

- **Taux de change fixe** : 1 ¥ (Yuan) = 100 FCFA
- Les clients sénégalais voient pratiquement le prix d'origine, favorisant l'achat en quantité
- Gestion complète : achat → transport Chine → livraison domicile Sénégal

## Modes de transport

### Express (3 jours)
- **Coût réel** : 11 000 CFA/kg
- **Prix déclaré client** : 12 000 CFA/kg
- **Marge** : 1 000 CFA/kg

### Fret aérien (6-10 jours)
- **Coût réel** : 7 500 CFA/kg
- **Prix déclaré client** : 8 000 CFA/kg
- **Marge** : 500 CFA/kg

### Maritime (50-60 jours)
- **Coût réel** : 135 000 CFA/m³
- **Prix déclaré client** : 145 000 CFA/m³
- **Marge** : 10 000 CFA/m³

## Commissions

- **Frais de service** : 5%, 10% ou 15% (configurable par produit)
- **Frais d'assurance** : Pourcentage configurable (ajouté au coût total)

## Structure des données

### Modèle Product (champs 1688)

```typescript
{
  price1688?: number,           // Prix en Yuan (¥)
  price1688Currency?: string,   // Devise (défaut: 'CNY')
  exchangeRate?: number,        // Taux de change (défaut: 100)
  serviceFeeRate?: number,      // Frais de service (5, 10, ou 15)
  insuranceRate?: number        // Frais d'assurance (en %)
}
```

## API de simulation

### Endpoint

```
POST /api/pricing/simulate
```

### Requête

```json
{
  "productId": "optional-product-id",
  "price1688": 50,              // Prix en Yuan
  "shippingMethod": "air_express",
  "weightKg": 2.5,
  "serviceFeeRate": 10,
  "insuranceRate": 2,
  "orderQuantity": 10,
  "monthlyVolume": 100
}
```

### Réponse

```json
{
  "success": true,
  "simulation": {
    "breakdown": {
      "productCostFCFA": 5000,        // Coût produit en FCFA
      "shippingCostReal": 27500,      // Coût transport réel
      "serviceFee": 500,              // Frais de service
      "insuranceRate": 560,           // Frais d'assurance
      "totalRealCost": 33560,         // Coût total réel
      "shippingCostClient": 30000,    // Prix transport déclaré client
      "totalClientPrice": 35000,      // Prix total facturé client
      "shippingMargin": 2500,         // Marge sur transport
      "netMargin": 1440,              // Marge nette totale
      "marginPercentage": 4.29,       // Pourcentage de marge
      "cumulativeMargin": 14400,      // Marge cumulée (10 unités)
      "estimatedMonthlyProfit": 144000 // Estimation bénéfice mensuel
    },
    "currency": "FCFA",
    "shippingMethod": {
      "id": "air_express",
      "label": "Express aérien 3 jours",
      "durationDays": 3
    },
    "volumeInfo": {
      "orderQuantity": 10,
      "monthlyVolume": 100
    }
  }
}
```

## Utilisation dans le code

### Simulation simple

```typescript
import { simulatePricing1688 } from '@/lib/pricing1688'

const result = simulatePricing1688({
  price1688: 50,              // 50 ¥
  shippingMethod: 'air_express',
  weightKg: 2.5,
  serviceFeeRate: 10,
  insuranceRate: 2,
  orderQuantity: 10,
  monthlyVolume: 100
})

console.log('Marge nette:', result.breakdown.netMargin)
console.log('Bénéfice mensuel estimé:', result.breakdown.estimatedMonthlyProfit)
```

### Simulation depuis un produit existant

```typescript
import { simulatePricingFromProduct } from '@/lib/pricing1688'
import Product from '@/lib/models/Product'

const product = await Product.findById(productId)
const result = simulatePricingFromProduct(product, {
  shippingMethod: 'air_15',
  weightKg: 3.0,
  orderQuantity: 5
})
```

## Calculs détaillés

### 1. Coût produit
```
Coût produit (FCFA) = Prix 1688 (¥) × Taux de change (100)
```

### 2. Coût transport réel
```
Transport réel = Poids (kg) × Taux réel
ou
Transport réel = Volume (m³) × Taux réel (pour maritime)
```

### 3. Frais de service
```
Frais service = Coût produit × (Taux service / 100)
```

### 4. Frais d'assurance
```
Frais assurance = (Coût produit + Transport réel) × (Taux assurance / 100)
```

### 5. Coût total réel
```
Coût total réel = Coût produit + Transport réel + Frais service + Frais assurance
```

### 6. Prix facturé client
```
Prix client = Coût produit + Transport déclaré client
```

### 7. Marge nette
```
Marge nette = Prix client - Coût total réel
```

### 8. Projections
```
Marge cumulée = Marge nette × Quantité commande
Bénéfice mensuel = Marge nette × Volume mensuel
```

## Exemples concrets

### Exemple 1 : Produit léger (Express)
- Prix 1688 : 30 ¥
- Poids : 1 kg
- Frais service : 10%
- Assurance : 0%

**Résultat** :
- Coût produit : 3 000 FCFA
- Transport réel : 11 000 FCFA
- Transport client : 12 000 FCFA
- Frais service : 300 FCFA
- Coût total réel : 14 300 FCFA
- Prix client : 15 000 FCFA
- **Marge nette : 700 FCFA**

### Exemple 2 : Produit volumineux (Maritime)
- Prix 1688 : 200 ¥
- Volume : 0.5 m³
- Frais service : 15%
- Assurance : 3%

**Résultat** :
- Coût produit : 20 000 FCFA
- Transport réel : 67 500 FCFA
- Transport client : 72 500 FCFA
- Frais service : 3 000 FCFA
- Assurance : 2 625 FCFA
- Coût total réel : 93 125 FCFA
- Prix client : 92 500 FCFA
- **Marge nette : -625 FCFA** (perte, ajuster les paramètres)

## Notes importantes

1. **Taux de change fixe** : Le système utilise 1 ¥ = 100 FCFA par défaut, mais peut être configuré par produit
2. **Marges sur transport** : Les marges sont automatiquement calculées entre coût réel et prix déclaré
3. **Commissions variables** : Les frais de service peuvent être ajustés (5%, 10%, 15%)
4. **Projections** : Les calculs de marge cumulée et bénéfice mensuel aident à la planification
5. **Validation** : L'API valide les données et retourne des erreurs claires en cas de problème

## Intégration dans l'interface admin

Pour intégrer ce système dans l'interface d'administration :

1. Ajouter les champs 1688 dans le formulaire de création/édition de produit
2. Créer un composant de simulation de pricing
3. Afficher les résultats de simulation avec les marges et projections
4. Permettre l'export des simulations pour analyse

