# Handoff : DDM+ Marketplace — 5 écrans premium (Direction Safe)

## Overview

Refonte UI/UX **premium** de 5 écrans du marketplace **DDM+ (Dieund Dal Ma)** — plateforme d'import direct Chine → Sénégal / Afrique de l'Ouest.

Direction visuelle validée : **01 · Safe** (évolution douce de la charte existante — émeraude/violet/ambre/bleu, Inter, rounded-xl/2xl, shadow-sm).

**Écrans livrés dans ce handoff** :

1. **Fiche produit** — `src/components/product/ProductDetailNew.tsx`
2. **Panier** — `src/app/(market)/panier/page.tsx` + `src/components/cart/CartItemCard.tsx`
3. **Checkout adresse** — `src/app/(market)/checkout/adresse/page.tsx`
4. **Achats groupés (listing)** — `src/app/(market)/achats-groupes/page.tsx`
5. **Détail groupe** — `src/app/(market)/achats-groupes/[groupId]/page.tsx`

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
- Comportements interactifs : quantités, paliers, formulaires, filtres, chat
- Layouts mobile 375px + desktop 1280px

**Ce qui reste à faire en dev** :

- Adapter le rendu aux composants `src/components/ui/*` existants
- Remplacer les SVG inline par des icônes `lucide-react`
- Câbler les vraies données API (`/api/catalog/products`, `/api/group-orders`, panier `localStorage cart:items`)
- Framer Motion pour les transitions (fade+slide au scroll, updates de progress bar)
- Tester en 320px min et sur les vrais devices Android low-end

---

## Comment ouvrir le prototype

Ouvrez `Prototype DDM+.html` dans un navigateur — tout est chargé via CDN (React 18.3.1, Babel Standalone, Tailwind Play). L'app a :

- **Sidebar de navigation** avec les 5 écrans numérotés (01 à 05)
- **Toggle Device** : Mobile 375 × 760 (frame téléphone) / Desktop 1280 (frame browser)
- **Toggle Thème** : Light / Dark
- **Persistance** : le dernier écran + device + thème sont conservés en localStorage

Chaque écran est un composant React autonome dans `proto/screen-*.jsx` qui accepte une prop `device: 'mobile' | 'desktop'` et adapte son rendu.

---

## Écran 1 · Fiche produit

**Purpose** : raconter l'offre en un flux : prix unitaire → MOQ → économies palier → groupe → transport → ajout panier.

### Layout mobile (375)

1. **Header** compact avec bouton retour + partage + favoris (pas de recherche)
2. **Galerie** aspect 4:3 :
   - Badges superposés en haut à gauche : `Fournisseur vérifié` (emerald), `Lot min. 5` (amber)
   - Badge `-34%` en haut à droite (red)
   - Compteur `1/4` en bas centre
   - Vignettes thumbnails scrollables sous la galerie
3. **Titre / rating** : Brand uppercase, titre H1 extrabold, étoiles + rating + reviews + ventes
4. **Bloc prix premium** (section dédiée) :
   - Prix unitaire `text-emerald-600 text-[28px] font-extrabold`
   - Prix de base barré + `-X%`
   - Info "Prix unitaire · faibles frais de service inclus"
   - **Card MOQ expandable** amber : "Lot minimum 5 unités · Pourquoi ce minimum ?" → dépliable en tap
   - **Section Prix par palier** : 3 cards cliquables (5-9 / 10-24 / 25+) — palier actif border/bg emerald
   - **Bandeau incitatif** emerald : "Ajoutez X unités pour débloquer −Y%"
5. **Card Achat groupé** (si actif) — gradient violet↔emerald :
   - Header : icône users + "Achat groupé actif" + "27 personnes ont rejoint" + `LiveDot`
   - Progress bar (mixed gradient) avec `X/200 unités · 72 %`
   - 3 chiffres : Prix groupe · Économie · Deadline
   - 2 CTA : `Rejoindre` (violet) + `Créer un groupe` (secondary)
