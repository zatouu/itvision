# Configuration Admin — Pricing B2B (paliers frais de service)

## Objectif

Ce document décrit la mise en configuration admin des **paliers de frais de service B2B** pour éviter les taux codés en dur dans le panier et le calcul serveur des commandes.

---

## Ce qui est configurable

Dans `pricing settings` (`data/pricing-settings.json`) :

- `defaultExchangeRate`
- `defaultServiceFeeRate`
- `defaultInsuranceRate`
- `defaultB2BDiscountPercent`
- `serviceFeeTiers[]`
  - `minAmount`
  - `maxAmount` (reconstruit automatiquement)
  - `feeRate`
  - `label`
  - `description`

---

## Édition admin

Composant admin : `src/components/AdminPricingDefaults.tsx`

Le bloc permet désormais :

- édition du taux B2B par défaut,
- ajout/suppression de paliers de frais,
- édition des seuils `minAmount`, du `feeRate`, du `label` et de la `description`.

API utilisée : `POST /api/admin/settings`

---

## Normalisation et garde-fous

Fichier : `src/lib/pricing/settings.ts`

- validation des taux (0..100 selon champ),
- validation du taux B2B (1..50),
- normalisation des paliers (tri par `minAmount`, suppression des invalides),
- reconstruction des `maxAmount` à partir du palier suivant,
- fallback sur des paliers par défaut si la config est vide/invalide.

---

## Consommation côté front et serveur

### API publique de lecture settings pricing

- `GET /api/pricing/settings`
- fichier : `src/app/api/pricing/settings/route.ts`

Permet au front public de récupérer les paliers configurés sans accès admin.

### Panier (front public)

Fichiers :
- `src/app/panier/page.tsx`
- `src/components/ServiceFeeTierProgress.tsx`
- `src/lib/pricing/tiered-service-fees.ts`

Effets :
- le panier charge `serviceFeeTiers` depuis l’API publique,
- les badges/progressions utilisent les paliers dynamiques,
- les économies de frais sont calculées sur le taux standard du premier palier (et non une constante fixe).

### Commande (backend)

Fichier : `src/app/api/order/route.ts`

Effets :
- le calcul serveur (`calculateCartTotal`) reçoit `serviceFeeTiers` issus des settings,
- la facturation commande reste alignée avec le front.

---

## Impact compatibilité

- Les anciennes configs sans `serviceFeeTiers` restent compatibles (fallback defaults).
- Aucun changement requis côté clients API existants hors récupération optionnelle de `/api/pricing/settings`.

---

## Vérification recommandée

1. Modifier les paliers dans l’admin pricing.
2. Ouvrir `/panier` avec des montants différents et vérifier le palier actif.
3. Passer une commande test et vérifier les champs `fees` enregistrés.
4. Contrôler la cohérence front vs backend (même taux appliqué pour un même montant).
