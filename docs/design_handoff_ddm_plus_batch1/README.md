# Handoff DDM+ · Batch 1 — Home v2 + 4 nouveaux écrans

## Overview

Extension du prototype marketplace **DDM+** (import Chine → Sénégal / AO), direction visuelle **Safe** validée. Ce batch introduit :

1. **Home v2** — hero Variante D (validée) : 3 pills stats, mosaïque 3×2 best-sellers en fondus rotatifs, ticker "En direct · Groupes en cours"
2. **Catalogue / Recherche** — sidebar filtres desktop (catégorie, prix, MOQ, groupe, vérifié, économie), tri, grille 4 cols, state vide
3. **Compte client dashboard** — profil anonymisé, stats, prochaine livraison, programme Grains, raccourcis, WhatsApp
4. **Mes commandes** — tabs (Toutes / En cours / Livrées), mini-timeline par carte, statuts colorés
5. **Suivi commande** — timeline verticale 5 étapes, placeholder map animée Guangzhou → Dakar, n° de suivi mono, WhatsApp

Le prototype conserve les 5 écrans du **Batch 2 (Base)** déjà livrés : Fiche produit, Panier, Checkout adresse, Achats groupés listing, Détail groupe.

**Mock data anonymisé** : profils "Client A/B/C", commandes "CMD-0001..0004", disclaimer "Données de démonstration" visible dans la sidebar du proto.

---

## About the Design Files

Prototype HTML + React JSX chargé via CDN (React 18.3.1, Babel Standalone, Tailwind Play). Référence de design **pas du code de production** — à recréer dans le codebase Next.js 15 / React 19 / Tailwind existant avec les composants UI internes, icônes `lucide-react`, et Framer Motion pour les transitions.

---

## Écrans livrés dans ce batch

### 1 · Home v2 — Variante D

**Composants concernés** : `src/app/(market)/market/page.tsx`, `src/components/home/*` (`HeroCarousel.tsx`, `FeatureBanners.tsx`, `GroupBuySection.tsx`, `SourcingOnDemand.tsx`, `CompactSearchBar.tsx`).

**Layout desktop (1280)** :

1. **Hero card** (rounded-3xl overflow-hidden, bordé, shadow-sm) contenant :
   - **Bloc principal violet gradient** (`from-violet-600 via-violet-700 to-emerald-600`, dot pattern 15%, `min-h-[500px]`)
     - Grid 2 cols `[1.15fr_1fr]` items-start, padding `px-10 pt-8 pb-10`
     - **Left col** (texte remonté) :
       - Row de 3 pills data en `bg-white/15 border-white/25 rounded-full` :
         - `● 2 143 groupes actifs` (dot emerald qui pulse)
         - `−35% économie moyenne`
         - `18h devis sourcing`
       - H1 52px extrabold `leading-[0.98] tracking-tight` : "Importez de Chine, à **prix usine**." — "prix usine" en `text-emerald-300`
       - Paragraphe max-w-md 15px `text-white/85`
       - Row de 3 pills features avec icônes Camera/Users/Package
       - 2 CTAs : `bg-white text-slate-900` "Explorer le catalogue →" et `bg-white/10 border-white/25` "📷 Trouvez-moi"
     - **Right col — Mosaïque 3×2 best-sellers** :
       - Header : chip "● Best sellers" + link "Voir tout →"
       - Grid `grid-cols-3 grid-rows-2 gap-2.5 h-[360px]`
       - 6 tiles produit avec :
         - Image plein cadre, gradient noir en bas
         - Badge `MIN X` amber ou `GROUPE` violet en haut-gauche
         - Bottom : catégorie uppercase / nom (3 mots) / prix `text-emerald-300` bold
         - **Animation `fadeInOut 12s`** avec `animationDelay` échelonné (0s, 1.5s, 3s…) — les tiles pulsent/rétablissent en asynchrone pour un effet "vitrine vivante"
   - **Ticker horizontal** sombre en bas (`bg-slate-900 border-t border-white/10`) :
     - Left : "🔥 En direct — Groupes en cours" (label rouge pulsant + titre)
     - Right : ticker qui défile à gauche (`ticker-left 45s linear infinite`), pause au hover, avec fondus latéraux
     - Chaque card ticker (260px) : avatar rond groupe, countdown rouge + %, nom, prix violet + prix barré, bouton "Rejoindre" violet ou "Presque plein" rouge
     - Contenu dupliqué 2x pour la boucle infinie
