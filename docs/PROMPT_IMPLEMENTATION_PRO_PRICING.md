# PROMPT D'IMPLÉMENTATION — Système Pro/Revendeur & Pricing Retail/Wholesale
## ITVision Marketplace — Refactoring cohérent de l'existant

---

## STATUT D'AVANCEMENT

| Tâche | Description | Statut |
|-------|-------------|--------|
| 1 | Refactoring `tiered-pricing.ts` — suppression tier 0% | ✅ FAIT |
| 2 | Ajout `marketplaceTier` + stats sur `User.ts` | ✅ FAIT |
| 3 | Création `resolve-product-price.ts` | ✅ FAIT |
| 8 | `marketplaceTier` dans JWT (`login/route.ts` + `auth-server.ts`) | ✅ FAIT |
| 4 | Activer `b2bPrice` dans `cart-calculator.ts` + `api/order/route.ts` + `Order.ts` + stats user | ✅ FAIT |
| 5 | Affichage UI 2 prix (`ProductDetail1688`, `ProductCard`, `catalog-format`, `produits/page`) | ✅ FAIT |
| 6 | Section Pro sur `/compte/profil` + `POST /api/client/request-pro` + API profil étendue | ✅ FAIT |
| 7 | Page admin `/admin/marketplace/comptes-pro` + `PUT` + `GET` APIs marketplace | ✅ FAIT |

---

## CONTEXTE ET ANALYSE DE L'EXISTANT

Tu travailles sur le codebase ITVision (Next.js 14 App Router, MongoDB/Mongoose, TypeScript strict, Tailwind CSS, charte graphique green/violet).

**Ce qui existe mais est incohérent ou orphelin :**

- `Product.b2bPrice` (`/src/lib/models/Product.ts` ligne 35) — champ "Prix entreprise en FCFA" présent sur le modèle mais **jamais utilisé dans le panier ni dans l'API order**. Dead field à activer.
- `QUANTITY_TIERS` (`/src/lib/pricing/tiered-pricing.ts`) — le tier `5-19 produits` a `discountPercent: 0` (aucune réduction, inutile). À supprimer.
- `Product.priceTiers[]` — utilisé uniquement pour les group orders. **Ne pas modifier**, laisser intact.
- `tiered-service-fees.ts` — paliers de frais de service (10%→5% selon montant). Fonctionnel. **Ne pas modifier**.
- `pricing1688.refactored.ts` `DYNAMIC_MARGIN_TIERS` — simulateur admin uniquement. **Ne pas modifier**.
- `User.role` — pas de concept de tier marketplace. À étendre sans casser l'existant.

---

## TÂCHE 1 — Refactoring `tiered-pricing.ts`

**Fichier** : `/src/lib/pricing/tiered-pricing.ts`

Supprimer le tier `5-19 produits (0%)` et démarrer les réductions à 20 pièces.
La logique wholesale 5+ pièces passe désormais par `b2bPrice`, pas par un pourcentage de réduction.

```typescript
// REMPLACER QUANTITY_TIERS par :
export const QUANTITY_TIERS: TierPricing[] = [
  { minQuantity: 20, maxQuantity: 49, discountPercent: 5,  label: '20-49 produits' },
  { minQuantity: 50, maxQuantity: 99, discountPercent: 10, label: '50-99 produits' },
  { minQuantity: 100,                 discountPercent: 15, label: '100+ produits'  }
]
```

Dans `getTierForQuantity`, mettre à jour le commentaire : le seuil minimum pour les réductions passe de 5 à 20.

---

## TÂCHE 2 — Ajouter `marketplaceTier` sur le modèle User

**Fichier** : `/src/lib/models/User.ts`

Ajouter dans `IUser` (après le champ `role`) :
```typescript
marketplaceTier?: 'standard' | 'pro' | 'reseller' | 'partner'
proRequestedAt?: Date
proValidatedAt?: Date
totalMarketplacePurchases?: number  // Cumul FCFA achats marketplace
marketplaceOrderCount?: number      // Nombre total de commandes passées
```

Ajouter dans `UserSchema` (après `role`) :
```typescript
marketplaceTier: {
  type: String,
  enum: ['standard', 'pro', 'reseller', 'partner'],
  default: 'standard',
  index: true
},
proRequestedAt: { type: Date },
proValidatedAt: { type: Date },
totalMarketplacePurchases: { type: Number, default: 0 },
marketplaceOrderCount: { type: Number, default: 0 },
```

**Règles métier des tiers :**
- `standard` : prix retail (`price`) affiché. Prix wholesale (`b2bPrice`) activé automatiquement si `qty >= 5` dans le panier.
- `pro` : prix wholesale automatique dès 1 pièce. Frais de service plafonnés à 8%. Facturation B2B auto.
- `reseller` : prix wholesale dès 1 pièce. Frais de service plafonnés à 5%. Facturation B2B.
- `partner` : même que reseller + crédit marchand + support prioritaire.

---

## TÂCHE 3 — Utilitaire `resolve-product-price.ts`

**Créer** : `/src/lib/pricing/resolve-product-price.ts`

