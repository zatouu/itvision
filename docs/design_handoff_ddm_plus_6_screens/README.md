# Handoff : DDM+ Marketplace — 6 écrans premium (Direction Safe)

## Overview

Refonte UI/UX **premium** de 6 écrans du marketplace **DDM+ (Dieund Dal Ma)** — plateforme d'import direct Chine → Sénégal / Afrique de l'Ouest.

Direction visuelle validée : **01 · Safe** (évolution douce de la charte existante — émeraude/violet/ambre/bleu, Inter, rounded-xl/2xl, shadow-sm).

**Écrans livrés dans ce handoff** :

1. **Home marketplace** — `src/app/(market)/market/page.tsx` + `src/components/home/*` *(nouveau dans cette itération)*
2. **Fiche produit** — `src/components/product/ProductDetailNew.tsx`
3. **Panier** — `src/app/(market)/panier/page.tsx` + `src/components/cart/CartItemCard.tsx`
4. **Checkout adresse** — `src/app/(market)/checkout/adresse/page.tsx`
5. **Achats groupés (listing)** — `src/app/(market)/achats-groupes/page.tsx`
6. **Détail groupe** — `src/app/(market)/achats-groupes/[groupId]/page.tsx`

Backend / API / modèles / routes **inchangés** — refonte UI/UX uniquement.

---

## About the Design Files

Les fichiers de ce bundle sont des **références de design en HTML + React JSX** — un prototype cliquable interactif servant de source de vérité visuelle et comportementale.

La tâche du développeur est de **recréer ces designs dans le codebase Next.js 15 App Router / React 19 / Tailwind CSS existant** en :

- Respectant les composants UI internes (`src/components/ui/*`)
- Utilisant les **icônes `lucide-react`** (les SVG inline du prototype sont des placeholders — mapping fourni plus bas)
- Réutilisant les composants structurels : `MarketHeader`, `MarketFooter`, `MarketBottomNav`, `CompactSearchBar`, `CheckoutStepper`, `PriceBreakdown`
- Câblant les vraies données via les API existantes (aucune API à créer)
- Implémentant systématiquement les variantes `dark:` (le prototype le fait pour chaque écran)
- Utilisant **Framer Motion** pour les micro-transitions douces (autorisé par le brief)

---

## Fidelity

**Haute fidélité (hi-fi)** — pixel-perfect côté :

- Palette et tokens exacts (voir Design Tokens plus bas)
- Typographie (familles, poids, tailles)
- Espacements, radius, ombres
- Copies finales en français
- Comportements interactifs
- Layouts mobile 375px + desktop 1280px

---

## Comment ouvrir le prototype

Ouvrez `Prototype DDM+.html` dans un navigateur — tout est chargé via CDN. L'app a :

- **Sidebar de navigation** avec les 6 écrans numérotés (01 à 06), la Home ouvre en premier
- **Toggle Device** : Mobile 375 × 760 / Desktop 1280
- **Toggle Thème** : Light / Dark
- **Persistance localStorage**

---

## Écran 1 · Home marketplace *(nouveau)*

**Purpose** : vitrine des 3 piliers dès le premier scroll — Trouvez-moi, Achats groupés, MOQ.
**Composants concernés** dans le codebase : `FeatureBanners.tsx`, `GroupBuySection.tsx`, `SourcingOnDemand.tsx`, `HeroCarousel.tsx`, `CompactSearchBar.tsx`.

### Layout mobile (375)

Ordre de scroll de haut en bas :

1. **MarketHeader** (44px logo DDM+ + heart + cart badge 3)
2. **Barre de recherche compacte** : input placeholder « Rechercher un produit, une catégorie… » + bouton photo violet (déclenche la modale `SourcingRequestModal`)
3. **Hero card** — carousel indicator + gradient violet→emerald `rounded-2xl` :
   - Badge « Nouveaux drops » ink
   - H1 « Importez de Chine, à prix usine. » (24px extrabold, "prix usine" en emerald-300)
   - Sous-titre « Sourcing, achats groupés et lots avantageux — livrés au Sénégal. »
   - 3 pills « Trouvez-moi 24h » / « Achats groupés » / « Lot minimum » sur `bg-white/10 border-white/25`
   - CTA blanc « Explorer le catalogue → »
   - Indicateurs pagination (barre active + 2 dots)
