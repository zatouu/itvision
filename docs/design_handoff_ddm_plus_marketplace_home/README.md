# Handoff : DDM+ Marketplace — Refonte Home (3 directions)

## Overview

Refonte UI/UX de la home du marketplace **DDM+ (Dieund Dal Ma)** — une plateforme d'import direct Chine → Sénégal / Afrique de l'Ouest. Le brief demande de mettre en avant les **3 piliers stratégiques** :

1. **Trouvez-moi** (sourcing sur demande par photo/lien)
2. **Achats groupés** (group buying avec compte à rebours et paliers)
3. **MOQ / Lot minimum** (prix dégressif par palier)

Cet handoff couvre uniquement la première étape du projet : **3 directions visuelles pour la home**, à faire valider avant le déploiement sur les 5 autres écrans (Fiche produit, Panier, Checkout, Achats groupés listing, Détail groupe).

Le stack technique cible est **Next.js 15 App Router + React 19 + Tailwind CSS**. Le backend reste inchangé — refonte UI/UX uniquement.

---

## About the Design Files

Les fichiers dans ce bundle sont des **références de design créées en HTML/CSS pur** — des prototypes montrant le rendu et le comportement attendus, **pas du code de production à copier tel quel**.

La tâche du développeur est de **recréer ces designs dans le codebase existant** (Next.js 15 App Router / React 19 / Tailwind CSS) en respectant :

- Les composants UI internes (`src/components/ui/*`)
- Le support du mode sombre (`dark:` variants)
- L'architecture des composants existants cités dans le brief (`FeatureBanners.tsx`, `GroupBuySection.tsx`, `SourcingOnDemand.tsx`, `HeroCarousel.tsx`, `CompactSearchBar.tsx`, `MarketHeader`, `MarketFooter`, `MarketBottomNav`)
- Les icônes `lucide-react` (pas les emojis utilisés dans les mocks — ce sont des placeholders)

Les emojis dans le HTML (📸 👥 📦 🛒 …) sont des **placeholders pour icônes lucide-react** — voir la table "Mapping icônes" plus bas.

---

## Fidelity

**Haute fidélité (hi-fi)** — pixel-perfect côté :
- Palette exacte (hex fournis)
- Typographie (familles, poids, tailles, letter-spacing)
- Espacements, radius, ombres
- Copies finales en français
- Hiérarchie visuelle et layout mobile + desktop

