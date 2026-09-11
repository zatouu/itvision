# Prompt — Redesign des pages restantes du marketplace DDM+

## Contexte

Le marketplace DDM+ (domaine `market` de la branche `feat/mobile-fusion`) a reçu une refonte visuelle en 3 batches couvrant les 15 écrans principaux du parcours client. Cependant, plusieurs pages utilitaires et secondaires utilisent encore un style legacy (gris `gray-*`, inline SVG, emoji, typo hétérogène). L'objectif est de les re-designer **toutes** pour uniformiser l'expérience sous la Direction 01 · Safe de DDM+.

## Source de vérité design

- Palettes, tokens et composants existants : `src/components/market/batch1/*`
- Handoff DDM+ Batch 1 : `docs/design_handoff_ddm_plus_batch1/`
- Handoff DDM+ Batch 3 : `docs/design_handoff_ddm_plus_batch3/`
- Référence direction visuelle : Direction 01 · Safe
  - `emerald-600` (`#059669`) : validation, prix, CTA primaires
  - `violet-600` (`#7C3AED`) : achats groupés, sourcing, modales
  - `amber-500` (`#F59E0B`) : MOQ, avertissements, compte à rebours
  - `blue-600` (`#2563EB`) : information, imports, tracking
  - `red-600` (`#DC2626`) : danger, urgence, litiges
  - Fond : `slate-50` clair / `slate-950` sombre
  - Surfaces : `white` / `slate-900`
  - Rayons : `rounded-xl`, `rounded-2xl`, `rounded-3xl`
  - Typo : Inter (via Tailwind par défaut), tailles utilitaires compactes `[12px]`, `[13px]`, `[14px]`
  - Mobile-first, bottom sheet sur mobile, modale/dialogue centré sur desktop

## Composants réutilisables obligatoires

Toute nouvelle page doit privilégier les composants déjà existants :

- `MarketHeader` / `MarketFooter` / `MarketBottomNav`
- `ScreenHome`, `ScreenCatalog`, `ScreenProduct`, `ScreenCart`, `ScreenCheckout`, `ScreenGroups`, `ScreenGroupDetail`, `ScreenAccount`, `ScreenOrders`, `ScreenTracking`, `ScreenPricing`, `ScreenShop` (modèles de composition)
- `ProductCard`, `GroupCard`, `Badge`, `Card`, `Section`, `TrustStrip`, `ProgressBar`, `CompactSearchBar` (quand recréé)
- `SourcingRequestModal` et `SourcingModalContext` pour le sourcing
- `PriceBreakdown` si besoin
- `formatFcfa` dans `src/components/market/batch1/formatFcfa.ts`
- `cn` depuis `@/lib/utils`
- `lucide-react` pour les icônes (interdit SVG inline et emoji en production)

## Liste des pages à re-designer

### P1 — Parcours critique (à faire en premier)

Ces pages sont traversées activement par un acheteur. Elles doivent être premium, responsives, dark mode.

| Route | Fichier actuel | Usage |
|-------|----------------|-------|
| `/paiement/checkout/[reference]` | `src/app/(market)/paiement/checkout/[reference]/page.tsx` | Page de paiement Wave/OM après validation d'un panier ou d'un groupe. Utilise `CheckoutInterface` et `CheckoutStepper`. |
| `/payment/cancel` | `src/app/(market)/payment/cancel/page.tsx` | Paiement annulé, CTA réessayer / retour. |
| `/commandes/[orderId]` | `src/app/(market)/commandes/[orderId]/page.tsx` | Détail d'une commande, timeline, articles, décomposition prix, chat support. Long composant client (~1300 lignes). |
| `/commandes/[orderId]/retour` | `src/app/(market)/commandes/[orderId]/retour/page.tsx` | Formulaire de demande de retour. |
| `/compte/profil` | `src/app/(market)/compte/profil/page.tsx` | Profil utilisateur, adresses, préférences. |
| `/compte/achats-groupes` | `src/app/(market)/compte/achats-groupes/page.tsx` | Liste des groupes rejoints par l'utilisateur. |
| `/compte/reclamer-commande` | `src/app/(market)/compte/reclamer-commande/page.tsx` | Formulaire de réclamation / litige. |
| `/achats-groupes/nouveau` | `src/app/(market)/achats-groupes/nouveau/page.tsx` | Création d'un nouvel achat groupé. |
| `/retrouver-ma-commande` | `src/app/(market)/retrouver-ma-commande/page.tsx` | Recherche d'une commande par téléphone / référence. |
| `/suivi` | `src/app/(market)/suivi/page.tsx` | Landing de suivi, champ de saisie de référence. |
| `/suivi/[reference]/litige` | `src/app/(market)/suivi/[reference]/litige/page.tsx` | Formulaire de litige sur une commande. |

