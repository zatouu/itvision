# Gestion des Prix - Analyse & Améliorations

## 📊 Vue d'ensemble actuelle

Le système de tarification actuel gère plusieurs types de produits avec des calculs complexes basés sur :
- Import depuis 1688/Alibaba (avec conversion Yuan → FCFA)
- Produits en stock local (Dakar)
- Frais de service et assurance
- Coûts de transport (aérien/maritime)
- **Marges commerciales ajustables** (défaut 0%, personnalisable)

---

## 🔄 Changements Récents - Marge Commerciale

### ⚡ Nouvelle Configuration (v2.0)

**Avant** :
- `marginRate` : 25% par défaut (appliqué automatiquement)
- Problème : marge cachée, comptabilité floue

**Après** :
- `marginRate` : **0% par défaut** (aucune marge automatique)
- Ajustable manuellement comme les autres frais
- Comptabilité transparente et traçable

### 📝 Impact sur le Calcul

```typescript
// AVANT (marge automatique 25%)
Coût fournisseur: 10,000 FCFA
Marge automatique: 2,500 FCFA (25%)
Prix vente: 12,500 FCFA
→ Comptabilité floue

// APRÈS (marge 0% par défaut)
Coût fournisseur: 10,000 FCFA
Marge: 0 FCFA (0% par défaut)
Prix vente: 10,000 FCFA
→ Transparence totale

// Si ajustée à 15%
Coût fournisseur: 10,000 FCFA
Marge: 1,500 FCFA (15%)
Prix vente: 11,500 FCFA
→ Marge explicite
```

### 🛠️ Migration

Pour mettre à jour les produits existants :

```bash
# Simulation (dry run)
npm run migrate:margin:dry

# Migration réelle (recommandé)
npm run migrate:margin

# Détails: voir scripts/migrate-margin-rate.ts
# et docs/MARGIN_REFACTOR_PLAN.md
```

---

## 🏗️ Architecture Actuelle

### Fichiers impliqués

```
src/lib/
├── logistics.ts               # Calcul transport + pricing summary
├── pricing1688.refactored.ts  # Pricing détaillé import 1688
├── pricing/
│   └── constants.ts           # Constantes centralisées
└── models/
    └── Product.ts             # Modèle avec champs pricing
```

### Flux de calcul

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         Flux de Calcul des Prix                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   ┌──────────────┐                                                          │
│   │   Produit    │                                                          │
│   │  (MongoDB)   │                                                          │
│   └──────┬───────┘                                                          │
│          │                                                                  │
│          ▼                                                                  │
│   ┌──────────────────────────────────────────────────────────────────┐      │
│   │  1. Coût de base                                                 │      │
│   │     • baseCost (FCFA direct)                                     │      │
│   │     • OU price1688 × exchangeRate                                │      │
│   └──────────────────────────────────────────────────────────────────┘      │
│          │                                                                  │
│          ▼                                                                  │
│   ┌──────────────────────────────────────────────────────────────────┐      │
│   │  2. Frais additionnels (import seulement)                        │      │
│   │     • Service fee: 5% | 10% | 15%                                │      │
│   │     • Assurance: 2.5%                                            │      │
│   └──────────────────────────────────────────────────────────────────┘      │
│          │                                                                  │
│          ▼                                                                  │
│   ┌──────────────────────────────────────────────────────────────────┐      │
│   │  3. Marge commerciale                                            │      │
│   │     • Marge standard: 25%                                        │      │
│   │     • Marge variable: selon volume                               │      │
│   └──────────────────────────────────────────────────────────────────┘      │
│          │                                                                  │
│          ▼                                                                  │
│   ┌──────────────────────────────────────────────────────────────────┐      │
│   │  4. Transport (si pas en stock)                                  │      │
│   │     • Air Express 3j: 12,000 FCFA/kg                             │      │
│   │     • Air 15j: 8,000 FCFA/kg                                     │      │
│   │     • Sea 60j: 140,000 FCFA/m³                                   │      │
│   └──────────────────────────────────────────────────────────────────┘      │
│          │                                                                  │
│          ▼                                                                  │
│   ┌──────────────────────────────────────────────────────────────────┐      │
│   │  5. Prix final client                                            │      │
│   │     Prix produit + frais + transport                             │      │
│   └──────────────────────────────────────────────────────────────────┘      │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 💡 Fonctionnement Actuel Détaillé

