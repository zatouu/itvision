# Audit Complet - Gestion des Produits

## 📋 Résumé Exécutif

Le système de gestion des produits est structuré en deux parties principales :
- **Backend** : APIs REST avec MongoDB/Mongoose pour la gestion CRUD et le calcul de pricing
- **Frontend** : Interface admin pour la gestion et interface client pour le catalogue

Le système supporte les produits standards et les produits importés depuis 1688 avec un système de pricing avancé incluant transport, commissions et marges.

---

## 🔧 BACKEND

### 1. Modèle de Données (`src/lib/models/Product.ts`)

#### Structure Principale
```typescript
interface IProduct {
  // Informations de base
  name: string (requis)
  category?: string
  description?: string
  tagline?: string
  
  // Pricing standard
  price?: number
  baseCost?: number
  marginRate?: number (défaut: 25%)
  currency?: string (défaut: 'Fcfa')
  
  // Médias
  image?: string
  gallery?: string[]
  
  // Caractéristiques
  features?: string[]
  colorOptions?: string[]
  variantOptions?: string[]
  
  // Disponibilité
  requiresQuote?: boolean
  stockStatus?: 'in_stock' | 'preorder' (défaut: 'preorder')
  stockQuantity?: number
  leadTimeDays?: number (défaut: 15)
  deliveryDays?: number
  availabilityNote?: string
  
  // Logistique
  weightKg?: number
  lengthCm?: number
  widthCm?: number
  heightCm?: number
  volumeM3?: number
  packagingWeightKg?: number
  
  // Sourcing
  sourcing?: {
    platform?: string (1688, AliExpress, Alibaba, Taobao, factory)
    supplierName?: string
    supplierContact?: string
    productUrl?: string
    notes?: string
  }
  
  // Informations 1688 (NOUVEAU)
  price1688?: number // Prix en Yuan (¥)
  price1688Currency?: string (défaut: 'CNY')
  exchangeRate?: number (défaut: 100, soit 1¥ = 100 FCFA)
  serviceFeeRate?: number // 5%, 10%, ou 15%
  insuranceRate?: number // Pourcentage d'assurance
  
  // Transport personnalisé
  shippingOverrides?: Array<{
    methodId: string
    ratePerKg?: number
    ratePerM3?: number
    flatFee?: number
  }>
  
  // Publication
  isPublished?: boolean (défaut: true)
  isFeatured?: boolean (défaut: false)
  
  // Timestamps
  createdAt: Date
  updatedAt: Date
}
```

### 2. APIs Backend

#### A. API Admin - Gestion Produits (`/api/products`)

**Fichier** : `src/app/api/products/route.ts`

**Endpoints** :
- `GET /api/products?search=&category=&limit=20&skip=0`
  - Rôle requis : ADMIN ou PRODUCT_MANAGER
  - Retourne : Liste paginée de produits
  - Filtres : recherche par nom, catégorie
  
- `POST /api/products`
  - Rôle requis : ADMIN ou PRODUCT_MANAGER
  - Crée un nouveau produit
  - Validation : `name` requis
  
- `PATCH /api/products`
  - Rôle requis : ADMIN ou PRODUCT_MANAGER
  - Met à jour un produit existant
  - Requiert : `id` dans le body
  
- `DELETE /api/products?id=`
  - Rôle requis : ADMIN ou PRODUCT_MANAGER
  - Supprime un produit

**Fonctionnalités** :
- Normalisation automatique des données
- Support des champs 1688 (price1688, exchangeRate, serviceFeeRate, insuranceRate)
- Gestion des tableaux (features, gallery, colorOptions, etc.)
- Validation et parsing des nombres

#### B. API Catalog - Affichage Client (`/api/catalog/products`)

**Fichier** : `src/app/api/catalog/products/route.ts`