4. **3 Feature banners** empilés — chacun ouvre le pilier dédié :
   - `01 · Sourcing` (violet) → « Trouvez-moi ce produit en 24h » → `SourcingRequestModal`
   - `02 · Groupes` (emerald) → « Rejoignez un achat groupé » → `/achats-groupes`
   - `03 · Lot minimum` (amber) → « Débloquez le prix par palier » → scroll ou modale simulateur
5. **Grille catégories** 4×2 : Sécurité, Audio, Éclairage, Auto, Mode, Maison, Beauté, Bureau (icônes lucide)
6. **Section « 🔥 Groupes en cours »** — horizontal-scroll de 4 cards groupe (160px) :
   - Image + badge Live/Presque plein + countdown en rouge
   - Titre 2 lignes + progress bar + `X/200` + `Y%`
   - Prix violet + `-Z%` emerald
7. **Section Sourcing "Trouvez-moi"** — Card violette gradient dédiée :
   - Icône + « Sourcing sur demande » + « Trouvez-moi ce produit en 24h »
   - 3 étapes 01 → 02 → 03 (Envoyez, Recevez, Commandez)
   - CTA violet « Photographier un produit » (déclenche `SourcingRequestModal`)
8. **Section MOQ « Pourquoi commander en quantité ? »** — Card amber gradient :
   - 4 tranches : `1-4 pcs — Prix local` / `5-9 — -13%` / `10-24 — -25% ✓` / `25+ — -40% 🔥`
   - Le palier `10-24` est mis en avant avec `bg-white shadow-sm`
   - CTA amber « Voir les produits éligibles »
9. **Section « 🔥 Populaires cette semaine »** — grille 2 col avec 6 ProductCard :
   - Badge `Min. X` amber en haut-gauche + `-Y%` red en haut-droite
   - Bouton favoris rond en bas-droite
   - Catégorie uppercase + titre 2 lignes + rating + prix + prix barré
10. **Trust strip 4 items** en 2×2
11. **Testimonials** — 3 cards horizontal-scroll (Amadou D., Fatima N., Omar S.)
12. **MarketBottomNav** : Accueil (actif) / Produits / Groupes / Panier / Compte

### Layout desktop (1280)

- Header pleine largeur avec nav + search + heart + cart
- Hero 3xl : split 1.3fr / 1fr — à gauche titre H1 52px + 3 pills + 2 CTA (blanc + outline blanc) ; à droite pile de 3 data cards flottantes (« 2 143 groupes actifs · ↗ +42% », « -35% éco. moyenne », « 18h devis moyen »)
- 3 feature banners en `grid-cols-3` — chaque card plus grande avec icône 12×12
- Grille catégories `grid-cols-8`
- Section groupes en `grid-cols-4`
- Section « Sourcing » + « MOQ » **côte à côte** en `grid-cols-2`
- Section populaires en `grid-cols-6`
- Trust strip en 4 cols
- Testimonials en `grid-cols-3`
- Footer minimal

### Micro-copies clés (Home)

- « Importez de Chine, à prix usine. »
- « Sourcing, achats groupés et lots avantageux — livrés au Sénégal. »
- « 3 façons d'importer avec DDM+ »
- « Trouvez-moi ce produit en 24h »
- « Vous ne trouvez pas votre produit ? Notre équipe de sourceurs en Chine le trouve pour vous. »
- « Pourquoi commander en quantité ? »
- « Le prix baisse par palier. Plus vous commandez, plus vous économisez. »
- « Rejoignez avant la deadline — plus vous êtes, plus le prix baisse »

