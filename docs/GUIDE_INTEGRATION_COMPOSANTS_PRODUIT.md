# Guide d'Intégration des Composants Produit

> Guide pratique pour migrer `ProductDetailExperience.tsx` vers l'architecture modulaire

---

## Objectif

Remplacer progressivement le code monolithique de `ProductDetailExperience.tsx` (2240 lignes) par les composants modulaires créés dans `src/components/product/`.

**Bénéfices attendus:**
- ✅ Réduction de ~70% du code dans ProductDetailExperience
- ✅ Réutilisabilité des composants dans d'autres pages
- ✅ Meilleure maintenabilité et testabilité
- ✅ Performance améliorée (lazy loading possible)

---

## Migration par étapes

### Étape 1 : Galerie d'images (5 minutes)

**Avant (lignes 177-247 dans ProductDetailExperience.tsx):**
```tsx
// Bloc complet avec state, miniatures, modal, etc.
<div className="lg:col-span-5 space-y-4">
  <div className="relative aspect-[4/3]...">
    {/* 70 lignes de code */}
  </div>
  {gallery.length > 1 && (
    <div className="flex gap-3...">
      {/* Miniatures */}
    </div>
  )}
</div>
```

**Après:**
```tsx
import { ProductGallery } from '@/components/product'

<ProductGallery
  images={gallery}
  productName={product.name}
  availabilityBadge={{
    status: product.availability.status,
    label: product.availability.label
  }}
  selectedIndex={activeImageIndex}
  onImageChange={setActiveImageIndex}
  className="lg:col-span-5"
/>
```

**À supprimer:**
- State `showImageModal`, `activeImageIndex`
- Handlers `handleKeyDown` pour modal
- Tout le JSX de la galerie et du modal

**Économie:** ~150 lignes

---

### Étape 2 : Bloc de prix (10 minutes)

**Avant (lignes 300-500):**
```tsx
{/* BLOC PRIX INDIVIDUEL */}
<div className="mt-6 relative">
  <div className="absolute -top-3 left-4...">
    💳 PRIX INDIVIDUEL
  </div>
  <div className="rounded-2xl...">
    {/* Structure de prix détaillée */}
    {/* Paliers de prix */}
    {/* Conseil achats en gros */}
  </div>
</div>

{/* BLOC PALIERS DE PRIX */}
{product.priceTiers && (
  <motion.div...>
    {/* 80 lignes de grille paliers */}
  </motion.div>
)}
```

**Après:**
```tsx
import { ProductPriceBlock } from '@/components/product'

<ProductPriceBlock
  baseCost={product.pricing.baseCost}
  salePrice={product.pricing.salePrice}
  totalWithFees={product.pricing.totalWithFees}
  marginRate={product.pricing.marginRate}
  currency={product.pricing.currency}
  fees={product.pricing.fees}
  priceTiers={product.priceTiers}
  quantity={hasVariantSelection ? totalVariantQuantity : quantity}
  subtotal={displayedSubtotal}
  isImported={product.isImported}
  showTiersBlock={!product.groupBuyEnabled}
/>
```

**À supprimer:**
- Tout le JSX du bloc prix individuel
- Tout le JSX des paliers de prix
- Logique de calcul des économies (déléguée au composant)

**Économie:** ~200 lignes

---

### Étape 3 : Onglets d'information (8 minutes)

**Avant (lignes 1900-2100):**
```tsx
{/* Onglets d'information */}
<div className="mt-12">
  <div className="flex flex-wrap gap-2...">
    {/* Navigation onglets */}
  </div>
  <div className="bg-white rounded-2xl...">
    <AnimatePresence mode="wait">
      {activeTab === 'description' && (
        <motion.div...>
          {/* Contenu description */}
        </motion.div>
      )}
      {/* 4 autres onglets */}
    </AnimatePresence>
  </div>
</div>
```

**Après:**
```tsx
import { ProductInfoTabs } from '@/components/product'

<ProductInfoTabs
  description={product.description}
  features={product.features}
  logisticsEntries={logisticsEntries}
  defaultTab="description"
  className="mt-12"
/>
```