### 1. **Constantes de base** (`src/lib/pricing/constants.ts`)

```typescript
DEFAULT_EXCHANGE_RATE = 100        // 1 ¥ = 100 FCFA
DEFAULT_SERVICE_FEE_RATE = 10      // 10% frais de service
DEFAULT_INSURANCE_RATE = 2.5       // 2.5% assurance
SERVICE_FEE_RATES = [5, 10, 15]    // Options de frais
```

### 2. **Coût produit** 

Priorité de calcul :
1. **baseCost** (si renseigné) → utilisé directement
2. **price1688** × `exchangeRate` → conversion Yuan → FCFA
3. **price** (legacy) → prix manuel

```typescript
// Exemple : Caméra 1688
price1688: 350 ¥
exchangeRate: 100
→ productCostFCFA = 35,000 FCFA
```

### 3. **Frais additionnels** (produits importés uniquement)

Appliqués sur le **coût fournisseur** :

| Frais | Taux | Calcul | Exemple (35,000 FCFA) |
|-------|------|--------|----------------------|
| Service | 10% | coût × 0.10 | 3,500 FCFA |
| Assurance | 2.5% | coût × 0.025 | 875 FCFA |
| **Total frais** | 12.5% | | **4,375 FCFA** |

```typescript
totalWithFees = productCostFCFA + serviceFee + insurance
              = 35,000 + 3,500 + 875
              = 39,375 FCFA
```

### 4. **Prix de vente** (avant transport)

```typescript
salePrice = productCostFCFA × (1 + marginRate/100)
          = 35,000 × 1.25
          = 43,750 FCFA
```

> **Note** : La marge est appliquée sur le coût AVANT les frais (pas sur totalWithFees)

### 5. **Transport**

Deux ensembles de taux :

| Méthode | Coût Réel (interne) | Prix Client (facturé) | Marge Transport |
|---------|---------------------|----------------------|-----------------|
| Air Express 3j | 11,000 FCFA/kg | 12,000 FCFA/kg | 1,000 FCFA/kg |
| Air 15j | 7,000 FCFA/kg | 8,000 FCFA/kg | 1,000 FCFA/kg |
| Maritime 60j | 130,000 FCFA/m³ | 140,000 FCFA/m³ | 10,000 FCFA/m³ |

```typescript
// Exemple : Produit 2kg avec Air 15j
shippingCost = 2kg × 8,000 = 16,000 FCFA
totalClient = salePrice + shippingCost
            = 43,750 + 16,000
            = 59,750 FCFA
```

### 6. **Marge dynamique** (selon volume)

```typescript
DYNAMIC_MARGIN_TIERS = {
  low: { qty: 1-5, multiplier: 1.0 },      // Marge standard
  medium: { qty: 6-20, multiplier: 0.95 }, // -5%
  high: { qty: 21-50, multiplier: 0.90 },  // -10%
  bulk: { qty: 51+, multiplier: 0.85 }     // -15%
}

// Exemple : 10 unités
marginRate = 25% × 0.95 = 23.75%
```

---

## 🔍 Problèmes Identifiés

### ❌ Problème 1 : Incohérence de marge

**Issue** : La marge est appliquée sur `productCostFCFA` (coût fournisseur brut) mais le client paie aussi `serviceFee + insurance`.

```
Coût fournisseur: 35,000 FCFA
Service (10%): 3,500 FCFA
Assurance (2.5%): 875 FCFA
─────────────────────────────
Coût réel total: 39,375 FCFA

Marge 25% sur 35,000 = +8,750 FCFA
Prix vente: 43,750 FCFA

Marge nette réelle: 43,750 - 39,375 = 4,375 FCFA (11% réel au lieu de 25%)
```

**Impact** : La marge effective est beaucoup plus faible que prévue.

### ❌ Problème 2 : Frais opaques pour le client