6. **Configuration** : pills variantes cliquables (border emerald quand sélectionné)
7. **Quantité** : stepper − / X / +
   - Le `−` est disabled tant que `qty <= minOrderQty`
   - "Total (X pcs)" à droite
   - Ligne "Vous économisez X F vs prix de base" en emerald si applicable
8. **Onglets** : Description / Expédition / Avis
9. **Trust strip** 4 items 2×2 (Escrow / Livraison / Inspection / WhatsApp)
10. **Produits souvent achetés ensemble** — grille 2 col
11. **Sticky bottom bar** au-dessus du bottom nav :
    - Ligne 1 : "Total X F · N pcs" + "Éco. Y F"
    - Ligne 2 : bouton WhatsApp carré + Ajouter (outline emerald) + Acheter (primary emerald)

### Layout desktop (1280)

- Header avec logo + nav (Catalogue, Groupes, Trouvez-moi) + search + heart + cart
- Breadcrumb `Accueil > Catalogue > Sécurité > Caméras IP`
- Grid 2 colonnes `[1fr_400px]` :
  - **Gauche** : Card galerie + Card tabs (Description | Expédition | Avis avec grid détaillé)
  - **Droite (sticky)** : Card pricing complète (identique mobile mais tailles agrandies) + Card groupe
- Section "Trust strip" 4 cols
- Section "Souvent achetés ensemble" 4 cols

### Micro-copies

- "Prix unitaire · faibles frais de service inclus"
- "Lot minimum 5 unités · Pourquoi ce minimum ?"
- "Un lot minimum permet à notre équipe de sourcing en Chine de négocier directement avec l'usine. Sans ce minimum, les frais fixes de transport et d'inspection rendraient l'import plus cher qu'un achat local."
- "Ajoutez 3 unités pour débloquer −13%"
- "Vous économisez 48 000 F vs prix de base"
- "27 personnes ont déjà rejoint"

### Comportements clés

- `qty` initial = `minOrderQty`
- Le stepper `−` est disabled à `qty <= minOrderQty`
- Cliquer un palier fixe `qty = tier.from`
- Le prix affiché = palier applicable pour la qty courante
- L'expandable MOQ toggle en tap simple

---

## Écran 2 · Panier

**Purpose** : dashboard d'achat optimisé — MOQ visible, économies affichées, groupes proposés.

### Layout mobile (375)

1. **Header** : bouton retour + "Mon panier" + icônes standard
2. **Alerte MOQ globale** (bannière amber en haut) si au moins 1 article sous son minimum :
   - "Lot minimum non atteint" + "N article à compléter avant le checkout"
3. **Section articles** :
   - Compteur "3 articles"
   - Liste de `CartItemCard`
4. **CartItemCard structure** :
   - Top row : image 80×80 + [nom clamp 2 lignes + variante en dessous + icône poubelle à droite]
   - Row badges : `Lot min. X` (amber ou red si sous minimum) + `Groupe actif` (violet) si applicable
   - Row bottom : stepper qty + prix total (Y F) + "X F × N" en dessous
   - **Sous-carte alerte MOQ** (si `qty < minOrderQty`) : bandeau amber "Ajoutez K unités pour atteindre le lot minimum" + bouton "Ajouter"
   - **Sous-carte palier** (si proche du next tier ≤ 5) : bandeau emerald "Ajoutez K unités pour débloquer −Y%" + bouton "Compléter"
   - **Sous-carte groupe** (si `hasActiveGroup`) : bandeau violet gradient avec icône + "Rejoindre le groupe : X F/pc · Économisez Y F sur ce lot" + bouton "Voir"
5. **Section "Complétez votre lot"** — suggestions 2 col
6. **Section "Groupes actifs pour vos produits"** — cards horizontales avec CTA "Rejoindre"
7. **Sticky bottom** :
   - Total en gros + N pcs + "Éco. X F" en emerald
   - Bouton "Commander →" primary (disabled si MOQ non atteint)