2. **3 façons d'importer** — 3 cards en `grid-cols-3` (Sourcing violet / Groupes emerald / Lot amber)
3. **Catégories** — `grid-cols-8` avec compteur produits par catégorie
4. **Sourcing + MOQ side-by-side** — grid-cols-2, cards violette et ambre
5. **Populaires** — `grid-cols-6` ProductCard
6. **Trust strip** — 4 cols
7. **Testimonials** — `grid-cols-3` avec témoignages anonymisés
8. **Footer** minimal

**Layout mobile (375)** :

- Header + search bar sticky avec bouton photo violet
- Hero rounded-2xl compact avec pills stats en flex-wrap + H1 28px + 2 CTAs
- **Section "⭐ Best sellers"** — horizontal-scroll de 6 ProductCard (150px width) — pas de mosaïque en mobile
- **Bandeau "En direct · Groupes en cours"** — label rouge pulsant + horizontal-scroll de 3 cards groupe compact (avatar rond, prix + countdown + CTA "Rejoindre" ou "Presque plein")
- 3 façons d'importer (stack vertical)
- Catégories `grid-cols-4`
- Sourcing / MOQ / Trust / Testimonials
- Bottom nav

**CSS animations à ajouter globalement** :

```css
@keyframes fadeInOut {
  0%, 30%   { opacity: 1; transform: scale(1); }
  40%, 55%  { opacity: 0.35; transform: scale(0.98); }
  65%, 100% { opacity: 1; transform: scale(1); }
}
.fade-rotate { animation: fadeInOut 12s ease-in-out infinite; }

@keyframes tickerLeft {
  0%   { transform: translateX(0); }
  100% { transform: translateX(-50%); }
}
.ticker-left { animation: tickerLeft 45s linear infinite; }
.ticker-container:hover .ticker-left { animation-play-state: paused; }

@keyframes pulse-slow { 0%,100% { opacity:1 } 50% { opacity:.4 } }
.animate-ping-slow { animation: pulse-slow 1.5s ease-in-out infinite; }
```

---

### 2 · Catalogue / Recherche

**Route** : `src/app/(market)/produits/page.tsx` (existante).

**Layout desktop** :

- Search bar sticky en haut (`top-16`) sur toute la largeur : input + bouton photo violet + `<select>` tri à droite
- Sous la search : chips filtres actifs + "Tout effacer"
- Grid principal `[240px_1fr]` :
  - **Sidebar filtres** (sticky, rounded-2xl) :
    - **Catégorie** : liste verticale avec compteurs, item actif emerald
    - **Prix** : slider single (0-30 000 F, step 1 000)
    - **Lot minimum** : 4 chips (Tous / 1-4 / 5-9 / 10+)
    - **Options** : checkbox "Groupe actif" (violet) + "Fournisseur vérifié" (emerald)
    - **Économie** : 4 chips (Tous / -20% / -30% / -40%)
    - Bouton "Réinitialiser X filtres" affiché si actifs
  - **Grid produits** `grid-cols-4 gap-4`, ou state vide si aucun résultat
- Bouton "Charger plus" + "Affichage N / total"

**Layout mobile** :

- Search bar sticky avec input, bouton photo violet, ligne dessous : bouton "Filtres (X)" + `<select>` tri
- Chips filtres actifs en horizontal-scroll
- Grid `grid-cols-2 gap-3`
- Bouton "Charger plus" pleine largeur
- **Bottom sheet Filtres** au tap (max-h-85%) avec footer sticky : "Réinitialiser" + "Voir N produits"

**State vide** : icône Search en cercle slate, "Aucun produit trouvé", CTA "Réinitialiser les filtres" + "Demander un sourcing" (violet)

---

### 3 · Compte client dashboard

**Route** : `src/app/(market)/compte/page.tsx`.

**Layout mobile** :

1. Header + "Mon compte"
2. **Header profile** — bandeau sombre `from-slate-900 to-slate-800` avec :
   - Avatar rond gradient violet→emerald (initiales `CA`)
   - Handle "Client A" + "Membre depuis 2026"
   - Bouton cloche notifications
3. **Stats** `grid-cols-3` : Commandes (12) / Groupes (7 violet) / Économies (184 500 F emerald)
4. **Prochaine livraison** — card avec :
   - Header : "Commande CMD-0001" + badge "En transit" blue
   - Row : 3 avatars empilés + nom + qty/shipping + ETA
   - **Mini-timeline horizontale** 5 pastilles : les 2 premières check emerald, la 3e emerald + `ring-4 ring-emerald-500/20`, les 2 dernières slate
   - Label "Inspection qualité" + link "Suivre →"
