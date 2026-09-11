# Prompt — DDM+ Batch 4 : redesign des 5-6 écrans critiques post-achat

## Objectif

Redesigner avec la Direction 01 · Safe de DDM+ les écrans les plus critiques du parcours **après validation du panier ou d'un groupe** :

1. `/paiement/checkout/[reference]`
2. `/payment/cancel`
3. `/commandes/[orderId]`
4. `/commandes/[orderId]/retour`
5. `/suivi/[reference]/litige`
6. `/compte/reclamer-commande`

Ces écrans sont actuellement legacy (gris `gray-*`, inline SVG/emoji, structuration disparate). Ils doivent devenir cohérents avec les 15 écrans DDM+ existants.

## Décisions de cadrage

### Scope du batch

- Batch 4 = **5-6 écrans critiques** (post-achat / paiement / litige / retour).
- Les autres P1, P2, P3 seront traités dans les batches suivants.

### Composant de formulaire partagé

- Créer **`ScreenFormRequest`** dans `src/components/market/batch1/screens/`
- 3 variantes via prop `variant: 'litige' | 'reclamation' | 'retour'`
- `retour` a des champs spécifiques (produits à retourner, motif de retour, photos, remboursement/échange).
- `litige` et `reclamation` partagent la même structure (référence commande, motif, description, pièces jointes, urgence).

### Détail commande (`/commandes/[orderId]`)

- Refondre le composant (actuellement ~1300 lignes) en sections claires.
- Approche : **4 onglets** sur mobile et desktop
  1. **Récapitulatif** : produits, décomposition prix, total
  2. **Suivi** : timeline verticale des statuts
  3. **Livraison** : adresse, transporteur, numéro de suivi
  4. **Actions** : contacter support, ouvrir litige, demander retour, répéter commande
- Le chat (`OrderChat`) et les notifications push restent disponibles sous forme de **floating bottom panel** ou d'une section fixe en bas de l'écran.
- Préserver `PushNotificationButton` et la logique de permissions.

### Paiement checkout (`/paiement/checkout/[reference]`)

- Reprendre `CheckoutStepper` existant.
- Remplacer `CheckoutInterface` par un nouveau `ScreenPaymentCheckout` premium :
  - Carte récapitulative (groupe ou commande standard)
  - Montant total en `emerald-600`
  - Tuiles de méthodes de paiement : **Wave**, **Orange Money**, **Free Money**, virement bancaire
  - Instructions dynamiques selon le provider actif (`settings.providers.manual.waveMerchantPhone`)
  - CTA principal large, sticky en mobile
  - Footer de confiance avec support WhatsApp
- Conserver `readPaymentSettings()` et la logique de sélection de provider.

### Payment cancel

- Page courte, premium, avec état d'annulation clair.
- Récapitulatif de la référence.
- CTA "Réessayer le paiement" (vers `/paiement/checkout/[ref]`) et "Retour au catalogue".

### Suivi / Retrouver commande

- Non inclus dans ce batch, sauf `litige`.
- `retrouver-ma-commande` et `/suivi` landing seront redesignés dans le batch 4b/5.

## Design tokens

- Couleurs : emerald, violet, amber, blue, red, slate
- Fonds : `bg-slate-50 dark:bg-slate-950`
- Surfaces : `bg-white dark:bg-slate-900`, bordures `border-slate-200 dark:border-slate-800`
- Rayons : `rounded-xl`, `rounded-2xl`, `rounded-3xl`
- Typo : Inter, tailles utilitaires `[12px]` à `[24px]`
- Mobile-first ; bottom sheet sur mobile ; modale centrée sur desktop

## Composants réutilisables

- `MarketHeader`, `MarketFooter`, `MarketBottomNav`
- `CheckoutStepper`
- `PriceBreakdown` (pour commande et checkout)
- `ProductCard`, `GroupCard`, `Badge`, `Card`, `Section`
- `SourcingRequestModal` comme modèle de modale formulaire
- `formatFcfa` depuis `src/components/market/batch1/formatFcfa.ts`
- `cn` depuis `@/lib/utils`
- `lucide-react` pour toutes les icônes

## Contraintes