### Layout desktop (1280)

- Header + breadcrumb
- Titre "Mon panier" + link "← Continuer mes achats"
- Grid 2 colonnes `[1fr_400px]` :
  - **Gauche** : Alerte MOQ (bannière large) + Liste CartItemCard + Section suggestions "Complétez votre lot" 4 col + Section "Groupes actifs pour vos produits" 2 col
  - **Droite (sticky)** : Card Récapitulatif complet
    - Sous-total (N pcs)
    - Frais de service 4%
    - Assurance import
    - Transport estimé
    - Économie paliers (bandeau emerald)
    - Total en gros
    - Card violette "Économisez jusqu'à X en achat groupé"
    - Alerte MOQ bloquante (si applicable)
    - CTA "Passer à la caisse" primary large (disabled si MOQ non atteint)
    - Trust icons (Escrow / Mobile Money / WhatsApp)
    - Card "Code promo" en dessous

### Micro-copies

- "Ajoutez K unités pour atteindre le lot minimum"
- "Ajoutez K unités pour débloquer −Y%"
- "Rejoindre le groupe : X F/pc · Économisez Y F sur ce lot"
- "Lot minimum non atteint · N article à compléter avant le checkout"
- "Économisez jusqu'à X F en achat groupé — N articles ont un groupe actif compatible"

### Comportements clés

- Un article `qty < minOrderQty` → **checkout disabled** + bordure `amber-400` sur la carte + sous-carte d'alerte
- Bouton "Ajouter" complète directement au minimum ou au palier suivant
- Bouton "Voir" ouvre la page détail groupe

---

## Écran 3 · Checkout adresse

**Purpose** : rassurer et clarifier — piliers MOQ / groupe / transparence prix visibles.

### Layout mobile (375)

1. Header : bouton retour + "Livraison"
2. **Stepper** en haut de page : ✓ Panier → ● Livraison → 3 Paiement
3. **Section Adresse de livraison** :
   - Nom complet
   - Téléphone `🇸🇳 +221 · 77 123 45 67`
   - Grid Région / Département / Quartier (selects autocomplete)
   - Adresse libre (rue, N°, point de repère)
   - **Placeholder carte** avec pin "Almadies, Dakar"
4. **Section Mode d'expédition** — 3 cards empilées :
   - Express aérien (4-7j · 24 500 F)
   - Standard aérien (8-12j · 12 500 F) — sélectionné par défaut
   - Maritime (35-45j · 4 200 F) avec **badge violet "Idéal en groupe"**
5. **Section Votre commande** — Card récapitulative :
   - Liste articles compacte avec image + badge count + badge MOQ + variante + prix
   - Sous-total, service 4%, assurance, transport
   - Ligne verte "Économie réalisée" si palier ou groupe
   - Total à payer en gros
   - Note "Escrow — débité seulement après réception"
6. **Trust strip** compact
7. **Sticky bottom** : Total à payer + bouton "Aller au paiement →"

### Layout desktop (1280)

- Header + Stepper (largeur pleine)
- Grid 2 colonnes `[1fr_400px]` :
  - **Gauche** : Card Adresse + Card Mode d'expédition (3 cards en `grid-cols-3`) + Trust strip
  - **Droite (sticky)** : Récapitulatif + CTA "Aller au paiement" + note sécurité

### Comportements clés

- La sélection du mode d'expédition met à jour le total en direct
- Le badge "Idéal en groupe" sur Maritime est purement informatif

### Micro-copies

- "Escrow — débité seulement après réception"
- "Idéal en groupe" (sur mode Maritime)
- "Paiement sécurisé · Escrow Mobile Money"
- "Depuis Guangzhou, Chine — inspection incluse"

---

## Écran 4 · Achats groupés (listing)

**Purpose** : expérience "drop / flash sale" contrôlée (urgence 6/10) — compte à rebours, progression, participants.

### Layout mobile (375)