5. **Programme Grains** — card gradient amber :
   - "3 450 grains" + "Palier Or"
   - Progress bar blanc/15 → blanc "Encore 1 550 grains pour Platinum"
   - Bouton "Utiliser mes grains →"
6. **Raccourcis** `grid-cols-2` mobile / `grid-cols-3` desktop : Mes commandes / Mes groupes / Favoris / Mes adresses / Sourcing / Paiement
7. **WhatsApp card** emerald bg
8. **Compte** — liste (Informations, Sécurité, Notifications, Aide) + "Se déconnecter" rouge

**Layout desktop** :

- Header avec H1 "Bonjour, Client A" + boutons cloche/paramètres
- Grid `[1fr_320px]` :
  - **Main** : Stats + Active order + Raccourcis + **Activité récente** (list divisée avec icônes tone)
  - **Sidebar** : Grains + WhatsApp + Compte + Se déconnecter

---

### 4 · Mes commandes

**Route** : `src/app/(market)/compte/commandes/page.tsx`.

- Header + breadcrumb + H1 "Mes commandes"
- **Tabs** : Toutes / En cours / Livrées avec compteurs (mobile : underline tabs sticky ; desktop : pilulier `bg-slate-100 p-1`)
- **Liste OrderCard** :
  - Top : ID commande + date + Badge statut coloré
  - Body : 3 avatars empilés + nom principal + "+ N articles" + qty/shipping + total à droite
  - **Mini-timeline** si non-livrée : 5 pastilles compact + label étape courante + ETA
  - CTAs : "Suivre" (primary si en cours), "Détails", "Contacter" WhatsApp
- **State vide** : icône Package, "Aucune commande", CTA "Explorer le catalogue"

**Statuts** : `ordered`, `sourcing`, `china`, `transit`, `delivered`, `cancelled` — mapping tone :
- `ordered` → blue
- `sourcing` → violet
- `china` → amber
- `transit` → blue
- `delivered` → emerald
- `cancelled` → red

---

### 5 · Suivi commande

**Route** : `src/app/(market)/compte/commandes/[id]/page.tsx`.

**Layout mobile** :

1. Header avec bouton retour + titre "Suivi · CMD-0001"
2. **Bandeau statut** emerald gradient : icône truck + "ÉTAPE 3/5 · Inspection qualité" + chip "En transit" pulsant
3. **Map placeholder** — SVG stylisé :
   - Trajectoire courbe pointillée emerald→blue de Guangzhou (bleu) à Dakar (ambre)
   - Marker "EN VOL" au milieu avec cercle pulsant emerald
   - Chip bottom-left "Distance parcourue · ~8 200 / 12 800 km"
   - Badge top-right "● Mise à jour temps réel"
4. **OrderInfo card** :
   - Row 3 avatars + nom + qty
   - Rounded-lg slate-50 : N° de suivi (mono), Livraison prévue emerald, Total payé
   - Boutons "Copier N°" + "WhatsApp" emerald
5. **Historique** — timeline verticale 5 étapes :
   - Chaque étape : pastille (check si done, numéro si future, pastille pulsante avec ring si current)
   - Ligne verticale entre étapes (emerald si done, slate sinon)
   - Titre étape + date à droite + description
   - L'étape courante est encadrée emerald bg
6. **Contact support** card

**Layout desktop** :

- Breadcrumb + H1 "Suivi de commande" + badge étape
- Grid `[1fr_380px]` :
  - **Main** : Map + Historique détaillé (timeline)
  - **Sidebar** : OrderInfo + WhatsApp + Actions (Copier / Modifier adresse / Facture / Signaler problème)

**Timeline étapes** :

| # | Label | Description |
|---|---|---|
| 1 | Commande confirmée | Paiement Escrow reçu |
| 2 | Sourcing en Chine | Notre équipe négocie avec l'usine |
| 3 | Inspection qualité | Contrôle avant expédition |
| 4 | En transit | Acheminement vers le Sénégal |
| 5 | Livré | Reçu à l'adresse indiquée |

---

## Mock data (anonymisé)

### Users
- Handle : `Client A/B/C` (initiales avatar : `CA`, `CB`, `CC`)
- Aucun nom réel, aucune entreprise identifiable

