# Architecture Marketplace IT Vision Plus

## Vue d'ensemble du modèle économique

Ce document décrit l'architecture du marketplace IT Vision Plus basé sur le **sourcing direct depuis la Chine** (1688, Taobao, AliExpress) avec une politique de prix transparente.

---

## 1. Philosophie du Pricing

### Principe fondamental : **Transparence totale**
- **Frais de service** : 10% (configurable par produit : 5%, 10%, 15%)
- **Assurance** : 2.5% (protection contre perte/dommage en transit)
- **Aucun frais caché** : Le client voit exactement ce qu'il paie
- **Transport affiché** : Prix du freight séparé (pas de "livraison gratuite" masquée)

### Formule de calcul

```
PRIX CLIENT = COÛT FOURNISSEUR + FRAIS DE SERVICE + ASSURANCE + TRANSPORT

Où :
- Coût Fournisseur (FCFA) = Prix 1688 (¥) × Taux de change (100 FCFA/¥)
- Frais de Service = Coût Fournisseur × 10%
- Assurance = Coût Fournisseur × 2.5%
- Transport = Calculé selon méthode (poids ou volume)
```

### Exemple concret

| Élément | Calcul | Montant |
|---------|--------|---------|
| Prix 1688 | ¥50 | - |
| Coût fournisseur | 50 × 100 | **5,000 FCFA** |
| Frais service (10%) | 5,000 × 10% | **500 FCFA** |
| Assurance (2.5%) | 5,000 × 2.5% | **125 FCFA** |
| **Sous-total produit** | | **5,625 FCFA** |
| Transport aérien 15j | 2kg × 8,500 | **17,000 FCFA** |
| **TOTAL CLIENT** | | **22,625 FCFA** |

---

## 2. Structure des données

### Modèle Produit (`src/lib/models/Product.ts`)

```typescript
interface IProduct {
  // Identification
  name: string
  category?: string
  
  // Sourcing Chine
  price1688?: number              // Prix en Yuan (¥)
  price1688Currency?: string        // 'CNY' par défaut
  exchangeRate?: number          // Défaut: 100 (1¥ = 100 FCFA)
  
  // Frais (configurables par produit)
  serviceFeeRate?: number         // 5, 10, ou 15
  insuranceRate?: number        // Défaut: 2.5
  
  // Logistique
  weightKg?: number
  lengthCm?: number
  widthCm?: number
  heightCm?: number
  volumeM3?: number               // Auto-calculé si dimensions fournies
  
  // Variant style 1688
  variantGroups?: IProductVariantGroup[]
  
  // Sourcing
  sourcing?: {
    platform?: '1688' | 'taobao' | 'aliexpress' | string
    supplierName?: string
    supplierContact?: string
    productUrl?: string
    notes?: string
  }
  
  // Prix final (auto-calculé)
  baseCost?: number               // Coût fournisseur en FCFA
  marginRate?: number            // Marge additionnelle (optionnelle)
}
```

### Constantes de pricing (`src/lib/pricing/constants.ts`)

```typescript
export const DEFAULT_EXCHANGE_RATE = 100        // 1 ¥ = 100 FCFA
export const DEFAULT_SERVICE_FEE_RATE = 10     // 10%
export const DEFAULT_INSURANCE_RATE = 2.5      // 2.5%
export const SERVICE_FEE_RATES = [5, 10, 15]   // Options possibles
```

---

## 3. Logique de calcul (`src/lib/pricing1688.ts`)

### Fonction principale : `simulatePricing1688()`

```typescript
function simulatePricing1688(input: PricingSimulationInput): PricingSimulationResult {
  // 1. Conversion prix Chine → FCFA
  const productCostFCFA = price1688 * exchangeRate
  
  // 2. Calcul des frais (sur coût fournisseur)
  const serviceFee = productCostFCFA * (serviceFeeRate / 100)
  const insuranceFee = productCostFCFA * (insuranceRate / 100)
  
  // 3. Calcul transport selon méthode
  const shippingCost = method === 'sea_freight' 
    ? volumeM3 * ratePerM3
    : weightKg * ratePerKg
  
  // 4. Prix total
  const totalClientPrice = productCostFCFA + serviceFee + insuranceFee + shippingCost
  
  // 5. Marge nette (transport facturé - transport réel)
  const shippingMargin = shippingCostClient - shippingCostReal
  const netMargin = totalClientPrice - totalRealCost
  
  return { breakdown, currency, shippingMethod }
}
```

---

## 4. Tarifs de transport (`src/lib/logistics.ts`)

### Coûts réels (internes)

| Méthode | Tarif | Minimum |
|---------|-------|---------|
| Express 3-5j (air_express) | 11,000 FCFA/kg | 20,000 FCFA |
| Aérien 10-15j (air_15) | 7,000 FCFA/kg | 15,000 FCFA |
| Maritime 45-50j (sea_freight) | 130,000 FCFA/m³ | 130,000 FCFA |

### Prix clients (affichés)

| Méthode | Tarif | Minimum | Délai |
|---------|-------|---------|-------|
| Express 3-5j | 12,000 FCFA/kg | 12,000 FCFA | 4 jours |
| Aérien 10-15j | 8,500 FCFA/kg | 8,500 FCFA | 13 jours |
| Maritime 45-50j | 180,000 FCFA/m³ | 0 | 48 jours |

