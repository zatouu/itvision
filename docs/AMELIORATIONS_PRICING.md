# Améliorations Proposées - Modèle Marketplace

## Résumé des changements effectués

✅ **Détection Taobao implémentée** : L'API `/api/products/import` retourne maintenant un message informatif quand une URL Taobao/Tmall est détectée, proposant des alternatives (1688 ou import manuel).

---

## 1. Améliorations Pricing (Recommandées)

### 1.1 Calcul du poids volumétrique (Transport aérien)

**Problème actuel** : Le transport est calculé uniquement sur le poids réel. L'aviation utilise le poids volumétrique (formule IATA).

**Solution proposée** :

```typescript
// src/lib/logistics.ts
function calculateVolumetricWeight(lengthCm: number, widthCm: number, heightCm: number): number {
  // Formule IATA standard : L × l × h (cm) / 5000
  return (lengthCm * widthCm * heightCm) / 5000
}

function calculateBilledWeight(product: IProduct): number {
  const actualWeight = product.weightKg || 1
  
  if (product.lengthCm && product.widthCm && product.heightCm) {
    const volumetricWeight = calculateVolumetricWeight(
      product.lengthCm,
      product.widthCm,
      product.heightCm
    )
    // Le transporteur prend le max des deux
    return Math.max(actualWeight, volumetricWeight)
  }
  
  return actualWeight
}
```

**Impact** : Prix de transport plus précis pour les produits volumineux mais légers (caméras avec packaging, antennes, câbles).

---

### 1.2 Taux de change dynamique

**Problème actuel** : Taux fixe à 100 FCFA/¥ (configurable mais statique).

**Solution proposée** :

```typescript
// src/lib/pricing/exchange-rate.ts
interface ExchangeRateCache {
  rate: number
  updatedAt: Date
  source: string
}

// Cache 24h pour éviter les appels API répétés
let cachedRate: ExchangeRateCache | null = null

export async function getCNYToXOFRate(): Promise<number> {
  // Retourner le cache si valide (< 24h)
  if (cachedRate && Date.now() - cachedRate.updatedAt.getTime() < 24 * 60 * 60 * 1000) {
    return cachedRate.rate
  }
  
  try {
    // API gratuite : exchangerate-api.com
    const response = await fetch('https://api.exchangerate-api.com/v4/latest/CNY')
    const data = await response.json()
    
    // CNY → EUR → XOF (pas de direct CNY/XOF)
    const cnyToEur = data.rates.EUR
    const eurToXof = 655.957  // Taux fixe BEAC
    const rate = Math.round(cnyToEur * eurToXof)
    
    cachedRate = {
      rate,
      updatedAt: new Date(),
      source: 'exchangerate-api.com'
    }
    
    return rate
  } catch {
    // Fallback sur taux par défaut
    return 100
  }
}
```

**Impact** : Prix plus justes reflétant les fluctuations du yuan. Gain/perte de marge automatiquement ajusté.

---

### 1.3 Système de réductions séparées (visuellement distinctes)

**Deux systèmes complémentaires, affichés séparément pour transparence :**

#### A. Réduction par quantité (existante)
- **Portée** : Sur le prix des produits
- **Fichier** : `src/lib/pricing/tiered-pricing.ts`
- **Déclencheur** : Nombre d'articles dans le panier
- **Paliers** : 5-19 (0%), 20-49 (5%), 50-99 (10%), 100+ (15%)

#### B. Réduction B2B sur frais de service (nouveau)
- **Portée** : Sur les frais de service uniquement
- **Fichier** : `src/lib/pricing/tiered-service-fees.ts`
- **Déclencheur** : Montant total de la commande
- **Paliers** : <500k (10%), 500k-2M (8%), 2M-5M (6%), >5M (5%)

**Affichage dans le checkout :**
```
Prix fournisseur (1688)        35,000 FCFA
Frais de service (8%)          + 2,800 FCFA  [badge: -700 FCFA réduction B2B]
Assurance (2.5%)               + 875 FCFA
─────────────────────────────────────────────
Sous-total                     38,675 FCFA
Réduction volume (-5%)         - 1,750 FCFA  [séparé]
─────────────────────────────────────────────
Transport                      + 17,000 FCFA
Total                          53,925 FCFA
```

---

## 2. Améliorations Logistique

### 2.1 Tarifs négociés par zone

**Problème actuel** : Tarifs transport fixes pour tout le Sénégal.

**Solution proposée** : Tarifs différenciés Dakar / Régions / Zones rurales.

```typescript
// src/lib/logistics.ts
interface ZoneShippingRate extends ShippingRate {
  zone: 'dakar' | 'regions' | 'rural'
  deliveryDaysAdd?: number
}

export const ZONE_SHIPPING_RATES: Record<string, ZoneShippingRate> = {
  air_express_dakar: {
    id: 'air_express',
    zone: 'dakar',
    label: 'Express Dakar',
    rate: 12_000,
    durationDays: 3
  },
  air_express_regions: {
    id: 'air_express',
    zone: 'regions',
    label: 'Express Régions',
    rate: 15_000,  // +25%
    durationDays: 5,
    deliveryDaysAdd: 2
  }
}
```

---

### 2.2 Mode "Consolidation conteneur"

**Pour les gros volumes réguliers** : Option d'expédition groupée mensuelle.