1. Header : bouton retour + icônes standards
2. **Hero** violet→emerald gradient full-width :
   - Badge "En direct" en pastille blanche translucide
   - Titre "Achats groupés" + "Jusqu'à -45%" (emerald-300)
   - Sous-titre "Rejoignez un groupe existant ou créez le vôtre. Plus on est nombreux, moins c'est cher."
   - 3 stats en cards translucides : Actifs · Participants · Éco. moyenne
   - CTA blanc "+ Créer un groupe"
3. **Barre filtres** sticky top :
   - Chips catégorie scrollables horizontal (Tous / Sécurité / Audio / …)
   - Row : "N groupes" + tri dropdown "Populaires"
4. **Grille cards 2 col** :
   - Image 4:3 avec badge Live/Presque plein en haut-gauche
   - Padding : catégorie uppercase + countdown à droite en rouge
   - Titre 2 lignes clamp
   - Progress bar mixed + `X/200 pcs · Y%`
   - Prix violet en gros + `-Z%` en emerald
   - Bouton "Rejoindre" violet pleine largeur
5. **Section Simulateur MOQ** (fond blanc) :
   - Titre + sous-titre
   - Slider quantité (5 → 50, accent emerald)
   - 3 mini cards : Prix/pc · Total · Économie (emerald)
   - CTA "Créer un groupe à ce prix"
6. Bottom nav

### Layout desktop (1280)

- Header + hero rounded-3xl avec stats à droite en pile
- Filtres + tri sur une ligne
- Grille cards **3 col**
- Simulateur en `[1fr_auto]` avec 3 cards prix à droite + 2 CTA en bas

### Comportements clés

- Filtres par catégorie côté client
- Slider met à jour prix palier en direct
- Cards cliquables → détail groupe

### Micro-copies

- "Achats groupés · Jusqu'à -45%"
- "Rejoignez un groupe existant ou créez le vôtre"
- "Presque plein" (badge red si ≥ 80%)
- "Live" (badge blanc + dot rouge pulsant)
- "Simulateur — quel prix pour votre lot ?"

---

## Écran 5 · Détail groupe

**Purpose** : conversion groupée avec urgence + confiance + preuve sociale.

### Layout mobile (375)

1. Header : bouton retour + bouton partage
2. **Hero produit** :
   - Image 4:3 + badge "Achat groupé" violet en haut-gauche + countdown en haut-droite
   - Titre produit + prix violet 28px + prix barré + `-34%`
   - Sub "Prix débloqué à la clôture du groupe"
3. **Progression du groupe** — Card gradient violet→emerald :
   - Header : `● Live` "GROUPE EN COURS" + countdown
   - `72%` progression en gros + "57 unités restantes" à droite en red
   - Progress bar `!h-3`
   - 3 chiffres : Engagés · Objectif · Personnes
   - Note "3 personnes ont rejoint dans la dernière heure"
4. **Comment ça marche ?** — 3 étapes en grid :
   - 01 Rejoignez le groupe (users)
   - 02 Payez à la clôture (wallet)
   - 03 Recevez livré (truck)
5. **Rejoindre** — Formulaire :
   - Nom, Téléphone (+221), Quantité stepper
   - Récap dans un rounded-xl slate-50 : Prix groupe · Sous-total · Économie
   - CTA "Rejoindre pour N pcs" violet full-width
   - Note "Aucun débit tant que le groupe n'est pas complet"
6. **Inviter** — Card avec URL "market.itvisionplus.sn/g/…" + bouton "Copier" + 3 boutons WhatsApp / Facebook / SMS
7. **Participants** — Card avec avatars initials + noms + timing + `X pcs`
8. **Chat du groupe** — Modéré par DDM+, messages support en emerald, input + bouton send
9. Trust strip
10. **Sticky bottom** : `X/Y pcs · Z%` + prix violet + bouton "Rejoindre" violet

### Layout desktop (1280)