**Endpoints** :
- `GET /api/catalog/products?page=1&limit=24`
  - Public (pas d'authentification)
  - Retourne : Produits publiés uniquement
  - Tri : Featured d'abord, puis par date
  - Inclut : Pricing calculé, options de transport, informations 1688

**Fichier** : `src/app/api/catalog/products/[id]/route.ts`

**Endpoints** :
- `GET /api/catalog/products/[id]`
  - Public
  - Retourne : Détails complets d'un produit + produits similaires
  - Format : `formatProductDetail()` avec pricing1688

#### C. API Import Produits (`/api/products/import`)

**Fichier** : `src/app/api/products/import/route.ts`

**Endpoints** :
- `GET /api/products/import?q=searchTerm`
  - Rôle requis : ADMIN ou PRODUCT_MANAGER
  - Recherche sur AliExpress via RapidAPI
  - Retourne : Liste de produits AliExpress normalisés
  
- `POST /api/products/import`
  - Rôle requis : ADMIN ou PRODUCT_MANAGER
  - Importe un produit depuis AliExpress
  - Conversion USD → FCFA automatique
  - Création du produit dans la base

**Fonctionnalités** :
- Intégration AliExpress DataHub API
- Conversion de devises (USD → FCFA)
- Normalisation des données
- Extraction des caractéristiques

#### D. API Pricing Simulation (`/api/pricing/simulate`)

**Fichier** : `src/app/api/pricing/simulate/route.ts`

**Endpoints** :
- `POST /api/pricing/simulate`
  - Public (utilisé côté client et admin)
  - Calcule le pricing complet d'un produit 1688
  - Paramètres :
    - `productId` (optionnel) ou `price1688`/`baseCost`
    - `shippingMethod` (air_express, air_15, sea_freight)
    - `weightKg` ou `volumeM3`
    - `serviceFeeRate`, `insuranceRate`
    - `orderQuantity`, `monthlyVolume` (pour projections)
  
  - Retourne :
    - Coûts réels (produit, transport, frais)
    - Prix facturé client
    - Marges (transport, nette, %)
    - Projections (marge cumulée, bénéfice mensuel)

- `GET /api/pricing/simulate`
  - Documentation de l'API

#### E. API Installations (`/api/products/installations`)

**Fichier** : `src/app/api/products/installations/route.ts`

**Endpoints** :
- `POST /api/products/installations`
  - Crée une demande d'installation
  - Marketplace techniciens

### 3. Utilitaires Backend

#### A. Calcul de Pricing (`src/lib/logistics.ts`)

**Fonction principale** : `computeProductPricing(product)`

**Fonctionnalités** :
- Calcul du prix de vente (baseCost + marge)
- Calcul des options de transport :
  - Express (3 jours) : 12 000 CFA/kg
  - Fret aérien (6-10 jours) : 8 000 CFA/kg
  - Maritime (50-60 jours) : 145 000 CFA/m³
- Support des overrides personnalisés par produit
- Calcul automatique du volume depuis dimensions
- Gestion du statut stock (in_stock = pas de transport)

**Taux de transport** :
- **Coûts réels** (internes) : `REAL_SHIPPING_COSTS`
  - Express : 11 000 CFA/kg
  - Aérien : 7 500 CFA/kg
  - Maritime : 135 000 CFA/m³
- **Prix clients** : `BASE_SHIPPING_RATES`
  - Express : 12 000 CFA/kg
  - Aérien : 8 000 CFA/kg
  - Maritime : 145 000 CFA/m³

#### B. Pricing 1688 (`src/lib/pricing1688.ts`)

**Fonction principale** : `simulatePricing1688(input)`

**Calculs effectués** :
1. Coût produit en FCFA (price1688 × exchangeRate)
2. Coût transport réel
3. Frais de service (coût produit × serviceFeeRate%)
4. Frais d'assurance (coût total × insuranceRate%)
5. Coût total réel
6. Prix transport déclaré client
7. Prix total facturé client
8. Marge nette et pourcentage
9. Projections (marge cumulée, bénéfice mensuel)

#### C. Formatage Catalog (`src/lib/catalog-format.ts`)

**Fonctions** :
- `formatProductDetail(product)` : Format pour page détail
- `formatSimilarProducts(products)` : Format pour produits similaires

**Inclut** :
- Normalisation des galeries
- Calcul du pricing
- Formatage des informations 1688
- Structure standardisée pour le frontend

---

## 🎨 FRONTEND

### 1. Pages Client

#### A. Catalogue Produits (`/produits`)

**Fichier** : `src/app/produits/page.tsx`

**Fonctionnalités** :
- Affichage en grille ou liste
- Recherche en temps réel (debounced)
- Filtres :
  - Catégorie
  - Disponibilité (en stock / sur commande)
  - Prix (min/max)
  - Délai de livraison
  - Avec prix / Sur devis uniquement
- Tri :
  - Par défaut (featured d'abord)
  - Prix croissant/décroissant
  - Nom A-Z
  - Note décroissante
- Comparaison de produits
- Favoris (localStorage)
- Pagination infinie
- Produits de fallback en cas d'erreur API

**Composants utilisés** :
- `ProductCard` : Carte produit
- `CartIcon` : Icône panier
- `CartDrawer` : Panier latéral

#### B. Détail Produit (`/produits/[id]`)

**Fichier** : `src/app/produits/[id]/page.tsx`

**Fonctionnalités** :
- Page serveur (SSR) avec metadata SEO
- Récupération produit + similaires
- Affichage via `ProductDetailExperience`

#### C. Favoris (`/produits/favoris`)

**Fichier** : `src/app/produits/favoris/page.tsx`

**Fonctionnalités** :
- Liste des produits favoris (localStorage)
- Affichage en grille

#### D. Comparaison (`/produits/compare`)

**Fichier** : `src/app/produits/compare/page.tsx`

**Fonctionnalités** :
- Comparaison côte à côte de produits

### 2. Composants Client

#### A. ProductCard (`src/components/ProductCard.tsx`)

**Props** :
```typescript
{
  name: string
  model?: string
  price?: string
  priceAmount?: number
  currency?: string
  requiresQuote?: boolean
  deliveryDays?: number
  features: string[]
  rating: number
  images: string[]
  shippingOptions?: ShippingOption[]
  availabilityStatus?: 'in_stock' | 'preorder'
  detailHref?: string
  isNew?: boolean
  isPopular?: boolean
  createdAt?: string
  onCompareToggle?: (productId, isSelected) => void
  isComparing?: boolean
}
```

**Fonctionnalités** :
- Galerie d'images avec navigation
- Badges (NOUVEAU, EN STOCK)
- Favoris (localStorage)
- Sélection méthode de transport (si preorder)
- Calcul prix total dynamique
- Ajout au panier
- Lien WhatsApp pour devis
- Comparaison de produits

#### B. ProductDetailExperience (`src/components/ProductDetailExperience.tsx`)

**Props** :
```typescript
{
  product: ProductDetailData
  similar: SimilarProductSummary[]
}
```

**Fonctionnalités** :
- Galerie d'images avec zoom modal
- Sélection couleur/variante
- Sélection méthode de transport
- Quantité
- Ajout au panier
- Demande de devis WhatsApp
- Négociation de tarif
- Installation & marketplace
- Onglets d'information :
  - Description
  - Caractéristiques
  - Logistique
  - Support
  - Avis
- Produits similaires
- Partage social
- Export PDF
- Favoris

**Intégration 1688** :
- Affichage conditionnel de `ProductPricing1688` si `product.pricing1688` existe

#### C. ProductPricing1688 (`src/components/ProductPricing1688.tsx`)

**Props** :
```typescript
{
  productId?: string
  pricing1688: Pricing1688Info | null
  weightKg?: number | null
  volumeM3?: number | null
  baseCost?: number | null
}
```

**Fonctionnalités** :
- Affichage "Prix d'origine" (au lieu de "Prix 1688")
- Prix direct en Yuan
- Taux de change
- Coût produit calculé
- Sélection méthode de transport
- Calcul du prix total via API
- Affichage détaillé :
  - Coûts (produit, transport, frais)
  - Prix client
  - Marges

### 3. Pages Admin

#### A. Gestion Produits (`/admin/produits`)

**Fichier** : `src/app/admin/produits/page.tsx`

**Fonctionnalités** :
- Accès restreint (ADMIN ou PRODUCT_MANAGER)
- Interface via `AdminProductManager`

#### B. Catalog Admin (`/admin/catalog`)

**Fichier** : `src/app/admin/catalog/page.tsx`

**Fonctionnalités** :
- Gestion du catalogue

### 4. Composants Admin

#### A. AdminProductManager (`src/components/AdminProductManager.tsx`)

**Fonctionnalités** :
- Liste des produits avec recherche/filtres
- CRUD complet (Create, Read, Update, Delete)
- Onglets d'édition :
  1. **Fiche produit** : Nom, description, catégorie, points clés, options
  2. **Détails & logistique** : Dimensions, poids, volume, disponibilité, sourcing
  3. **Médias** : Image principale, galerie
  4. **Tarifs & livraison** :
     - Pricing standard (prix, coût, marge)
     - **Section 1688** : Prix 1688, taux de change, frais service/assurance
     - **Simulateur de pricing** : Calcul automatique avec projections
     - Overrides transport par méthode
  5. **Import express** : Recherche et import AliExpress

**Fonctionnalités avancées** :
- Calcul automatique du prix (baseCost + marge)
- Upload d'images
- Import depuis AliExpress
- Simulateur de pricing 1688 intégré
- Validation des données

#### B. PricingSimulator (intégré dans AdminProductManager)

**Fonctionnalités** :
- Sélection méthode de transport
- Quantité de commande
- Volume mensuel moyen
- Calcul via API `/api/pricing/simulate`
- Affichage :
  - Détail des coûts
  - Prix client
  - Marges & projections

#### C. ProductAdminInterface (`src/components/ProductAdminInterface.tsx`)

**Fonctionnalités** :
- Interface alternative de gestion produits
- Gestion des catégories
- Gestion des fournisseurs
- Historique des prix

#### D. DynamicProductManager (`src/components/DynamicProductManager.tsx`)

**Fonctionnalités** :
- Gestion produits avec localStorage
- Provider React Context
- Produits par défaut

#### E. ServiceProductCatalog (`src/components/ServiceProductCatalog.tsx`)

**Fonctionnalités** :
- Catalogue de produits par service
- Intégration avec système de devis

---

## 🔄 FLUX DE DONNÉES

### 1. Création/Modification Produit (Admin)

```
AdminProductManager
  ↓ (POST/PATCH)
/api/products
  ↓ (buildProductPayload)
Validation & Normalisation
  ↓
MongoDB (Product Model)
  ↓
Retour produit créé/modifié
```

### 2. Affichage Catalogue (Client)

```
/produits
  ↓ (GET)
/api/catalog/products
  ↓ (computeProductPricing)
Calcul pricing + transport
  ↓
Formatage données
  ↓
Affichage ProductCard
```

### 3. Détail Produit (Client)

```
/produits/[id]
  ↓ (SSR)
Product.findById(id)
  ↓ (formatProductDetail)
Formatage + pricing1688
  ↓
ProductDetailExperience
  ↓ (si pricing1688)
ProductPricing1688
  ↓ (POST)
/api/pricing/simulate
  ↓
Calcul pricing complet
```

### 4. Simulation Pricing (Admin/Client)

```
PricingSimulator / ProductPricing1688
  ↓ (POST)
/api/pricing/simulate
  ↓ (simulatePricing1688)
Calculs :
  - Coût produit
  - Transport réel vs client
  - Frais service/assurance
  - Marges
  - Projections
  ↓
Affichage breakdown
```

---

## 📊 FONCTIONNALITÉS PAR CATÉGORIE

### ✅ Gestion Standard
- [x] CRUD produits
- [x] Upload images
- [x] Galerie multiple
- [x] Catégories
- [x] Caractéristiques
- [x] Options couleur/variante
- [x] Gestion stock
- [x] Pricing avec marge
- [x] Transport personnalisé

### ✅ Import 1688
- [x] Prix en Yuan
- [x] Taux de change configurable
- [x] Frais de service (5%, 10%, 15%)
- [x] Frais d'assurance
- [x] Calcul automatique baseCost
- [x] Simulateur de pricing
- [x] Affichage côté client

### ✅ Transport & Logistique
- [x] 3 méthodes : Express, Aérien, Maritime
- [x] Calcul automatique (poids/volume)
- [x] Overrides par produit
- [x] Coûts réels vs prix clients
- [x] Marges sur transport

### ✅ Interface Client
- [x] Catalogue avec filtres
- [x] Recherche
- [x] Comparaison
- [x] Favoris
- [x] Panier
- [x] Détail produit complet
- [x] Calcul pricing 1688
- [x] Sélection transport

### ✅ Interface Admin
- [x] Gestion complète produits
- [x] Import AliExpress
- [x] Simulateur pricing
- [x] Upload médias
- [x] Validation données

---

## 🔐 SÉCURITÉ & PERMISSIONS

### APIs Admin
- **Authentification** : JWT token (cookie ou header)
- **Rôles requis** : ADMIN ou PRODUCT_MANAGER
- **Endpoints protégés** :
  - `/api/products/*` (sauf GET catalog)
  - `/api/products/import/*`
  - `/api/products/installations`

### APIs Publiques
- `/api/catalog/products/*` : Accès public
- `/api/pricing/simulate` : Accès public (calcul uniquement)

---

## 📈 STATISTIQUES & MÉTRIQUES

### Modèle Product
- **Champs** : ~30 champs principaux
- **Relations** : Aucune (document standalone)
- **Index** : `category`, `name` (via recherche)

### APIs
- **Endpoints admin** : 4 (GET, POST, PATCH, DELETE)
- **Endpoints catalog** : 2 (liste, détail)
- **Endpoints pricing** : 1 (simulation)
- **Endpoints import** : 2 (recherche, import)

### Composants
- **Composants client** : 3 principaux (ProductCard, ProductDetailExperience, ProductPricing1688)
- **Composants admin** : 1 principal (AdminProductManager) + 3 alternatifs

---

## 🚀 POINTS FORTS

1. **Architecture modulaire** : Séparation claire backend/frontend
2. **Pricing avancé** : Calcul automatique avec marges et projections
3. **Support 1688** : Système complet d'import et pricing
4. **Transport flexible** : 3 méthodes avec overrides
5. **Interface riche** : Admin complète + Client moderne
6. **Performance** : SSR pour détails, pagination, lazy loading
7. **UX** : Filtres, recherche, comparaison, favoris

---

## ⚠️ POINTS D'AMÉLIORATION POTENTIELS

1. **Cache** : Pas de cache API (considérer Redis)
2. **Images** : Pas de CDN configuré
3. **Recherche** : Recherche basique (considérer Elasticsearch)
4. **Validation** : Validation côté client à renforcer
5. **Tests** : Pas de tests unitaires/intégration
6. **Documentation API** : Swagger/OpenAPI à ajouter
7. **Analytics** : Tracking produits à améliorer
8. **Stock** : Gestion stock avancée (alertes, historique)

---

## 📝 NOTES TECHNIQUES

### Technologies
- **Backend** : Next.js API Routes, MongoDB/Mongoose
- **Frontend** : React, Next.js, TypeScript
- **Styling** : Tailwind CSS
- **State** : React hooks, localStorage
- **Auth** : JWT

### Dépendances Clés
- `mongoose` : ODM MongoDB
- `next` : Framework React
- `lucide-react` : Icônes
- `framer-motion` : Animations

---

**Date de l'audit** : 2024
**Version** : 1.0

