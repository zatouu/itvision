# Handoff DDM+ · Batch 3 — Finalisation du parcours (5 écrans)

## Overview

Extension finale du prototype marketplace **DDM+**, direction visuelle **Safe** validée. Ce batch termine le parcours client premium avec les 5 écrans restants demandés dans le brief. Il vient s'ajouter aux **Batch 1** (Home v2, Catalogue, Compte, Mes commandes, Suivi) et **Batch 2** (Fiche produit, Panier, Checkout, Groupes listing, Détail groupe).

**Écrans livrés dans ce Batch 3** :

11. **Paiement succès** — `/payment/success`
12. **Boutique / Vendeur** — `/vendeur/[slug]` + `/boutiques/[shopId]` (avec toggle démo Usine/Partenaire)
13. **Sourcing tracking + modale** — `/market/sourcing/[token]` (avec 2 états démo)
14. **Prix transparent / Tarification** — `/tarification` + `/prix-transparent`
15. **Devenir vendeur + Espace vendeur** — `/devenir-vendeur` + `/espace-vendeur` (2 modes)

**Total prototype : 15 écrans navigables** (5 Batch 1 + 5 Batch 2 + 5 Batch 3), groupés en 3 sections dans la sidebar.

Mock data **anonymisé** (Client A, Boutique Alpha, CMD-0005, PAY-2026-9812AB, SRC-2026-A7F3B1…) + disclaimer permanent "Données de démonstration".

---

## About the Design Files

