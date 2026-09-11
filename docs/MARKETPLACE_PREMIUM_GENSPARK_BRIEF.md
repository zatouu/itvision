# Brief GenSpark — Refonte premium marketplace DDM+

## 1. Contexte

Le marketplace DDM+ est déjà fonctionnel : catalogue, panier, checkout, achats groupés, sourcing "Trouvez-moi", tarification transparente. Cependant, l'expérience n'est pas encore **premium** et les 3 piliers stratégiques ne sont pas assez mis en avant :

- **Achats groupés** (group buying)
- **Trouvez-moi / sourcing** (recherche de produit par photo, lien ou texte)
- **Quantité minimum (MOQ)** par produit

Le brief vise une refonte **UI/UX uniquement** sur 5 écrans clés. Le backend reste inchangé.

---

## 1.5 Direction visuelle validée

La home a déjà été explorée par GenSpark dans le handoff : `docs/design_handoff_ddm_plus_marketplace_home/README.md`
**Direction choisie : 01 · Safe — Évolution douce de l'existant**

- Positionnement : refonte à faible risque, conserve la charte actuelle (émeraude / violet / ambre).
- Urgence sociale : maîtrisée (compte à rebours, barres de progression, badges discrets).
- Palette : émeraude `#059669` (actions / prix / stock), violet `#7C3AED` (groupes / sourcing), ambre `#F59E0B` (MOQ / alertes), bleu `#2563EB` (import / info), fond `white` / `slate-50`, texte `slate-900`.
- Typographie : **Inter** uniquement, lisible et sobre.
- Radius : `rounded-xl` (12 px) / `rounded-2xl` (16 px).
- Ombres : `shadow-sm` par défaut, `shadow-md` au hover.

Le handoff contient :

- 3 directions côte à côte (`home-directions.html`)
- Tokens détaillés (colors, typography, spacing, radius, shadows, motion)
- Mapping icônes (emoji → `lucide-react`)
- Assets produits temporaires
- README complet avec prochaines étapes

**Tous les autres écrans doivent suivre cette direction 01 · Safe.**

---

## 2. Stack technique

- **Framework** : Next.js 15 App Router, React 19
- **Styling** : Tailwind CSS, classes existantes `dark:` support
- **Composants** : React server + client, Framer Motion autorisé
- **UI Kit interne** : `src/components/ui/*` (Button, Card, Toaster, etc.)
- **Icônes** : `lucide-react`
- **Langue** : Français
- **Palette validée (Direction 01 · Safe)** — à utiliser sur les 5 écrans :
  - CTA / actions principales : `emerald-600` (`#059669`)
  - Groupes / sourcing : `violet-600` (`#7C3AED`)
  - MOQ / alertes : `amber-500` (`#F59E0B`)
  - Info / import : `blue-600` (`#2563EB`)
  - Économies / prix : `emerald-600`
  - Texte principal : `slate-900` (`#0F172A`)
  - Surface principale : `white` / `slate-50`
  - Bordures : `slate-200`
  - Dark mode : inverser vers `dark:bg-slate-900`, `dark:text-slate-100`
- **Typographie** : **Inter** uniquement (pas de Manrope, pas de JetBrains Mono)
- **Responsive** : mobile-first, bottom nav sur mobile

---

## 3. Objectif de la refonte

Faire passer le marketplace en expérience "premium import Chine" avec :

1. **Hiérarchie claire** : les 3 piliers doivent être immédiatement identifiables.
2. **Incitation à la quantité** : le MOQ et les paliers dégressifs doivent être présentés comme une opportunité d'économie, pas une contrainte.
3. **Confiance** : transparence des prix, transport, délais, statut de groupe.
4. **Conversion** : CTA uniques par écran, friction réduite, feedback visuel immédiat.
5. **Cohérence** : mêmes patterns, mêmes espacements, mêmes tons sur les 5 écrans.

---

## 4. Écrans à refaire (par ordre de priorité)