```typescript
/**
 * Résout le prix applicable pour un produit selon la quantité et le tier du compte.
 * Priorité : tier Pro/Reseller/Partner → b2bPrice ; Standard qty>=5 → b2bPrice ; sinon price retail.
 */
export type MarketplaceTier = 'standard' | 'pro' | 'reseller' | 'partner'

export function resolveProductPrice(params: {
  price: number
  b2bPrice?: number
  qty: number
  marketplaceTier?: MarketplaceTier
}): {
  appliedPrice: number
  priceType: 'retail' | 'wholesale'
  wholesaleEligible: boolean
  savingsPercent: number
} {
  const { price, b2bPrice, qty, marketplaceTier = 'standard' } = params

  const isProAccount = marketplaceTier !== 'standard'
  const isWholesaleQty = qty >= 5
  const hasWholesalePrice = typeof b2bPrice === 'number' && b2bPrice > 0 && b2bPrice < price

  const wholesaleEligible = hasWholesalePrice && (isProAccount || isWholesaleQty)
  const appliedPrice = wholesaleEligible ? b2bPrice! : price
  const savingsPercent = wholesaleEligible && price > 0
    ? Math.round((1 - b2bPrice! / price) * 100)
    : 0

  return {
    appliedPrice,
    priceType: wholesaleEligible ? 'wholesale' : 'retail',
    wholesaleEligible,
    savingsPercent
  }
}
```

---

## TÂCHE 4 — Activer `b2bPrice` dans le panier et l'API order

### 4a. `cart-calculator.ts`

**Fichier** : `/src/lib/pricing/cart-calculator.ts`

Dans l'interface `CartItem`, ajouter :
```typescript
b2bPrice?: number
marketplaceTier?: MarketplaceTier
```

Dans la boucle de calcul du `supplierCost` (section "Coût fournisseur"), remplacer le calcul par :

```typescript
import { resolveProductPrice } from './resolve-product-price'

// Pour chaque item :
const resolved = resolveProductPrice({
  price: item.price,
  b2bPrice: item.b2bPrice,
  qty: item.qty,
  marketplaceTier: item.marketplaceTier
})
const unitPrice = resolved.appliedPrice
// Utiliser unitPrice au lieu de item.price pour le calcul supplierCost
```

### 4b. `/api/order/route.ts`

- Lire `marketplaceTier` depuis le JWT de l'utilisateur authentifié (déjà décodé dans le handler).
- Appeler `resolveProductPrice` pour chaque item du panier.
- Stocker `priceType: 'retail' | 'wholesale'` sur chaque ligne dans le document Order pour la comptabilité.
- Après création de la commande avec succès, incrémenter sur le User :
  ```typescript
  await User.findByIdAndUpdate(userId, {
    $inc: {
      totalMarketplacePurchases: orderTotal,
      marketplaceOrderCount: 1
    }
  })
  ```

### 4c. Auto-promotion vers Pro

Dans la même API order, après l'incrément, vérifier si le user standard atteint les seuils Pro :
```typescript
if (user.marketplaceTier === 'standard') {
  const newTotal = (user.totalMarketplacePurchases || 0) + orderTotal
  const newCount = (user.marketplaceOrderCount || 0) + 1
  if (newTotal >= 150_000 || newCount >= 3) {
    // Envoyer notification in-app "Vous êtes éligible au compte Pro"
    // Ne PAS promouvoir automatiquement — attendre validation admin
    // Utiliser le système InAppNotification existant
  }
}
```

---

## TÂCHE 5 — Affichage UI des deux niveaux de prix

### 5a. `ProductDetail1688.tsx`

Dans la section affichage prix, après le prix principal, ajouter :
```tsx
{/* Prix wholesale si disponible */}
{product.b2bPrice && product.b2bPrice < displayPrice && (
  <div className="mt-2 flex items-center gap-2 flex-wrap">
    <span className="text-sm text-gray-500">À partir de 5 pcs :</span>
    <span className="text-lg font-bold text-green-600">
      {product.b2bPrice.toLocaleString('fr-FR')} FCFA
    </span>
    <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-semibold">
      -{Math.round((1 - product.b2bPrice / displayPrice) * 100)}% wholesale
    </span>
  </div>
)}
{/* Badge Pro si compte Pro ou supérieur */}
{userTier && userTier !== 'standard' && product.b2bPrice && (
  <p className="text-xs text-violet-600 mt-1 font-medium">
    ✓ Prix Pro appliqué automatiquement (compte {userTier})
  </p>
)}
```

Pour récupérer `userTier` côté client : lire depuis le contexte de session ou faire un fetch `/api/auth/login` (GET) qui retourne déjà les infos user. Ajouter `marketplaceTier` dans le payload JWT et dans la réponse GET `/api/auth/login`.

### 5b. `ProductCard.tsx`

Sous le prix principal, si `b2bPrice` existe sur le produit :
```tsx
{product.b2bPrice && product.b2bPrice < (product.price || 0) && (
  <p className="text-xs text-green-600 font-medium mt-0.5 truncate">
    5 pcs+ : {product.b2bPrice.toLocaleString('fr-FR')} FCFA
  </p>
)}
```

