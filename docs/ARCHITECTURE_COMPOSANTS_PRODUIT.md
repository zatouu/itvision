# Architecture Composants Page Produit

> Date: 2026-01-10  
> Branche: `add_kafka_engine`  
> Session: Refactoring UI/UX page produit

---

## Vue d'ensemble

La page produit (`/produits/[slug]`) a été refactorisée pour séparer les responsabilités en composants modulaires et réutilisables.

### Structure des fichiers

```
src/components/
├── product/                          # ✅ NOUVEAU - Composants modulaires
│   ├── index.ts                      # Point d'entrée unifié (exports)
│   ├── ProductGallery.tsx            # Galerie d'images avec zoom/swipe
│   ├── ProductPriceBlock.tsx         # Structure de prix (source, frais, paliers)
│   ├── ProductInfoTabs.tsx           # Onglets d'information
│   └── ProductRichDescription.tsx    # Rendu HTML enrichi sécurisé
├── ProductDetailExperience.tsx       # Composant principal (à refactorer progressivement)
├── ProductSidebar.tsx                # Sidebar droite (achats groupés, promos)
└── GroupBuyProposalModal.tsx         # Modal proposition achat groupé
```

---

## Composants créés

### 1. ProductGallery

**Fichier:** `src/components/product/ProductGallery.tsx`

**Responsabilité:** Affichage et navigation des images produit

**Fonctionnalités:**
- ✅ Image principale avec badge disponibilité
- ✅ Miniatures cliquables (desktop + mobile)
- ✅ Navigation flèches au hover
- ✅ Indicateurs dots sur mobile
- ✅ **Support swipe tactile** (touch events)
- ✅ **Modal plein écran** avec navigation clavier
- ✅ **Zoom interactif** (suivre la souris)

**Props:**
```typescript
interface ProductGalleryProps {
  images: string[]                    // URLs des images
  productName: string                 // Alt text
  availabilityBadge?: {               // Badge optionnel
    status: 'in_stock' | 'preorder' | string
    label: string
  }
  selectedIndex?: number              // Contrôle externe optionnel
  onImageChange?: (index: number) => void
  className?: string
}
```

**Usage:**
```tsx
import { ProductGallery } from '@/components/product'

<ProductGallery
  images={product.gallery}
  productName={product.name}
  availabilityBadge={{
    status: product.availability.status,
    label: product.availability.label
  }}
/>
```

---

### 2. ProductPriceBlock

**Fichier:** `src/components/product/ProductPriceBlock.tsx`

**Responsabilité:** Affichage structuré des prix et paliers

**Fonctionnalités:**
- ✅ Prix source (coût fournisseur)
- ✅ Décomposition des frais (marge, service, assurance)
- ✅ Prix unitaire TTC calculé
- ✅ **Paliers de prix dégressifs** (avec badge "MEILLEUR")
- ✅ Indicateur du palier actif selon quantité
- ✅ Conseil achats en gros pour produits importés
- ✅ Sous-total dynamique

**Props:**
```typescript
interface ProductPriceBlockProps {
  baseCost: number | null             // Prix source
  salePrice: number | null            // Prix après marge
  totalWithFees: number | null        // Prix TTC
  marginRate?: number                 // Taux de marge (%)
  currency: string                    // Devise ('FCFA')
  fees?: PricingFees | null           // Détail des frais
  priceTiers?: PriceTier[]            // Paliers dégressifs
  quantity?: number                   // Quantité sélectionnée
  subtotal?: number                   // Sous-total calculé
  isImported?: boolean                // Afficher conseil import
  showTiersBlock?: boolean            // Afficher bloc paliers
  className?: string
}
```

**Usage:**
```tsx
import { ProductPriceBlock } from '@/components/product'

<ProductPriceBlock
  baseCost={product.pricing.baseCost}
  salePrice={product.pricing.salePrice}
  totalWithFees={product.pricing.totalWithFees}
  currency={product.pricing.currency}
  fees={product.pricing.fees}
  priceTiers={product.priceTiers}
  quantity={quantity}
  isImported={product.isImported}
/>
```

---

### 3. ProductInfoTabs

**Fichier:** `src/components/product/ProductInfoTabs.tsx`

**Responsabilité:** Onglets d'information produit

