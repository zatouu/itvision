# Prompt GenSpark — DDM+ Marketplace · Batch 3 (5 écrans restants)

## Contexte

Les Batch 1 (Home, Catalogue, Compte, Mes commandes, Suivi) et Batch 2 (Fiche produit, Panier, Checkout adresse, Achats groupés, Détail groupe) du marketplace DDM+ sont déjà implémentés dans `src/components/market/batch1/`.

Il reste **5 écrans** à designer pour finaliser le parcours client premium. Ces écrans existent déjà en version fonctionnelle basique dans le code, mais ils ne sont pas encore alignés sur la **Direction 01 · Safe** validée.

Backend / API / modèles / routes inchangés. La tâche est uniquement UI/UX : livrer des maquettes haute fidélité (prototype HTML/JSX) prêtes à être recodées dans le codebase.

---

## Direction visuelle validée

**Direction 01 · Safe — Évolution douce de l'existant.**

| Token | Valeur | Usage |
|---|---|---|
| Primary | `emerald-600` `#059669` | CTA, prix, validation, stock |
| Accent | `violet-600` `#7C3AED` | groupes, sourcing, actions secondaires |
| Warning | `amber-500` `#F59E0B` | MOQ, alertes, compte à rebours |
| Info | `blue-600` `#2563EB` | import, suivi, info |
| Danger | `red-600` `#DC2626` | urgence, litige, annulation |
| Fond | `white` / `slate-50` | surfaces |
| Texte | `slate-900` | titres et corps |
| Bordures | `slate-200` | cartes, séparateurs |

- Typographie : **Inter** uniquement.
- Radius : `rounded-xl` (12 px), `rounded-2xl` (16 px), `rounded-3xl` (24 px) pour les héros.
- Ombres : `shadow-sm` par défaut, `shadow-md` au hover.
- Dark mode obligatoire : `dark:bg-slate-900`, `dark:text-slate-100`, `dark:border-slate-800`.
- Icônes : `lucide-react` uniquement. Pas d'emojis, pas de SVG inline.
- Animations : Framer Motion autorisé pour les micro-transitions.

### Composants partagés déjà en place

Utiliser les mêmes patterns que Batch 1 / Batch 2 :

- `MarketHeader`, `MarketFooter`, `MarketBottomNav`
- `CompactSearchBar`
- `ProductCard` (grille, badges MIN X / GROUPE)
- `GroupCard` (avatar, countdown, barre de progression, %)
- `Button` : primary (emerald), secondary (white/border), violet, outline, ghost, dark
- `Icon` : icônes normalisées via `lucide-react`
- `CheckoutStepper` : Panier → Livraison → Paiement
- `PriceBreakdown`
- `Badge` / `Card` / `Section`

Référence de code : `src/components/market/batch1/`.

---

## Livrables attendus

1. Prototype HTML unique `Prototype DDM+ batch3.html` avec navigation latérale entre les 5 écrans.
2. Toggle mobile 375 px / desktop 1280 px.
3. Toggle light / dark.
4. Dossier `proto/screen-*.jsx` avec les composants autonomes.
5. `README.md` décrivant les écrans, les tokens, le mapping icônes et les routes conservées.

---

## Les 5 écrans à designer

Contrainte majeure : **les routes et les labels de boutons ci-dessous doivent être respectés**. Les implémentations existantes utilisent déjà ces URL et ces actions ; la refonte les garde inchangées.

---

### 1 · Paiement succès (`/payment/success?ref=...`)

**Page affichée après validation d'un paiement.**

**État actuel** : `src/app/(market)/payment/success/page.tsx`
- Affiche un check (ou loader si confirmation en cours).
- Titre "Paiement confirmé !" ou "Paiement en cours de confirmation".
- Texte explicatif.
- 3 boutons dynamiques :
  - `Vérifier / réessayer le paiement` → `/paiement/checkout/${reference}`
  - `Retour à l'achat groupé` → `/achats-groupes/${groupId}`
  - `Voir mes commandes` → `/compte/commandes`
  - `Retour à l'accueil` → `/`

**Attendu design** :
- Layout sobre et célébratoire, centré.
- Cercle large avec check emerald animé (Framer Motion scale + opacity).
- Résumé commande : type (groupe ou commande), ID, montant payé, produit(s).
- **Timeline "Prochaines étapes"** 5 pastilles (Commande confirmée → Sourcing → Inspection → Transit → Livré) avec les 2 premières en emerald, les suivantes en slate.
- 2 CTAs principaux :
  - `Voir mes commandes` (primary emerald)
  - `Retour à l'accueil` (secondary)