**Ce qui reste à faire en dev** :
- Adapter le rendu aux composants `src/components/ui/*` existants
- Remplacer les emojis par des icônes `lucide-react`
- Câbler les vraies données API (`/api/catalog/products`, `/api/group-orders`)
- Implémenter les variantes `dark:` (le brief le mentionne — les tokens dark sont fournis ci-dessous)
- Framer Motion pour les transitions douces (le brief l'autorise)

---

## Screens / Views

Un seul écran de design pour le moment : **Home marketplace**, décliné en **3 directions visuelles** (Safe / Bold / Signature). Chaque direction est présentée en **mobile 375×760** et **desktop 1280**.

### Direction 01 · Safe — Évolution douce de l'existant

**Purpose** : proposition de refonte à faible risque, qui conserve la charte actuelle (émeraude/violet/ambre) mais resserre la hiérarchie et améliore les patterns.

**Layout mobile (375 px)** :
1. Topbar 44 px — logo DDM+ à gauche (emerald + slate), 2 icônes actions à droite (favoris, panier avec badge count)
2. Search bar 56 px — input pleine largeur `bg-slate-100 rounded-xl`
3. Hero card 12 px margin — gradient `from-violet-600 to-emerald-600`, radius 16 px, padding 18/16/20
   - Titre "Importez de Chine, à prix usine" — Inter 800 20/24 letter-spacing -0.02em
   - Sous-titre "Sourcing, achats groupés et lots avantageux — livrés au Sénégal."
   - 3 pills "promesse" en `bg-white/14 backdrop-blur`
   - CTA blanc plein "Explorer le catalogue →" Inter 700 12
4. 3 feature banners empilées (card horizontale, icône colorée à gauche)
5. Section "Groupe en cours" — card `bg-gradient-to-br from-emerald-50 to-violet-50`, live badge rouge, barre de progression
6. Grille produits 2 colonnes avec badge "Min. X" ambre
7. Bottom nav 5 items

**Layout desktop (1280 px)** :
- Header 56 px, hero pleine largeur avec 200 px de hauteur, 3 banners en `grid-cols-3` sous le hero

### Direction 02 · Bold ★ (Recommandée) — Marketplace confiance premium

**Purpose** : positionne DDM+ comme marketplace B2B/B2C premium type "Alibaba modernisé" ou "Mercado Libre" pour l'Afrique de l'Ouest. Densité contrôlée, urgence sociale à 6/10, palette signature.

**Layout mobile (375 px)** :
1. **Top strip 26 px** `bg-#0F0F10 text-white` — "DROP #37 · Semaine du 09 sept." + "Livraison Dakar 4-7j"
2. **Topbar 52 px** — logo `DDM+` (le `+` en `#FF4D1F`), favoris + panier avec badge orange
3. **Search bar 8/12 padding** — input `bg-#F5EFE3 rounded-xl` + bouton photo carré noir 38×38 avec ring orange
4. **Hero card** `bg-gradient-to-b from-#1D1B4E to-#0F0F10 rounded-2xl` :
   - Eyebrow "◆ DROP DE LA SEMAINE" orange 9/uppercase/letter-spacing 0.14em
   - Compte à rebours "02j : 14h : 22m" en JetBrains Mono, chip `bg-orange/15 border-orange/35`
   - Titre 3 lignes : "Prix usine. / **Faibles frais.** / Zéro intermédiaire." — Manrope 800 26/26 letter-spacing -0.03em, le mot "Faibles frais" en `#FF4D1F`
   - 3 pillars en grille `grid-cols-3` — chaque pillar : icône + titre + micro
   - CTA principal orange plein "Explorer le drop →" avec `shadow-[0_8px_20px_-8px_rgba(255,77,31,0.7)]`
5. **Trust strip** horizontal-scroll — 5 badges "✓ Inspection Chine", "✓ Escrow", "✓ Mobile Money", "✓ Suivi WhatsApp", "✓ Livraison Dakar & régions"
6. **Section "3 façons d'importer avec DDM+"** :
   - Titre Manrope 800 16
   - 3 cards pillar avec visuel gradient à gauche (96 px) + numéro 01/02/03 + big icon
     - Pillar 1 : gradient `from-#7C3AED to-#4C1D95` (Trouvez-moi / violet)
     - Pillar 2 : gradient `from-#FF4D1F to-#B91C1C` (Groupés / orange-rouge)
     - Pillar 3 : gradient `from-#F59E0B to-#B45309` (Lot min. / ambre)
7. **Section "Groupes actifs maintenant"** — horizontal scroll de cards 160 px :
   - Image aspect-square avec chip `%` noir + label "Bientôt complet" orange si ≥ 80%
   - Titre 2 lignes clamp
   - Progress bar gradient orange→ambre
   - Row : "143/200 pcs" + "-38%" (vert `#0F9D58`)
   - Prix en gros Manrope 800 13 + prix barré
   - Compte à rebours "⏱ 02j 14h 22m" en JetBrains Mono rouge
8. **Section "Populaires cette semaine"** — filtres chips + grille 2 colonnes
   - Chaque card : image, badge MOQ ambre en haut-gauche, badge -X% rouge en haut-droite, titre, prix, "Dès **X pcs** · Y F/pc" en vert
9. **Bottom nav 5 items** avec bouton photo central circulaire orange 44×44 qui déborde vers le haut

**Layout desktop (1280 px)** :
- Top strip noir 32 px
- Header 64 px avec logo, nav 4 items (dont "Trouvez-moi" avec badge "NEW" orange), search bar élargie avec bouton photo intégré, favoris + panier
- Hero 280 px en `grid-cols-[1.3fr_1fr]` : à gauche titre + CTA, à droite pile de 3 data cards flottantes (compte à rebours, "+2143 groupes", "-45%")
- 3 banners en `grid-cols-[2fr_1fr_1fr]` — le premier plus large (Trouvez-moi) car pilier prioritaire

### Direction 03 · Signature — Éditorial confiance · Papier & vert forêt

**Purpose** : positionnement le plus distinctif — DDM+ comme "portail import premium d'Afrique de l'Ouest". Ancrage africain (vert forêt, papier ivoire), typographie soignée, chiffres tous en JetBrains Mono pour un feel B2B / data-transparent.

**Layout mobile (375 px)** :
1. Topbar 52 px sur fond ivoire `#F5F3EE`, logo "DDM+" avec le "D" initial dans un chip vert forêt
2. Hero section (padding 20/14/12) :
   - Eyebrow avec ligne à gauche "Import Chine · Sénégal · Depuis 2023" — JetBrains Mono 10 uppercase
   - Titre "Prix usine. **Livré** au Sénégal." — Manrope 700 30/29 letter-spacing -0.035em, le mot "Livré" en `#0E4635` avec un fond terracotta translucide en `::after`
   - Search bar large avec bouton caméra vert forêt
3. **Stats row** — 3 cards blanches `border-black/8 rounded-xl` : "10 340 Produits", "2 143 Groupes /sem", "-45% Éco. max" (chiffres Manrope 700 16, labels JetBrains Mono 9 uppercase)
4. **Section pillars** "Nos 3 façons d'importer" en liste éditoriale :
   - Chaque item séparé par `border-top-black/10`
   - Numéro 01/02/03 en JetBrains Mono à gauche
   - Icône box carrée 36×36 à droite (couleur par pillar : forest, terracotta, ink)
   - Titre avec un mot mis en vert forêt
5. **Section groupes** — bloc pleine largeur `bg-#0E4635 text-#F5F3EE` (rupture visuelle) :
   - Label "◉ Groupes en cours"
   - Titre "Rejoignez avant la deadline."
   - Cards horizontal-scroll fond ivoire, live badge terracotta pulsant, chiffres en mono
6. **Section "À découvrir"** — grille 2 colonnes de produits avec badge MOQ en typographie noire pure (pas de couleur)
7. Bottom nav 5 items sur fond ivoire

**Layout desktop (1280 px)** :
- Header 64 px sans bordure marquée
- Hero 340 px en `grid-cols-[1.2fr_1fr]` — à gauche titre 60px, à droite un "data panel" vert forêt avec 3 cellules (Groupes actifs 2143 en grand, Éco max -45%, Devis moyen 18h) + indicateur de croissance terracotta

---

## Interactions & Behavior

### Direction 02 · Bold (recommandée pour la suite)

**Compte à rebours du drop (hero)** :
- Format `JJj : HHh : MMm` en JetBrains Mono
- Update toutes les minutes minimum, idéalement chaque seconde en mémoire
- Source : timestamp de fin du drop hebdomadaire (à définir avec backend)

**Compte à rebours cartes groupe** :
- Format `JJj HHh MMm` avec ⏱ devant
- Couleur rouge `#DC2626` en Mono
- Data : `group.deadline` (existe dans `/api/group-orders`)

**Progress bar groupes** :
- `width = (currentQty / targetQty) * 100%`
- Gradient orange→ambre `from-#FF4D1F to-#F59E0B`
- Si `pct >= 80%` : afficher chip "Bientôt complet" en haut-droite de l'image

**Live badge (pulsation)** :
- CSS `animation: pulse 1.5s infinite` sur un dot 5×5 précédant le mot "Live"
- Sur fond vert (`#22c55e`) pour drop hero, ou terracotta pour Signature

**Search bar avec caméra** :
- L'input reste focusable normalement
- Le bouton photo carré ouvre la modale `SourcingRequestModal` (composant existant)

**Bottom nav bouton photo central** :
- Bouton circulaire orange qui déborde de 14 px vers le haut
- Border blanche 3 px pour créer la "notch"
- Ouvre la même modale sourcing

**CTA pillars "→"** :
- Pillar 01 (Trouvez-moi) → ouvre `SourcingRequestModal`
- Pillar 02 (Groupés) → navigue `/achats-groupes`
- Pillar 03 (Lot min.) → scrolle jusqu'à la section MOQ / ouvre bottom sheet "Calculer mon lot"

**Filtres chips** (populaires) :
- État actif : `bg-#0F0F10 text-white`
- État inactif : `bg-white border-#eee5d5 text-#4a453d`

**Hover states** (desktop uniquement) :
- Cards produit : `hover:shadow-lg hover:-translate-y-0.5 transition`
- Boutons CTA : `hover:brightness-95`
- Liens "→" : `hover:gap-2` pour animer l'écart avec la flèche

**Transitions autorisées** (Framer Motion) :
- Fade+slide sur l'entrée des sections au scroll (`whileInView`, `y: 20 → 0`, `duration: 0.4`)
- Pas d'effets tape-à-l'œil — le brief est explicite (max 6/10 d'urgence)

---

## State Management

Les données sont déjà exposées par le backend existant, à ne pas modifier :

| Donnée | Source | Chemin |
| --- | --- | --- |
| Produits populaires | API existante | `/api/catalog/products?sort=popular&limit=8` |
| Groupes actifs | API existante | `/api/group-orders?status=active` |
| Détail groupe | API existante | `/api/group-orders/[groupId]` |
| Panier | localStorage | `cart:items` |
| MOQ par produit | Model | `Product.minOrderQty` |
| Paliers prix | Model | `Product.priceTiers` |
| Cible groupe | Model | `Product.groupBuyTargetQty` |

**States nouveaux à créer côté client** :
- `dropCountdown` : `{ days, hours, minutes }` — dérivé du timestamp de fin du drop hebdo
- `filterActive` : catégorie active dans les chips populaires
- `heroScrolled` : booléen pour animer le hero au scroll (optionnel)

**Modales à câbler** (composants existants) :
- `SourcingRequestModal` — 4 déclencheurs (bouton caméra search, pillar 01, bottom nav center, feature banner 1)
- `PriceCalculatorModal` (à créer si pas déjà présent) — déclenché par pillar 03 et section MOQ

---

## Design Tokens

### Direction 02 · Bold (recommandée)

**Colors — Light mode**
```
--ddm-ink          #0F0F10
--ddm-ink-2        #1D1B4E    /* nuit profonde, sections premium */
--ddm-cream        #FDFBF7    /* background principal */
--ddm-cream-2      #F5EFE3    /* surfaces secondaires (search input, chips) */
--ddm-border       #EEE5D5

--ddm-primary      #FF4D1F    /* orange import, CTA principaux */
--ddm-primary-2    #B91C1C    /* orange foncé pour gradients */
--ddm-community    #7C3AED    /* violet, achats groupés */
--ddm-community-2  #4C1D95
--ddm-moq          #F59E0B    /* ambre, MOQ + lot minimum */
--ddm-moq-2        #B45309
--ddm-success      #0F9D58    /* vert prix, économies */
--ddm-danger       #DC2626    /* urgence, deadlines */
--ddm-live         #22C55E    /* dot "live" */

--ddm-muted        #7A7061
--ddm-body         #4A453D
```

**Colors — Dark mode**
```
--ddm-ink          #F5F3EE    /* inversion */
--ddm-cream        #0F0F10    /* background principal */
--ddm-cream-2      #1A1A1D    /* surfaces secondaires */
--ddm-border       #2A2A2E

--ddm-primary      #FF6B3D    /* légèrement plus lumineux en dark */
--ddm-community    #A78BFA
--ddm-moq          #FBBF24
--ddm-success      #22C55E
--ddm-danger       #F87171

--ddm-muted        #8A857D
--ddm-body         #C7C2B7
```

**Typography**
```
Display : Manrope, weight 700-800, letter-spacing -0.02 à -0.04em
Body    : Inter (ou Manrope 500), weight 400-600
Numbers : JetBrains Mono, weight 500-700 — utilisé pour tous les prix, deadlines, quantités

Sizes mobile :
  h1 hero       : 26/26 (28 px optique)
  h2 section    : 16-20/1.02
  h3 sub        : 13-15/1.15
  body          : 11-12/1.4
  caption/mono  : 9-10/1.2 (mono pour chiffres)

Sizes desktop :
  h1 hero       : 44/1.0
  h2 section    : 20-28/1.05
  body          : 13-15/1.5
```

**Spacing** (Tailwind scale)
```
Mobile page padding : 12 px (px-3)
Card interior       : 10-14 px (p-2.5 à p-3.5)
Section vertical    : 14-20 px (py-3.5 à py-5)
Grid gap            : 8-10 px (gap-2 à gap-2.5)
Desktop page pad    : 32 px (px-8)
```

**Radius**
```
--r-sm   : 6 px    (badges, chips small)
--r-md   : 10-12 px (buttons, chips, inputs)
--r-lg   : 14-16 px (cards)
--r-xl   : 20-24 px (hero, gros modules)
--r-full : 999px    (CTA arrondis, promises)
```

**Shadows**
```
--shadow-cta     : 0 8px 20px -8px rgba(255,77,31,.7)   /* orange glow sous CTA principal */
--shadow-card    : 0 1px 0 rgba(0,0,0,.02), 0 6px 20px -12px rgba(0,0,0,.15)
--shadow-hover   : 0 12px 30px -16px rgba(0,0,0,.25)
```

**Motion**
```
duration-fast   : 150ms
duration-base   : 250ms
duration-slow   : 400ms
easing          : cubic-bezier(0.22, 1, 0.36, 1)   /* ease-out expo-like */
pulse (live)    : 1.5s infinite
```

### Direction 01 · Safe (tokens résumés)

```
Primary  : emerald-600  #059669
Accent   : violet-600   #7C3AED
Warning  : amber-500    #F59E0B
Info     : blue-600     #2563EB
Ink      : slate-900    #0F172A
Surface  : slate-50     #F8FAFC / white
Border   : slate-200    #E2E8F0
Font     : Inter (tout)
Radius   : rounded-xl (12), rounded-2xl (16)
Shadow   : shadow-sm par défaut, shadow-md hover
```

### Direction 03 · Signature (tokens résumés)

```
Primary  : forest       #0E4635
Accent   : terracotta   #E85D2F
Ink      : #0A0A0A
Paper    : #F5F3EE
Stone    : #E8E4DB
Muted    : #8A857D
Fonts    : Manrope (display) + JetBrains Mono (tous chiffres)
Radius   : rounded-xl / rounded-2xl, bordures 1px à la place des ombres
```

---

## Mapping icônes (emoji → lucide-react)

Les mocks utilisent des emojis en placeholders. À remplacer systématiquement :

| Emoji mock | Icône lucide | Usage |
| --- | --- | --- |
| 📸 / 📷 | `Camera` | Trouvez-moi, bouton photo search |
| 👥 | `Users` | Achats groupés |
| 📦 | `Package` / `Boxes` | MOQ / lot minimum |
| 🛒 | `ShoppingCart` | Panier |
| ♡ / ♥ | `Heart` | Favoris |
| ◉ | `User` / `CircleUser` | Compte |
| ⌂ | `Home` | Accueil |
| ◫ | `LayoutGrid` | Catalogue |
| ⌕ | `Search` | Recherche |
| ⏱ | `Clock` / `Timer` | Compte à rebours |
| ✓ | `Check` / `ShieldCheck` | Trust badges |
| 🔥 | `Flame` | Sections "hot", groupes |
| ◆ | `Diamond` (ou petit dot) | Marqueur eyebrow "Drop" |
| → | `ArrowRight` | Liens et CTA |

---

## Assets

Images produit utilisées dans les mocks (licence CC/PD, remplaçables par le vrai catalogue) — stockées dans `assets/img/` du projet source :

| Fichier | Source | Usage dans les mocks |
| --- | --- | --- |
| `product-camera.jpg` | image_search (Aqara Camera, CC) | Groupe caméra IP dôme |
| `product-earbuds.jpg` | image_search (Dreamstime CC) | Écouteurs TWS |
| `product-led.jpg` | image_search (Super Bright LEDs CC) | Ruban LED |
| `product-carmount.jpg` | image_search (Amazon listing CC) | Support MagSafe voiture |
| `product-bag.jpg` | image_search (PickPik CC) | Sac cabas |
| `product-watch.jpg` | image_search (Amazon fitness tracker CC) | Montre connectée |

⚠️ **À remplacer en production** par les vrais visuels du catalogue DDM+. Les images actuelles sont OK pour les mocks mais pas pour la mise en ligne.

**Web fonts à charger** (Bold + Signature) :
```html
<link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet">
```

Ou en Next.js avec `next/font/google` — préférable pour la performance.

---

## Files

Fichiers de design présents dans ce handoff :

- `home-directions.html` — Le fichier principal contenant les 3 directions côte à côte (mobile + desktop pour chacune), avec palette, tokens, notes pro/con et micro-copies par direction.
- `assets/img/*.jpg` — Images produit utilisées dans les mocks (listées ci-dessus).

Pour ouvrir le fichier : ouvrir `home-directions.html` dans un navigateur, tous les styles sont inline. Aucune dépendance JS externe (juste un petit script pour les clics sur les CTA "Choisir cette direction").

---

## Prochaines étapes recommandées

1. **Valider une direction** avec le stakeholder (recommandée : **02 · Bold**).
2. Livrer ensuite les 5 autres écrans dans la direction choisie :
   - Fiche produit (`ProductDetailNew.tsx`) — bloc prix premium avec paliers cliquables et sélecteur quantité intelligent
   - Panier (`panier/page.tsx` + `CartItemCard.tsx`) — dashboard d'achat avec économies affichées et alertes MOQ bloquantes
   - Checkout (`checkout/adresse/page.tsx`) — stepper + décomposition prix transparente + options livraison (Express/Aérien/Maritime)
   - Achats groupés listing (`achats-groupes/page.tsx`)
   - Détail groupe (`achats-groupes/[groupId]/page.tsx`) — hero produit + progression + formulaire de participation + chat
3. Livrer les **variantes dark mode** systématiquement (les tokens dark sont dans les Design Tokens ci-dessus).
4. Écrire les tests E2E marketplace avant merge (`npm run test:e2e`).

---

## Contraintes techniques rappel

- Ne pas toucher au backend, aux modèles (`src/lib/models/*`), aux API (`src/app/api/*`)
- Ne pas modifier le parcours AI/mobile (`mobile/app`)
- Réutiliser les composants structurels : `MarketHeader`, `MarketFooter`, `MarketBottomNav`, `CompactSearchBar`, `CheckoutStepper`, `PriceBreakdown`
- Mobile-first, testé min 320 px
- Accessibilité : contrastes AA minimum, labels ARIA, focus visibles
- Dark mode : toute nouvelle couleur doit avoir son `dark:` (voir tokens ci-dessus)
- Valider avec `npm run type-check`, `npm run test:domains`, `npm run test:boundaries`, `npm run build`
