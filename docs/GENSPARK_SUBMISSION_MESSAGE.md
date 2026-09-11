# Message d'envoi à GenSpark — Refonte marketplace DDM+

## Objet
Refonte UI/UX marketplace DDM+ — 5 écrans restants, direction 01 · Safe validée

## Corps du message

Bonjour,

Voici la suite du brief marketplace DDM+.

Nous avons déjà reçu et validé la **Direction 01 · Safe — Évolution douce de l'existant** du handoff joint. Merci de l'utiliser comme source de vérité visuelle pour les 5 écrans restants.

---

## Direction validée

- **Nom** : 01 · Safe
- **Style** : évolution douce, faible risque, proche de la charte actuelle
- **Palette** :
  - Émeraude `#059669` (CTA, prix, stock)
  - Violet `#7C3AED` (groupes, sourcing)
  - Ambre `#F59E0B` (MOQ, alertes)
  - Bleu `#2563EB` (import, info)
  - Fond `white` / `slate-50`
  - Texte `slate-900`
- **Typographie** : Inter uniquement
- **Radius** : `rounded-xl` (12px), `rounded-2xl` (16px)
- **Ombres** : `shadow-sm` par défaut, `shadow-md` au hover
- **Urgence sociale** : maîtrisée (compte à rebours, barres de progression, badges discrets)

Source de vérité : `docs/design_handoff_ddm_plus_marketplace_home/home-directions.html` (Direction 01)
Fichier de tokens / détails : `docs/design_handoff_ddm_plus_marketplace_home/README.md`

---

## Écrans à livrer (mobile 375px + desktop 1280px)

1. **Fiche produit** — `src/components/product/ProductDetailNew.tsx`
   - Bloc prix premium
   - Paliers de prix cliquables
   - Sélecteur quantité intelligent (bloqué au `minOrderQty`)
   - Badge MOQ "Lot minimum X"
   - Card achat groupé (objectif, délai, prix, boutons Rejoindre / Créer)
   - Onglets Description / Expédition / Avis

2. **Panier** — `src/app/(market)/panier/page.tsx` + `src/components/cart/CartItemCard.tsx`
   - Carte article avec image, nom, variante, quantité, prix total
   - Badge "Min X" si `minOrderQty > 1`
   - Contrôle quantité bloqué au min
   - Récapitulatif sticky (desktop) / bottom sheet (mobile)
   - Économies totales affichées
   - Alerte MOQ bloquante
   - Section "Groupes actifs pour vos produits"

3. **Checkout** — `src/app/(market)/checkout/adresse/page.tsx`
   - Stepper Panier → Livraison → Paiement
   - Décomposition transparente du prix (prix source, frais de service, assurance, transport, grains, promo)
   - Options livraison Express / Aérien / Maritime
   - Formulaire adresse simplifié
   - Bannière de confiance

4. **Achats groupés listing** — `src/app/(market)/achats-groupes/page.tsx`
   - Hero "Achats groupés"
   - Grille de cards groupe avec image, prix actuel, prix barré
   - Barre de progression, compte à rebours, badge "Bientôt complet" si ≥ 80%
   - Nombre de participants et quantités engagées

5. **Détail groupe** — `src/app/(market)/achats-groupes/[groupId]/page.tsx`
   - Hero produit avec prix actuel du groupe
   - Progression du groupe (barre, quantités, objectif, deadline)
   - Section "Comment ça marche ?"
   - Formulaire de participation
   - Section participants (anonymisés) et chat
   - CTA sticky "Rejoindre maintenant"

---

## Contraintes techniques

- **Stack** : Next.js 15 App Router, React 19, Tailwind CSS, Framer Motion autorisé
- **Icônes** : `lucide-react` uniquement (pas d'emojis)
- **Langue** : Français
- **Responsive** : mobile-first, test min 320px
- **Mode sombre** : livré systématiquement pour chaque écran
- **Ne pas toucher au backend** : pas d'API, pas de modèles, pas de schémas
- **Ne pas créer de nouvelle route** sans l'ajouter dans `src/lib/domains.ts`
- **Réutiliser les composants structurels** : `MarketHeader`, `MarketFooter`, `MarketBottomNav`, `CompactSearchBar`, `CheckoutStepper`, `PriceBreakdown`
- **Accessibilité** : contrastes AA, labels ARIA, focus visibles

---

## Livrables attendus

Pour chaque écran :
1. Composant(s) React prêts à l'emploi
2. Liste des fichiers modifiés/créés avec chemins
3. Résumé des changements par rapport à l'existant
4. Copies finales en français
5. Capture/description du rendu mobile + desktop
6. Variante dark mode

---

## Validation avant merge

```bash
npm run type-check
npm run test:domains
npm run test:boundaries
npm run build
```

Merci et bonne création.