### Comportements clés (Home)

- Le hero est **prêt pour un carousel** (indicateurs déjà présents — 3 slides recommandés)
- Les 3 feature banners **ouvrent les modales existantes** :
  - Sourcing → `SourcingRequestModal`
  - Groupes → navigation `/achats-groupes`
  - MOQ → bottom sheet / modale simulateur (à créer si absent)
- Le bouton photo dans la search bar déclenche également `SourcingRequestModal`
- La section catégories navigue vers `/produits?cat=...`
- Toutes les cards produit / groupe sont cliquables (hover + `translate-y`)

---

## Écran 2 · Fiche produit

*(Inchangé vs v1 du handoff — voir description dans `README v1` si besoin. Résumé :)*

Bloc prix premium avec paliers cliquables, badge MOQ expandable, Card achat groupé, sélecteur quantité intelligent, tabs Description/Expédition/Avis, sticky bottom bar mobile (WhatsApp / Ajouter / Acheter).

## Écran 3 · Panier

*(Inchangé)* `CartItemCard` avec sous-cartes MOQ / palier / groupe, alerte MOQ globale bloquante, récapitulatif sticky desktop, incitations personnalisées avec bouton d'application directe.

## Écran 4 · Checkout adresse

*(Inchangé)* Stepper Panier → Livraison → Paiement, adresse Région → Département → Quartier + placeholder carte, 3 modes d'expédition avec badge « Idéal en groupe » sur Maritime, décomposition prix transparente.

## Écran 5 · Achats groupés (listing)

*(Inchangé)* Hero gradient avec 3 stats, filtres catégorie + tri, grille cards avec compte à rebours + progress bar animée + badge « Presque plein », simulateur MOQ intégré.

## Écran 6 · Détail groupe

*(Inchangé)* Hero produit + Card progression, « Comment ça marche ? » 3 étapes, formulaire participation, participants anonymisés + chat groupe, Card partage avec URL copiable, sticky bottom « Rejoindre maintenant ».

---

## Design Tokens (Direction Safe)

### Colors — Light mode

```
Primary   emerald-600  #059669   /* CTA principaux, prix, stock */
Accent    violet-600   #7C3AED   /* achats groupés, sourcing */
Warning   amber-500    #F59E0B   /* MOQ, alertes */
Info      blue-600     #2563EB   /* import, info */
Danger    red-600      #DC2626   /* urgence, deadlines */

Ink       slate-900    #0F172A
Muted     slate-500    #64748B
Border    slate-200    #E2E8F0
Surface   white / slate-50
```

### Colors — Dark mode

```
Primary   emerald-500  #10B981
Accent    violet-500   #8B5CF6
Warning   amber-400    #FBBF24
Info      blue-500     #3B82F6
Danger    red-400      #F87171

Ink       white / slate-100
Muted     slate-400
Border    slate-800
Surface   slate-950 / slate-900

Éléments teintés :
  Emerald soft : bg-emerald-950/40  border-emerald-900
  Violet soft  : bg-violet-950/40   border-violet-900
  Amber soft   : bg-amber-950/40    border-amber-900
  Red soft     : bg-red-950/40      border-red-900
```

### Typography

```
Font family : Inter (uniquement)
Sizes mobile :
  h1 hero   : 24-28px, extrabold 800, tracking-tight -0.02em
  h2 section: 14-16px, extrabold 800
  h3 card   : 13px,    extrabold 800
  body      : 12-13px, medium 500 → semibold 600
  label     : 10-11px, bold, uppercase, tracking-wider
  caption   : 10px,    semibold
Prices      : tabular-nums, extrabold, 15-28px
Sizes desktop :
  h1 hero : 44-52px
  h2 section : 20px
  body : 13-15px
```

### Spacing