- Header + breadcrumb
- Grid 2 colonnes `[1fr_400px]` :
  - **Gauche** :
    - Card hero split 2 col : image à gauche, titre/prix/**Progression** à droite
    - Card "Comment ça marche ?" 3 cols
    - Grid `Participants | Chat` 2 col
    - Trust strip
  - **Droite (sticky)** : Formulaire de participation + Card partage

### Comportements clés

- Le CTA "Copier" affiche un état "Copié ✓" pendant 1.5s
- Le stepper quantité recalcule le sous-total et l'économie en direct
- Le chat est une preview — message support tagué "Support" en emerald

### Micro-copies

- "Prix débloqué à la clôture du groupe"
- "3 personnes ont rejoint dans la dernière heure"
- "Aucun débit tant que le groupe n'est pas complet"
- "Rejoignez, plus vous êtes nombreux, plus le prix baisse"
- "Modéré par DDM+ · N membres"

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
Surface   white / slate-50  #F8FAFC
```

### Colors — Dark mode

```
Primary   emerald-500  #10B981   (hover emerald-400)
Accent    violet-500   #8B5CF6
Warning   amber-400    #FBBF24
Info      blue-500     #3B82F6
Danger    red-400      #F87171

Ink       white / slate-100
Muted     slate-400    #94A3B8
Border    slate-800    #1E293B
Surface   slate-950 / slate-900

/* Éléments teintés dark */
Emerald bg soft : bg-emerald-950/40  border-emerald-900
Violet bg soft  : bg-violet-950/40   border-violet-900
Amber bg soft   : bg-amber-950/40    border-amber-900
Red bg soft     : bg-red-950/40      border-red-900
```

### Typography

```
Font family : Inter (uniquement)
Sizes mobile :
  h1 titre  : 19-22 px, font-extrabold 800, leading-tight, tracking-tight -0.02em
  h2 section: 14-16 px, font-extrabold 800
  h3 card   : 13 px,    font-extrabold 800
  body      : 12-13 px, font-medium 500 à font-semibold 600
  label     : 11 px,    font-bold, uppercase, letter-spacing 0.05em (tracking-wider)
  caption   : 10-11 px, font-semibold