1. **Ne pas modifier la logique métier** : conserver les appels API, les paramètres des composants, les modèles.
2. **Ne pas casser le paiement Wave/OM/Free** : la sélection du provider et les numéros de téléphone marchands restent inchangés.
3. **Un agent/domaine** : tout reste dans `src/app/(market)` et `src/components/market`.
4. **Responsivité** : mobile-first, desktop `max-w-5xl` ou `max-w-6xl`.
5. **Dark mode** : tous les blocs doivent avoir leurs `dark:`.
6. **Accessibilité** : labels, `aria`, contrastes.
7. **Pas de SVG inline, pas d'emoji** en production.
8. **Copie en français**.
9. **Pas de `any` nouveau**.
10. **Pas de code mort** : supprimer les composants remplacés.

## Détail par écran

### 1. `/paiement/checkout/[reference]`

Fichiers concernés :
- `src/app/(market)/paiement/checkout/[reference]/page.tsx`
- `src/components/payment/CheckoutInterface.tsx`
- `src/components/payment/CheckoutRelatedProducts.tsx` (optionnel)
- `src/components/cart/CheckoutStepper.tsx`

Livrable attendu :
- Nouveau composant `ScreenPaymentCheckout` (ou refonte de `CheckoutInterface`).
- Layout avec `MarketHeader`, `CheckoutStepper`, hero payment.
- Tuiles de méthodes de paiement cliquables.
- Récapitulatif groupe/commande.
- CTA sticky.
- Footer minimal.

### 2. `/payment/cancel`

Fichiers concernés :
- `src/app/(market)/payment/cancel/page.tsx`

Livrable attendu :
- Hero card centré avec icône `XCircle` en `red-600`.
- Récapitulatif de la référence annulée.
- Deux CTA : "Réessayer le paiement" (si `ref` présent) et "Continuer mes achats".

### 3. `/commandes/[orderId]`

Fichiers concernés :
- `src/app/(market)/commandes/[orderId]/page.tsx` (très long, à découper)
- `src/components/OrderChat.tsx` (à conserver mais intégrer proprement)
- `src/hooks/usePushNotifications.ts` (conservé)

Livrable attendu :
- Nouveau composant `ScreenOrderDetail` ou refactoring de la page.
- Onglets : Récapitulatif, Suivi, Livraison, Actions.
- Timeline verticale des statuts coloriée (new, pending, paid, shipped, delivered, cancelled).
- Décomposition prix via `PriceBreakdown`.
- Floating action bar ou bottom panel pour chat et actions rapides.
- Badges de statut.
- Conserver la fonctionnalité de copie du numéro de commande.

### 4. `/commandes/[orderId]/retour`

Fichiers concernés :
- `src/app/(market)/commandes/[orderId]/retour/page.tsx`

Livrable attendu :
- Formulaire `ScreenFormRequest` avec `variant='retour'`.
- Champs : produit(s) concerné(s), motif (défectueux, non conforme, changement d'avis), photos, choix remboursement/échange, téléphone, commentaire.
- CTA sticky.
- État de succès.

### 5. `/suivi/[reference]/litige`

Fichiers concernés :
- `src/app/(market)/suivi/[reference]/litige/page.tsx`

Livrable attendu :
- Formulaire `ScreenFormRequest` avec `variant='litige'`.
- Champs : référence, motif, gravité, description, pièces jointes, téléphone.
- CTA sticky.
- État de succès.

### 6. `/compte/reclamer-commande`

Fichiers concernés :
- `src/app/(market)/compte/reclamer-commande/page.tsx`

Livrable attendu :
- Formulaire `ScreenFormRequest` avec `variant='reclamation'`.
- Champs : numéro de commande, type de réclamation, description, pièces jointes, téléphone.
- CTA sticky.
- État de succès.

## Validation obligatoire

Après chaque lot de 2-3 écrans, lancer :

```bash
npm run type-check
npm run build
npm run test:domains
npm run test:boundaries
```

## Commit attendu

```
feat(market): redesign premium DDM+ batch 4 — post-achat et litiges

- Redesign /paiement/checkout/[reference] avec ScreenPaymentCheckout
- Redesign /payment/cancel
- Redesign /commandes/[orderId] en onglets
- Ajoute ScreenFormRequest (litige / reclamation / retour)
- Redesign /commandes/[orderId]/retour, /suivi/[reference]/litige, /compte/reclamer-commande

Generated with [Devin](https://devin.ai)
Co-Authored-By: Devin <158243242+devin-ai-integration[bot]@users.noreply.github.com>
```