```
Mobile page padding : 16px (px-4)
Card interior       : 10-16px (p-2.5 à p-4)
Section vertical    : 24px (mt-6) entre sections mobile ; 40px (mt-10) desktop
Grid gap products   : 12px (gap-3)
Desktop max-w       : 1152px (max-w-6xl)
```

### Radius

```
Buttons small : 8-10px (rounded-lg)
Buttons md    : 12px   (rounded-xl)
Cards         : 16px   (rounded-2xl)
Hero          : 20-24px (rounded-3xl desktop)
Pills / avatars : rounded-full
```

### Shadows

```
default : shadow-sm
hover   : shadow-md
Sticky bottom bar : border-t only (no shadow)
```

### Motion (Framer Motion recommandé)

```
duration-fast : 150ms
duration-base : 250ms
duration-slow : 400ms
easing        : [0.22, 1, 0.36, 1]
pulse (live)  : 1500ms infinite
hover cards   : translate-y-0.5 + shadow-md
```

---

## Mapping icônes (SVG inline prototype → lucide-react)

| Nom prototype | Lucide-react | Usage |
| --- | --- | --- |
| `home` | `Home` | Bottom nav accueil |
| `grid` | `LayoutGrid` | Bottom nav catalogue |
| `users` | `Users` | Groupes |
| `cart` | `ShoppingCart` | Panier |
| `user` | `User` | Compte |
| `search` | `Search` | Recherche |
| `heart` | `Heart` | Favoris |
| `camera` | `Camera` | Sourcing |
| `package` | `Package` | MOQ |
| `boxes` | `Boxes` | Lot |
| `clock` | `Clock` | Compte à rebours |
| `check` / `checkCircle` | `Check` / `CheckCircle2` | Validation |
| `shield` | `ShieldCheck` | Sécurité |
| `truck` / `plane` / `ship` | `Truck` / `Plane` / `Ship` | Expédition |
| `chevronRight/Left/Down` | `Chevron…` | Navigation |
| `arrowRight/Left` | `Arrow…` | CTA |
| `plus` / `minus` | `Plus` / `Minus` | Steppers |
| `x` / `trash` | `X` / `Trash2` | Fermer / Supprimer |
| `info` | `Info` | Info |
| `sparkles` | `Sparkles` | Économies |
| `flame` | `Flame` | Hot |
| `target` | `Target` | Objectif groupe |
| `mapPin` | `MapPin` | Adresse |
| `wallet` / `lock` | `Wallet` / `Lock` | Paiement |
| `send` / `message` | `Send` / `MessageSquare` | Chat |
| `share` / `copy` | `Share2` / `Copy` | Partage |
| `whatsapp` | icône custom `si-whatsapp` ou `MessageCircle` | WhatsApp |
| `gift` | `Gift` | Mode / cadeau |
| `moon` / `sun` | `Moon` / `Sun` | Toggle dark (proto uniquement) |
| `smartphone` / `monitor` | `Smartphone` / `Monitor` | Proto uniquement |
| `filter` | `SlidersHorizontal` | Filtres |
| `star` | `Star` | Rating |
| `bell` | `Bell` | Notifications |
| `eye` | `Eye` | Visibilité |

---

## Format FCFA

```js
const fmtFCFA = (n) =>
  new Intl.NumberFormat("fr-FR").format(n).replace(/\s/g, "\u202F") + "\u00A0F";
```
Espaces fines insécables (U+202F) pour éviter les retours à la ligne dans les cards étroites. À conserver.

---

## Assets

Images produit (licence CC/PD, à remplacer par le vrai catalogue) — `assets/img/` :

| Fichier | Produit mock |
| --- | --- |
| `product-camera.jpg` | Caméra IP dôme 4MP (principal) |
| `product-earbuds.jpg` | Écouteurs sans fil TWS |
| `product-led.jpg` | Ruban LED RGB COB 5m |
| `product-carmount.jpg` | Support voiture MagSafe |
| `product-bag.jpg` | Sac cabas |
| `product-watch.jpg` | Montre connectée fitness |