Prices      : tabular-nums, extrabold, 15-28 px
```

### Spacing

```
Mobile page padding    : 16 px (px-4)
Card interior          : 12-16 px (p-3 à p-4)
Section vertical       : 16-20 px (py-4 à py-5)
Grid gap products      : 12 px (gap-3)
Desktop page padding   : 24 px (px-6), max-w-6xl (1152)
```

### Radius

```
--r-md  : 8-10 px (buttons small, chips)
--r-lg  : 12 px   (rounded-xl — inputs, buttons md)
--r-xl  : 16 px   (rounded-2xl — cards)
--r-full: 999px   (badges pills, avatars)
```

### Shadows

```
default   : shadow-sm  (0 1px 2px rgba(0,0,0,.05))
hover     : shadow-md  (0 4px 6px -1px rgba(0,0,0,.1))
elevated  : shadow-lg
Sticky bottom bar : shadow-none + border-t
```

### Motion (Framer Motion recommandé)

```
duration-fast : 150ms  (hover, focus)
duration-base : 250ms  (state transitions)
duration-slow : 400ms  (page transitions, entrées)
easing        : [0.22, 1, 0.36, 1] (ease-out expo)
pulse (live)  : 1500ms infinite, opacity .35 ↔ 1
```

---

## Mapping icônes (SVG inline prototype → lucide-react)

| Nom prototype | Lucide-react | Usage |
| --- | --- | --- |
| `home` | `Home` | Bottom nav accueil |
| `grid` | `LayoutGrid` | Bottom nav catalogue |
| `users` | `Users` | Groupes, participants |
| `cart` | `ShoppingCart` | Panier |
| `user` | `User` | Compte |
| `search` | `Search` | Recherche |
| `heart` | `Heart` | Favoris |
| `camera` | `Camera` | Sourcing "Trouvez-moi" |
| `package` | `Package` | MOQ, colis |
| `boxes` | `Boxes` | Lot |
| `clock` | `Clock` | Compte à rebours |
| `check` | `Check` | Validation |
| `checkCircle` | `CheckCircle2` | Inspection, trust |
| `shield` | `ShieldCheck` | Sécurité paiement |
| `truck` | `Truck` | Livraison |
| `plane` | `Plane` | Expédition aérienne |
| `ship` | `Ship` | Expédition maritime |
| `chevronRight` / `Left` / `Down` | `ChevronRight` / `Left` / `Down` | Navigation |
| `arrowRight` / `Left` | `ArrowRight` / `Left` | CTA |
| `plus` / `minus` | `Plus` / `Minus` | Steppers |
| `x` | `X` | Close |
| `trash` | `Trash2` | Supprimer |
| `info` | `Info` | Info bulle |
| `sparkles` | `Sparkles` | Économies, promo |
| `flame` | `Flame` | Hot, urgence |
| `target` | `Target` | Objectif |
| `mapPin` | `MapPin` | Adresse |
| `wallet` | `Wallet` | Paiement |
| `lock` | `Lock` | Sécurité |
| `send` | `Send` | Chat send |
| `share` | `Share2` | Partage |
| `copy` | `Copy` | Copier lien |
| `message` | `MessageSquare` | Chat |
| `whatsapp` | `MessageCircle` ou icône custom `si-whatsapp` | WhatsApp support |
| `moon` / `sun` | `Moon` / `Sun` | Dark mode toggle (interne au proto) |
| `smartphone` / `monitor` | `Smartphone` / `Monitor` | Interne au proto |
| `filter` | `SlidersHorizontal` | Filtres |
| `star` | `Star` | Rating |

---

## Format FCFA

Le prototype utilise :
```js
const fmtFCFA = (n) =>
  new Intl.NumberFormat("fr-FR").format(n).replace(/\s/g, "\u202F") + "\u00A0F";