Prototype HTML + React JSX chargé via CDN. Référence de design **pas du code de production** — à recréer dans le codebase Next.js 15 / React 19 / Tailwind existant avec :
- Icônes `lucide-react` (pas de SVG inline, pas d'emoji)
- Framer Motion pour les micro-transitions
- Composants UI internes (`src/components/ui/*`)
- Composants structurels réutilisés : `MarketHeader`, `MarketFooter`, `MarketBottomNav`, `CompactSearchBar`, `CheckoutStepper`, `PriceBreakdown`, `ProductCard`, `GroupCard`, `Badge`, `Card`, `Section`

---

## Fidelity

Haute fidélité (hi-fi) : palette, tokens, layouts mobile 375 + desktop 1280, comportements interactifs (tabs, filtres, timelines, modales, accordéons, sliders), copies FR finales, dark mode systématique. Les routes existantes sont respectées à la lettre.

---

## Comment ouvrir le prototype

Ouvrez `Prototype DDM+.html` dans un navigateur. La sidebar affiche 3 sections :
- **Batch 1 · Parcours** (01-05) : Accueil, Catalogue, Mon compte, Mes commandes, Suivi commande
- **Batch 2 · Achat** (06-10) : Fiche produit, Panier, Checkout, Groupes, Détail groupe
- **Batch 3 · Finalisation** (11-15) : Paiement succès, Boutique/Vendeur, Sourcing, Prix transparent, Devenir vendeur

Toggle Mobile 375 / Desktop 1280 + Toggle Light / Dark. Persistance en localStorage.

Sur les écrans Batch 3 avec plusieurs états (Boutique, Sourcing, Vendeur), un **bandeau ambre "Démo :"** en haut permet de basculer entre les cas d'usage.

---

# Écrans livrés dans ce Batch 3

## 11 · Paiement succès

**Route** : `/payment/success?ref=...`
**Composant proto** : `proto/screen-payment-success.jsx`
**Fichier codebase** : `src/app/(market)/payment/success/page.tsx`

### Layout

**Desktop** : layout centré `max-w-2xl` sur fond `slate-50` (ou `slate-950` dark).
1. Header réduit (logo DDM+ centré)
2. **Cercle check** — 112×112 gradient `from-emerald-500 to-emerald-600` avec halo `animate-ping` (2s), icône Check strokeWidth 3
3. Eyebrow "PAIEMENT CONFIRMÉ" uppercase emerald + H1 "Merci pour votre commande"
4. Message avec montant en gras + référence en pastille monospace
5. **Card "Prochaines étapes"** — timeline horizontale 5 pastilles (Commande confirmée = done, Sourcing = current ring, les 3 autres slate)
6. Card résumé commande : items compacts, sous-total, date payé, méthode (Wave · **** 4587), livraison prévue
7. Card WhatsApp support
8. 2 CTAs égaux : `Retour à l'accueil` (secondary) + `Voir mes commandes` (primary emerald)

**Mobile** : Stack vertical, cercle 96px, timeline horizontale scrollable.

### Routes / boutons respectés

- `Voir mes commandes` → `/compte/commandes`
- `Retour à l'accueil` → `/`
- `Vérifier / réessayer` (lien secondaire bottom) → `/paiement/checkout/${reference}` (dynamique selon état)
- `Retour à l'achat groupé` (contexte groupe) → `/achats-groupes/${groupId}` — à afficher quand `type === "group"`

### Copies FR

- "Paiement confirmé" (eyebrow)
- "Merci pour votre commande" (H1)
- "Votre paiement de {montant} a bien été reçu. Vous recevrez une confirmation par SMS et par email."
- "Prochaines étapes"
- "Livraison prévue le {date}"
- "Un problème avec ce paiement ? Vérifier ou réessayer"

### Changements vs existant

- Ajout d'une **timeline "Prochaines étapes"** claire (5 pastilles)
- Passage d'un check simple à un check animé avec halo et taille 112px
- Résumé de commande visuellement segmenté (items + décomposition prix + méthode paiement)
- Card WhatsApp dédiée au lieu d'un simple lien
- Hiérarchie CTA : 2 boutons primaires, le lien "Vérifier" en discret

---

## 12 · Boutique / Vendeur

**Routes** : `/vendeur/[slug]` et `/boutiques/[shopId]`
**Composant proto** : `proto/screen-shop.jsx`
**Fichiers codebase** : `src/app/(market)/vendeur/[slug]/page.tsx`, `src/app/(market)/boutiques/[shopId]/page.tsx`

### Layout

**Header shop** (mobile compact, desktop rounded-3xl) :
- Background gradient personnalisé par type (`from-violet-700 via-violet-600 to-emerald-600` pour usine ; `from-emerald-600 via-emerald-500 to-amber-500` pour partenaire), dot pattern 15%
- Avatar carré 80×80 (initiales boutique)
- Row de badges :
  - `Inspecté par DDM+` (icône `factory`) OU `Partenaire local` (icône `mapPin`)
  - `Vérifié` emerald si `verified`
- H1 nom boutique (20px mobile / 32px desktop)
- Note + reviewCount + ans d'activité + location
- Chips catégories

**Body** :
- 4 tabs : Produits (count) / Avis (count) / À propos / Conditions
- **Onglet Produits** : chips catégorie horizontaux + count + grille 2 cols mobile / 4 cols desktop de `ProductCard`
- **Onglet Avis** : liste anonymisée (initiales avatar, `Client A/B/C`, note étoiles, date, texte) — state vide si 0 avis
- **Onglet À propos** : description + grid 4 stats (Produits, Note, Réponse, À l'heure) + certifications (Inspection trimestrielle DDM+ / Escrow / Contrôle qualité) + localisation
- **Onglet Conditions** : 4 cards (Retour, Livraison, Paiement, Garantie)

**Mobile** : sticky bottom CTA `Contacter` + `Voir produits`
**Desktop** : sidebar droite 320px sticky avec temps de réponse, taux à l'heure, catalogue count + `Contacter le vendeur` (emerald WhatsApp) + `Suivre la boutique`

### Routes / boutons respectés

- `Contacter le vendeur` → ouverture WhatsApp
- Clic sur `ProductCard` → `/produits/${id}`
- Navigation retour : header back button

### 2 types de vendeurs

Le prototype expose un toggle démo `Usine / Partenaire` qui bascule entre :

| Attribut | Usine chinoise | Partenaire local |
|---|---|---|
| Badge | `Inspecté par DDM+` + icône `factory` | `Partenaire local` + icône `mapPin` |
| Location | Guangzhou, Chine | Dakar, Sénégal |
| Gradient | violet → emerald | emerald → amber |
| Certifs | Inspection trimestrielle + Contrôle qualité avant expédition | Adresse et pièces vérifiées + Escrow |
| Temps réponse | < 2h | < 30min |
| Ans d'activité | 8 | 3 |

### Changements vs existant

- **Nouveau design premium** avec header gradient et distinguo visuel usine/partenaire
- **Tabs** au lieu d'une simple liste
- Ajout **Avis clients** anonymisés
- Ajout **À propos + certifications**
- Ajout **Conditions** (retour, livraison, paiement, garantie)
- Sidebar contact vendeur sur desktop
- Sticky bottom CTA sur mobile

---

## 13 · Sourcing tracking + Modale raccourci

**Route** : `/market/sourcing/[token]`
**Composant proto** : `proto/screen-sourcing.jsx`
**Fichier codebase** : `src/app/(market)/market/sourcing/[token]/page.tsx`

### Layout — Page de suivi

**Hero contextuel** :
- Badge statut coloré (emerald pour `proposal_ready`, blue pour `searching`, etc.)
- Timestamp de création
- H1 "Votre demande de sourcing"
- Token en monospace

**Layout mobile** : sections empilées.
**Layout desktop** : grid `[360px_1fr]`.

**Card "Votre demande"** (colonne gauche desktop) :
- Photo aspect video du produit demandé
- Description
- Grid 3 stats : Quantité / Budget max / Délai

**Timeline verticale 5 étapes** :
1. Demande reçue
2. Recherche en cours (violet + ping si current)
3. Proposition disponible
4. En commande
5. Livré

**Card proposition (si dispo)** — encadrée emerald gradient :
- Header avec chip "Proposition trouvée" + badge % économie
- Image produit + nom + fournisseur (avec check vérifié)
- Bloc prix : Prix unitaire livré (emerald) + Prix marché barré + Total emphasé
- Grid 3 : Délai / Garantie / MOQ
- Card notes du conseiller
- 2 CTAs : `Accepter et payer · {total}` (primary emerald) + `Discuter avec un conseiller` (violet outline)

**État "En recherche" (sans proposition)** :
- Icône search violet dans cercle
- "Notre équipe travaille sur votre demande"
- Chip SLA `24h`
- CTA `Contacter mon conseiller` WhatsApp

### Modale raccourci (accessible depuis Home / Catalogue / search bar)

- **Mobile** : bottom sheet plein largeur `rounded-t-3xl`, max-h 92%
- **Desktop** : modale centrée 560px `rounded-2xl`
- Header : icône Camera violet + "Sourcing sur demande · Trouvez-moi ce produit" + close
- 3 étapes visuelles en pastilles violet : Photo/Lien/Texte → Devis 24h → Commande
- Zone d'upload dashed border (photo + lien accepté)
- Textarea description
- Grid 3 : Quantité / Budget/pc / Délai
- Bandeau emerald reassurance "24h ouvrées · sans engagement"
- Footer : Annuler (secondary) + `Envoyer la demande` (violet)

### Routes / boutons respectés

- `Accepter et payer` → POST `/api/market/sourcing/track/${token}` puis redirection paiement
- `Discuter avec un conseiller` → ouverture WhatsApp
- Modale → à câbler avec le composant `SourcingRequestModal` existant

### Statuts supportés

- `new`, `searching`, `proposal_ready`, `proposal_sent`, `accepted`, `rejected`, `fulfilled`, `cancelled`, `expired` — chaque statut a son mapping badge (tone + icône + label)

### Changements vs existant

- Design cohérent avec le Batch 1 (timeline verticale identique au Suivi commande)
- Card proposition emphasée avec badges et prix hiérarchisés
- État sans proposition avec SLA visible
- Modale raccourci créée pour être accessible depuis n'importe où (Home, Catalogue, header)

---

## 14 · Prix transparent / Tarification

**Routes** : `/tarification` + `/prix-transparent` (mêmes composants, contenus similaires — fusion recommandée)
**Composant proto** : `proto/screen-pricing.jsx`
**Fichiers codebase** : `src/app/(market)/tarification/page.tsx`, `src/app/(market)/prix-transparent/page.tsx`

### Sections (ordre)

1. **Hero** rounded-3xl gradient violet→emerald, chip "Zéro frais caché", H1 "Prix transparent, calculé au FCFA près"
2. **Décomposition interactive** :
   - Slider prix usine (5 000 - 50 000 F)
   - Card total emerald grosse taille
   - 4 barres animées : Prix usine (blue) / Frais service 10% (emerald) / Assurance 2% (amber) / Transport (violet) avec % de chaque
3. **Comparatif 3 façons** — 3 cards `grid-cols-3` :
   - Achat seul (slate)
   - Achat groupé (violet, encadré `ring-4 ring-violet-500/10`, badge "⭐ Recommandé")
   - Prix par palier (amber)
   - Chaque card : icône, titre, description, prix/pc, total pour qty simulée, barre visuelle savings
4. **Transport** — 3 cards : Express aérien / Aérien standard / Maritime (badge "Idéal en groupe" violet)
5. **Remises par volume** — table 4 paliers (1-5 / 6-19 / 20-49 / 50+) avec palier 20-49 highlight "Populaire"
6. **FAQ accordéon** — 5 questions (calcul prix / paiement échelonné / assurance / achat groupé / moyens paiement)
7. **CTA final** — bloc emerald gradient `Voir le catalogue` + `Demander un sourcing`

**Desktop** : grid `[1fr_360px]` après les 3 premières sections (Transport + FAQ à gauche, Tiers en sidebar sticky).
**Mobile** : sections empilées avec padding.

### Routes / boutons respectés

- `Voir le catalogue` → `/produits`
- `Retour à l'accueil` → `/` (implicite dans le CTA final via secondary — remplacé ici par sourcing)
- `Demander un sourcing` → ouvre modale sourcing

### Copies FR

- "Prix transparent, calculé au FCFA près"
- "Zéro frais caché"
- "Comment votre prix se compose"
- "Ajustez le prix usine pour voir l'impact en direct"
- "3 façons d'obtenir le meilleur prix"
- "Le prix baisse dès que vous augmentez"

### Changements vs existant

- **Fusion pédagogique** des 2 routes (tarification + prix-transparent)
- **Décomposition interactive** avec slider (nouvelle mécanique)
- **Comparatif visuel** 3 cards avec recommandation
- **FAQ accordéon** au lieu de sections statiques
- CTA final gradient emerald sur bloc dédié

---

## 15 · Devenir vendeur + Espace vendeur

**Routes** : `/devenir-vendeur` + `/espace-vendeur`
**Composant proto** : `proto/screen-vendor.jsx` (2 modes : landing / dashboard)
**Fichiers codebase** : `src/app/(market)/devenir-vendeur/page.tsx`, `src/app/(market)/espace-vendeur/page.tsx`

### 15a · Landing `/devenir-vendeur`

**Hero desktop** grid 2 cols :
- Colonne gauche : chip "Devenez vendeur", H1 44px "Vendez avec DDM+", promesse, grid 3 stats (Marge +45%, Setup 10min, Commission 0%)
- Colonne droite : formulaire dans card `bg-white/10 backdrop-blur border-white/20` avec CTA blanc `Créer ma boutique`

**Hero mobile** : compact 28px + description, formulaire dans une section en dessous.

**Sections body** :
1. **3 étapes** : Importez en groupe → Recevez le stock → Revendez (icônes emerald)
2. **Bénéfices** — card emerald bg avec 6 checkmarks (Prix usine sans intermédiaire, Logistique inclue, Assurance 2%, Visibilité 10 000+ clients, Escrow, Support 7j/7)
3. **Formulaire mobile** en card (nom, description, email, téléphone) — dupliqué depuis le hero desktop

### 15b · Dashboard `/espace-vendeur`

**Header** :
- Bandeau `from-slate-900 to-slate-800` (dark)
- Avatar boutique + nom "Boutique Alpha" + badge Vérifié + note + Membre depuis
- Desktop : boutons `Voir ma boutique` + `Paramètres`

**Stats** :
- Grid 5 cols desktop / 3 cols mobile
- Produits (24 slate) / Commandes (47 emerald) / En attente (3 amber) / Revenus (1 245 000 F violet) / Stock faible (5 red)

**Tabs** : Produits / Commandes / Avis

**Onglet Produits** :
- Header : count + bouton `Ajouter` désactivé avec badge "BIENTÔT"
- Liste 5 items : image + nom + catégorie + prix emerald + stepper stock (avec label "Bas" rouge si `lowStock`)

**Onglet Commandes** :
- Cards : ID monospace + Badge statut (pending amber / shipped blue / delivered emerald) + Client anonyme + count articles + date + montant
- CTAs : `Détail` + `Expédier` si pending

**Onglet Avis** : état vide (icône étoile grise, "Aucun avis pour le moment")

### Routes / boutons respectés

- `/devenir-vendeur` → formulaire → POST `/api/vendor/register` → redirection `/espace-vendeur`
- `/espace-vendeur` → GET `/api/vendor/stats`, `/api/vendor/products`, `/api/vendor/orders`
- Connexion requise pour `/devenir-vendeur` : `/login?return=/devenir-vendeur`
- Bouton `Ajouter un produit` visuellement désactivé + badge "BIENTÔT" (aligné sur état réel du backend)

### Copies FR

- "Vendez avec DDM+"
- "Importez en groupe, recevez le stock à Dakar, revendez avec marge"
- "Créer ma boutique"
- "En créant votre boutique, vous acceptez nos CGV vendeurs"
- "Espace vendeur · Boutique Alpha"

### Changements vs existant

- Landing devient une **vraie page marketing** (au lieu d'un simple formulaire)
- 3 étapes visuelles + bénéfices en 6 checkmarks
- Dashboard avec **stats colorées par tone** (émeraude/ambre/violet/rouge)
- **Badge "BIENTÔT" visible** sur bouton Ajouter pour indiquer l'état à venir
- Dark mode complet pour dashboard vendeur

---

## Design Tokens (rappel Direction Safe)

```
Primary   emerald-600  #059669    CTA, prix, validation
Accent    violet-600   #7C3AED    groupes, sourcing
Warning   amber-500    #F59E0B    MOQ, alertes
Info      blue-600     #2563EB    import, suivi
Danger    red-600      #DC2626    urgence, litige

Font      Inter uniquement
Radius    rounded-xl (12) / rounded-2xl (16) / rounded-3xl (24) pour hero
Shadow    shadow-sm par défaut, shadow-md hover
Dark      dark:bg-slate-900, dark:text-slate-100, dark:border-slate-800
```

Zones colorées dark : `dark:bg-emerald-950/40 dark:border-emerald-900` (idem violet/amber/red/blue).

---

## Nouveaux composants réutilisables (à extraire)

- **`SuccessCheck`** — cercle animé check + halo `animate-ping` (à réutiliser sur toutes les confirmations)
- **`Timeline`** (horizontale ou verticale) — pastilles étapes emerald/slate avec lignes reliantes (déjà utilisé dans Batch 1 Suivi, Paiement succès, Sourcing)
- **`FAQAccordion`** — accordéon avec Plus/Minus icons
- **`PriceBreakdownBars`** — décomposition avec barres animées par catégorie
- **`ComparisonCards`** — 3 cards avec ring recommandation
- **`ShopHeader`** — header avec gradient personnalisé + toggle badges usine/partenaire
- **`SourcingModal`** — modale bottom-sheet mobile / dialog desktop réutilisable depuis toute la marketplace
- **`VendorStatsGrid`** — grid de mini-cards colorées par tone

---

## Files

Prototype cliquable :

- `Prototype DDM+.html` — Entrée principale
- `proto/shared.jsx` — Icônes + mocks anonymisés (avec nouveaux : `PAYMENT_SUCCESS`, `SHOPS`, `SOURCING_REQUESTS`, `SOURCING_STEPS`, `VENDOR`)
- `proto/shell.jsx` — Shell 3 batches groupés
- `proto/screen-*.jsx` — 15 fichiers écrans (5 par batch)
- `assets/img/product-*.jpg` — images produit mock

---

## Contraintes techniques (rappel)

- **Stack** : Next.js 15 App Router · React 19 · Tailwind CSS · Framer Motion autorisé
- **Icônes** `lucide-react` uniquement
- **Langue** française
- **Responsive** mobile-first, min 320px
- **Dark mode** obligatoire, systématique
- **Backend / API / modèles / routes** inchangés
- **Routes existantes respectées à la lettre** (voir sections par écran)
- **Mock data** anonymisé partout + disclaimer visible dans le shell du prototype
- **Accessibilité AA** : contrastes, labels ARIA, hit-targets 44px min

---

## Prochaines étapes possibles

Le parcours client premium est **complet** (15 écrans). Pistes d'itération :

1. **Onboarding** premier lancement (3-4 slides expliquant les 3 piliers)
2. **Favoris** (liste des produits sauvegardés)
3. **Mes adresses** (gestion carnet d'adresses)
4. **Mes demandes sourcing** (liste des demandes personnelles)
5. **Recherche vocale** ou par photo (fonctionnalité)
6. **Notifications** center

Ces écrans ne sont pas dans le scope du brief mais peuvent être ajoutés au proto sur demande.
