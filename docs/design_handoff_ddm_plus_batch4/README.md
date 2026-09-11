# Handoff DDM+ · Batch 4 — Post-achat critique (6 écrans)

## Overview

Redesign des **6 écrans critiques post-achat** du marketplace DDM+ sous la Direction 01 · Safe. Ces écrans remplacent les pages legacy `gray-*`/emoji/SVG inline actuelles et s'alignent sur les 15 écrans déjà livrés (Batch 1-3).

**Écrans livrés dans ce Batch 4** :

16. **Paiement checkout** — `/paiement/checkout/[reference]`
17. **Paiement annulé** — `/payment/cancel`
18. **Détail commande** — `/commandes/[orderId]` (4 onglets + chat floating)
19. **Retour produit** — `/commandes/[orderId]/retour` (variant `retour`)
20. **Litige commande** — `/suivi/[reference]/litige` (variant `litige`)
21. **Réclamer commande** — `/compte/reclamer-commande` (variant `reclamation`)

**Total prototype : 21 écrans** groupés en 4 batches dans la sidebar.

**Composant partagé clé** : `ScreenFormRequest` — un seul composant qui gère les 3 formulaires (litige / réclamation / retour) via la prop `variant`. Chaque variant a ses champs spécifiques (retour = sélection articles + choix remboursement/échange ; litige = urgence).

Mock data anonymisé, disclaimer permanent "Données de démonstration".

---

## About the Design Files