### 4.1 Home marketplace (`src/app/(market)/market/page.tsx`)

**Objectif** : transformer la home en vitrine des 3 piliers dès le premier scroll.

**Composants concernés** :
- `src/components/home/FeatureBanners.tsx`
- `src/components/home/GroupBuySection.tsx`
- `src/components/home/SourcingOnDemand.tsx`
- `src/components/home/HeroCarousel.tsx`
- `src/components/home/CompactSearchBar.tsx`

**Attendu** :
- Hero qui annonce clairement les 3 promesses (bas prix Chine, groupe, sourcing).
- FeatureBanners : 3 cartes avec vraie hiérarchie visuelle (sourcing en premier, group buy en deuxième, MOQ/transparence en troisième). Les CTA ouvrent les modales déjà existantes.
- Section "Trouvez-moi" avec 3 étapes visuelles (photo → devis 24h → commande) et un CTA photo dominant.
- Section "Achats groupés" : grille de groupes actifs avec vrai **compte à rebours**, **barre de progression**, **prix actuel**, **nombre de participants**, **savings %**.
- Section "Pourquoi commander en quantité ?" : expliquer le MOQ avec un mini-calculateur de prix par palier.
- Badge "Quantité min." visible sur les cartes produits populaires.

**Copies clés** :
- "Trouvez-moi ce produit en 24h"
- "Rejoignez un achat groupé, plus on est nombreux, moins c'est cher"
- "À partir de X unités, débloquez le prix dégressif"

---

### 4.2 Fiche produit (`src/components/product/ProductDetailNew.tsx`)

**Objectif** : raconter l'offre en un seul flux : prix unitaire → MOQ → économie de groupe → transport → ajout panier.

**Attendu** :
- Hero mobile : image produit + sticky CTA en bas.
- Bloc prix premium :
  - Prix unitaire affiché en grand.
  - Si `minOrderQty > 1` : badge "Lot minimum X" avec explication "pourquoi ?" (faibles frais de service = prix usine).
  - Paliers de prix (`priceTiers`) en cards cliquables, avec le palier actuel mis en évidence.
  - Si group buy activé : card "Achat groupé" avec objectif, délai, prix déjà débloqué, boutons Rejoindre / Créer.
- Sélecteur de quantité intelligent :
  - Boutons `-` bloqués à `minOrderQty`.
  - Quand on dépasse un palier, afficher l'économie gagnée en temps réel.
  - Suggestion "Ajoutez Y unités pour débloquer -Z%" si proche du palier suivant.
- Onglets simplifiés (Description, Expédition, Avis).
- Section "Produits souvent achetés ensemble" en dessous.

**Contraintes techniques** :
- Le champ `minOrderQty` est maintenant exposé par `formatProductDetail`.
- Les callbacks `addToCart`, `onWhatsApp`, `onBuyNow` existent.
- Conserver `MobileBottomBar` mais améliorer le wording (ex : "Ajouter — X unités min.").

---

### 4.3 Panier (`src/app/(market)/panier/page.tsx` + `src/components/cart/CartItemCard.tsx`)

**Objectif** : transformer le panier d'une liste d'articles en tableau de bord d'achat optimisé.

**Attendu** :
- Carte article (`CartItemCard`) avec :
  - Image, nom, variante, prix total.
  - Badge "Min X" si `minOrderQty > 1`.
  - Contrôle quantité bloqué au min.
  - CTA "Acheter en groupe" visible si un groupe actif existe pour ce produit.
- Récapitulatif sticky (desktop) / bottom sheet (mobile) avec :
  - Sous-total, frais de service, assurance, transport.
  - **Économie totale affichée** (promo + grains + palier).
  - **Alerte MOQ** : si un article est en dessous de son min, bloquer le checkout.
- Remplacer le compteur "5 articles" actuel par :
  - Un message d'incitation MOQ personnalisé par produit.
  - Ou une section "Complétez votre lot pour -X%".
- Section "Groupes actifs pour vos produits" plus visible, avec CTA direct.
- CTA checkout unique et dominant.