### 5c. `/app/panier/page.tsx`

Dans l'affichage de chaque ligne du panier, indiquer si le prix wholesale est appliqué :
```tsx
{item.b2bPrice && item.qty >= 5 && (
  <span className="text-xs text-green-600 font-medium ml-1">(prix pro)</span>
)}
```

---

## TÂCHE 6 — Page compte client : statut Pro et demande

**Fichier** : `/src/app/compte/profil/page.tsx`

Ajouter une section "Statut Marketplace" en bas du formulaire de profil, après le bouton de sauvegarde.

La section doit :
1. Afficher un badge coloré avec le tier actuel (standard/pro/reseller/partner)
2. Pour `standard` : afficher la progression vers Pro (commandes et montant cumulé)
3. Afficher un bouton "Demander le passage Pro" si les seuils sont atteints et demande pas encore faite
4. Si demande faite mais pas encore validée : message d'attente

**Couleurs badges** : standard → gray, pro → green, reseller → violet, partner → yellow

**API à créer** : `POST /api/client/request-pro`
- Vérifie que l'user est authentifié et `marketplaceTier === 'standard'`
- Vérifie les seuils (3+ commandes OU 150k+ FCFA)
- Met à jour `proRequestedAt: new Date()`
- Envoie une notification in-app à l'admin (utiliser le système `InAppNotification` existant)
- Retourne `{ success: true }`

---

## TÂCHE 7 — Interface admin : gestion des comptes Pro

**Fichier à créer** : `/src/app/admin/marketplace/comptes-pro/page.tsx`

Page admin listant :
1. Section "Demandes en attente" — users avec `proRequestedAt` défini mais `proValidatedAt` non défini
2. Section "Comptes Pro actifs" — tous les users avec `marketplaceTier !== 'standard'`

Colonnes du tableau : Nom, Email, Commandes (#), Cumul achats (FCFA), Tier actuel, Date demande, Actions

Actions disponibles par ligne :
- Bouton "Promouvoir Pro" → appelle l'API avec tier `pro`
- Bouton "Promouvoir Revendeur" → appelle l'API avec tier `reseller`
- Bouton "Rétrograder Standard" → appelle l'API avec tier `standard`

**API à créer** : `PUT /api/admin/users/[id]/marketplace-tier`
- Réservé aux rôles `ADMIN | SUPER_ADMIN` (vérifier via `verifyAuthServer`)
- Body : `{ tier: 'standard' | 'pro' | 'reseller' | 'partner' }`
- Met à jour `marketplaceTier` et `proValidatedAt: new Date()` si tier !== 'standard'
- Envoie un email de confirmation au client (utiliser `email-service.ts` existant)
  - Sujet : "Votre compte ITVision Market a été mis à niveau"
  - Corps : confirmer le tier, lister les avantages (prix wholesale auto, facturation B2B...)

---

## TÂCHE 8 — Ajouter `marketplaceTier` dans le JWT

**Fichier** : `/src/app/api/auth/login/route.ts`

Dans le payload JWT signé lors du login, ajouter `marketplaceTier` :
```typescript
const tokenPayload = {
  userId: user._id,
  email: user.email,
  role: user.role,
  marketplaceTier: user.marketplaceTier || 'standard',  // AJOUTER
  // ...autres champs existants
}
```

Dans la réponse GET (vérification token), inclure également `marketplaceTier` dans la réponse JSON.

Cela permet à tous les composants client de lire le tier depuis la session sans appel API supplémentaire.

---

## CHECKLIST DE COHÉRENCE FINALE

Après implémentation, vérifier que :

- [ ] `Product.b2bPrice` est correctement renseigné dans l'interface admin produit (formulaire de création/édition)
- [ ] Le champ `b2bPrice` est visible et modifiable dans `/src/app/admin/produits/[id]/page.tsx` ou équivalent
- [ ] `resolveProductPrice` est utilisé partout où un prix produit est calculé (panier, order API, simulation)
- [ ] Les commandes en DB stockent `priceType` pour chaque ligne (traçabilité comptable)
- [ ] Le JWT inclut `marketplaceTier` et est bien lu côté client
- [ ] La page `/compte/profil` affiche correctement le statut et la progression
- [ ] L'admin peut gérer les tiers via `/admin/marketplace/comptes-pro`
- [ ] Les tests TypeScript passent (`npm run build`) sans erreurs de type sur les nouveaux champs

---

## ORDRE D'IMPLÉMENTATION RECOMMANDÉ

1. Tâche 1 (tiered-pricing refactor) — 30 min — sans risque
2. Tâche 2 (User model) — 15 min — sans risque
3. Tâche 3 (resolve-product-price utilitaire) — 20 min — nouveau fichier
4. Tâche 8 (JWT marketplaceTier) — 15 min — critique pour les autres tâches
5. Tâche 4 (cart-calculator + API order) — 60 min — coeur du changement
6. Tâche 5 (UI ProductDetail + ProductCard + Panier) — 45 min
7. Tâche 6 (page profil + API request-pro) — 45 min
8. Tâche 7 (admin + API marketplace-tier) — 60 min

**Total estimé : ~5h de développement**