```
Les espaces sont remplacés par des espaces fines insécables (U+202F) pour éviter que le nombre wrap sur 2 lignes dans les cards étroites. À conserver.

---

## Assets

Images produit utilisées dans les mocks (licence CC/PD, à remplacer par le catalogue réel) — dans `assets/img/` :

| Fichier | Produit mock |
| --- | --- |
| `product-camera.jpg` | Caméra IP dôme 4MP (produit principal) |
| `product-earbuds.jpg` | Écouteurs sans fil TWS |
| `product-led.jpg` | Ruban LED RGB COB 5m |
| `product-carmount.jpg` | Support voiture MagSafe |
| `product-bag.jpg` | Sac cabas |
| `product-watch.jpg` | Montre connectée fitness |

⚠️ **À remplacer en production** par les vrais visuels du catalogue DDM+.

---

## Files

Le prototype cliquable :

- `Prototype DDM+.html` — Entrée principale (ouvrir dans un navigateur)
- `proto/shared.jsx` — Icônes SVG inline, composants partagés (Button, Badge, Card, ProgressBar, CountdownChip, LiveDot, MarketHeader, MarketBottomNav, Section, TrustStrip), formatter FCFA, données mock (PRODUCT, CART, GROUPS)
- `proto/screen-product.jsx` — Écran 1 · Fiche produit
- `proto/screen-cart.jsx` — Écran 2 · Panier
- `proto/screen-checkout.jsx` — Écran 3 · Checkout adresse
- `proto/screen-groups.jsx` — Écran 4 · Achats groupés listing
- `proto/screen-group-detail.jsx` — Écran 5 · Détail groupe
- `proto/shell.jsx` — Shell du prototype (navigation, toggles device/dark, frame device)

---

## Résumé des changements par écran vs existant

### Fiche produit
- **Nouveau** : bloc prix premium avec paliers cliquables + badge MOQ expandable
- **Nouveau** : bandeau incitatif "Ajoutez X unités pour −Y%"
- **Nouveau** : Card achat groupé intégrée à la fiche
- **Nouveau** : sélecteur quantité avec bornage MOQ et calcul économie en direct
- **Amélioré** : sticky bottom bar mobile (WhatsApp / Ajouter / Acheter en 1 ligne)
- **Amélioré** : tabs simplifiées (Description / Expédition / Avis)
- **Amélioré** : trust strip 4 items

### Panier
- **Nouveau** : `CartItemCard` avec badge MOQ + sous-cartes alertes MOQ / palier / groupe
- **Nouveau** : alerte MOQ globale bloquante en haut (checkout disabled)
- **Nouveau** : incitations personnalisées "Ajoutez K unités" avec bouton d'application directe
- **Nouveau** : section "Groupes actifs pour vos produits"
- **Nouveau** : récap desktop sticky avec économie totale + potentiel groupe
- **Supprimé** : compteur "5 articles pour le minimum" confus → remplacé par incitations par produit

### Checkout adresse
- **Nouveau** : Stepper visuel Panier → Livraison → Paiement
- **Nouveau** : options livraison en 3 cards avec badge "Idéal en groupe" sur Maritime
- **Nouveau** : décomposition transparente (sous-total, service 4%, assurance, transport, économie)
- **Nouveau** : ligne "Économie réalisée" si palier/groupe
- **Amélioré** : formulaire adresse Région → Département → Quartier avec placeholder carte
- **Amélioré** : trust banner (Escrow / Suivi / WhatsApp)

### Achats groupés listing
- **Nouveau** : Hero "Achats groupés — Jusqu'à -45%" avec 3 stats en direct
- **Nouveau** : filtres catégorie + tri
- **Nouveau** : cards groupe avec compte à rebours en temps réel, progress bar animée, badge "Presque plein" ≥ 80%
- **Nouveau** : simulateur MOQ intégré avec slider
- **Fix** : les badges affichent maintenant les **quantités** (X/200 pcs) et non les participants (bug prod)

### Détail groupe
- **Nouveau** : Hero produit avec prix actuel groupe et prix barré
- **Nouveau** : Card progression avec 72% en gros + restant en rouge
- **Nouveau** : 3 étapes "Comment ça marche ?" visuelles
- **Nouveau** : formulaire participation simple (nom, tel, quantité) avec récap économie en direct
- **Nouveau** : liste participants anonymisés (initials)
- **Nouveau** : chat groupe modéré avec badge "Support" pour DDM+
- **Nouveau** : Card partage avec URL copiable + boutons WhatsApp/Facebook/SMS
- **Nouveau** : Sticky bottom mobile "Rejoindre maintenant"

---

## Contraintes techniques rappel

- Next.js 15 App Router, React 19, Tailwind CSS, Framer Motion autorisé
- **Icônes** : `lucide-react` uniquement (voir mapping)
- **Langue** : Français
- **Responsive** : mobile-first, min 320px, breakpoint md à 768px
- **Dark mode** : obligatoire pour chaque écran (`dark:` variants systématiques)
- **Pas de backend / API / modèles modifiés**
- **Pas de nouvelle route** sans mise à jour de `src/lib/domains.ts`
- **Réutiliser** : `MarketHeader`, `MarketFooter`, `MarketBottomNav`, `CompactSearchBar`, `CheckoutStepper`, `PriceBreakdown`
- **Accessibilité** : contraste AA min, labels ARIA, focus visibles, hit-targets 44 px min sur mobile

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

1. **Panier** — c'est le composant qui bloque le checkout par MOQ, tout le reste en dépend
2. **Fiche produit** — met en évidence les 3 piliers
3. **Checkout** — dépend du panier
4. **Détail groupe** — expérience conversion
5. **Achats groupés listing** — page d'atterrissage

Chaque écran peut être livré en PR indépendante — les composants partagés (`Badge`, `Button`, `CountdownChip`, `LiveDot`, `ProgressBar`, `TrustStrip`) peuvent être extraits en atomic components dans `src/components/ui/*` en amont.