**Contraintes techniques** :
- Le panier est stocké dans `localStorage` (`cart:items`).
- Chaque item a maintenant `minOrderQty`.
- Les fonctions `updateQty`, `removeItem`, `proceedToCheckout` existent.

---

### 4.4 Checkout / adresse (`src/app/(market)/checkout/adresse/page.tsx`)

**Objectif** : rassurer et clarifier la transaction, en particulier sur les 3 piliers.

**Attendu** :
- Stepper visuel : Panier → Livraison → Paiement.
- Récapitulatif de commande avec :
  - Liste des articles et quantités.
  - Badge "Lot min. X" sur chaque ligne concernée.
  - Décomposition transparente du prix (prix source, frais de service, assurance, transport, grains, promo).
  - **Ligne "Économie réalisée"** si palier MOQ ou group buy.
- Options de livraison en cards (Express, Aérien, Maritime) avec :
  - Délai.
  - Coût.
  - Badge "Moins cher en groupe" si maritime éligible.
- Formulaire adresse simplifié :
  - Autocomplete région/département/quartier.
  - Carte (déjà présente, à conserver).
- Bannière de confiance : "Paiement sécurisé", "Suivi en temps réel", "Support WhatsApp".

**Contraintes techniques** :
- Le checkout lit `sessionStorage.getItem('checkout_cart')`.
- Le formulaire `form` et les `errors` existent.
- Conserver `CheckoutStepper`.

---

### 4.5 Page achats groupés (`src/app/(market)/achats-groupes/page.tsx` + `[groupId]/page.tsx`)

**Objectif** : créer une expérience "drop" ou "flash sale" pour les groupes, avec urgence et confiance.

**Attendu — Listing (`/achats-groupes`)** :
- Hero "Achats groupés — Jusqu'à -45%" avec CTA "Créer un groupe".
- Filtres simplifiés (catégorie, tri).
- Grille de cards groupe avec :
  - Image produit.
  - Nom, prix actuel, prix de base barré.
  - Barre de progression animée.
  - Compte à rebours en temps réel (jours/heures/minutes).
  - Nombre de participants et quantités engagées.
  - Badge "Bientôt complet" si ≥ 80%.
  - CTA "Rejoindre" ou "Voir".
- Simulateur de prix dégressif (déjà présent) mais plus intégré visuellement.

**Attendu — Détail (`/achats-groupes/[groupId]`)** :
- Hero produit avec prix actuel du groupe et prix de base barré.
- Section "Progression du groupe" avec barre, quantités, objectif, deadline.
- Section "Comment ça marche ?" en 3 étapes (rejoindre → paiement → livraison).
- Formulaire de participation simple (nom, téléphone, quantité).
- Section "Participants" (anonymisés) et chat groupe.
- Partage (copier le lien) mis en avant.
- CTA "Rejoindre maintenant" sticky en bas.

**Contraintes techniques** :
- Les données viennent de `/api/group-orders` et `/api/group-orders/[groupId]`.
- Le state `joinForm`, `countdown` existent.
- Conserver `GroupOrderChat`.

---

## 5. Principes de design

### 5.1 Hiérarchie visuelle des 3 piliers (suggestions)

| Pilier | Couleur dominante | Icône | Où le mettre en avant |
| --- | --- | --- | --- |
| Trouvez-moi | Violet | `Camera` / `Search` | Hero, FeatureBanners, fiche produit sticky, home section dédiée |
| Achats groupés | Émeraude/Violet | `Users` / `TrendingUp` | FeatureBanners, home section, fiche produit, panier, listing groupes |
| MOQ | Ambre | `Package` / `Boxes` | Badge produit, sélecteur quantité, panier, checkout, home section "lot" |

### 5.2 Micro-copies premium

- "Prix usine + faibles frais" au lieu de "prix import"
- "Lot minimum" au lieu de "MOQ"
- "Économisez X FCFA/pc dès Y unités"
- "Plus que Z unités pour débloquer le palier"
- "X personnes ont déjà rejoint aujourd'hui"