Prototype HTML + React JSX chargé via CDN. Référence de design **pas du code de production** — à recréer dans le codebase Next.js 15 / React 19 / Tailwind existant avec :
- Icônes `lucide-react` (pas de SVG inline, pas d'emoji)
- Framer Motion pour les micro-transitions
- Composants UI internes (`src/components/ui/*`)
- Composants structurels réutilisés : `MarketHeader`, `MarketFooter`, `MarketBottomNav`, `CheckoutStepper`, `PriceBreakdown`, `Badge`, `Card`, `Section`, `OrderChat`, `PushNotificationButton`

---

# Détails par écran

## 16 · Paiement checkout `/paiement/checkout/[reference]`

**Fichiers codebase** : `src/app/(market)/paiement/checkout/[reference]/page.tsx`, `src/components/payment/CheckoutInterface.tsx`
**Composant proto** : `proto/screen-payment-checkout.jsx`

### Layout desktop

- `MarketHeader` + `CheckoutStepper` "Panier ✓ → Livraison ✓ → **Paiement**"
- Grid `[1fr_400px]` :
  - **Left col** :
    - Bloc **Montant à payer** — gradient emerald `p-6 rounded-2xl` avec label uppercase blanc/80, montant `text-[42px]` tabular-nums, référence à droite en font-mono
    - Card "Choisissez un mode de paiement" avec **grid 2 cols** de 4 tuiles (Wave / Orange Money / Free Money / Virement bancaire)
    - Chaque tuile : logo carré coloré (bleu Wave, orange OM, rose Free, slate wire), label extrabold, sub, radio circulaire à droite
    - **Instructions dynamiques** selon méthode sélectionnée :
      - Wave/OM/Free : encadré slate avec liste ordonnée (Ouvrez app → Envoyez X F à Y → Renseignez votre numéro) + numéro marchand copiable
      - Virement : encadré bleu avec IBAN mono + mention "Référence : PAY-XXXX obligatoire"
    - Champ téléphone (indicatif +221 pré-rempli, tabular-nums) — masqué si virement
    - Card WhatsApp support emerald
  - **Right col (sticky)** :
    - Card récapitulatif : items compacts (image + count sur badge + nom + variante + prix) + décomposition (Sous-total / Service 4% / Assurance / Transport / Économie emerald) + Total XL emerald
    - CTA principal `Payer {montant}` XL emerald pleine largeur avec icône Lock
    - Note "Escrow · débité après réception"

### Layout mobile

- Header compact + Stepper
- Bloc gradient emerald montant (mx-4)
- Section méthodes (stack vertical, `space-y-2`)
- Section instructions
- Section téléphone
- Section récap
- **Sticky bottom bar** : bouton `Payer {montant}` emerald + note sécurité

### Méthodes de paiement (données)

```
Wave         · #00B0F0 · Instant · Sans frais         · +221 78 000 00 00
Orange Money · #FF6600 · Instant · Frais standards    · +221 77 111 11 11
Free Money   · #CD0067 · Instant · Frais standards    · +221 76 222 22 22
Virement     · slate-700 · 24-48h · Pour gros volumes · IBAN SN12 0001 2345…
```

### Routes / boutons respectés

- CTA `Payer {montant}` → déclenche le flow selon provider (existant)
- Bouton `Copier` sur numéro marchand → copy to clipboard
- Bouton WhatsApp support → `openWhatsApp(supportPhone, message)`

### Changements vs existant

- Header custom remplacé par `MarketHeader` + `CheckoutStepper`
- Montant XL affiché dans un gradient emerald (au lieu d'un simple texte)
- Méthodes en tuiles 2 cols au lieu d'un select
- Instructions dynamiques par provider (au lieu d'un texte statique)
- CTA sticky mobile
- Dark mode complet

---

## 17 · Paiement annulé `/payment/cancel`

**Fichier codebase** : `src/app/(market)/payment/cancel/page.tsx`
**Composant proto** : `proto/screen-payment-cancel.jsx`

### Layout

- Layout centré `max-w-2xl` sur fond `slate-50`/`slate-950`
- **Cercle X** gradient `from-red-500 to-red-600`, 96px mobile / 112px desktop, ombre rouge
- Eyebrow rouge "PAIEMENT ANNULÉ" + H1 "Votre paiement a été annulé"
- Message reassurant : "**Aucune somme n'a été débitée.** Vous pouvez réessayer…"
- Référence en pastille monospace
- Card recap commande (ID + badge "En attente" ambre + montant à régler + info "48h pour finaliser")
- Card **Raisons possibles** en slate-50 (3 items avec icônes X rouges)
- 2 CTAs : `Continuer mes achats` (secondary) + `Réessayer le paiement` (primary emerald + icône refresh)
- Card WhatsApp support emerald

### Routes / boutons respectés

- `Réessayer le paiement` → `/paiement/checkout/[reference]`
- `Continuer mes achats` → `/produits`
- `Contact` support → `openWhatsApp()`

### Changements vs existant

- Card message unique de contrôle → composition premium avec 4 sections
- Icône X grande + halo au lieu d'un simple icône inline
- Section "Raisons possibles" pédagogique
- Récap montant à régler visible pour rassurer

---

## 18 · Détail commande `/commandes/[orderId]`

**Fichiers codebase** : `src/app/(market)/commandes/[orderId]/page.tsx` (1300+ lignes actuellement — à refactoriser), `src/components/OrderChat.tsx`
**Composant proto** : `proto/screen-order-detail.jsx`

### Layout desktop / mobile

**Header** :
- Back button + ID commande
- Ligne info : Badge statut + N° tracking mono + bouton Copier
- H1 "Commande CMD-XXXX"
- Sub : date de commande + livraison prévue emerald
- À droite : Total payé XL emerald

**Tabs pilulier** `bg-slate-100 p-1` (desktop) / underline (mobile) — 4 onglets avec icônes :
1. **Récapitulatif** (`fileText`)
2. **Suivi** (`truck`)
3. **Livraison** (`mapPin`)
4. **Actions** (`helpCircle`)

### Onglet 1 · Récapitulatif

- Card **Articles** : header count + total pcs, divide list avec image 56×56, nom, variante, prix unitaire × qty, total item
- Card **Décomposition prix** : sous-total, service 4%, assurance, transport, **Économie réalisée** (encart emerald), Total XL emerald, ligne info paiement

### Onglet 2 · Suivi

- Bloc gradient emerald "Étape 3/5 · Inspection qualité" avec chip Live pulsant + ETA + N° suivi
- Card **Historique détaillé** — timeline verticale 5 étapes (identique au ScreenTracking Batch 1) :
  - Pastilles emerald avec check si done, ring si current pulsant, slate si future
  - Ligne verticale reliante emerald/slate
  - Titre étape + date à droite + description
  - L'étape courante encadrée emerald bg

### Onglet 3 · Livraison

- Card **Adresse** avec icône bleue mapPin — nom, ligne1, ligne2, ville, téléphone
- Card **Transporteur** — nom, contact, dernière mise à jour emerald, N° suivi mono avec bouton Copier
- Card **Livraison prévue** — icône ambre clock + fenêtre emerald XL + note "SMS 1h avant"

### Onglet 4 · Actions

- 6 boutons cards empilés :
  - `Contacter le support` (emerald primary highlight) — WhatsApp
  - `Répéter la commande` (refresh)
  - `Demander un retour` (package) → `/commandes/[id]/retour`
  - `Ouvrir un litige` (info) → `/suivi/[id]/litige`
  - `Télécharger la facture` (fileText) — PDF
  - `Partager la commande` (share)

### Floating Chat Panel

- **Bouton flottant** bottom-right 56×56 emerald avec badge non-lus rouge
- Sur clic : panneau plein écran mobile / dialog 400px desktop
- Structure : header (icône + "Chat support" + statut Live) → messages scrollables (bulles user à droite emerald, support à gauche blanc/dark avec tag "DDM+ Support" + check) → input + bouton send
- Le composant existant `OrderChat` peut être intégré dans ce panneau

### Routes / boutons respectés

- `Copier` N° tracking → `navigator.clipboard`
- Actions → routes existantes ou modales
- `PushNotificationButton` : à intégrer dans l'onglet Actions ou en floating

### Changements vs existant

- **1300 lignes → 4 onglets clairs** (Récap / Suivi / Livraison / Actions)
- Header structuré avec badge + tracking + total
- Timeline verticale identique au reste du parcours (cohérence)
- Chat en floating panel (au lieu d'inline)
- Icônes lucide, dark mode systématique

---

## 19-20-21 · Formulaires partagés (`ScreenFormRequest`)

**Composant proto** : `proto/screen-form-request.jsx`
**Wrappers** : `ScreenClaimRetour`, `ScreenClaimLitige`, `ScreenClaimReclamation`

Un seul composant, 3 variants via prop `variant: "litige" | "reclamation" | "retour"`.

### Structure commune

- Header avec `MarketHeader` + titre selon variant
- **Header card** : icône colorée (tone par variant : red/amber/violet) + label uppercase + H1 + sub descriptif
- Body form empilé :
  1. **Référence commande** — pré-remplie (litige, retour) ou champ libre monospace (réclamation)
  2. **Articles à retourner** (retour uniquement) — sélection multiple avec stepper quantité + total sélectionné
  3. **Motif** — radios en cards `border-2` (couleur emerald si sélectionné)
  4. **Remboursement / Échange** (retour uniquement) — 2 tuiles 50/50
  5. **Niveau d'urgence** (litige/réclamation uniquement) — 3 chips (Faible slate / Normal emerald / Urgent red)
  6. **Description** — textarea 5 lignes
  7. **Pièces jointes** — zone dashed border avec icône upload emerald
  8. **Téléphone** — indicatif +221 pré-rempli
  9. **Banner SLA** coloré par variant : "Réponse sous 24h ouvrées"
- **Sticky bottom bar** : `Annuler` (secondary) + `{submitLabel}` (primary avec icône Send)
- Sur submit : **écran de succès** avec check emerald animé + ref DEM-XXXX + 2 CTAs (Nouvelle demande / Voir mes commandes)

### 19 · Retour `/commandes/[orderId]/retour`

- **Variant** : `retour`
- **Icône hero** : `refresh` violet
- **Champs spécifiques** :
  - Sélection multiple articles avec quantités
  - Choix Remboursement (icône wallet) OR Échange (icône refresh)
- **Motifs** : Défectueux / Non conforme / Ne convient pas / Endommagé livraison / Changement d'avis
- **CTA** : "Envoyer la demande de retour"

### 20 · Litige `/suivi/[reference]/litige`

- **Variant** : `litige`
- **Icône hero** : `info` red
- **Référence pré-remplie** (depuis URL)
- **Motifs** : Commande jamais reçue / Produits endommagés / Mauvais article / Articles manquants / Non conforme / Autre
- **Urgence** activée
- **CTA** : "Ouvrir le litige"

### 21 · Réclamation `/compte/reclamer-commande`

- **Variant** : `reclamation`
- **Icône hero** : `helpCircle` amber
- **Référence à saisir** (champ libre monospace)
- **Motifs** : Commande absente / Mauvais compte / Paiement fait mais non confirmé / Autre
- **Urgence** activée
- **CTA** : "Envoyer la réclamation"

### Routes / boutons respectés

- Chaque route reste séparée côté Next.js — le composant partagé est instancié avec la bonne prop
- Submit → API existante (POST vers endpoint spécifique)

### Changements vs existant

- **3 pages en 1 composant** (mutualisation code + design)
- Champs spécifiques par variant (retour ≠ litige/réclamation)
- Formulaire premium avec cards empilées, radios visuels, upload dashed, sticky footer
- Écran de succès animé cohérent avec le Paiement succès (Batch 3)
- Dark mode complet

---

## Design Tokens (rappel Safe)

```
Primary   emerald-600  #059669    CTA, prix, validation
Accent    violet-600   #7C3AED    groupes, sourcing, retour
Warning   amber-500    #F59E0B    MOQ, réclamation, en attente
Info      blue-600     #2563EB    tracking, adresse, virement
Danger    red-600      #DC2626    urgence, litige, annulation

Font      Inter uniquement
Radius    rounded-xl / rounded-2xl / rounded-3xl
Shadow    shadow-sm par défaut, shadow-md hover
Dark      systématique sur toutes surfaces
```

---

## Nouveaux composants réutilisables (à extraire)

- **`PaymentMethodTile`** — tuile radio-like avec logo carré coloré + label + radio circle
- **`OrderStatusBadge`** — mapping statut → tone/icon/label (ordered/sourcing/china/transit/delivered/cancelled)
- **`OrderTabs`** — pilulier desktop / underline mobile avec icônes lucide
- **`FloatingChatButton`** — FAB bottom-right avec badge non-lus
- **`ChatPanel`** — dialog droite desktop / bottom-sheet mobile avec messages bulles alignés user/support
- **`ClaimForm`** — le `ScreenFormRequest` factorisé (variant prop)
- **`SlaBanner`** — banner coloré par variant avec icône clock + copie SLA

---

## Files

```
Prototype DDM+.html
proto/
  shared.jsx                 — Icônes + mocks (avec Batch 4 : PAYMENT_METHODS, ORDER_DETAIL, CLAIM_CONTEXT)
  shell.jsx                  — Shell 4 batches
  screen-home.jsx            — Batch 1
  screen-catalog.jsx         — Batch 1
  screen-account.jsx         — Batch 1
  screen-orders.jsx          — Batch 1
  screen-tracking.jsx        — Batch 1
  screen-product.jsx         — Batch 2
  screen-cart.jsx            — Batch 2
  screen-checkout.jsx        — Batch 2
  screen-groups.jsx          — Batch 2
  screen-group-detail.jsx    — Batch 2
  screen-payment-success.jsx — Batch 3
  screen-shop.jsx            — Batch 3
  screen-sourcing.jsx        — Batch 3
  screen-pricing.jsx         — Batch 3
  screen-vendor.jsx          — Batch 3
  screen-payment-checkout.jsx — Batch 4 · NOUVEAU
  screen-payment-cancel.jsx   — Batch 4 · NOUVEAU
  screen-order-detail.jsx     — Batch 4 · NOUVEAU
  screen-form-request.jsx     — Batch 4 · NOUVEAU (composant partagé + 3 wrappers)
assets/img/product-*.jpg
```

---

## Contraintes techniques (rappel)

- **Stack** : Next.js 15 App Router · React 19 · Tailwind CSS · Framer Motion autorisé
- **Icônes** `lucide-react` uniquement (pas de SVG inline, pas d'emoji)
- **Langue** française
- **Responsive** mobile-first, min 320px
- **Dark mode** obligatoire, systématique
- **Backend / API / modèles / routes** inchangés
- **Ne pas casser le paiement Wave/OM/Free** : la sélection provider et les numéros marchands restent inchangés (lire depuis `readPaymentSettings()`)
- **Mock data** anonymisé + disclaimer visible dans le shell
- **Accessibilité AA** : contrastes, labels ARIA, hit-targets 44px min

---

## Commit suggéré

```
feat(market): redesign premium DDM+ batch 4 — post-achat et litiges

- Redesign /paiement/checkout/[reference] avec ScreenPaymentCheckout
  (tuiles Wave/OM/Free/virement, montant XL emerald, instructions dynamiques)
- Redesign /payment/cancel avec X animé et raisons pédagogiques
- Redesign /commandes/[orderId] en 4 onglets (Récap/Suivi/Livraison/Actions)
  + floating chat panel intégrant OrderChat
- Ajoute ScreenFormRequest partagé (variants : litige / reclamation / retour)
- Redesign /commandes/[orderId]/retour, /suivi/[reference]/litige,
  /compte/reclamer-commande
```

---

## Prochaines étapes

Batch 5 (à planifier) — pages restantes du prompt initial :
- **P1 restants** : `/compte/profil`, `/compte/achats-groupes`, `/achats-groupes/nouveau`, `/retrouver-ma-commande`, `/suivi`
- **P2** : `/produits/compare`, `/produits/favoris`, `/market/boutiques`, `/market/compte`, `/market/creer-compte`
- **P3** : `/corporate-produits`, `/corporate-produits/[id]`, `/grains`

Total prototype après Batch 5 : ~34 écrans (21 actuels + 13 restants).