⚠️ **À remplacer en production** par les vrais visuels du catalogue DDM+.

---

## Files

- `Prototype DDM+.html` — Entrée principale
- `proto/shared.jsx` — Icônes SVG, composants partagés (Button, Badge, Card, ProgressBar, CountdownChip, LiveDot, MarketHeader, MarketBottomNav, Section, TrustStrip), FCFA formatter, données mock
- `proto/shell.jsx` — Shell (navigation, toggles device/dark, frames)
- `proto/screen-home.jsx` — **Écran 1 · Home marketplace (nouveau)**
- `proto/screen-product.jsx` — Écran 2 · Fiche produit
- `proto/screen-cart.jsx` — Écran 3 · Panier
- `proto/screen-checkout.jsx` — Écran 4 · Checkout adresse
- `proto/screen-groups.jsx` — Écran 5 · Achats groupés listing
- `proto/screen-group-detail.jsx` — Écran 6 · Détail groupe

---

## Résumé des changements (vs prod actuelle)

### Home (nouveau dans cette itération)

- **Nouveau** : Hero unique avec 3 promesses en pills + carousel-ready
- **Nouveau** : 3 Feature Banners hiérarchisés (Sourcing en 01, Groupes en 02, MOQ en 03) — CTAs câblés aux modales existantes
- **Nouveau** : Barre de recherche avec bouton photo qui déclenche `SourcingRequestModal`
- **Nouveau** : Section Sourcing dédiée avec 3 étapes visuelles
- **Nouveau** : Section « Pourquoi commander en quantité ? » avec table de paliers -13% / -25% / -40%
- **Nouveau** : Section groupes en horizontal-scroll avec compte à rebours + progress
- **Nouveau** : Grille catégories 4×2 mobile / 8 cols desktop
- **Nouveau** : Grille produits populaires avec badges MOQ visibles
- **Nouveau** : Testimonials horizontal-scroll mobile / 3 cols desktop
- **Fix** : les feature banners ouvrent maintenant les modales existantes (pas de 404)
- **Fix** : les badges de groupe affichent bien les **quantités** (X/200 pcs) et non les participants

### Autres écrans

Voir les sections dédiées plus haut. Les changements sont documentés en détail : bloc prix premium, alertes MOQ personnalisées, économies affichées, options livraison, groupes actifs, chat, partage, etc.

---

## Contraintes techniques rappel

- Next.js 15 App Router, React 19, Tailwind CSS, Framer Motion autorisé
- Icônes `lucide-react` uniquement
- Langue française
- Responsive mobile-first, min 320px, breakpoint md à 768px
- **Dark mode obligatoire** pour chaque écran (`dark:` variants systématiques)
- Pas de backend / API / modèles modifiés
- Pas de nouvelle route sans `src/lib/domains.ts`
- Réutiliser `MarketHeader`, `MarketFooter`, `MarketBottomNav`, `CompactSearchBar`, `CheckoutStepper`, `PriceBreakdown`
- Accessibilité : contraste AA min, labels ARIA, focus visibles, hit-targets 44px min

---

## Validation avant merge

```bash
npm run type-check
npm run test:domains
npm run test:boundaries
npm run build
npm run test:e2e
```

---

## Ordre d'implémentation recommandé

1. **Home** — c'est la vitrine des 3 piliers, l'entrée principale
2. **Fiche produit** — met en évidence les 3 piliers au niveau produit
3. **Panier** — bloque le checkout via MOQ, tout le reste en dépend
4. **Checkout** — dépend du panier
5. **Détail groupe** — expérience conversion groupée
6. **Achats groupés listing** — page d'atterrissage groupes

Chaque écran peut être livré en PR indépendante. Les primitives partagées (`Badge`, `Button`, `CountdownChip`, `LiveDot`, `ProgressBar`, `TrustStrip`) peuvent être extraites en atomic components dans `src/components/ui/*` en amont dans une PR distincte.