Le client voit un prix final sans détail des frais :
- Service fee : ❓
- Assurance : ❓
- Marge : ❓

### ❌ Problème 3 : Gestion des variantes

Les variantes ont des prix 1688 individuels mais :
- Pas de gestion des frais par variante
- Calcul de transport global (pas par variante)
- Pas de prix dégressifs par variante

### ❌ Problème 4 : Taux de change statique

```typescript
exchangeRate: 100 // Fixe dans le code
```

Pas de mécanisme de mise à jour automatique ou manuel facile.

### ❌ Problème 5 : Transport maritime sous-évalué

```
Volume 1m³ = 140,000 FCFA
Poids 100kg (air) = 800,000 FCFA

→ Le maritime est souvent plus cher que prévu pour petits volumes
```

---

## ✅ Propositions d'Amélioration

### 🎯 Amélioration 1 : Marge cohérente

**Option A** : Marge sur coût total (avec frais)

```typescript
totalCost = productCostFCFA + serviceFee + insurance
salePrice = totalCost × (1 + marginRate/100)

// Exemple
totalCost = 39,375 FCFA
salePrice = 39,375 × 1.25 = 49,219 FCFA
margeNette = 49,219 - 39,375 = 9,844 FCFA (25% réel)
```

**Option B** : Marge ajustée

```typescript
// Augmenter automatiquement le taux de marge pour compenser les frais
effectiveMargin = marginRate × (1 + serviceFeeRate/100 + insuranceRate/100)
                = 25% × 1.125 = 28.125%

salePrice = productCostFCFA × (1 + effectiveMargin/100)
          = 35,000 × 1.28125 = 44,844 FCFA
```

### 🎯 Amélioration 2 : Transparence des prix

Ajouter un breakdown détaillé :

```typescript
interface PriceBreakdown {
  productCost: number          // 35,000 FCFA
  serviceFee: number          // 3,500 FCFA
  insurance: number           // 875 FCFA
  margin: number              // 9,844 FCFA
  subtotal: number            // 49,219 FCFA
  shipping: number            // 16,000 FCFA
  total: number               // 65,219 FCFA
  
  // Méta
  marginRate: number          // 25%
  effectiveMarginRate: number // 28.1%
  currency: string            // FCFA
}
```

Afficher au client (mode admin uniquement) :

```
Prix produit: 35,000 FCFA
+ Frais de service (10%): 3,500 FCFA
+ Assurance (2.5%): 875 FCFA
+ Marge commerciale (25%): 9,844 FCFA
─────────────────────────────────────
Sous-total: 49,219 FCFA
+ Transport Air 15j: 16,000 FCFA
═════════════════════════════════════
TOTAL: 65,219 FCFA
```

### 🎯 Amélioration 3 : Gestion taux de change

**3.1 Table MongoDB**

```javascript
// Collection: exchange_rates
{
  _id: ObjectId("..."),
  fromCurrency: "CNY",
  toCurrency: "FCFA",
  rate: 103.5,
  source: "manual", // ou "api"
  validFrom: ISODate("2026-01-12T00:00:00Z"),
  validUntil: null, // null = actif
  updatedBy: "admin@itvision.sn",
  createdAt: ISODate("2026-01-12T08:00:00Z")
}
```

**3.2 API Admin**

```typescript
// GET /api/admin/exchange-rates
// POST /api/admin/exchange-rates
// PATCH /api/admin/exchange-rates/:id

interface ExchangeRate {
  id: string
  fromCurrency: string
  toCurrency: string
  rate: number
  source: 'manual' | 'api' | 'scraper'
  validFrom: Date
  validUntil: Date | null
  updatedBy: string
}
```

**3.3 Service de récupération**

```typescript
// src/lib/services/exchange-rate.ts

export async function getCurrentExchangeRate(
  from: string = 'CNY',
  to: string = 'FCFA'
): Promise<number> {
  // 1. Chercher dans MongoDB (taux actif)
  const rate = await ExchangeRate.findOne({
    fromCurrency: from,
    toCurrency: to,
    validFrom: { $lte: new Date() },
    $or: [
      { validUntil: null },
      { validUntil: { $gte: new Date() } }
    ]
  }).sort({ validFrom: -1 })

  if (rate) return rate.rate

  // 2. Fallback : constante par défaut
  return DEFAULT_EXCHANGE_RATE
}
```