- Section "Besoin d'aide ?" avec WhatsApp.
- Mobile : empilé, timeline horizontale scrollable. Desktop : card centrée, timeline horizontale compacte.
- Dark mode : fond `slate-900`, card `slate-800`.

---

### 2 · Page boutique / vendeur (`/vendeur/[slug]` et `/boutiques/[shopId]`)

**Page publique d'une boutique ou d'un vendeur.**

**État actuel** :
- `src/app/(market)/vendeur/[slug]/page.tsx` : client-side, fetch `/api/catalog/products?sellerSlug=...`, affiche une liste de produits.
- `src/app/(market)/boutiques/[shopId]/page.tsx` : server-side, fetch `Shop` via Mongoose, puis client `ShopPageClient`.

**Données disponibles** : nom, slug, logo, description, `verified`, rating, `productCount`, liste produits (image, nom, prix, stock).

**Routes conservées** :
- `/vendeur/[slug]`
- `/boutiques/[shopId]`
- Clic produit → `/produits/${id}`

**Attendu design** :
- **Header gradient** violet→emerald avec logo / initiales, nom, badge `Inspecté par DDM+` (usine chinoise) ou `Partenaire local` (shop sénégalais/AO), note étoiles, années, catégories.
- **Tabs** : Produits / Avis / À propos / Conditions.
- Onglet Produits : grille `ProductCard` (2 cols mobile, 4 cols desktop), filtres catégorie, tri.
- Onglet Avis : liste avis clients anonymisés (initiales, note, commentaire, date).
- Onglet À propos : description boutique, badges certification, localisation, contact.
- Onglet Conditions : politique de retour, livraison, paiement.
- **CTA sticky mobile** : `Contacter le vendeur` (secondary) / `Voir les produits`.
- Dark mode : header plus profond, cards `slate-900`.

---

### 3 · Demande sourcing "Trouvez-moi" (`/market/sourcing/[token]`)

**Page publique de suivi d'une demande de sourcing.**

**État actuel** : `src/app/(market)/market/sourcing/[token]/page.tsx`
- Affiche une demande par `publicToken`.
- Statuts : `new`, `searching`, `proposal_ready`, `proposal_sent`, `accepted`, `rejected`, `fulfilled`, `cancelled`, `expired`.
- Colonne gauche : photo, description, quantité, budget, date.
- Colonne droite : proposition avec prix, transport, garantie, boutons `Accepter et payer` / `Discuter avec un conseiller`.
- Timeline statut verticale.

**Routes conservées** :
- `/market/sourcing/[token]`
- CTA accepter : POST `/api/market/sourcing/track/${token}` puis redirection paiement.
- CTA discuter : ouverture WhatsApp.

**Attendu design** :
- **Hero contextuel** : badge statut coloré, titre "Votre demande de sourcing", référence.
- **Carte produit demandé** : image, description, quantité, budget max, délai souhaité.
- **Timeline verticale 5 étapes** : Demande reçue → Recherche en cours → Proposition disponible → En commande → Livré.
- **Carte proposition** (si dispo) :
  - Image produit trouvé, nom, fournisseur.
  - Prix unitaire livré, total, prix marché barré, économie %.
  - Délai, garantie, notes.
  - Boutons `Accepter et payer` (emerald) et `Discuter avec un conseiller` (violet outline).
- **État sans proposition** : illustration + "Notre équipe travaille sur votre demande" + délai SLA.
- **État expiré/refusé** : message explicite + CTA `Nouvelle demande`.
- Mobile : colonnes empilées, timeline verticale. Desktop : grid `[360px_1fr]`.
- Dark mode : cartes `slate-900`, gradients subtils.

**Modale de raccourci (depuis Home / Catalogue)** :
- Bouton photo violet dans la `CompactSearchBar` ouvre une modale.
- Formulaire rapide : photo, lien, texte, budget cible, quantité, délai souhaité.
- 3 étapes visuelles : `Photo / Lien / Texte` → `Devis 24h` → `Commande`.
- Mobile : bottom sheet plein écran. Desktop : modale centrée.

---

### 4 · Tarification / Prix transparent (`/tarification` + `/prix-transparent`)

**Pages explicatives du calcul des prix.**

**État actuel** :
- `src/app/(market)/tarification/page.tsx` : sections Logique des prix, Options transport, Remises pack, Achats groupés, Assurance, CTA final.
- `src/app/(market)/prix-transparent/page.tsx` : exemple concret caméra Hikvision, tarifs dégressifs B2B, poids volumétrique, FAQ.

**Routes conservées** :
- `/tarification`
- `/prix-transparent`
- CTA principal : `Voir le catalogue` → `/produits`
- CTA secondaire : `Retour à l'accueil` → `/`