### 5.3 Mobile

- Bottom sticky CTA sur fiche, panier, checkout, détail groupe.
- Cartes produit en 2 colonnes sur mobile.
- Simulateur MOQ en accordéon ou bottom sheet.
- Pas de multi-colonnes complexes en dessous de 640px.

---

## 6. Contraintes techniques fortes

1. **Ne pas toucher au backend** : pas d'API, pas de modèle, pas de schéma.
2. **Ne pas créer de nouvelle page de route** sans l'ajouter dans `src/lib/domains.ts`.
3. **Réutiliser les composants existants** quand c'est possible (`MarketHeader`, `MarketFooter`, `MarketBottomNav`, `CompactSearchBar`, `CheckoutStepper`, `PriceBreakdown`).
4. **Conserver la responsivité** : mobile-first, test min 320px.
5. **Ne pas ajouter de dépendance** sauf si justifié et approuvé.
6. **Conserver l'accessibilité** : contrastes, labels ARIA, focus visibles.
7. **Mode sombre** : toute nouvelle couleur doit avoir son équivalent `dark:`.
8. **Pas de code mort** : si un composant est remplacé, supprimer l'ancien (ou marquer deprecated dans `src/lib/domains.ts`).

---

## 7. Livrables attendus

Pour chaque écran, GenSpark doit fournir :

1. **Composant(s) React** prêts à l'emploi.
2. **Fichier(s) modifiés/créés** listés avec chemin.
3. **Diff / résumé des changements** par rapport à l'existant.
4. **Copies finales** en français.
5. **Indication responsive** (mobile / tablet / desktop).
6. **Capture ou description textuelle** du rendu attendu.

---

## 8. Ce qu'il ne faut PAS faire

- Ne pas réécrire la logique métier (prix, stock, paiement, groupes).
- Ne pas modifier `src/lib/models/*`, `src/app/api/*`.
- Ne pas toucher au parcours AI/mobile (`mobile/app`, `docs/XEUY_HANDOFF_GENSPARK_UNIFIED.md`).
- Ne pas supprimer les pages corporate ou xeuy.

---

## 9. Références utiles

- Fiche produit actuelle : `src/components/product/ProductDetailNew.tsx`
- Panier actuel : `src/app/(market)/panier/page.tsx` + `src/components/cart/CartItemCard.tsx`
- Checkout actuel : `src/app/(market)/checkout/adresse/page.tsx`
- Home actuelle : `src/app/(market)/market/page.tsx`
- Groupes actuels : `src/app/(market)/achats-groupes/page.tsx` + `[groupId]/page.tsx`
- Modèle de données produit : `src/lib/models/Product.ts` (champs `minOrderQty`, `groupBuyMinQty`, `groupBuyTargetQty`, `priceTiers`)
- API catalog : `/api/catalog/products`
- API groupes : `/api/group-orders`
- Modale sourcing : `src/components/SourcingRequestModal.tsx`

---

## 10. Définition de "premium" pour ce projet

- **Clarté** : l'utilisateur comprend en 3 secondes ce qu'il peut faire et ce qu'il gagne.
- **Urgence sociale** : les groupes ont un compte à rebours et une progression visible.
- **Incitation économique** : le MOQ et les paliers sont présentés comme des opportunités d'économie.
- **Confiance** : transparence totale du prix, du transport, du statut.
- **Fluidité** : un CTA unique et sticky par écran, pas de choix paralysants.

---

## 11. Validation

Avant de merger la refonte GenSpark, vérifier :

```bash
npm run type-check
npm run test:domains
npm run test:boundaries
npm run build
```

Et s'assurer que les tests E2E marketplace passent (`npm run test:e2e`).

---

## Annexe A — Références visuelles et direction validée

### Direction 01 · Safe déjà fournie pour la home

La home a été explorée dans `docs/design_handoff_ddm_plus_marketplace_home/`. **La direction 01 · Safe est validée** et doit guider les 5 écrans.