### 🎯 Amélioration 4 : Prix dégressifs avancés

**4.1 Système de paliers**

```typescript
interface PriceTier {
  minQty: number
  maxQty?: number
  discount: number // Pourcentage ou montant fixe
  type: 'percentage' | 'fixed'
}

// Exemple produit
{
  name: "Caméra Hikvision",
  basePrice: 125000,
  priceTiers: [
    { minQty: 1, maxQty: 5, discount: 0, type: 'percentage' },      // Prix normal
    { minQty: 6, maxQty: 10, discount: 5, type: 'percentage' },     // -5%
    { minQty: 11, maxQty: 20, discount: 10, type: 'percentage' },   // -10%
    { minQty: 21, discount: 15000, type: 'fixed' }                  // -15,000 FCFA/unité
  ]
}
```

**4.2 Calcul dynamique**

```typescript
function calculateTierPrice(
  basePrice: number,
  quantity: number,
  tiers: PriceTier[]
): number {
  const tier = tiers.find(t => 
    quantity >= t.minQty && 
    (!t.maxQty || quantity <= t.maxQty)
  )

  if (!tier) return basePrice

  if (tier.type === 'percentage') {
    return basePrice * (1 - tier.discount / 100)
  }

  return basePrice - tier.discount
}

// Affichage
Prix unitaire:
  1-5 unités: 125,000 FCFA/unité
  6-10 unités: 118,750 FCFA/unité (-5%)
  11-20 unités: 112,500 FCFA/unité (-10%)
  21+ unités: 110,000 FCFA/unité
```

### 🎯 Amélioration 5 : Suggestions transport intelligentes

```typescript
function suggestBestShipping(
  product: Product,
  quantity: number,
  urgency: 'low' | 'medium' | 'high'
): ShippingRecommendation {
  const options = [
    {
      method: 'air_express',
      cost: calculateShipping('air_express', product, quantity),
      days: 3,
      score: urgency === 'high' ? 10 : 5
    },
    {
      method: 'air_15',
      cost: calculateShipping('air_15', product, quantity),
      days: 15,
      score: urgency === 'medium' ? 10 : urgency === 'low' ? 8 : 6
    },
    {
      method: 'sea_freight',
      cost: calculateShipping('sea_freight', product, quantity),
      days: 60,
      score: urgency === 'low' ? 10 : 3
    }
  ]

  // Calculer score final (coût + délai + urgence)
  const scored = options.map(opt => ({
    ...opt,
    finalScore: opt.score - (opt.cost / 10000) // Pénalité coût
  }))

  return scored.sort((a, b) => b.finalScore - a.finalScore)[0]
}
```

### 🎯 Amélioration 6 : Historique des prix

```javascript
// Collection: price_history
{
  productId: ObjectId("..."),
  timestamp: ISODate("2026-01-12T10:00:00Z"),
  snapshot: {
    baseCost: 35000,
    exchangeRate: 103.5,
    serviceFeeRate: 10,
    insuranceRate: 2.5,
    marginRate: 25,
    salePrice: 49219,
    shippingOptions: [...]
  },
  changedBy: "admin@itvision.sn",
  changeReason: "Mise à jour taux de change"
}
```

**Utilité** :
- Traçabilité des modifications
- Analyse évolution prix
- Détection anomalies
- Historique client (prix acheté vs actuel)

---

## 🛠️ Plan d'Implémentation

### Phase 1 : Correctifs urgents (1-2 jours)

1. ✅ **Corriger calcul marge**
   - Appliquer marge sur `totalCost` (incluant frais)
   - Mettre à jour `logistics.ts`

2. ✅ **Ajouter breakdown détaillé**
   - Créer interface `PriceBreakdown`
   - Exposer dans API `/api/catalog/products/[id]`

### Phase 2 : Gestion taux de change (2-3 jours)

3. ✅ **Créer modèle ExchangeRate**
   - Schema Mongoose
   - Migration données existantes