> **Note** : La marge sur transport (ex: 1,000 FCFA/kg en express) couvre les imprévus et garantit la viabilité économique.

---

## 5. Sources d'import

### Architecture modulaire (`src/lib/import-sources.ts`)

```typescript
type ImportSource = 'rapidapi' | 'apify' | 'scraperapi' | 'direct' | 'affiliate'
```

| Source | Description | Utilisation |
|--------|-------------|-------------|
| **RapidAPI** | API aliexpress-datahub | Recherche par mot-clé AliExpress |
| **Apify** | Scraping cloud via actors | Alternative si RapidAPI limité |
| **ScraperAPI** | Proxy scraping | Fallback technique |
| **Direct** | Parsing HTML direct | 1688 (avec limitation captcha) |
| **Affiliate** | API officielle AliExpress | Nécessite partenariat |

### Flux d'import

```
Admin → /admin/import-produits → API /api/products/import → Source externe → Normalisation → MongoDB
```

---

## 6. Gestion des variantes (style 1688)

### Structure

```typescript
interface IProductVariantGroup {
  name: string           // ex: "Couleur", "Taille"
  variants: IProductVariant[]
}

interface IProductVariant {
  id?: string
  name: string          // ex: "Rouge", "32GB"
  sku?: string
  image?: string        // Image spécifique variante
  price1688?: number    // Prix spécifique
  stock?: number
}
```

### Cas d'usage
- Caméra avec option 2MP/4MP/8MP
- Disque dur 1TB/2TB/4TB
- Couleurs de boîtiers (blanc/noir)

---

## 7. Achat groupé (Group Buy)

### Mécanisme

```typescript
interface IPriceTier {
  minQty: number
  maxQty?: number
  price: number
  discount?: number
}
```

| Quantité | Prix unitaire | Réduction |
|----------|---------------|-----------|
| 1-9 | 100,000 FCFA | - |
| 10-49 | 95,000 FCFA | 5% |
| 50+ | 90,000 FCFA | 10% |

---

## 8. Points d'attention

### Ce qui est **déjà bien géré**

1. ✅ **Séparation coût réel / prix client** pour le transport
2. ✅ **Frais configurables par produit** (pas de valeur hardcodée)
3. ✅ **Fallback exchange rate** (100 FCFA/¥) si non défini
4. ✅ **Validation des imports** (poids/dimensions requis)
5. ✅ **Détection anti-bot** avec message explicite

### Ce qui peut être **amélioré**

1. 🔄 **Import Taobao** : Problème de captcha/bloquage (voir section dédiée)
2. 🔄 **Historique taux de change** : Actuellement statique (100 FCFA/¥)
3. 🔄 **Alertes fournisseurs** : Si prix 1688 change
4. 🔄 **Calcul volumétrique** : Formule standard aviation (L×l×h/5000)

---

## 9. API Routes liées

| Route | Usage |
|-------|-------|
| `GET /api/products/import?url=` | Preview import 1688/AliExpress |
| `GET /api/products/import?keyword=` | Recherche par mot-clé |
| `POST /api/products/import` | Import bulk (URLs ou items) |
| `GET /api/pricing/simulate` | Simulation pricing côté client |
| `GET /api/shipping-rates` | Récupération tarifs transport |

---

## 10. Interface Admin

### Page d'import : `/admin/import-produits`

**Fonctionnalités :**
- Recherche par mot-clé (RapidAPI/Apify)
- Import par URL (1688/AliExpress)
- Bulk import (20 URLs max)
- Preview avant import
- Mapping champs automatique

### Gestion produits : `/admin-produits`

**Configuration par produit :**
- Prix 1688 (¥)
- Taux de change personnalisé
- Frais de service (5/10/15%)
- Taux d'assurance
- Poids et dimensions
- Variant groups

---

## Annexes

### A. Calcul du volume volumétrique (aviation)

```typescript
// Formule standard IATA
const volumetricWeightKg = (lengthCm × widthCm × heightCm) / 5000

// Le transporteur facture le max entre poids réel et poids volumétrique
const billedWeight = Math.max(actualWeightKg, volumetricWeightKg)
```

### B. Taux de change dynamique

```typescript
// Recommandation : API externe pour taux CNY/FCFA
// Ex: https://api.exchangerate-api.com/v4/latest/CNY

async function getExchangeRate(): Promise<number> {
  const response = await fetch('https://api.exchangerate-api.com/v4/latest/CNY')
  const data = await response.json()
  // CNY → EUR → XOF (car pas de direct CNY/XOF)
  const cnyToEur = data.rates.EUR
  const eurToXof = 655.957  // Taux fixe
  return Math.round(cnyToEur * eurToXof)
}
```

### C. Gestion des erreurs d'import

| Code erreur | Cause | Solution |
|-------------|-------|----------|
| `CAPTCHA` | 1688/Taobao bloque | Import manuel ou Apify |
| `PREVIEW_FAILED` | Structure HTML changée | Mise à jour regex/parser |
| `NETWORK_ERROR` | Timeout/proxy | Retry avec backoff |
| `VALIDATION_ERROR` | Données incomplètes | Compléter poids/dimensions |