**Attendu design** :
- **Hero** gradient violet→emerald avec titre "Prix transparent" et promesse "Pas de frais cachés".
- **Décomposition interactive d'un prix type** :
  - Prix usine constaté (barre bleue)
  - Frais de service 10% (barre emerald)
  - Assurance 2% (barre amber)
  - Transport variable (barre violet)
  - Total calculé en live
- **Comparatif Achat seul vs Groupé vs Palier** :
  - 3 colonnes avec exemples chiffrés.
  - Barres visuelles montrant l'économie.
- **Transport cards** : Express / Aérien / Maritime avec icône, délai, coût, idéal pour.
- **Remises par volume** : paliers 1–5 / 6–19 / 20–49 / 50+ avec couleurs progressives.
- **FAQ** accordéon.
- CTA final : `Voir le catalogue` (emerald) + `Demander un sourcing` (violet).
- Mobile : sections empilées, comparatif en cards verticales. Desktop : grid 2-3 cols.
- Dark mode : fond `slate-950`, sections `slate-900`.

---

### 5 · Devenir vendeur / Espace vendeur (`/devenir-vendeur` + `/espace-vendeur`)

**Landing d'inscription vendeur + dashboard vendeur.**

**État actuel** :
- `src/app/(market)/devenir-vendeur/page.tsx` : formulaire nom, description, email, téléphone. CTA `Créer ma boutique`. Redirection `/espace-vendeur`.
- `src/app/(market)/espace-vendeur/page.tsx` : dashboard vendeur avec stats (produits, commandes, en attente, revenus, stock faible), onglets Produits / Commandes, ajustement stock.

**Routes conservées** :
- `/devenir-vendeur`
- `/espace-vendeur`
- Connexion requise : `/login?return=/devenir-vendeur`
- API : `/api/vendor/register`, `/api/vendor/stats`, `/api/vendor/products`, `/api/vendor/orders`

**Attendu design** :

#### `/devenir-vendeur`
- **Landing premium** :
  - Hero "Vendez avec DDM+" : bénéfices (stock local, marge, visibilité).
  - 3 étapes visuelles : `Importez en groupe` → `Recevez le stock` → `Revendez au Sénégal`.
  - Formulaire simple : nom boutique, description, email, téléphone.
  - Card "Comment ça marche ?" avec liste.
  - CTA `Créer ma boutique` (emerald).
- Mobile : hero compact, formulaire empilé. Desktop : 2 cols hero + formulaire à droite.

#### `/espace-vendeur`
- **Dashboard vendeur** :
  - Header avec nom boutique, badge `verified`, note.
  - **Stats cards** 5 colonnes desktop / 2+1 sur mobile : Produits, Commandes, En attente, Revenus, Stock faible.
  - Onglets Produits / Commandes / Avis (pilulier).
  - Liste Produits : image, nom, prix, stock, ajustement `+`/`-`.
  - Liste Commandes : ID, client, date, statut, montant, détail articles.
  - CTA `Ajouter un produit` (emerald) — désactivé visuellement avec badge "Bientôt" si pas actif.
- Dark mode : cards `slate-900`, header gradient foncé.

---

## Contraintes techniques

- **Stack cible** : Next.js 15 App Router, React 19, Tailwind CSS, Framer Motion.
- **Icônes** : `lucide-react` uniquement.
- **Langue** : Français.
- **Responsive** : mobile-first, mobile 375 px, desktop 1280 px, test min 320 px.
- **Dark mode** : chaque écran avec variantes `dark:`.
- **Mock data** full anonymes : "Client A", "Boutique Alpha", "CMD-0001", "DDM-2026-A0F3B1", disclaimer visible "Données de démonstration".
- **Pas de backend / API / modèles / routes à créer ou modifier.**
- **Routes existantes à respecter strictement** (voir section précédente).
- **Pas de SVG inline** : utiliser `lucide-react` ou un placeholder rectangle avec icône.
- **Accessibilité AA** : contrastes, labels ARIA, hit-targets 44 px min.

---

## Validation avant livraison

Dans le README du handoff, indiquer pour chaque écran :
1. Composant(s) React du prototype.
2. Liste des routes et boutons utilisés.
3. Résumé des changements par rapport à l'existant.
4. Copies finales en français.
5. Capture/description du rendu mobile + desktop.
6. Variante dark mode.

---

## Références

- Handoff Batch 1 : `docs/design_handoff_ddm_plus_batch1/README.md`
- Prompt complet : `docs/PROMPT_GENSPARK_DDM_MARKETPLACE_V2.md`
- Implémentation existante : `src/components/market/batch1/`
- Registre de domaines / routes : `src/lib/domains.ts`
- Middleware : `src/lib/middleware/routes.ts`