### Orders (ORDERS[])
- IDs : `CMD-0001` à `CMD-0004`
- Tracking : `DDM-2026-A0F3B1` (format neutre non associable)
- Dates 2026

### Testimonials (TESTIMONIALS[])
- Client A / B / C avec rôle générique (`Import électronique`, `Revendeur mode`, `Achat groupé`)

### Participants groupes (PARTICIPANTS_ANON[])
- Format : `Client · X pcs` + timestamp relatif

### Disclaimer
- Sidebar du proto affiche en permanence : chip amber "● Données de démonstration"

---

## Nouveaux composants réutilisables (à extraire)

Ces primitives sont partagées entre plusieurs écrans du Batch 1 et méritent d'être extraites en atomic components dans `src/components/ui/*` :

- **`OrderCard`** — card commande avec mini-timeline (utilisé dans Compte + Mes commandes)
- **`OrderTimeline`** (horizontal compact et vertical full) — pastilles étapes emerald/slate avec lignes
- **`GrainCard`** — card programme fidélité gradient amber
- **`MapPlaceholder`** — SVG trajectoire animée entre 2 villes
- **`FiltersPanel`** — panel filtres réutilisable (catégorie / prix / MOQ / options / économie)
- **`Fade-rotate tile`** — la CSS animation `fadeInOut 12s` avec délais échelonnés

---

## Design Tokens (rappel Direction Safe)

```
Primary   emerald-600  #059669
Accent    violet-600   #7C3AED
Warning   amber-500    #F59E0B
Info      blue-600     #2563EB
Danger    red-600      #DC2626

Font      Inter
Radius    rounded-xl (12), rounded-2xl (16), rounded-3xl (24)
Shadows   shadow-sm par défaut, shadow-md au hover
```

Dark mode : `dark:` variants systématiques (`dark:bg-slate-900`, `dark:text-white`, `dark:border-slate-800`, etc.). Zones colorées : `dark:bg-emerald-950/40 dark:border-emerald-900` (idem violet/amber/red).

---

## Files

- `Prototype DDM+.html` — Entrée principale (ouvrir dans navigateur)
- `proto/shared.jsx` — Icônes, composants partagés, mock data ANONYMISÉ (USER, ORDERS, ORDER_STEPS, TESTIMONIALS, PARTICIPANTS_ANON, CATEGORIES, CATALOG)
- `proto/shell.jsx` — Shell avec 2 batches groupés + disclaimer
- `proto/screen-home.jsx` — **Home v2 (Variante D)**
- `proto/screen-catalog.jsx` — **Catalogue avec filtres**
- `proto/screen-account.jsx` — **Compte client dashboard**
- `proto/screen-orders.jsx` — **Mes commandes**
- `proto/screen-tracking.jsx` — **Suivi commande**
- `proto/screen-product.jsx` — Batch 2 · Fiche produit
- `proto/screen-cart.jsx` — Batch 2 · Panier
- `proto/screen-checkout.jsx` — Batch 2 · Checkout adresse
- `proto/screen-groups.jsx` — Batch 2 · Achats groupés listing
- `proto/screen-group-detail.jsx` — Batch 2 · Détail groupe

---

## Prochaines étapes

### Batch 2 (déjà livré en v1/v2)
Fiche produit, Panier, Checkout, Groupes listing, Détail groupe — à rafraîchir si nécessaire pour cohérence visuelle avec Home v2.

### Batch 3 (à venir)
- Paiement succès (sobre : check + résumé + timeline immédiate + 2 CTAs)
- Page boutique / vendeur (badge "Usine DDM+" vs "Partenaire local")
- Demande sourcing "Trouvez-moi" (page dédiée avec formulaire complet + modale de raccourci)
- Tarification / Prix transparent (décomposition prix interactive + comparatif seul/groupé/palier)
- Devenir vendeur (à cadrer)

---

## Contraintes techniques

- Next.js 15 App Router · React 19 · Tailwind CSS · Framer Motion autorisé
- Icônes `lucide-react` uniquement (mapping SVG inline → lucide dans le handoff v2)
- Français
- Responsive mobile-first, min 320px, breakpoint md à 768px
- Dark mode obligatoire pour chaque écran
- Pas de backend / API / modèles modifiés
- Réutiliser composants structurels (`MarketHeader`, `MarketFooter`, `MarketBottomNav`, `CompactSearchBar`, `CheckoutStepper`, `PriceBreakdown`)
- Accessibilité AA, labels ARIA, hit-targets 44px min