**Onglets disponibles:**
| ID | Label | Contenu |
|----|-------|---------|
| `description` | Description | HTML/prose du produit |
| `features` | Caractéristiques | Liste de features avec checkmarks |
| `logistics` | Logistique | Specs techniques (poids, volume, etc.) |
| `support` | Garantie & SAV | Informations de support |
| `reviews` | Avis clients | Notes et commentaires |

**Props:**
```typescript
interface ProductInfoTabsProps {
  description?: string | null         // HTML brut
  features?: string[]                 // Liste features
  logisticsEntries?: LogisticsEntry[] // Specs techniques
  reviews?: Review[]                  // Avis pré-chargés
  onLoadReviews?: () => Promise<Review[]>  // Chargement lazy
  averageRating?: number              // Note moyenne
  defaultTab?: InfoTabId              // Onglet initial
  onTabChange?: (tab: InfoTabId) => void
  className?: string
}
```

**Usage:**
```tsx
import { ProductInfoTabs } from '@/components/product'

<ProductInfoTabs
  description={product.description}
  features={product.features}
  logisticsEntries={logisticsEntries}
  defaultTab="description"
/>
```

---

### 4. ProductRichDescription

**Fichier:** `src/components/product/ProductRichDescription.tsx`

**Responsabilité:** Rendu sécurisé et enrichi du contenu HTML

**Fonctionnalités:**
- ✅ **Sanitisation XSS** via `isomorphic-dompurify`
- ✅ Amélioration automatique des éléments HTML (liens, images, tables)
- ✅ Composant Notice (info, warning, success, tip)
- ✅ Composant Testimonial (citation client)
- ✅ Composant Highlights (points clés)

**Props:**
```typescript
interface ProductRichDescriptionProps {
  html?: string | null                // Contenu HTML brut
  markdown?: string | null            // Alternative Markdown
  highlights?: string[]               // Points clés
  notice?: {                          // Avertissement
    type: 'info' | 'warning' | 'success' | 'tip'
    message: string
  }
  testimonial?: {                     // Citation client
    text: string
    author: string
    role?: string
  }
  compact?: boolean                   // Mode compact
  className?: string
}
```

**Usage:**
```tsx
import { ProductRichDescription } from '@/components/product'

<ProductRichDescription
  html={product.description}
  highlights={['Garantie 2 ans', 'Installation incluse']}
  notice={{ type: 'tip', message: 'Commandez avant 14h pour livraison demain' }}
/>
```

---

## Imports recommandés

### Import groupé (recommandé)

```tsx
import { 
  ProductGallery, 
  ProductPriceBlock, 
  ProductInfoTabs,
  ProductRichDescription 
} from '@/components/product'
```

### Import individuel

```tsx
import ProductGallery from '@/components/product/ProductGallery'
```

---

## Dépendances ajoutées

| Package | Version | Usage |
|---------|---------|-------|
| `isomorphic-dompurify` | ^13.x | Sanitisation HTML XSS-safe |

---

## Migration progressive

Le fichier `ProductDetailExperience.tsx` (2240 lignes) n'a **pas été modifié** pour éviter les régressions. Les nouveaux composants peuvent être intégrés progressivement :

### Phase 1 (actuelle) ✅
- Créer les composants modulaires dans `src/components/product/`
- Tester indépendamment
- Documenter les APIs

### Phase 2 (à faire)
- Remplacer la galerie dans `ProductDetailExperience` par `<ProductGallery>`
- Remplacer le bloc prix par `<ProductPriceBlock>`
- Remplacer les onglets par `<ProductInfoTabs>`

### Phase 3 (futur)
- Supprimer le code dupliqué dans `ProductDetailExperience`
- Réduire le fichier à ~500 lignes (orchestration uniquement)

---

## Prochaines étapes suggérées

1. **Intégrer ProductGallery** dans `ProductDetailExperience.tsx`
2. **Créer ProductGroupBuyBlock** (extraire le bloc achat groupé)
3. **Créer ProductInstallationRequest** (extraire le formulaire installation)
4. **API Reviews** : Connecter `onLoadReviews` à une vraie API
5. **Tests unitaires** : Ajouter des tests pour chaque composant

---

*Documentation générée le 2026-01-10*