### P2 — Parcours secondaire

| Route | Fichier actuel | Usage |
|-------|----------------|-------|
| `/produits/compare` | `src/app/(market)/produits/compare/page.tsx` | Comparaison de produits. |
| `/produits/favoris` | `src/app/(market)/produits/favoris/page.tsx` | Liste des favoris / wishlist. |
| `/market/boutiques` | `src/app/(market)/market/boutiques/page.tsx` | Liste des boutiques (marché). |
| `/market/compte` | `src/app/(market)/market/compte/page.tsx` | Compte simplifié market. |
| `/market/creer-compte` | `src/app/(market)/market/creer-compte/page.tsx` | Inscription simplifiée market. |

### P3 — Pages spécifiques / landing

| Route | Fichier actuel | Usage |
|-------|----------------|-------|
| `/corporate-produits` | `src/app/(market)/corporate-produits/page.tsx` | Catalogue corporate dans market. |
| `/corporate-produits/[id]` | `src/app/(market)/corporate-produits/[id]/page.tsx` | Fiche produit corporate. |
| `/grains` | `src/app/(market)/grains/page.tsx` | Landing import de grains (produit spécifique). |

## Contraintes techniques

1. **Préserver les API et la logique** : ne pas modifier les appels `fetch`, les endpoints, les modèles Mongoose, ni la sémantique des formulaires. Refactoriser le JSX/CSS uniquement.
2. **Un agent = un domaine** : rester dans `src/app/(market)` et `src/components/market`. Ne pas importer de modèles corporate/xeuy.
3. **Pas de code mort** : si un composant est remplacé, le supprimer et mettre à jour les imports.
4. **Responsive** : mobile-first, desktop ≤ `max-w-6xl` / `max-w-5xl`, pas de doublon mobile/desktop sauf si pattern existant.
5. **Dark mode** : toutes les surfaces doivent avoir `dark:`.
6. **Accessibilité** : labels, `aria-label`, focus visible, contrastes.
7. **Icônes** : `lucide-react` uniquement. Pas d'emoji. Pas d'inline SVG.
8. **Copy** : UI en français.
9. **TypeScript** : pas de `any` nouveau. Conserver les types existants si corrects.
10. **Styles** : Tailwind utility-first. Éviter `gray-*` au profit de `slate-*`.
11. **Composants** : si possible extraire les sections en composants locaux (pas de fichiers > 500 lignes si c'est évitable).

## Règles de mise en page par type de page

### Paiement (`/paiement/checkout/[reference]`)

- Reprendre le stepper `CheckoutStepper` déjà existant.
- Réduire le header à `MarketHeader` (ne pas recréer un header custom).
- Refaire `CheckoutInterface` dans `src/components/payment/CheckoutInterface.tsx` (ou remplacer par un nouveau `ScreenPaymentCheckout`) avec :
  - Carte récapitulative de la commande/groupe
  - Montant total en évidence `emerald-600`
  - Méthodes de paiement sous forme de tuiles (Wave, Orange Money, Free Money, virement)
  - CTA principal large et sticky en mobile
  - Footer minimal avec support
- Conserver `readPaymentSettings()` et la logique de sélection de provider.

### Détail commande (`/commandes/[orderId]`)

- Refondre en onglets ou sections empilées :
  - **Récapitulatif** : articles, décomposition prix (`PriceBreakdown` si possible)
  - **Tracking** : timeline verticale coloriée par statut
  - **Livraison** : adresse, transporteur, numéro de suivi cliquable
  - **Actions** : contacter support, ouvrir litige, répéter commande
- Utiliser les badges de statut (emerald/blue/amber/red).
- Conserver `OrderChat` et les notifications push (`PushNotificationButton`).

### Formulaires (`retour`, `reclamer-commande`, `litige`)

- Design "formulaire premium" : cartes empilées, inputs `rounded-xl`, labels clairs, sélecteur de motif avec icônes.
- Sticky footer avec CTA.
- Message de succès centré avec check animation.

### Profil et compte

- Liste de cartes avec icônes : Mes infos, Adresses, Préférences, Sécurité.
- CTA secondaires.
- Conserver les appels API existants.

### Nouvel achat groupé (`/achats-groupes/nouveau`)

- Wizard en 2-3 étapes (produit / quantité / prix cible).
- Hero violet clair.
- CTA large.

### Suivi / retrouver commande

- Champ de saisie avec icône `Search`.
- Empty state illustré.
- Lien rapide vers `/compte/commandes`.

### Compare / Favoris

- Grille responsive.
- Empty state avec CTA vers catalogue.
- Card avec actions (supprimer, ajouter au panier).

## Processus de livraison attendu

1. **Explorer** : lire chaque fichier listé, identifier les appels API et l'état.
2. **Planifier** : créer un plan par lots de 3-4 pages maximum.
3. **Implémenter** : recréer/adapter le JSX, extraire les composants si besoin.
4. **Valider** à chaque lot :
   - `npm run type-check`
   - `npm run build`
   - `npm run test:domains`
   - `npm run test:boundaries`
5. **Commiter** par lot avec des messages explicites.
6. **Ne pas pousser** tant que le lot n'est pas validé.

## Exemple de structure de fichier cible

Pour un formulaire premium type retour/réclamation :

```tsx
// src/app/(market)/commandes/[orderId]/retour/page.tsx
'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Package, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatFcfa } from '@/components/market/batch1/formatFcfa';

export default function ReturnRequestPage() {
  const { orderId } = useParams<{ orderId: string }>();
  // ... état et logique existante
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <main className="mx-auto max-w-2xl px-4 py-6">
        {/* header mobile */}
        <div className="mb-4 flex items-center gap-2">
          <Link href={`/commandes/${orderId}`} className="...">
            <ArrowLeft size={18} /> Retour
          </Link>
          <h1 className="...">Demande de retour</h1>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:bg-slate-900 dark:border-slate-800">
          {/* formulaire */}
        </div>
      </main>
    </div>
  );
}
```

## Bonnes pratiques

- Toujours vérifier que `MarketHeader` et `MarketBottomNav` apparaissent (via `(market)/layout.tsx`).
- Ne pas recréer de header/footer custom sauf si la page est une landing isolée sans layout (vérifier `layout.tsx`).
- Préférer `next/link` pour la navigation interne.
- Préférer `img` avec `src` depuis API ; `next/image` uniquement si la source est sûre et dans la config.

## Validation finale obligatoire avant toute poussée

```bash
npm run type-check
npm run build
npm run test:domains
npm run test:boundaries
```

## Notes importantes

- `payment/success` vient d'être refondu. Ne pas le modifier sauf bug.
- `SourcingRequestModal` est récent. S'en inspirer pour les modales de formulaire.
- Les pages corporate (`/corporate-produits`) sont dans le domaine market mais orientées B2B. Elles doivent suivre le design DDM+ sans devenir corporate.
- `/grains` est une landing promotionnelle. La traiter comme un écran `Screen*` spécifique.

## Commit attendu

Chaque lot doit être commité avec un message du type :

```
feat(market): redesign premium des pages <noms>

- <page 1>
- <page 2>
- ...

Generated with [Devin](https://devin.ai)
Co-Authored-By: Devin <158243242+devin-ai-integration[bot]@users.noreply.github.com>
```