**À supprimer:**
- State `activeTab`, `reviews`, `reviewsLoading`, `averageRating`
- Type `InfoTab`
- Tous les onglets et leur contenu
- Hook `useEffect` pour charger les avis

**Économie:** ~300 lignes

---

### Étape 4 : Description enrichie (optionnel, 5 minutes)

Si vous souhaitez améliorer le rendu HTML de la description, remplacez dans `ProductInfoTabs`:

**Dans le composant DescriptionTab:**
```tsx
import { ProductRichDescription } from '@/components/product'

function DescriptionTab({ description }: { description?: string | null }) {
  return (
    <ProductRichDescription
      html={description}
      highlights={[
        'Garantie constructeur incluse',
        'Installation professionnelle disponible',
        'Support IT Vision 7j/7'
      ]}
      notice={{
        type: 'tip',
        message: 'Commandez avant 14h pour livraison express possible'
      }}
    />
  )
}
```

---

## Checklist de migration

### Préparation
- [ ] Créer une branche `refactor/product-ui-components`
- [ ] Sauvegarder `ProductDetailExperience.tsx` en `.backup`
- [ ] Installer `isomorphic-dompurify` (déjà fait)

### Migration galerie
- [ ] Importer `ProductGallery`
- [ ] Remplacer le JSX de la galerie
- [ ] Supprimer states et handlers obsolètes
- [ ] Tester swipe mobile
- [ ] Tester modal zoom et navigation clavier

### Migration prix
- [ ] Importer `ProductPriceBlock`
- [ ] Remplacer les blocs prix individuels et paliers
- [ ] Supprimer JSX obsolète
- [ ] Tester changement de quantité
- [ ] Vérifier calcul paliers automatique

### Migration onglets
- [ ] Importer `ProductInfoTabs`
- [ ] Remplacer tout le bloc onglets
- [ ] Supprimer states et types obsolètes
- [ ] Tester navigation entre onglets
- [ ] Vérifier chargement avis

### Validation finale
- [ ] Build sans erreur : `npm run build`
- [ ] Vérifier toutes les fonctionnalités
- [ ] Comparer taille bundle (webpack analyzer)
- [ ] Tests visuels sur mobile/desktop
- [ ] Commit avec message descriptif

---

## Commandes utiles

```bash
# Vérifier les imports non utilisés
npx eslint src/components/ProductDetailExperience.tsx --fix

# Compter les lignes avant/après
wc -l src/components/ProductDetailExperience.tsx

# Build pour vérifier
npm run build

# Analyser le bundle
npm run build -- --analyze
```

---

## Résultat attendu

### Avant (structure actuelle)
```
ProductDetailExperience.tsx  (~2240 lignes)
├── State management (50 lignes)
├── Galerie images (150 lignes)
├── Prix & paliers (200 lignes)
├── Variantes (100 lignes)
├── Actions panier (150 lignes)
├── Bloc achat groupé (200 lignes)
├── Installation (250 lignes)
├── Onglets info (300 lignes)
├── Produits similaires (100 lignes)
├── Modals (200 lignes)
└── Handlers divers (540 lignes)
```

### Après (structure cible)
```
ProductDetailExperience.tsx  (~800 lignes)
├── State management (30 lignes)
├── <ProductGallery /> (3 lignes)
├── <ProductPriceBlock /> (10 lignes)
├── Variantes (100 lignes) - à extraire prochainement
├── Actions panier (150 lignes)
├── <ProductGroupBuyBlock /> (5 lignes) - à créer
├── <ProductInstallationRequest /> (5 lignes) - à créer
├── <ProductInfoTabs /> (5 lignes)
├── Produits similaires (100 lignes) - à extraire
├── Modals (200 lignes)
└── Handlers divers (192 lignes)
```

**Réduction:** ~1440 lignes (-64%)

---

## Support

En cas de problème lors de la migration :
1. Consulter `docs/ARCHITECTURE_COMPOSANTS_PRODUIT.md`
2. Vérifier les types exportés depuis `src/components/product/index.ts`
3. Comparer avec le code original dans `.backup`
4. Rollback avec `git checkout src/components/ProductDetailExperience.tsx`

---

*Guide créé le 2026-01-10 - Basé sur l'architecture modulaire v1*
