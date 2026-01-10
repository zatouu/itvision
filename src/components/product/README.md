# Composants Produit - Page Détail

> Composants modulaires et réutilisables pour l'affichage des pages produit

---

## 📦 Composants disponibles

| Composant | Description | Ligne de code |
|-----------|-------------|---------------|
| **ProductGallery** | Galerie d'images avec zoom/swipe | `import { ProductGallery } from '@/components/product'` |
| **ProductPriceBlock** | Structure de prix détaillée + paliers | `import { ProductPriceBlock } from '@/components/product'` |
| **ProductInfoTabs** | Onglets d'information (desc/features/etc) | `import { ProductInfoTabs } from '@/components/product'` |
| **ProductRichDescription** | Rendu HTML enrichi sécurisé | `import { ProductRichDescription } from '@/components/product'` |

---

## 🚀 Quick Start

### Installation

```bash
npm install isomorphic-dompurify
```

### Usage basique

```tsx
import { 
  ProductGallery, 
  ProductPriceBlock, 
  ProductInfoTabs 
} from '@/components/product'

export default function ProductPage({ product }) {
  return (
    <div className="grid grid-cols-12 gap-6">
      {/* Galerie - 5 colonnes */}
      <ProductGallery
        images={product.gallery}
        productName={product.name}
        availabilityBadge={{
          status: product.availability.status,
          label: product.availability.label
        }}
        className="col-span-5"
      />

      {/* Info - 4 colonnes */}
      <div className="col-span-4">
        <h1>{product.name}</h1>
        
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
      </div>
      
      {/* Sidebar - 3 colonnes */}
      <div className="col-span-3">
        {/* ProductSidebar ou autres widgets */}
      </div>
      
      {/* Onglets pleine largeur */}
      <ProductInfoTabs
        description={product.description}
        features={product.features}
        logisticsEntries={logisticsEntries}
        className="col-span-12"
      />
    </div>
  )
}
```

---

## 📖 Documentation complète

- **Architecture:** [ARCHITECTURE_COMPOSANTS_PRODUIT.md](../../../docs/ARCHITECTURE_COMPOSANTS_PRODUIT.md)
- **Guide d'intégration:** [GUIDE_INTEGRATION_COMPOSANTS_PRODUIT.md](../../../docs/GUIDE_INTEGRATION_COMPOSANTS_PRODUIT.md)
- **État du projet:** [STATE_SNAPSHOT_GROUP_BUY.md](../../../docs/STATE_SNAPSHOT_GROUP_BUY.md)

---

## ✨ Fonctionnalités clés

### ProductGallery
- ✅ Navigation tactile (swipe mobile)
- ✅ Modal plein écran avec zoom interactif
- ✅ Navigation clavier (←→ / Escape)
- ✅ Miniatures desktop + dots mobile
- ✅ Badge disponibilité customisable

### ProductPriceBlock
- ✅ Décomposition transparente des prix (source + frais)
- ✅ Paliers de prix dégressifs automatiques
- ✅ Indicateur du palier actif
- ✅ Calcul des économies en temps réel
- ✅ Badge "MEILLEUR" sur le palier optimal

### ProductInfoTabs
- ✅ 5 onglets (description, features, logistics, support, reviews)
- ✅ Lazy loading des avis clients
- ✅ Animations Framer Motion
- ✅ Fallback gracieux si données manquantes

### ProductRichDescription
- ✅ Sanitisation XSS via DOMPurify
- ✅ Amélioration automatique du HTML (classes Tailwind)
- ✅ Composants Notice/Highlights/Testimonial
- ✅ Support Markdown (alternatif)

---

## 🎨 Personnalisation

Tous les composants acceptent une prop `className` pour personnaliser le style :

```tsx
<ProductGallery 
  className="rounded-3xl shadow-2xl" 
  {...props} 
/>

<ProductPriceBlock 
  className="mt-8 mb-4" 
  {...props} 
/>
```

---

## 🧪 Tests

```bash
# Tests unitaires (à implémenter)
npm test -- ProductGallery
npm test -- ProductPriceBlock

# Vérifier les types TypeScript
npx tsc --noEmit
```

---

## 🔄 Migration depuis ProductDetailExperience

Voir le [Guide d'Intégration](../../../docs/GUIDE_INTEGRATION_COMPOSANTS_PRODUIT.md) pour un processus étape par étape qui permet de réduire le code de ~64% (2240 → 800 lignes).

---

## 📦 Dépendances

| Package | Version | Usage |
|---------|---------|-------|
| `framer-motion` | ^11.x | Animations |
| `lucide-react` | ^0.x | Icônes |
| `isomorphic-dompurify` | ^13.x | Sanitisation HTML |
| `clsx` | ^2.x | Classes conditionnelles |

---

## 🤝 Contributing

Lors de l'ajout de nouveaux composants :
1. Créer le fichier dans `src/components/product/`
2. Exporter depuis `index.ts`
3. Documenter dans `ARCHITECTURE_COMPOSANTS_PRODUIT.md`
4. Ajouter un exemple d'usage dans ce README

---

*Dernière mise à jour: 2026-01-10*