4. ✅ **API Admin taux**
   - CRUD routes
   - Interface admin
   - Validation

5. ✅ **Service récupération**
   - Fonction `getCurrentExchangeRate()`
   - Intégration dans pricing

### Phase 3 : Prix dégressifs (3-4 jours)

6. ✅ **Modèle price tiers**
   - Ajouter au schema Product
   - Fonction calcul

7. ✅ **UI Affichage**
   - Tableau paliers
   - Calculateur dynamique
   - Preview prix total

### Phase 4 : Analytics & Historique (2-3 jours)

8. ✅ **Price history**
   - Collection MongoDB
   - Triggers auto
   - API lecture

9. ✅ **Dashboard pricing**
   - Évolution prix
   - Marges par catégorie
   - Rapports

---

## 📝 Fichiers à créer/modifier

### Nouveaux fichiers

```
src/
├── lib/
│   ├── models/
│   │   └── ExchangeRate.ts              # Nouveau modèle
│   ├── services/
│   │   ├── exchange-rate.service.ts     # Service taux de change
│   │   └── pricing.service.ts           # Service pricing amélioré
│   └── pricing/
│       ├── breakdown.ts                 # Calcul breakdown détaillé
│       └── tiers.ts                     # Gestion paliers
├── app/
│   └── api/
│       └── admin/
│           ├── exchange-rates/
│           │   ├── route.ts             # GET, POST
│           │   └── [id]/
│           │       └── route.ts         # PATCH, DELETE
│           └── pricing/
│               └── history/
│                   └── route.ts         # Historique
└── components/
    ├── admin/
    │   ├── ExchangeRateManager.tsx      # Interface taux
    │   └── PricingDashboard.tsx         # Dashboard analytics
    └── PriceBreakdownCard.tsx           # Affichage détails prix
```

### Fichiers à modifier

```
src/lib/
├── logistics.ts                         # Corriger marge
├── pricing1688.refactored.ts            # Intégrer nouveau calcul
└── models/Product.ts                    # Ajouter priceTiers
```

---

## 🎨 Mockup Interface Admin

### Gestion Taux de Change

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  💱 Gestion des Taux de Change                                 [+ Nouveau]  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  📊 Taux Actuel                                                              │
│  ┌────────────────────────────────────────────────────────────────────┐     │
│  │  CNY → FCFA                                                         │     │
│  │  1 ¥ = 103.5 FCFA                                                   │     │
│  │                                                                     │     │
│  │  Dernière MAJ: 12/01/2026 08:00                                    │     │
│  │  Par: admin@itvision.sn                                            │     │
│  │  Source: Manuel                                                    │     │
│  │                                                                     │     │
│  │  [Modifier]  [Historique]                                          │     │
│  └────────────────────────────────────────────────────────────────────┘     │
│                                                                              │
│  📜 Historique (30 derniers jours)                                           │
│  ┌────────────────────────────────────────────────────────────────────┐     │
│  │  Date          Taux      Variation    Par                          │     │
│  │  ──────────────────────────────────────────────────────────────    │     │
│  │  12/01/2026    103.5     +0.5%       admin@itvision.sn            │     │
│  │  05/01/2026    103.0     -1.0%       admin@itvision.sn            │     │
│  │  20/12/2025    104.0     +4.0%       system                        │     │
│  └────────────────────────────────────────────────────────────────────┘     │
│                                                                              │
│  💡 Impact sur le catalogue                                                  │
│  ┌────────────────────────────────────────────────────────────────────┐     │
│  │  150 produits impactés                                             │     │
│  │  Variation moyenne: +520 FCFA/produit                              │     │
│  │                                                                     │     │
│  │  [Voir produits impactés]  [Prévisualiser changements]            │     │
│  └────────────────────────────────────────────────────────────────────┘     │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

Voulez-vous que je commence l'implémentation des améliorations ? Je peux créer :

1. **Correction marge** (urgent)
2. **Système taux de change** (prioritaire)
3. **Prix dégressifs** (business value)
4. **Dashboard analytics** (insights)

Dites-moi par quoi commencer ! 🚀