Le fichier `home-directions.html` contient les 3 directions côte à côte. Utiliser la **Direction 01** comme source de vérité.

### Contraintes non négociables

- Tailwind CSS
- Responsive mobile-first
- Mode sombre supporté
- Pas de nouvelle dépendance sauf justification
- Réutilisation des composants structurels quand pertinent (`MarketHeader`, `MarketFooter`, `MarketBottomNav`, etc.)

### Références visuelles (optionnel mais utile)

Si tu veux t'ancrer dans l'existant, les URLs de prod sont :
| Écran | URL prod | Éléments à observer / à améliorer |
| --- | --- | --- |
| **Home** | `https://market.itvisionplus.sn/` | Hero, 3 feature banners, bottom nav, trust badges, sections flash/sourcing/catégories |
| **Catalogue** | `https://market.itvisionplus.sn/produits` | Grille de cartes, badges, filtres, bannières catégorie |
| **Fiche produit** | `https://market.itvisionplus.sn/produits/<id>` | Galerie, pricing, CTA, onglets, trust badges |
| **Panier** | `https://market.itvisionplus.sn/panier` | CartItemCard, récapitulatif, suggestions, group buy opportunities |
| **Checkout** | `https://market.itvisionplus.sn/checkout/adresse` | Stepper, formulaire, options livraison, récapitulatif |
| **Groupes** | `https://market.itvisionplus.sn/achats-groupes` | Listing, cartes de groupe, simulateur |
| **Détail groupe** | `https://market.itvisionplus.sn/achats-groupes/<groupId>` | Progression, formulaire participation, chat, CTA sticky |

### Éléments de charte de la direction 01 · Safe (à appliquer)

- **Fond** : blanc / `slate-50`, bordures `slate-200`.
- **Header** : blanc, logo DDM+ à gauche, recherche compacte, panier/compte à droite.
- **CTA principal** : `emerald-600`.
- **Piliers** : violet `violet-600` (Trouvez-moi / groupes), ambre `amber-500` (MOQ), bleu `blue-600` (import).
- **Économies** : `emerald-600`.
- **Urgence** : `amber-600` ou `red-600` discret.
- **Typographie** : Inter uniquement, poids 400-800.
- **Radius** : `rounded-xl` (12 px) / `rounded-2xl` (16 px).
- **Ombres** : `shadow-sm`, `shadow-md` au hover.
- **Bottom nav** : 5 icônes classiques (accueil, produits, groupes, panier, compte).

### Problèmes visuels à résoudre (indépendamment de la charte choisie)

- Les 3 feature banners de la home ont des CTAs qui doivent s'intégrer à des modales (pas de page 404).
- Le catalogue en prod affiche parfois 0 produits selon les données — la refonte doit prévoir un skeleton/état vide premium.
- Le compteur "5 articles pour le minimum" au panier est confus et doit être remplacé par une incitation MOQ réelle.
- Les badges de groupe affichent "participants" alors que les données sont des **quantités**.
- Le sélecteur de quantité fiche produit ne montre pas encore le MOQ (corrigé côté tech, à rendre visible côté UI).

### Consigne de livraison

Puisque la direction 02 · Bold est déjà validée pour la home, livrer directement les **5 écrans suivants** dans cette charte :

1. **Fiche produit** — bloc prix premium avec paliers cliquables, sélecteur quantité intelligent, badge MOQ, group buy card.
2. **Panier** — dashboard d'achat avec économies affichées, alertes MOQ bloquantes, suggestions de groupes.
3. **Checkout** — stepper, décomposition prix transparente, options livraison (Express/Aérien/Maritime).
4. **Achats groupés listing** — grille de cards groupe avec compte à rebours, barre de progression, social proof.
5. **Détail groupe** — hero produit + progression + formulaire de participation + chat.

Chaque écran en **mobile 375px** et **desktop 1280px**. Livrer aussi les **variantes dark mode** systématiquement.