```typescript
interface ContainerConsolidation {
  cutoffDate: Date          // Date limite commande
  departureDate: Date       // Départ du conteneur
  arrivalDate: Date         // Arrivée estimée
  minVolumeM3: number       // Volume minimum pour participation
  ratePerM3: number         // 90,000 FCFA/m³ (vs 180,000 standard)
  sharedCost: number        // Coût fixe partagé
}

// Exemple : Conteneur mensuel
const monthlyContainer: ContainerConsolidation = {
  cutoffDate: new Date('2024-02-15'),
  departureDate: new Date('2024-02-20'),
  arrivalDate: new Date('2024-03-25'),
  minVolumeM3: 0.5,
  ratePerM3: 90_000,  // 50% du tarif standard
  sharedCost: 50_000  // Dividé par nombre de participants
}
```

**Impact** : Réduction de 40-50% sur le transport pour clients patients (B2B).

---

## 3. Améliorations UX Checkout

### 3.1 Décomposition transparente du prix

**Solution** : Affichage détaillé dans le panier et checkout.

```
Récapitulatif commande
━━━━━━━━━━━━━━━━━━━━
Caméra IP Hikvision 4MP      45,000 FCFA
  └─ Prix fournisseur (1688)  40,000 FCFA
  └─ Frais de service (10%)     4,000 FCFA
  └─ Assurance (2.5%)           1,000 FCFA

Transport Aérien 15j         17,000 FCFA
  └─ 2kg × 8,500 FCFA/kg

TOTAL                        62,000 FCFA
━━━━━━━━━━━━━━━━━━━━
💡 Vous économisez 15,000 FCFA par rapport au prix local
```

### 3.2 Simulateur de prix intégré

**Fonctionnalité** : Page `/simulateur-import` où le client entre un prix 1688 et voit instantanément le prix final.

```typescript
// Interface publique
interface PriceSimulatorInput {
  price1688: number
  weightKg: number
  dimensions?: { l: number; w: number; h: number }
  quantity?: number
}

interface PriceSimulatorResult {
  productCost: number
  serviceFee: number
  insurance: number
  shippingOptions: ShippingOption[]
  totalPrice: number
  savingsVsLocal: number
}
```

---

## 4. Automatisations Sourcing

### 4.1 Alertes prix fournisseur

**Problème** : Les prix 1688 changent sans que tu le saches.

**Solution** : Vérification automatique hebdomadaire.

```typescript
// Cron job hebdomadaire
async function checkPriceChanges() {
  const products = await Product.find({
    'sourcing.platform': { $in: ['1688', 'taobao'] },
    price1688: { $exists: true }
  }).limit(100)
  
  for (const product of products) {
    try {
      const currentPrice = await scrape1688Price(product.sourcing.productUrl)
      
      if (currentPrice && currentPrice !== product.price1688) {
        const change = ((currentPrice - product.price1688) / product.price1688) * 100
        
        // Notifier si changement > 10%
        if (Math.abs(change) > 10) {
          await sendAlert({
            type: 'PRICE_CHANGE',
            product: product.name,
            oldPrice: product.price1688,
            newPrice: currentPrice,
            changePercent: change
          })
        }
        
        // Mettre à jour le prix
        await Product.updateOne(
          { _id: product._id },
          { 
            $set: { price1688: currentPrice },
            $push: {
              priceHistory: {
                date: new Date(),
                price1688: currentPrice,
                changePercent: change
              }
            }
          }
        )
      }
    } catch (e) {
      console.error(`Erreur vérification prix ${product.name}:`, e)
    }
  }
}
```

---

## 5. Implémentations Rapides (Quick Wins)

### 5.1 Badge "Prix Transparent"

Sur les fiches produits importés :
```
┌─────────────────────┐
│ 🏷️ Prix Transparent │
│ 10% service + 2.5%  │
│ assurance           │
└─────────────────────┘
```

### 5.2 Comparaison prix local vs import

```
💰 Notre prix : 125,000 FCFA
📍 Prix moyen Dakar : 180,000 FCFA
💸 Vous économisez : 55,000 FCFA (30%)
```

### 5.3 Estimation livraison améliorée

```
🚢 Maritime (45-50 jours)      35,000 FCFA
✈️ Aérien (10-15 jours)        68,000 FCFA  ⭐ Populaire
🚀 Express (3-5 jours)         95,000 FCFA
```

---

## Priorités d'implémentation

| Priorité | Amélioration | Effort | Impact |
|----------|---------------|--------|--------|
| P0 | Poids volumétrique | 🟡 Moyen | 🔥 Précision transport |
| P0 | Décomposition prix checkout | 🟢 Faible | 🔥 Confiance client |
| P1 | Taux change dynamique | 🟢 Faible | 🟡 Marge optimisée |
| P1 | Palier frais de service B2B | 🟡 Moyen | 🟡 Fidélisation |
| P2 | Consolidation conteneur | 🔴 Élevé | 🔥 Avantage compétitif |
| P2 | Alertes prix fournisseur | 🟡 Moyen | 🟡 Marge protégée |
| P3 | Zones géographiques | 🟡 Moyen | 🟡 UX améliorée |

---

## Notes sur le modèle actuel

Ton modèle actuel est **solide** sur ces points :
- ✅ Séparation claire coût réel / prix client
- ✅ Frais configurables par produit
- ✅ Support variantes (style 1688)
- ✅ Multi-source d'import (Apify, RapidAPI, direct)
- ✅ Gestion des erreurs anti-bot (message clair CAPTCHA)

Points de vigilance :
- 🟡 Le taux 100 FCFA/¥ est conservateur (réel ~82-85 FCFA/¥ en 2024)
- 🟡 Poids volumétrique non pris en compte (surcoût potentiel transport)
- 🟡 Pas de mécanisme d'alerte si prix fournisseur change
